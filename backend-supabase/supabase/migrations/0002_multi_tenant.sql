-- School ERP - multi-tenancy (Organization admin -> clients/schools -> licensed modules)
-- Run AFTER 0001_core.sql. Safe on a database that already holds single-school data: everything
-- existing is assigned to a "default-school" client.

-- ─── clients (one row per school / tenant) ──────────────────────────────────
create table clients (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 2 and 120),
  code text not null unique check (code ~ '^[a-z0-9][a-z0-9-]{1,38}[a-z0-9]$'),
  status text not null default 'ACTIVE' check (status in ('ACTIVE','SUSPENDED')),
  enabled_modules text[] not null default '{}' check (enabled_modules <@ array['FEES','ERP']),
  contact_name text,
  contact_email text,
  contact_phone text,
  address text,
  notes text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger clients_updated before update on clients for each row execute function set_updated_at();
alter table clients enable row level security;

-- default client that adopts every pre-existing row
insert into clients (name, code, enabled_modules) values ('Default School', 'default-school', array['FEES','ERP']);

-- ─── client_id on every school-owned table ──────────────────────────────────
do $$
declare
  t text;
  default_client uuid := (select id from clients where code = 'default-school');
begin
  foreach t in array array['users','parents','academic_years','fee_categories','fee_structures','transport_fee_structures',
                           'students','student_fee_ledgers','payments','audit_logs','expenses'] loop
    execute format('alter table %I add column client_id uuid references clients(id) on delete restrict', t);
    execute format('update %I set client_id = %L', t, default_client);
    -- users stays nullable: ORG_ADMIN (platform owner) belongs to no client
    if t <> 'users' then execute format('alter table %I alter column client_id set not null', t); end if;
    execute format('create index %I on %I (client_id)', t || '_client_idx', t);
  end loop;
end $$;

-- users: role ORG_ADMIN (platform owner) has no client; everyone else must belong to one
alter table users drop constraint users_role_check;
alter table users add constraint users_role_check check (role in ('ORG_ADMIN','ADMIN','STAFF','TEACHER'));
alter table users add constraint users_client_required check (role = 'ORG_ADMIN' or client_id is not null);

-- ─── unique constraints become per-client ──────────────────────────────────
-- (users.email / users.contact_no1 stay GLOBAL: they are login ids resolved before the tenant is known)
alter table parents drop constraint parents_primary_mobile_number_key;
alter table parents drop constraint parents_secondary_mobile_number_key;
alter table parents add constraint parents_client_primary_mobile_key unique (client_id, primary_mobile_number);
alter table parents add constraint parents_client_secondary_mobile_key unique (client_id, secondary_mobile_number);

alter table academic_years drop constraint academic_years_name_key;
alter table academic_years add constraint academic_years_client_name_key unique (client_id, name);
drop index academic_years_one_active_idx;
create unique index academic_years_one_active_idx on academic_years (client_id) where is_active;

alter table fee_categories drop constraint fee_categories_name_key;
alter table fee_categories add constraint fee_categories_client_name_key unique (client_id, name);

alter table fee_structures drop constraint fee_structures_academic_year_medium_standard_key;
alter table fee_structures add constraint fee_structures_client_year_medium_std_key unique (client_id, academic_year, medium, standard);

drop index transport_fee_structures_active_idx;
create unique index transport_fee_structures_active_idx on transport_fee_structures (client_id, academic_year, transport_type) where is_active;

alter table students drop constraint students_student_code_key;
alter table students add constraint students_client_code_key unique (client_id, student_code);

alter table student_fee_ledgers drop constraint student_fee_ledgers_ledger_number_key;
alter table student_fee_ledgers add constraint ledgers_client_number_key unique (client_id, ledger_number);

-- ─── payment functions: now tenant-aware ───────────────────────────────────
-- p_client_id confines every row they touch to one school and stamps the rows they create.
drop function if exists create_batch_payments(jsonb, uuid);
drop function if exists reverse_payment(uuid, text, uuid);

create or replace function create_batch_payments(p_payments jsonb, p_performed_by uuid, p_client_id uuid)
returns setof payments language plpgsql as $$
declare
  item jsonb;
  led student_fee_ledgers;
  v_amount numeric; v_conc numeric; v_method text;
  v_receipt integer := null;
  v_new_paid numeric; v_new_conc numeric; v_remaining numeric; v_status text;
  v_pay payments;
  v_txn text := 'BATCH_TXN_' || (extract(epoch from clock_timestamp()) * 1000)::bigint || '_' || substr(md5(random()::text), 1, 4);
  v_student students;
  v_parent parents;
