-- School ERP - core schema (Supabase / Postgres)
-- Run in the Supabase SQL editor, or with the Supabase CLI: `supabase db push`.
-- The backend connects with the SERVICE ROLE key, which bypasses RLS. RLS is enabled with no
-- policies so the anon key can never read these tables directly.


-- ─── helpers ────────────────────────────────────────────────────────────────
create or replace function set_updated_at() returns trigger language plpgsql as $$
begin new.updated_at = now(); return new; end $$;

-- ─── users (staff / admin / teacher) ────────────────────────────────────────
create table users (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) <= 100),
  email text unique,
  password_hash text not null,
  role text not null default 'STAFF' check (role in ('ADMIN','STAFF','TEACHER')),
  permissions text[] not null default '{}',
  dob date,
  aadhar_no text,
  pan_no text,
  contact_no1 text unique,
  contact_no2 text,
  address text,
  photo_url text,
  designation text,
  experience text,
  education_details jsonb not null default '[]',
  shift1 jsonb not null default '{"entry":null,"exit":null}',
  shift2 jsonb not null default '{"entry":null,"exit":null}',
  teacher_profile jsonb not null default '{"isClassTeacherFor":{"standard":null,"division":null,"medium":null},"subjectsAssigned":[]}',
  is_active boolean not null default true,
  last_login timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index users_role_active_idx on users (role, is_active);
create trigger users_updated before update on users for each row execute function set_updated_at();

