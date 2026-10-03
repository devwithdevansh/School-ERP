/**
 * printUtils.ts
 * ─────────────────────────────────────────────────────────────────────────────
 * Premium print engine (school details come from config/brand.ts).
 *
 * KEY FIX: Images are fetched and converted to base64 data URIs so they are
 * embedded directly in the HTML string — no network requests from the iframe,
 * which means logos always load correctly in both dev and production.
 *
 * Architecture:
 *  - fetchAsBase64(url)     → converts any asset URL to a data URI
 *  - generateReceiptHTML()  → premium A4 receipt HTML with embedded images
 *  - generateReportHTML()   → branded A4/landscape report HTML
 *  - printHTML(html)        → injects into hidden iframe → iframe.print()
 * ─────────────────────────────────────────────────────────────────────────────
 */
import { brand } from '../config/brand';

import type { PaymentTransaction } from "../mockData";

// ─── Image → Base64 ───────────────────────────────────────────────────────────

/**
 * Fetch any URL (Vite-resolved asset path) and return a base64 data URI.
 * Returns empty string on failure so print still works without the logo.
 */
export async function fetchAsBase64(url: string): Promise<string> {
  try {
    const resp = await fetch(url);
    if (!resp.ok) return "";
    const blob = await resp.blob();
    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  } catch {
    return "";
  }
}

// ─── Text helpers ─────────────────────────────────────────────────────────────

function toIndianWords(amount: number): string {
  const parts = amount.toFixed(2).split(".");
  const rupees = parseInt(parts[0], 10);
  const paise = parseInt(parts[1], 10);

  const convertPart = (num: number): string => {
    if (num === 0) return "";
    const ones = [
      "",
      "One",
      "Two",
      "Three",
      "Four",
      "Five",
      "Six",
      "Seven",
      "Eight",
      "Nine",
      "Ten",
      "Eleven",
      "Twelve",
      "Thirteen",
      "Fourteen",
      "Fifteen",
      "Sixteen",
      "Seventeen",
      "Eighteen",
      "Nineteen",
    ];
    const tens = [
      "",
      "",
      "Twenty",
      "Thirty",
      "Forty",
      "Fifty",
      "Sixty",
      "Seventy",
      "Eighty",
      "Ninety",
    ];

    const below100 = (n: number): string =>
      n < 20
        ? ones[n]
        : tens[Math.floor(n / 10)] + (n % 10 ? " " + ones[n % 10] : "");

    const below1000 = (n: number): string =>
      n < 100
        ? below100(n)
        : ones[Math.floor(n / 100)] +
        " Hundred" +
        (n % 100 ? " " + below100(n % 100) : "");

    let result = "";
    let n = num;
    const crore = Math.floor(n / 10_000_000);
    n %= 10_000_000;
    const lakh = Math.floor(n / 100_000);
    n %= 100_000;
    const thousand = Math.floor(n / 1_000);
    n %= 1_000;

    if (crore) result += below1000(crore) + " Crore ";
    if (lakh) result += below1000(lakh) + " Lakh ";
    if (thousand) result += below1000(thousand) + " Thousand ";
    if (n) result += below1000(n);

    return result.trim();
  };

  if (rupees === 0 && paise === 0) return "Zero Rupees Only";

  let words = "";
  if (rupees > 0) {
    words += convertPart(rupees) + " Rupees";
  }
  if (paise > 0) {
    if (rupees > 0) words += " and ";
    words += convertPart(paise) + " Paise";
  }
  return words + " Only";
}

function modeLabel(method: string): string {
  const m = (method || "").toLowerCase();
  if (m === "cash") return "Cash";
  if (m === "upi") return "UPI / Online";
  if (m === "online") return "Online Transfer";
  if (m === "cheque") return "Cheque";
  if (["neft", "rtgs", "imps"].includes(m)) return m.toUpperCase();
  return method ? method.charAt(0).toUpperCase() + method.slice(1) : "N/A";
}

function inr(n: number): string {
  return Math.abs(n).toLocaleString("en-IN");
}

export interface SubItem {
  id?: string;
  description: string;
  amount: number;
  concessionAmount: number;
  method?: string;
  status?: string;
}

