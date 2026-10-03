/**
 * PrintReport.tsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Screen-preview component for reports (not used for actual printing).
 * Actual printing is handled by printUtils.ts via an iframe.
 *
 * Supports 3 report types:
 *  • daily-collections  → portrait
 *  • outstanding-dues   → landscape (more columns)
 *  • rte-reconcile      → portrait
 * ─────────────────────────────────────────────────────────────────────────────
 */

import React from 'react';
import { brand } from '../config/brand';

const logoPath = brand.logo;

interface PrintReportProps {
  report: {
    type: string;
    title: string;
    data: any;
  };
}

const SCHOOL_NAME = brand.schoolName.toUpperCase();
const SCHOOL_MEDIUM = brand.medium;
const SCHOOL_ADDRESS = brand.address;
const SCHOOL_PHONE = brand.phone;
const SCHOOL_EMAIL = brand.email;
const SCHOOL_WEBSITE = brand.website;

/* ── shared styles ── */
const S = {
  page: {
    width: '210mm',
    margin: '0 auto',
    padding: '14mm 12mm 10mm',
    backgroundColor: '#ffffff',
    fontFamily: "'Segoe UI', 'Helvetica Neue', Arial, sans-serif",
    fontSize: '10px',
    color: '#1a1a2e',
    boxSizing: 'border-box' as const,
  } as React.CSSProperties,

  pageLandscape: {
    width: '297mm',
  } as React.CSSProperties,

  headerRow: {
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    marginBottom: '8px',
  } as React.CSSProperties,

  schoolName: {
    fontSize: '20px',
    fontWeight: 800,
    color: '#134e4a',
    letterSpacing: '0.4px',
    lineHeight: 1.1,
  } as React.CSSProperties,

  ruleGold: { height: '4px', backgroundColor: '#e8a020', marginBottom: '3px' } as React.CSSProperties,
  ruleNavy: { height: '2px', backgroundColor: '#134e4a', marginBottom: '12px' } as React.CSSProperties,

  titleBar: {
    backgroundColor: '#134e4a',
    color: '#fff',
    textAlign: 'center' as const,
    padding: '8px 0',
    fontSize: '13px',
    fontWeight: 700,
    letterSpacing: '2px',
    marginBottom: '6px',
  } as React.CSSProperties,

  generatedAt: {
    fontSize: '8.5px',
    color: '#888',
    textAlign: 'right' as const,
    marginBottom: '12px',
  } as React.CSSProperties,

  summaryGrid: {
    display: 'grid',
    gap: '10px',
    marginBottom: '16px',
    padding: '10px',
    border: '1px solid #dde3ed',
    borderRadius: '6px',
    background: '#f7f9fc',
  } as React.CSSProperties,

  statLabel: {
    fontSize: '8.5px',
    fontWeight: 700,
    color: '#888',
    textTransform: 'uppercase' as const,
    letterSpacing: '0.5px',
  } as React.CSSProperties,

  statVal: {
    fontSize: '13px',
    fontWeight: 800,
    color: '#1a1a2e',
    marginTop: '3px',
  } as React.CSSProperties,

  table: {
    width: '100%',
    borderCollapse: 'collapse' as const,
    fontSize: '9.5px',
  } as React.CSSProperties,

  th: {
    padding: '7px 8px',
    backgroundColor: '#134e4a',
    color: '#fff',
    fontWeight: 700,
    textAlign: 'left' as const,
    whiteSpace: 'nowrap' as const,
  } as React.CSSProperties,

  thRight: {
    textAlign: 'right' as const,
  } as React.CSSProperties,

  td: {
    padding: '6px 8px',
    borderBottom: '1px solid #e8edf5',
    color: '#333',
  } as React.CSSProperties,

  tdRight: {
    textAlign: 'right' as const,
    fontWeight: 700,
  } as React.CSSProperties,

  footer: {
    marginTop: '24px',
    borderTop: '1px solid #dde3ed',
    paddingTop: '12px',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    fontSize: '8.5px',
    color: '#888',
  } as React.CSSProperties,

  sigLine: {
    width: '150px',
    borderTop: '1px solid #aaa',
    paddingTop: '4px',
    textAlign: 'center' as const,
    fontSize: '8.5px',
    color: '#555',
  } as React.CSSProperties,
};