begin
  for item in select * from jsonb_array_elements(p_payments) loop
    v_amount := coalesce((item->>'amount')::numeric, 0);
    v_conc   := coalesce((item->>'concessionAmount')::numeric, 0);
    v_method := item->>'method';
    if v_amount < 0 or v_conc < 0 then raise exception 'Amounts must not be negative' using errcode = 'P0001'; end if;
    continue when v_amount = 0 and v_conc = 0;

    select * into led from student_fee_ledgers where id = (item->>'ledgerId')::uuid and client_id = p_client_id for update;
    if not found then raise exception 'Ledger not found for ID: %', item->>'ledgerId' using errcode = 'P0002'; end if;

    if v_receipt is null and v_amount > 0 then
      update academic_years set last_receipt_number = last_receipt_number + 1
        where name = led.academic_year and client_id = p_client_id returning last_receipt_number into v_receipt;
      if v_receipt is null then raise exception 'Academic year not found for ledger %', led.id using errcode = 'P0002'; end if;
    end if;

    v_new_paid := led.paid_amount + v_amount;
    v_new_conc := led.concession_amount + v_conc;
    v_remaining := led.total_amount - v_new_paid - v_new_conc;
    if v_remaining < 0 then raise exception 'Over-payment not allowed for ledger %', led.id using errcode = 'P0001'; end if;
    v_status := case when v_remaining = 0 then 'PAID' when v_new_paid > 0 then 'PARTIAL' else 'PENDING' end;

    insert into payments (client_id, ledger_id, receipt_number, amount, concession_amount, method, details, performed_by, gateway_transaction_id)
    values (p_client_id, led.id, case when v_amount > 0 then v_receipt end, v_amount, v_conc, v_method,
            coalesce(item->'details','{}'::jsonb) || jsonb_build_object('remark', item->'remark', 'transactionId', coalesce(item->'details'->>'transactionId', v_txn)),
            p_performed_by, item->>'gatewayTransactionId')
    returning * into v_pay;

    update student_fee_ledgers set paid_amount = v_new_paid, concession_amount = v_new_conc,
      remaining_amount = v_remaining, status = v_status where id = led.id;

    select * into v_student from students where id = led.student_id;
    select * into v_parent from parents where id = v_student.parent_id;
    insert into audit_logs (client_id, performed_by, target_ledger_id, target_student_id, action, details)
    values (p_client_id, p_performed_by, led.id, led.student_id,
            case when v_amount > 0 then 'PAYMENT_CREATED' else 'LEDGER_CONCESSION_APPLIED' end,
            jsonb_build_object('paymentId', v_pay.id, 'amount', v_amount, 'concessionAmount', v_conc, 'method', v_method,
                               'studentName', coalesce(v_student.student_name,'Unknown Student'),
                               'parentName', coalesce(v_parent.parent_name,'Unknown Parent'),
                               'parentPhone', coalesce(v_parent.primary_mobile_number,'')));
    return next v_pay;
  end loop;
  return;
end $$;

create or replace function reverse_payment(p_payment_id uuid, p_reason text, p_performed_by uuid, p_client_id uuid)
returns payments language plpgsql as $$
declare
  pay payments; led student_fee_ledgers; rev payments;
  v_paid numeric; v_conc numeric; v_remaining numeric; v_status text;
  v_student students; v_parent parents;
begin
  if p_reason is null or btrim(p_reason) = '' then raise exception 'A valid reversal reason is required' using errcode = 'P0001'; end if;
  select * into pay from payments where id = p_payment_id and client_id = p_client_id for update;
  if not found then raise exception 'Payment not found' using errcode = 'P0002'; end if;
  if pay.is_reversal then raise exception 'Cannot reverse a reversal' using errcode = 'P0001'; end if;
  if exists (select 1 from payments where reversed_payment_id = pay.id) then raise exception 'Already reversed' using errcode = 'P0001'; end if;

  select * into led from student_fee_ledgers where id = pay.ledger_id for update;
  v_paid := led.paid_amount - pay.amount;
  if v_paid < 0 then raise exception 'Ledger paid amount cannot become negative' using errcode = 'P0001'; end if;
  v_conc := led.concession_amount - coalesce(pay.concession_amount, 0);
  v_remaining := led.total_amount - v_paid - v_conc;
  v_status := case when v_remaining = 0 then 'PAID' when v_paid > 0 then 'PARTIAL' else 'PENDING' end;

  insert into payments (client_id, ledger_id, amount, concession_amount, method, details, is_reversal, reversed_payment_id, performed_by)
  values (p_client_id, pay.ledger_id, -pay.amount, -coalesce(pay.concession_amount,0), pay.method,
          jsonb_build_object('reversalOf', pay.id, 'reason', p_reason), true, pay.id, p_performed_by)
  returning * into rev;

  update student_fee_ledgers set paid_amount = v_paid, concession_amount = v_conc,
    remaining_amount = v_remaining, status = v_status where id = led.id;

  select * into v_student from students where id = led.student_id;
  select * into v_parent from parents where id = v_student.parent_id;
  insert into audit_logs (client_id, performed_by, target_ledger_id, target_student_id, action, details)
  values (p_client_id, p_performed_by, led.id, led.student_id, 'PAYMENT_REVERSED',
          jsonb_build_object('paymentId', pay.id, 'amount', pay.amount, 'reason', p_reason,
                             'studentName', coalesce(v_student.student_name,'Unknown Student'),
                             'parentName', coalesce(v_parent.parent_name,'Unknown Parent'),
                             'parentPhone', coalesce(v_parent.primary_mobile_number,'')));
  return rev;
end $$;