export function groupSubItems(items: SubItem[]): SubItem[] {
  if (!items || items.length === 0) return [];

  const MONTH_ORDER = [
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
    "January",
    "February",
    "March",
  ];

  const groups: { [key: string]: { items: SubItem[]; months: string[] } } = {};

  for (const item of items) {
    const match = item.description?.match(
      /^(.+?)\s*-\s*(January|February|March|April|May|June|July|August|September|October|November|December)$/i,
    );
    if (match) {
      const rawPrefix = match[1].trim();
      const rawMonth =
        match[2].charAt(0).toUpperCase() + match[2].slice(1).toLowerCase();
      if (!groups[rawPrefix]) {
        groups[rawPrefix] = { items: [], months: [] };
      }
      groups[rawPrefix].items.push(item);
      groups[rawPrefix].months.push(rawMonth);
    } else {
      const desc = (item.description || "General Fee").trim();
      if (!groups[desc]) {
        groups[desc] = { items: [], months: [] };
      }
      groups[desc].items.push(item);
    }
  }

  const result: SubItem[] = [];

  for (const key of Object.keys(groups)) {
    const g = groups[key];
    if (g.months.length > 0) {
      g.months.sort((a, b) => MONTH_ORDER.indexOf(a) - MONTH_ORDER.indexOf(b));
      const startMonth = g.months[0];
      const endMonth = g.months[g.months.length - 1];

      const totalAmt = g.items.reduce((sum, x) => sum + x.amount, 0);
      const totalConcession = g.items.reduce(
        (sum, x) => sum + x.concessionAmount,
        0,
      );
      const first = g.items[0];

      const description =
        startMonth === endMonth
          ? `${key} - ${startMonth}`
          : `${key} - ${startMonth} to ${endMonth}`;

      result.push({
        description,
        amount: totalAmt,
        concessionAmount: totalConcession,
        method: first.method,
        status: first.status,
      });
    } else {
      if (g.items.length === 1) {
        result.push(g.items[0]);
      } else {
        const totalAmt = g.items.reduce((sum, x) => sum + x.amount, 0);
        const totalConcession = g.items.reduce(
          (sum, x) => sum + x.concessionAmount,
          0,
        );
        const first = g.items[0];
        result.push({
          description: key,
          amount: totalAmt,
          concessionAmount: totalConcession,
          method: first.method,
          status: first.status,
        });
      }
    }
  }

  return result;
}

// ─── School constants ─────────────────────────────────────────────────────────

const esc = (v: string) => v.replace(/&/g, "&amp;").replace(/</g, "&lt;");
const SCH = {
  name: esc(brand.schoolName.toUpperCase()),
  medium: esc(brand.medium),
  address: esc(brand.address),
  phone: esc(brand.phone),
  email: esc(brand.email),
};

// ─── Shared base CSS ──────────────────────────────────────────────────────────

const BASE_CSS = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&family=Outfit:wght@400;500;600;700;800;900&family=JetBrains+Mono:wght@400;600;700&display=swap');