export const PrintReport: React.FC<PrintReportProps> = ({ report }) => {
  const { type, title, data } = report;

  const isLandscape = type === 'outstanding-dues';

  const todayStr = new Date().toLocaleDateString('en-IN', {
    year: 'numeric', month: 'long', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  });

  const pageStyle: React.CSSProperties = {
    ...S.page,
    ...(isLandscape ? S.pageLandscape : {}),
  };

  /* ── Branded header ── */
  const Header = (
    <>
      <div style={S.headerRow}>
        <div style={{ width: '170px', flexShrink: 0 }}>
          <img
            src={logoPath}
            alt={`${brand.schoolName} logo`}
            style={{ width: '100%', objectFit: 'contain' }}
          />
        </div>
        <div>
          <div style={S.schoolName}>{SCHOOL_NAME}</div>
          <div style={{ fontSize: '10px', fontWeight: 700, color: '#d08c16', marginTop: '3px' }}>{SCHOOL_MEDIUM}</div>
          <div style={{ fontSize: '9.5px', color: '#555', marginTop: '2px' }}>{SCHOOL_ADDRESS}</div>
          <div style={{ fontSize: '9.5px', color: '#555', marginTop: '1px' }}>Ph: {SCHOOL_PHONE} &nbsp;|&nbsp; {SCHOOL_EMAIL} &nbsp;|&nbsp; {SCHOOL_WEBSITE}</div>
        </div>
      </div>
      <div style={S.ruleGold} />
      <div style={S.ruleNavy} />
      <div style={S.titleBar}>{title.toUpperCase()}</div>
      <div style={S.generatedAt}>Generated: {todayStr}</div>
    </>
  );

  /* ── Footer ── */
  const Footer = (
    <div style={S.footer}>
      <div>
        <div style={{ fontWeight: 700, color: '#555', fontSize: '9px' }}>{brand.productName} Administration System</div>
        <div style={{ fontSize: '8px', color: '#aaa' }}>Securely verified via Digital Ledger Access Protocol</div>
      </div>
      <div style={S.sigLine}>
        Authorised Signature<br />
        <span style={{ fontSize: '8px', color: '#aaa' }}>Office of the School Principal</span>
      </div>
    </div>
  );

  /* ================================================================ */
  /* 1. DAILY COLLECTIONS                                              */
  /* ================================================================ */
  if (type === 'daily-collections') {
    const avgDue = data.studentCount > 0
      ? Math.round(data.totalCollected / data.studentCount)
      : 0;
    void avgDue;

    return (
      <div style={pageStyle}>
        {Header}
        <div style={{ ...S.summaryGrid, gridTemplateColumns: 'repeat(4,1fr)' }}>
          {[
            { label: 'Total Collected', val: `₹${(data.totalCollected || 0).toLocaleString('en-IN')}` },
            { label: 'Cash', val: `₹${(data.cashCollected || 0).toLocaleString('en-IN')}` },
            { label: 'Online / UPI', val: `₹${(data.onlineCollected || 0).toLocaleString('en-IN')}` },
            { label: 'Cheque', val: `₹${(data.chequeCollected || 0).toLocaleString('en-IN')}` },
          ].map((s, i) => (
            <div key={i}>
              <div style={S.statLabel}>{s.label}</div>
              <div style={S.statVal}>{s.val}</div>
            </div>
          ))}
        </div>

        <table style={S.table}>
          <thead>
            <tr>
              {['S.No', 'Code', 'Student Name', 'Class & Medium', 'Fee Category', 'Method', 'Time', 'Amount'].map((h, i) => (
                <th key={i} style={{ ...S.th, ...(i === 7 ? S.thRight : {}) }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(data.transactions || []).map((t: any, idx: number) => (
              <tr key={t.id} style={{ background: idx % 2 === 0 ? 'rgba(0,0,0,0.018)' : 'transparent' }}>
                <td style={S.td}>{idx + 1}</td>
                <td style={{ ...S.td, fontFamily: 'monospace', color: '#555' }}>{t.studentCode}</td>
                <td style={{ ...S.td, fontWeight: 700 }}>{t.studentName}</td>
                <td style={S.td}>{t.classInfo}</td>
                <td style={S.td}>{(t.feeType || '').replace(/\n/g, ', ')}</td>
                <td style={{ ...S.td, fontWeight: 700, textTransform: 'uppercase' }}>{t.method}</td>
                <td style={{ ...S.td, color: '#666' }}>{t.time}</td>
                <td style={{ ...S.td, ...S.tdRight, color: '#134e4a' }}>₹{(t.amount || 0).toLocaleString('en-IN')}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {Footer}
      </div>
    );
  }

  /* ================================================================ */
  /* 2. OUTSTANDING DUES (landscape)                                   */
  /* ================================================================ */
  if (type === 'outstanding-dues') {
    const avgDue = data.studentCount > 0
      ? Math.round(data.totalOutstandingAmount / data.studentCount)
      : 0;

    return (
      <div style={pageStyle}>
        {Header}
        <div style={{ ...S.summaryGrid, gridTemplateColumns: 'repeat(4,1fr)' }}>
          {[
            { label: 'Total Outstanding', val: `₹${(data.totalOutstandingAmount || 0).toLocaleString('en-IN')}`, color: '#dc2626' },
            { label: 'Students with Dues', val: `${data.studentCount || 0}`, color: undefined },
            { label: 'Avg. Dues / Student', val: `₹${avgDue.toLocaleString('en-IN')}`, color: undefined },
            { label: 'Aging (1M / 2M / 3M+)', val: `${data.oneDueCount || 0} / ${data.twoDueCount || 0} / ${data.threePlusDueCount || 0}`, color: undefined },
          ].map((s, i) => (
            <div key={i}>
              <div style={S.statLabel}>{s.label}</div>
              <div style={{ ...S.statVal, ...(s.color ? { color: s.color } : {}) }}>{s.val}</div>
            </div>
          ))}
        </div>

        <table style={S.table}>
          <thead>
            <tr>
              {['S.No', 'Code', 'Student Name', 'Class', 'Parent Name', 'Mobile', 'Overdue', 'Edu Dues', 'Trans Dues', 'Total Due'].map((h, i) => (
                <th key={i} style={{ ...S.th, ...(i >= 7 ? S.thRight : {}) }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(data.students || []).map((s: any, idx: number) => (
              <tr key={s.id} style={{ background: idx % 2 === 0 ? 'rgba(0,0,0,0.018)' : 'transparent' }}>
                <td style={S.td}>{idx + 1}</td>
                <td style={{ ...S.td, fontFamily: 'monospace', color: '#555' }}>{s.studentCode}</td>
                <td style={{ ...S.td, fontWeight: 700 }}>{s.studentName}</td>
                <td style={S.td}>{s.classInfo}</td>
                <td style={S.td}>{s.parentName}</td>
                <td style={{ ...S.td, color: '#666' }}>{s.parentMobile}</td>
                <td style={{ ...S.td, fontWeight: 700 }}>{s.overdueCount} Months</td>
                <td style={{ ...S.td, ...S.tdRight, color: '#ea580c' }}>₹{(s.educationDue || 0).toLocaleString('en-IN')}</td>
                <td style={{ ...S.td, ...S.tdRight, color: '#d97706' }}>₹{(s.transportDue || 0).toLocaleString('en-IN')}</td>
                <td style={{ ...S.td, ...S.tdRight, color: '#134e4a', fontSize: '10px' }}>₹{(s.totalDue || 0).toLocaleString('en-IN')}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {Footer}
      </div>
    );
  }

  /* ================================================================ */
  /* 3. RTE RECONCILE                                                  */
  /* ================================================================ */
  if (type === 'rte-reconcile') {
    return (
      <div style={pageStyle}>
        {Header}
        <div style={{ ...S.summaryGrid, gridTemplateColumns: 'repeat(2,1fr)' }}>
          {[
            { label: 'Total RTE Enrolled', val: `${data.studentCount || 0} Students`, color: undefined },
            { label: 'Total Exempted Tuition Fee', val: `₹${(data.totalExemptedAmount || 0).toLocaleString('en-IN')}`, color: '#4338ca' },
          ].map((s, i) => (
            <div key={i}>
              <div style={S.statLabel}>{s.label}</div>
              <div style={{ ...S.statVal, ...(s.color ? { color: s.color } : {}) }}>{s.val}</div>
            </div>
          ))}
        </div>

        <table style={S.table}>
          <thead>
            <tr>
              {['S.No', 'Code', 'Student Name', 'Class & Section', 'Parent Name', 'Mobile', 'Exempted Amount'].map((h, i) => (
                <th key={i} style={{ ...S.th, ...(i === 6 ? S.thRight : {}) }}>{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {(data.students || []).map((s: any, idx: number) => (
              <tr key={s.id} style={{ background: idx % 2 === 0 ? 'rgba(0,0,0,0.018)' : 'transparent' }}>
                <td style={S.td}>{idx + 1}</td>
                <td style={{ ...S.td, fontFamily: 'monospace', color: '#555' }}>{s.studentCode}</td>
                <td style={{ ...S.td, fontWeight: 700 }}>{s.studentName}</td>
                <td style={S.td}>{s.classInfo}</td>
                <td style={S.td}>{s.parentName}</td>
                <td style={{ ...S.td, color: '#666' }}>{s.parentMobile}</td>
                <td style={{ ...S.td, ...S.tdRight, color: '#4338ca', fontSize: '10px' }}>₹{(s.exemptedAmount || 0).toLocaleString('en-IN')}</td>
              </tr>
            ))}
          </tbody>
        </table>

        {Footer}
      </div>
    );
  }

  return null;
};