-- ─── refresh tokens (users + parents) ───────────────────────────────────────
create table refresh_tokens (
  id uuid primary key default gen_random_uuid(),
  domain text not null check (domain in ('user','parent')),
  owner_id uuid not null,
  token_hash text not null,
  expires_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index refresh_tokens_owner_idx on refresh_tokens (domain, owner_id);

-- ─── parents ────────────────────────────────────────────────────────────────
create table parents (
  id uuid primary key default gen_random_uuid(),
  parent_name text not null check (char_length(parent_name) <= 100),
  primary_mobile_number text not null unique check (primary_mobile_number ~ '^[6-9][0-9]{9}$'),
  secondary_mobile_number text unique check (secondary_mobile_number is null or secondary_mobile_number ~ '^[6-9][0-9]{9}$'),
  email text,
  address text,
  password_hash text,
  is_password_set boolean not null default false,
  allow_otp_reset boolean not null default false,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger parents_updated before update on parents for each row execute function set_updated_at();

-- ─── academic years ─────────────────────────────────────────────────────────
create table academic_years (
  id uuid primary key default gen_random_uuid(),
  name text not null unique check (name ~ '^[0-9]{4}-[0-9]{4}$'),
  start_date date not null,
  end_date date not null,
  is_active boolean not null default false,
  last_receipt_number integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- only one active year
create unique index academic_years_one_active_idx on academic_years (is_active) where is_active;
create trigger academic_years_updated before update on academic_years for each row execute function set_updated_at();

-- ─── fee categories / structures ────────────────────────────────────────────
create table fee_categories (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  type text not null check (type in ('EDUCATION','TERM','TRANSPORT','ADMISSION','OTHER','BAG_KIT')),
  description text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create trigger fee_categories_updated before update on fee_categories for each row execute function set_updated_at();

create table fee_structures (
  id uuid primary key default gen_random_uuid(),
  medium text not null check (medium in ('English','Gujarati')),
  standard text not null,
  annual_fee numeric not null check (annual_fee >= 0),
  education_part_count integer not null default 12 check (education_part_count >= 1),
  term_part_count integer not null default 2 check (term_part_count >= 0),
  admission_fee numeric not null default 0 check (admission_fee >= 0),
  bag_kit_fee numeric not null default 0 check (bag_kit_fee >= 0),
  term_fee numeric not null default 0 check (term_fee >= 0),
  applicable_fee_categories uuid[] not null default '{}',
  academic_year text not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (academic_year, medium, standard)
);
create trigger fee_structures_updated before update on fee_structures for each row execute function set_updated_at();

create table transport_fee_structures (
  id uuid primary key default gen_random_uuid(),
  academic_year text not null,
  transport_type text not null,
  amount numeric not null check (amount >= 0),
  frequency text not null default 'MONTHLY' check (frequency in ('MONTHLY','QUARTERLY','YEARLY')),
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index transport_fee_structures_active_idx on transport_fee_structures (academic_year, transport_type) where is_active;
create trigger transport_fee_structures_updated before update on transport_fee_structures for each row execute function set_updated_at();

-- ─── students ───────────────────────────────────────────────────────────────
create table students (
  id uuid primary key default gen_random_uuid(),
  parent_id uuid references parents(id),
  student_code text unique,
  student_name text not null check (char_length(student_name) <= 100),
  surname text,
  father_name text,
  mother_name text,
  gr_no text,
  roll_no integer,
  gender text check (gender in ('Male','Female')),
  dob date,
  aadhar_no text,
  pen_no text,
  photo_url text,
  profile jsonb not null default '{}',
  medium text not null check (medium in ('English','Gujarati')),
  standard text not null,
  division text not null,
  transport_type text not null default 'None',
  is_migrated boolean not null default false,
  is_rte boolean not null default false,
  is_new_admission boolean not null default false,
  buy_bag_kit boolean not null default false,
  admission_month text not null default 'June',
  transport_start_month text,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (parent_id, student_name, medium)
);
create index students_class_idx on students (medium, standard, division);
create index students_parent_idx on students (parent_id);
create trigger students_updated before update on students for each row execute function set_updated_at();

-- ─── ledgers & payments ─────────────────────────────────────────────────────
create table student_fee_ledgers (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  academic_year text not null,
  fee_category_id uuid not null references fee_categories(id),
  fee_period text not null,
  fee_type text not null check (fee_type in ('EDUCATION','TERM','TRANSPORT','ADMISSION','OTHER','BAG_KIT')),
  ledger_number text not null unique,
  total_amount numeric not null check (total_amount >= 0),
  paid_amount numeric not null default 0 check (paid_amount >= 0),
  concession_amount numeric not null default 0 check (concession_amount >= 0),
  remaining_amount numeric not null check (remaining_amount >= 0),
  status text not null default 'PENDING' check (status in ('PENDING','PARTIAL','PAID','WAIVED','CANCELLED')),
  due_date date not null,
  source text not null default 'MANUAL' check (source in ('GENERATED','MIGRATED','MANUAL')),
  generated_from text not null default 'FEE_STRUCTURE' check (generated_from in ('FEE_STRUCTURE','TRANSPORT_STRUCTURE','MIGRATION')),
  remarks text,
  is_archived boolean not null default false,
  snapshot jsonb not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (student_id, fee_category_id, fee_period, academic_year)
);
create index ledgers_year_status_idx on student_fee_ledgers (academic_year, status);
create index ledgers_student_idx on student_fee_ledgers (student_id, due_date);
create trigger ledgers_updated before update on student_fee_ledgers for each row execute function set_updated_at();

create table payments (
  id uuid primary key default gen_random_uuid(),
  ledger_id uuid not null references student_fee_ledgers(id),
  receipt_number integer,
  amount numeric not null,
  concession_amount numeric not null default 0,
  method text not null check (method in ('CASH','CHEQUE','ONLINE','UPI','REVERSAL')),
  details jsonb not null default '{}',
  is_reversal boolean not null default false,
  gateway_transaction_id text,
  reversed_payment_id uuid references payments(id),
  performed_by uuid references users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index payments_ledger_idx on payments (ledger_id, created_at desc);
create unique index payments_one_reversal_idx on payments (reversed_payment_id) where reversed_payment_id is not null;
create trigger payments_updated before update on payments for each row execute function set_updated_at();

-- ─── audit log & expenses ───────────────────────────────────────────────────
create table audit_logs (
  id uuid primary key default gen_random_uuid(),
  performed_by uuid references users(id) on delete set null,
  target_parent_id uuid,
  target_student_id uuid,
  target_ledger_id uuid,
  action text not null,
  details jsonb not null default '{}',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index audit_logs_created_idx on audit_logs (created_at desc);
create index audit_logs_action_idx on audit_logs (action, created_at desc);

create table expenses (
  id uuid primary key default gen_random_uuid(),
  title text not null check (char_length(title) <= 150),
  category text not null default 'Miscellaneous',
  amount numeric not null check (amount >= 0),
  payment_method text not null default 'CASH' check (payment_method in ('CASH','BANK','ONLINE')),
  description text not null default '',
  date timestamptz not null default now(),
  created_by uuid references users(id) on delete set null,
  is_reversed boolean not null default false,
  reversed_at timestamptz,
  reversed_reason text not null default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index expenses_date_idx on expenses (date desc);
create trigger expenses_updated before update on expenses for each row execute function set_updated_at();

-- ─── atomic payment functions (supabase-js has no multi-statement transactions) ──
-- Applies a batch of payments/concessions in ONE transaction. Rows are locked FOR UPDATE, so
-- two cashiers can't overspend the same ledger.
create or replace function create_batch_payments(p_payments jsonb, p_performed_by uuid)
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

    select * into led from student_fee_ledgers where id = (item->>'ledgerId')::uuid for update;
    if not found then raise exception 'Ledger not found for ID: %', item->>'ledgerId' using errcode = 'P0002'; end if;

    if v_receipt is null and v_amount > 0 then
      update academic_years set last_receipt_number = last_receipt_number + 1
        where name = led.academic_year returning last_receipt_number into v_receipt;
      if v_receipt is null then raise exception 'Academic year not found for ledger %', led.id using errcode = 'P0002'; end if;
    end if;

    v_new_paid := led.paid_amount + v_amount;
    v_new_conc := led.concession_amount + v_conc;
    v_remaining := led.total_amount - v_new_paid - v_new_conc;
    if v_remaining < 0 then raise exception 'Over-payment not allowed for ledger %', led.id using errcode = 'P0001'; end if;
    v_status := case when v_remaining = 0 then 'PAID' when v_new_paid > 0 then 'PARTIAL' else 'PENDING' end;

    insert into payments (ledger_id, receipt_number, amount, concession_amount, method, details, performed_by, gateway_transaction_id)
    values (led.id, case when v_amount > 0 then v_receipt end, v_amount, v_conc, v_method,
            coalesce(item->'details','{}'::jsonb) || jsonb_build_object('remark', item->'remark', 'transactionId', coalesce(item->'details'->>'transactionId', v_txn)),
            p_performed_by, item->>'gatewayTransactionId')
    returning * into v_pay;

    update student_fee_ledgers set paid_amount = v_new_paid, concession_amount = v_new_conc,
      remaining_amount = v_remaining, status = v_status where id = led.id;

    select * into v_student from students where id = led.student_id;
    select * into v_parent from parents where id = v_student.parent_id;
    insert into audit_logs (performed_by, target_ledger_id, target_student_id, action, details)
    values (p_performed_by, led.id, led.student_id,
            case when v_amount > 0 then 'PAYMENT_CREATED' else 'LEDGER_CONCESSION_APPLIED' end,
            jsonb_build_object('paymentId', v_pay.id, 'amount', v_amount, 'concessionAmount', v_conc, 'method', v_method,
                               'studentName', coalesce(v_student.student_name,'Unknown Student'),
                               'parentName', coalesce(v_parent.parent_name,'Unknown Parent'),
                               'parentPhone', coalesce(v_parent.primary_mobile_number,'')));
    return next v_pay;
  end loop;
  return;
end $$;

create or replace function reverse_payment(p_payment_id uuid, p_reason text, p_performed_by uuid)
returns payments language plpgsql as $$
declare
  pay payments; led student_fee_ledgers; rev payments;
  v_paid numeric; v_conc numeric; v_remaining numeric; v_status text;
  v_student students; v_parent parents;
begin
  if p_reason is null or btrim(p_reason) = '' then raise exception 'A valid reversal reason is required' using errcode = 'P0001'; end if;
  select * into pay from payments where id = p_payment_id for update;
  if not found then raise exception 'Payment not found' using errcode = 'P0002'; end if;
  if pay.is_reversal then raise exception 'Cannot reverse a reversal' using errcode = 'P0001'; end if;
  if exists (select 1 from payments where reversed_payment_id = pay.id) then raise exception 'Already reversed' using errcode = 'P0001'; end if;

  select * into led from student_fee_ledgers where id = pay.ledger_id for update;
  v_paid := led.paid_amount - pay.amount;
  if v_paid < 0 then raise exception 'Ledger paid amount cannot become negative' using errcode = 'P0001'; end if;
  v_conc := led.concession_amount - coalesce(pay.concession_amount, 0);
  v_remaining := led.total_amount - v_paid - v_conc;
  v_status := case when v_remaining = 0 then 'PAID' when v_paid > 0 then 'PARTIAL' else 'PENDING' end;

  insert into payments (ledger_id, amount, concession_amount, method, details, is_reversal, reversed_payment_id, performed_by)
  values (pay.ledger_id, -pay.amount, -coalesce(pay.concession_amount,0), pay.method,
          jsonb_build_object('reversalOf', pay.id, 'reason', p_reason), true, pay.id, p_performed_by)
  returning * into rev;

  update student_fee_ledgers set paid_amount = v_paid, concession_amount = v_conc,
    remaining_amount = v_remaining, status = v_status where id = led.id;

  select * into v_student from students where id = led.student_id;
  select * into v_parent from parents where id = v_student.parent_id;
  insert into audit_logs (performed_by, target_ledger_id, target_student_id, action, details)
  values (p_performed_by, led.id, led.student_id, 'PAYMENT_REVERSED',
          jsonb_build_object('paymentId', pay.id, 'amount', pay.amount, 'reason', p_reason,
                             'studentName', coalesce(v_student.student_name,'Unknown Student'),
                             'parentName', coalesce(v_parent.parent_name,'Unknown Parent'),
                             'parentPhone', coalesce(v_parent.primary_mobile_number,'')));
  return rev;
end $$;

-- ─── row level security: deny direct access, service role only ──────────────
alter table users enable row level security;
alter table refresh_tokens enable row level security;
alter table parents enable row level security;
alter table academic_years enable row level security;
alter table fee_categories enable row level security;
alter table fee_structures enable row level security;
alter table transport_fee_structures enable row level security;
alter table students enable row level security;
alter table student_fee_ledgers enable row level security;
alter table payments enable row level security;
alter table audit_logs enable row level security;
alter table expenses enable row level security;