* { box-sizing: border-box; margin: 0; padding: 0; }
body {
  font-family: 'Inter', system-ui, -apple-system, sans-serif;
  font-size: 11px;
  color: #1e293b;
  background: #fff;
  -webkit-print-color-adjust: exact !important;
  print-color-adjust: exact !important;
}
table { border-collapse: collapse; }
`;

// ─── Premium Receipt HTML ─────────────────────────────────────────────────────

export function generateReceiptHTML(
  transaction: PaymentTransaction,
  opts: {
    currentUserName?: string;
    logoBase64?: string;
    watermarkBase64?: string;
  },
): string {
  const { currentUserName, logoBase64 = "", watermarkBase64 = "" } = opts;

  const totalAmount = Math.abs(transaction.amount);
  const words = toIndianWords(totalAmount);
  const mode = modeLabel(transaction.method || "");
  const receiptNo = transaction.receiptNumber 
    ? transaction.receiptNumber.toString() 
    : (transaction.id?.slice(-12).toUpperCase() || "N/A");

  const period = (() => {
    if (transaction.studentCode) {
      const match = transaction.studentCode?.match(/\/(\d{4})-(\d{2})\//);
      if (match) {
        const startYear = match[1];
        const endYear = startYear.slice(0, 2) + match[2];
        return `${startYear} – ${endYear}`;
      }
    }
    const yearPart = transaction.date
      ? new Date(transaction.date).getFullYear()
      : new Date().getFullYear();
    return `${yearPart} – ${yearPart + 1}`;
  })();

  const dateStr = transaction.date
    ? new Date(transaction.date).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    })
    : new Date().toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "long",
      year: "numeric",
    });

  const timeStr =
    transaction.time ||
    new Date().toLocaleTimeString("en-IN", {
      hour: "2-digit",
      minute: "2-digit",
    });

  // Fee rows
  const feeRows = (() => {
    if (transaction.subItems?.length) {
      const grouped = groupSubItems(transaction.subItems);
      return grouped
        .map(
          (item, i) => `
        <tr style="background:${i % 2 === 0 ? "rgba(248,250,253,0.7)" : "rgba(255,255,255,0.75)"};page-break-inside:avoid;">
          <td style="padding:7px 12px;color:#64748b;text-align:center;width:36px;border-right:1px solid #e2e8f4;font-family:'JetBrains Mono',monospace;">${i + 1}</td>
          <td style="padding:7px 12px;color:#1e293b;font-weight:600;border-right:1px solid #e2e8f4;">
            ${item.description}
            ${item.concessionAmount > 0 ? `<span style="display:inline-block;margin-left:8px;font-size:9px;color:#b45309;background:rgba(254,243,199,0.85);border:1px solid rgba(252,211,77,0.5);padding:2px 8px;border-radius:9999px;font-weight:700;font-family:'Inter',sans-serif;">-${item.concessionAmount.toLocaleString("en-IN")} &nbsp;₹ off</span>` : ""}
          </td>
          <td style="padding:7px 12px;color:#475569;text-align:center;border-right:1px solid #e2e8f4;width:110px;">${modeLabel(item.method || transaction.method || "")}</td>
          <td style="padding:7px 12px;text-align:right;color:#134e4a;font-weight:700;width:120px;font-family:'JetBrains Mono',monospace;white-space:nowrap;">${inr(item.amount)} &nbsp;₹</td>
        </tr>
      `,
        )
        .join("");
    }
    return `
      <tr style="background:rgba(248,250,253,0.7);page-break-inside:avoid;">
        <td style="padding:7px 12px;color:#64748b;text-align:center;width:36px;border-right:1px solid #e2e8f4;font-family:'JetBrains Mono',monospace;">1</td>
        <td style="padding:7px 12px;color:#1e293b;font-weight:600;border-right:1px solid #e2e8f4;">${transaction.feeType || "Fee Collection"}</td>
        <td style="padding:7px 12px;color:#475569;text-align:center;border-right:1px solid #e2e8f4;width:110px;">${mode}</td>
        <td style="padding:7px 12px;text-align:right;color:#134e4a;font-weight:700;width:120px;font-family:'JetBrains Mono',monospace;white-space:nowrap;">${inr(totalAmount)} &nbsp;₹</td>
      </tr>
    `;
  })();

  const concessionRow =
    !transaction.subItems && transaction.concessionAmount
      ? `
    <tr style="background:rgba(255,251,235,0.7);page-break-inside:avoid;">
      <td style="padding:7px 12px;border-right:1px solid #e2e8f4;font-family:'JetBrains Mono',monospace;"></td>
      <td style="padding:7px 12px;color:#b45309;font-style:italic;font-weight:700;border-right:1px solid #e2e8f4;">
        ✦ Concession Applied
      </td>
      <td style="border-right:1px solid #e2e8f4;"></td>
      <td style="padding:7px 12px;text-align:right;color:#b45309;font-weight:700;font-family:'JetBrains Mono',monospace;white-space:nowrap;">−${(transaction.concessionAmount || 0).toLocaleString("en-IN")} &nbsp;₹</td>
    </tr>
  `
      : "";

  const signerName = currentUserName
    ? currentUserName.toUpperCase()
    : "AUTHORISED SIGNATORY";

  const logoImg = logoBase64
    ? `<img src="${logoBase64}" alt="Logo" style="max-width:100%;max-height:100%;object-fit:contain;display:block;margin:0 auto;" />`
    : "";

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Payment Receipt — ${transaction.studentName}</title>
  <style>
    ${BASE_CSS}
    @page { size: A4 portrait; margin: 0; }

    body {
      padding: 0;
      margin: 0;
      width: 210mm;
      height: 297mm;
      background: #fff;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }

    .receipt-container {
      width: 210mm;
      height: 148mm;
      position: relative;
      display: flex;
      flex-direction: column;
      overflow: hidden;
    }

    .content-wrapper {
      position: relative;
      z-index: 2;
      flex: 1;
      display: flex;
      flex-direction: column;
      box-sizing: border-box;
      padding: 10px 10mm 45px;
      background: transparent;
    }

    /* ── Two-column info grid ── */
    .info-grid {
      display: grid; grid-template-columns: 1fr 1fr;
      gap: 8px;
      margin-bottom: 4px;
      page-break-inside: avoid;
    }
    .info-col {
      padding: 6px 10px;
      border: 1px solid rgba(226, 232, 240, 0.8);
      border-radius: 6px;
    }
    .info-col:first-child {
      background: rgba(248, 250, 253, 0.65); /* Semi-transparent */
    }
    .info-col:last-child {
      background: rgba(255, 255, 255, 0.65); /* Semi-transparent */
    }
    .info-col-header {
      font-family: 'Outfit', sans-serif;
      font-size: 8.5px; font-weight: 800; color: #134e4a;
      letter-spacing: 1.2px; text-transform: uppercase;
      border-bottom: 2px solid #e8a020;
      padding-bottom: 4px; margin-bottom: 6px;
    }
    .info-row { display: flex; gap: 8px; margin-bottom: 3px; align-items: baseline; }
    .info-label { font-family: 'Outfit', sans-serif; font-size: 8px; font-weight: 700; color: #64748b; width: 72px; flex-shrink: 0; text-transform: uppercase; letter-spacing: 0.8px; }
    .info-value { font-size: 8px; font-weight: 600; color: #1e293b; flex: 1; }

    /* ── Section header ── */
    .section-hd {
      display: flex; align-items: center; gap: 8px;
      margin-bottom: 4px;
      page-break-after: avoid;
    }
    .section-hd-bar { width: 4px; height: 14px; background: #e8a020; border-radius: 2px; flex-shrink: 0; }
    .section-hd-text { font-family: 'Outfit', sans-serif; font-size: 10px; font-weight: 800; color: #134e4a; letter-spacing: 0.8px; text-transform: uppercase; }

    /* ── Fee table ── */
    .fee-table { width: 100%; margin-bottom: 0; border: 1px solid rgba(226, 232, 240, 0.8); border-radius: 6px; overflow: hidden; }
    .fee-table thead tr { background: linear-gradient(135deg, #134e4a 0%, #2a5298 100%); }
    .fee-table thead th { font-family: 'Outfit', sans-serif; padding: 5px 8px; color: #fff; font-size: 9px; font-weight: 700; text-align: left; letter-spacing: 0.8px; text-transform: uppercase; }
    .fee-table thead th:last-child { text-align: right; }
    .fee-table tbody td { padding: 5px 8px; }
    .fee-table tbody tr { border-bottom: 1px solid #e8edf8; }
    .fee-table tbody tr:last-child { border-bottom: none; }
    .fee-table tfoot tr { background: linear-gradient(to bottom, #e8a020, #d97706); }
    .fee-table tfoot td { padding: 10px 12px; color: #134e4a; font-weight: 800; font-family: 'Outfit', sans-serif; border-bottom: 3px double #134e4a; }
    .fee-table tfoot td.total-label { font-size: 10.5px; letter-spacing: 2px; text-transform: uppercase; }
    .fee-table tfoot td.total-amt { text-align: right; font-size: 14px; color: #134e4a; font-family: 'JetBrains Mono', monospace; white-space: nowrap; }

    /* ── Words box ── */
    .words-box {
      margin-top: 14px;
      border-left: 4px solid #e8a020;
      background: linear-gradient(to right, rgba(255, 251, 240, 0.85), rgba(255, 255, 255, 0.85)); /* Semi-transparent */
      padding: 10px 16px;
      border-radius: 0 6px 6px 0;
      font-size: 10px; color: #334155;
      border-top: 1px solid rgba(226, 232, 240, 0.3);
      border-bottom: 1px solid rgba(226, 232, 240, 0.3);
      border-right: 1px solid rgba(226, 232, 240, 0.3);
      page-break-inside: avoid;
    }

    /* ── Remark box ── */
    .remark-box {
      margin-top: 10px;
      border-left: 4px solid #94a3b8;
      background: rgba(248, 250, 253, 0.85); /* Semi-transparent */
      padding: 9px 16px;
      border-radius: 0 6px 6px 0;
      font-size: 8px; color: #475569; font-style: italic;
      border-top: 1px solid rgba(226, 232, 240, 0.3);
      border-bottom: 1px solid rgba(226, 232, 240, 0.3);
      border-right: 1px solid rgba(226, 232, 240, 0.3);
      page-break-inside: avoid;
    }

    /* ── Signature section ── */
    .sig-section {
      display: flex; justify-content: space-between; align-items: flex-end;
      margin-top: auto;
      padding-top: 24px;
      page-break-inside: avoid;
    }
    .sig-block { text-align: center; }
    .sig-name { font-family: 'Outfit', sans-serif; font-size: 10.5px; font-weight: 700; color: #134e4a; margin-bottom: 30px; letter-spacing: 0.5px; }
    .sig-line { width: 170px; border-top: 1.5px solid #94a3b8; padding-top: 6px; }
    .sig-sub { font-family: 'Outfit', sans-serif; font-size: 8.5px; color: #94a3b8; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; }
    .stamp-box {
      width: 76px; height: 76px;
      border: 2px double #cbd5e1;
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      color: #cbd5e1; font-size: 8px; font-weight: 800;
      text-align: center; line-height: 1.3;
      font-family: 'Outfit', sans-serif;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
  </style>
</head>
<body>
  <div class="receipt-container">
  <!-- WATERMARK CONTAINER (Rendered at z-index: 1, under content at z-index: 2) -->
  ${watermarkBase64
      ? `
  <div style="position: absolute; top: 0; left: 0; width: 210mm; height: 148mm; z-index: 1; pointer-events: none; display: flex; align-items: center; justify-content: center; overflow: hidden;">
    <img src="${watermarkBase64}" style="width: 460px; height: 460px; opacity: 0.08; transform: rotate(-12deg); object-fit: contain;" />
  </div>
  `
      : ""
    }

  <!-- ════ HEADER WITH WAVE/CURVED BLOCK OVERLAPS ════ -->
  <div class="header-container" style="position: relative; height: 130px; width: 100%; overflow: hidden; background: #fff; page-break-inside: avoid; z-index: 3;">
    <!-- Right Gold Block (Shorter, tucked behind) -->
    <div style="position: absolute; top: 0; right: 0; width: 48%; height: 96px; background: #e8a020; z-index: 1; display: flex; flex-direction: column; align-items: flex-end; justify-content: center; padding-right: 28px; color: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact;">
      <div style="font-size: 28px; font-weight: 900; letter-spacing: 3px; text-transform: uppercase; color: #fff; line-height: 1; text-shadow: 1px 1px 3px rgba(0,0,0,0.18);">RECEIPT</div>
      <div style="font-size: 8px; color: #134e4a; font-weight: 700; margin-top: 8px; text-align: right; background: rgba(255,255,255,0.92); padding: 3px 8px; border-radius: 4px; box-shadow: 0 2px 4px rgba(0,0,0,0.08);">
        NO: <span style="font-family: 'JetBrains Mono', monospace; font-size: 10.5px; font-weight: 900; color: #134e4a; letter-spacing: 0.5px;">${receiptNo}</span>
      </div>
    </div>

    <!-- Left Navy Block (Full height, overlapping, with bottom-right curve) -->
    <div style="position: absolute; top: 0; left: 0; width: 65%; height: 130px; background: #134e4a; z-index: 2; border-bottom-right-radius: 40px; display: flex; align-items: center; padding-left: 28px; color: #fff; -webkit-print-color-adjust: exact; print-color-adjust: exact;">
      <div style="width: 80px; height: 80px; border-radius: 50%; background: #fff; padding: 6px; display: flex; align-items: center; justify-content: center; box-shadow: 0 4px 12px rgba(0,0,0,0.2); margin-right: 18px; flex-shrink: 0; overflow: hidden;">
        ${logoImg}
      </div>
      <div style="display: flex; flex-direction: column; gap: 5px;">
        <div style="font-size: 20px; font-weight: 900; letter-spacing: 0.5px; line-height: 1.1; color: #fff;">${SCH.name}</div>
        <div style="font-size: 11px; font-weight: 700; color: #fcd34d; letter-spacing: 0.4px;">English &amp; Gujarati Medium</div>
        <div style="font-size: 8px; color: #e2e8f0; line-height: 1.5;">
          ${SCH.address}<br/>
          Ph: ${SCH.phone} &nbsp;·&nbsp; ${SCH.email}
        </div>
      </div>
    </div>
  </div>

  <div class="content-wrapper">

      <!-- ════ INFO GRID ════ -->
      <div class="info-grid">
        <div class="info-col">
          <div class="info-col-header">Student Information</div>
          <div class="info-row"><span class="info-label">Name</span><span class="info-value" style="font-size: 12px; color: #134e4a; font-weight: 700;">${transaction.studentName}</span></div>
          ${transaction.classInfo ? `<div class="info-row"><span class="info-label">Class</span><span class="info-value">${transaction.classInfo}</span></div>` : ""}
          <div class="info-row"><span class="info-label">Period</span><span class="info-value">${period}</span></div>
        </div>
        <div class="info-col">
          <div class="info-col-header">Payment Information</div>
          <div class="info-row"><span class="info-label">Date</span><span class="info-value">${dateStr}</span></div>
          <div class="info-row"><span class="info-label">Time</span><span class="info-value">${timeStr}</span></div>
          <div class="info-row"><span class="info-label">Status</span><span class="info-value" style="color:#16a34a;font-weight:700;">Payment Received</span></div>
        </div>
      </div>

      <!-- ════ FEE TABLE ════ -->
      <div class="section-hd">
        <div class="section-hd-bar"></div>
        <div class="section-hd-text">Payment Details</div>
      </div>

      <table class="fee-table">
        <thead>
          <tr>
            <th style="width:36px;text-align:center;">#</th>
            <th>Description</th>
            <th style="width:110px;text-align:center;">Mode</th>
            <th style="width:110px;text-align:right;">Amount (₹)</th>
          </tr>
        </thead>
        <tbody>
          ${feeRows}
          ${concessionRow}
        </tbody>
        <tfoot>
          <tr>
            <td colspan="3" class="total-label">Total Paid</td>
            <td class="total-amt">${inr(totalAmount)} ₹</td>
          </tr>
        </tfoot>
      </table>

      <!-- ════ AMOUNT IN WORDS ════ -->
      <div class="words-box">
        <strong>Amount in Words:</strong>&nbsp;<em>${words}</em>
      </div>

      ${transaction.remark
      ? `
      <div class="remark-box"><strong>Remark:</strong> ${transaction.remark}</div>
      `
      : ""
    }

      <!-- ════ SIGNATURE ════ -->
      <div class="sig-section" style="justify-content: flex-end;">
        <div class="sig-block">
          <div class="sig-name">${signerName}</div>
          <div class="sig-line">
            <div class="sig-sub">Authorised Signatory</div>
          </div>
        </div>
      </div>
  </div>

  <!-- ════ FOOTER WITH WAVE/CURVED BLOCK OVERLAPS ════ -->
  <div class="footer-container" style="position: absolute; bottom: 0; left: 0; height: 40px; width: 100%; overflow: hidden; background: #fff; page-break-inside: avoid; z-index: 10;">
    <!-- Left Gold Block (Shorter, tucked behind) -->
    <div style="position: absolute; bottom: 0; left: 0; width: 45%; height: 30px; background: #e8a020; z-index: 1; display: flex; align-items: center; padding-left: 20px; color: #134e4a; -webkit-print-color-adjust: exact; print-color-adjust: exact;">
      <span style="font-size: 11px; font-weight: 900; letter-spacing: 1px; text-transform: uppercase;">THANK YOU</span>
    </div>

    <!-- Right Navy Block (Full height, overlapping, with top-left curve) -->
    <div style="position: absolute; bottom: 0; right: 0; width: 70%; height: 40px; background: #134e4a; z-index: 2; border-top-left-radius: 35px; display: flex; align-items: center; justify-content: flex-end; padding-right: 25px; padding-left: 45px; color: #fff; font-size: 8px; -webkit-print-color-adjust: exact; print-color-adjust: exact;">
      <div style="display: flex; gap: 12px; font-weight: 600; align-items: center; letter-spacing: 0.5px; padding-left: 25px;">
        <span>📞 ${SCH.phone}</span>
        <span style="opacity: 0.4;">|</span>
        <span>✉️ ${SCH.email}</span>
        <span style="opacity: 0.4;">|</span>
        <span>🌐 ${esc(brand.website)}</span>
      </div>
    </div>
  </div>
  </div>
</body>
</html>`;
}

// ─── Premium Report HTML ──────────────────────────────────────────────────────

export function generateReportHTML(
  report: { type: string; title: string; data: any },
  opts: { logoBase64?: string } = {},
): string {
  const { type, title, data } = report;
  const { logoBase64 = "" } = opts;

  const isLandscape = type === "outstanding-dues";
  const todayStr = new Date().toLocaleDateString("en-IN", {
    year: "numeric",
    month: "long",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });

  const logoImg = logoBase64
    ? `<img src="${logoBase64}" alt="Logo" style="width:100%;height:100%;object-fit:contain;" />`
    : "";

  const headerHTML = `
    <div style="display:flex;align-items:center;gap:0;margin-bottom:0;page-break-inside:avoid;">
      <div style="width:90px;height:68px;flex-shrink:0;display:flex;align-items:center;justify-content:center;padding:4px 8px 4px 0;">
        ${logoImg}
      </div>
      <div style="width:3px;background:linear-gradient(to bottom,#e8a020,#134e4a);align-self:stretch;margin:3px 12px;border-radius:2px;"></div>
      <div style="flex:1;">
        <div style="font-size:20px;font-weight:900;color:#134e4a;letter-spacing:1px;">${SCH.name}</div>
        <div style="font-size:9.5px;font-weight:700;color:#b45309;margin-top:2px;">${SCH.medium}</div>
        <div style="font-size:9px;color:#64748b;margin-top:1px;">${SCH.address}</div>
      </div>
    </div>
    <div style="height:3px;background:linear-gradient(to right,#e8a020,#d08c16,#e8a020);margin:8px 0 2px;"></div>
    <div style="height:1.5px;background:#134e4a;margin-bottom:12px;"></div>
    <div style="background:linear-gradient(135deg,#134e4a 0%,#2a5298 100%);padding:9px 14px;border-radius:4px;display:flex;justify-content:space-between;align-items:center;margin-bottom:5px;">
      <div style="font-size:13px;font-weight:800;color:#fff;letter-spacing:3px;text-transform:uppercase;">${title}</div>
      <div style="font-size:8.5px;color:rgba(255,255,255,0.75);">Generated: ${todayStr}</div>
    </div>
  `;

  const statCard = (label: string, val: string, color = "#1a1a2e") => `
    <div style="border:1px solid #dde4f0;border-radius:6px;padding:8px 12px;background:#f8fafd;">
      <div style="font-size:8px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:0.8px;">${label}</div>
      <div style="font-size:14px;font-weight:800;color:${color};margin-top:3px;">${val}</div>
    </div>
  `;

  const thStyle = `padding:8px 9px;background:linear-gradient(135deg,#134e4a 0%,#2a5298 100%);color:#fff;font-size:9px;font-weight:700;text-align:left;white-space:nowrap;`;
  const thRStyle = `${thStyle}text-align:right;`;
  const tdStyle = `padding:6px 9px;border-bottom:1px solid #e8edf8;font-size:9.5px;color:#334155;`;
  const tdRStyle = `${tdStyle}text-align:right;font-weight:700;`;

  const footerHTML = `
    <div style="margin-top:20px;border-top:1px solid #e2e8f0;padding-top:10px;display:flex;justify-content:space-between;align-items:flex-end;page-break-inside:avoid;">
      <div style="font-size:8.5px;color:#94a3b8;font-style:italic;">
        <strong style="color:#134e4a;">${esc(brand.productName)}</strong> — School Administration System<br/>
        This report is system-generated. Verify figures with the school office.
      </div>
      <div style="width:140px;border-top:1px solid #94a3b8;padding-top:5px;text-align:center;font-size:8.5px;color:#64748b;">
        Authorised Signature<br/><span style="font-size:7.5px;color:#94a3b8;">Office of the School Principal</span>
      </div>
    </div>
  `;

  let bodyHTML = "";

  if (type === "daily-collections") {
    const rows = (data.transactions || [])
      .map(
        (t: any, i: number) => `
      <tr style="background:${i % 2 === 0 ? "#f8fafd" : "#fff"};page-break-inside:avoid;">
        <td style="${tdStyle}color:#94a3b8;text-align:center;">${i + 1}</td>
        <td style="${tdStyle}font-family:monospace;font-size:9px;color:#64748b;">${t.studentCode || "—"}</td>
        <td style="${tdStyle}font-weight:700;">${t.studentName}</td>
        <td style="${tdStyle}">${t.classInfo || "—"}</td>
        <td style="${tdStyle}">${(t.feeType || "").replace(/\n/g, ", ")}</td>
        <td style="${tdStyle}font-weight:700;text-transform:uppercase;">${t.method || "—"}</td>
        <td style="${tdStyle}color:#64748b;">${t.time || "—"}</td>
        <td style="${tdRStyle}color:#134e4a;">₹${(t.amount || 0).toLocaleString("en-IN")}</td>
      </tr>
    `,
      )
      .join("");

    const netCash = Math.max(0, (data.cashCollected || 0) - (data.cashExpenses || 0));

    let expensesHTML = "";
    if (data.expenses && data.expenses.length > 0) {
      const expRows = data.expenses.map((exp: any, i: number) => `
        <tr style="background:${i % 2 === 0 ? "#fff5f5" : "#fff"};page-break-inside:avoid;">
          <td style="${tdStyle}color:#94a3b8;text-align:center;">${i + 1}</td>
          <td style="${tdStyle}font-weight:700;color:#dc2626;">${exp.title}</td>
          <td style="${tdStyle}">${exp.category}</td>
          <td style="${tdStyle}font-weight:700;text-transform:uppercase;">${exp.paymentMethod}</td>
          <td style="${tdStyle}color:#64748b;">${exp.description || "—"}</td>
          <td style="${tdRStyle}color:#dc2626;">₹${(exp.amount || 0).toLocaleString("en-IN")}</td>
        </tr>
      `).join("");

      expensesHTML = `
        <h4 style="margin:20px 0 10px 0;color:#134e4a;font-size:12px;">Daily Expenses</h4>
        <table style="width:100%;border-collapse:collapse;border:1px solid #dde4f0;border-radius:6px;overflow:hidden;margin-bottom:14px;">
          <thead><tr style="background:#f1f5f9;">
            <th style="${thStyle}width:32px;text-align:center;">#</th>
            <th style="${thStyle}">Title</th>
            <th style="${thStyle}">Category</th>
            <th style="${thStyle}">Method</th>
            <th style="${thStyle}">Description</th>
            <th style="${thRStyle}">Amount</th>
          </tr></thead>
          <tbody>${expRows}</tbody>
        </table>
      `;
    }

    bodyHTML = `
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:14px;">
        ${statCard("Total Collected", `₹${(data.totalCollected || 0).toLocaleString("en-IN")}`, "#134e4a")}
        ${statCard("Net Cash", `₹${netCash.toLocaleString("en-IN")}`)}
        ${statCard("Online / UPI", `₹${(data.onlineCollected || 0).toLocaleString("en-IN")}`)}
        ${statCard("Cheque", `₹${(data.chequeCollected || 0).toLocaleString("en-IN")}`)}
      </div>
      <table style="width:100%;border-collapse:collapse;border:1px solid #dde4f0;border-radius:6px;overflow:hidden;">
        <thead><tr>
          <th style="${thStyle}width:32px;text-align:center;">#</th>
          <th style="${thStyle}">Code</th><th style="${thStyle}">Student Name</th>
          <th style="${thStyle}">Class</th><th style="${thStyle}">Fee Category</th>
          <th style="${thStyle}">Method</th><th style="${thStyle}">Time</th>
          <th style="${thRStyle}">Amount</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
      ${expensesHTML}
    `;
  }

  if (type === "outstanding-dues") {
    const avg =
      data.studentCount > 0
        ? Math.round(data.totalOutstandingAmount / data.studentCount)
        : 0;
    const rows = (data.students || [])
      .map(
        (s: any, i: number) => `
      <tr style="background:${i % 2 === 0 ? "#f8fafd" : "#fff"};page-break-inside:avoid;">
        <td style="${tdStyle}color:#94a3b8;text-align:center;">${i + 1}</td>
        <td style="${tdStyle}font-family:monospace;font-size:9px;color:#64748b;">${s.studentCode || "—"}</td>
        <td style="${tdStyle}font-weight:700;">${s.studentName}</td>
        <td style="${tdStyle}">${s.classInfo || "—"}</td>
        <td style="${tdStyle}">${s.parentName || "—"}</td>
        <td style="${tdStyle}color:#64748b;">${s.parentMobile || "—"}</td>
        <td style="${tdStyle}font-weight:700;color:#64748b;">${s.overdueCount} Months</td>
        <td style="${tdRStyle}color:#ea580c;">₹${(s.educationDue || 0).toLocaleString("en-IN")}</td>
        <td style="${tdRStyle}color:#d97706;">₹${(s.transportDue || 0).toLocaleString("en-IN")}</td>
        <td style="${tdRStyle}color:#134e4a;font-size:10px;">₹${(s.totalDue || 0).toLocaleString("en-IN")}</td>
      </tr>
    `,
      )
      .join("");

    bodyHTML = `
      <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:14px;">
        ${statCard("Total Outstanding", `₹${(data.totalOutstandingAmount || 0).toLocaleString("en-IN")}`, "#dc2626")}
        ${statCard("Students with Dues", `${data.studentCount || 0}`)}
        ${statCard("Avg. Due / Student", `₹${avg.toLocaleString("en-IN")}`)}
        ${statCard("Aging 1M / 2M / 3M+", `${data.oneDueCount || 0} / ${data.twoDueCount || 0} / ${data.threePlusDueCount || 0}`)}
      </div>
      <table style="width:100%;border-collapse:collapse;border:1px solid #dde4f0;overflow:hidden;">
        <thead><tr>
          <th style="${thStyle}width:30px;text-align:center;">#</th>
          <th style="${thStyle}">Code</th><th style="${thStyle}">Student Name</th>
          <th style="${thStyle}">Class</th><th style="${thStyle}">Parent</th>
          <th style="${thStyle}">Mobile</th><th style="${thStyle}">Overdue</th>
          <th style="${thRStyle}">Edu Dues</th><th style="${thRStyle}">Trans Dues</th>
          <th style="${thRStyle}">Total Due</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    `;
  }

  if (type === "rte-reconcile") {
    const rows = (data.students || [])
      .map(
        (s: any, i: number) => `
      <tr style="background:${i % 2 === 0 ? "#f8fafd" : "#fff"};page-break-inside:avoid;">
        <td style="${tdStyle}color:#94a3b8;text-align:center;">${i + 1}</td>
        <td style="${tdStyle}font-family:monospace;font-size:9px;color:#64748b;">${s.studentCode || "—"}</td>
        <td style="${tdStyle}font-weight:700;">${s.studentName}</td>
        <td style="${tdStyle}">${s.classInfo || "—"}</td>
        <td style="${tdStyle}">${s.parentName || "—"}</td>
        <td style="${tdStyle}color:#64748b;">${s.parentMobile || "—"}</td>
        <td style="${tdRStyle}color:#4338ca;font-size:10px;">₹${(s.exemptedAmount || 0).toLocaleString("en-IN")}</td>
      </tr>
    `,
      )
      .join("");

    bodyHTML = `
      <div style="display:grid;grid-template-columns:repeat(2,1fr);gap:8px;margin-bottom:14px;">
        ${statCard("Total RTE Enrolled", `${data.studentCount || 0} Students`)}
        ${statCard("Total Exempted Tuition", `₹${(data.totalExemptedAmount || 0).toLocaleString("en-IN")}`, "#4338ca")}
      </div>
      <table style="width:100%;border-collapse:collapse;border:1px solid #dde4f0;overflow:hidden;">
        <thead><tr>
          <th style="${thStyle}width:30px;text-align:center;">#</th>
          <th style="${thStyle}">Code</th><th style="${thStyle}">Student Name</th>
          <th style="${thStyle}">Class &amp; Section</th>
          <th style="${thStyle}">Parent Name</th><th style="${thStyle}">Mobile</th>
          <th style="${thRStyle}">Exempted Amount</th>
        </tr></thead>
        <tbody>${rows}</tbody>
      </table>
    `;
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>${title}</title>
  <style>
    ${BASE_CSS}
    @page { size: A4 ${isLandscape ? "landscape" : "portrait"}; }
    thead { display: table-header-group; }
    tfoot { display: table-footer-group; }
    tr { page-break-inside: avoid; }
  </style>
</head>
<body>
  <div style="position:relative;">
    ${headerHTML}
    ${bodyHTML}
    ${footerHTML}
  </div>
</body>
</html>`;
}

// ─── iframe print engine ──────────────────────────────────────────────────────

export function printHTML(html: string): void {
  const existing = document.getElementById("__erp-print-frame");
  if (existing) existing.remove();

  const iframe = document.createElement("iframe");
  iframe.id = "__erp-print-frame";
  iframe.style.cssText =
    "position:fixed;top:0;left:0;width:0;height:0;border:0;visibility:hidden;";
  document.body.appendChild(iframe);

  const doc = iframe.contentDocument || iframe.contentWindow?.document;
  if (!doc) return;
  doc.open();
  doc.write(html);
  doc.close();

  // Wait for all images (now base64 — should be instant, but guard anyway)
  const imgs = Array.from(doc.querySelectorAll("img"));
  if (imgs.length === 0) {
    setTimeout(() => {
      iframe.contentWindow?.print();
      setTimeout(() => iframe.remove(), 1500);
    }, 120);
    return;
  }

  let loaded = 0;
  const tryPrint = () => {
    if (++loaded >= imgs.length) {
      setTimeout(() => {
        iframe.contentWindow?.print();
        setTimeout(() => iframe.remove(), 1500);
      }, 120);
    }
  };
  imgs.forEach((img) => {
    if (img.complete) tryPrint();
    else {
      img.addEventListener("load", tryPrint);
      img.addEventListener("error", tryPrint);
    }
  });
}
