// ============================================================================
// Waiver PDF Generation — Luxury Layout
// ============================================================================
// Generates a professional waiver PDF using the tenant's theme accent color.
// Design: luxury hotel / high-end spa consent form aesthetic.
// Dependency: jspdf
// ============================================================================

import jsPDF from 'jspdf';

export interface WaiverPDFData {
  tenantName: string;
  tenantAccentColor?: string;   // hex, e.g. '#B76E79'
  tenantLogoUrl?: string;       // Supabase storage URL for tenant logo
  clientName: string;
  clientEmail?: string;
  clientPhone?: string;
  waiverText: string;
  signatureDataUrl: string;     // base64 PNG from signature canvas
  signedAt: string;             // ISO timestamp
  eventName?: string;
  smsConsent?: boolean;
}

// ── Layout constants (points — 72pt = 1 inch) ───────────────────────────

const ML = 60;                       // margin left
const MR = 60;                       // margin right
const MT = 56;                       // margin top (below accent stripe)
const MB = 60;                       // margin bottom
const PW = 612;                      // letter width
const PH = 792;                      // letter height
const CW = PW - ML - MR;            // content width
const STRIPE_H = 3;                  // top accent stripe height
const FOOTER_Y = PH - 32;           // footer baseline

// ── Colors ───────────────────────────────────────────────────────────────

const BLACK: RGB = [30, 30, 30];
const DARK: RGB = [60, 60, 60];
const MID: RGB = [120, 120, 120];
const LIGHT: RGB = [170, 170, 170];
const RULE: RGB = [215, 215, 215];
const PANEL_BG: RGB = [248, 248, 248];
const WHITE: RGB = [255, 255, 255];

type RGB = [number, number, number];

// ── Helpers ──────────────────────────────────────────────────────────────

function hexToRgb(hex: string): RGB {
  const c = hex.replace('#', '');
  return [
    parseInt(c.substring(0, 2), 16),
    parseInt(c.substring(2, 4), 16),
    parseInt(c.substring(4, 6), 16),
  ];
}

function formatDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  } catch {
    return iso;
  }
}

function formatDateTime(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
    });
  } catch {
    return iso;
  }
}

/** Add a page if content won't fit; returns the (possibly reset) Y. */
function ensureSpace(doc: jsPDF, y: number, needed: number): number {
  if (y + needed > PH - MB) {
    doc.addPage();
    drawStripe(doc, doc.__accentRgb);
    return MT + STRIPE_H + 12;
  }
  return y;
}

/** Thin accent stripe at page top. */
function drawStripe(doc: jsPDF, accent: RGB): void {
  doc.setFillColor(...accent);
  doc.rect(0, 0, PW, STRIPE_H, 'F');
}

/** Footer on every page. */
function drawFooter(doc: jsPDF, accent: RGB): void {
  // Thin rule above footer
  doc.setDrawColor(...RULE);
  doc.setLineWidth(0.5);
  doc.line(ML, FOOTER_Y - 10, PW - MR, FOOTER_Y - 10);

  const totalPages = doc.getNumberOfPages();
  const pageNum = doc.getCurrentPageInfo().pageNumber;

  doc.setFontSize(7);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...LIGHT);
  doc.text(`Page ${pageNum} of ${totalPages}`, ML, FOOTER_Y);
  doc.text('Powered by Sunstone Studio', PW - MR, FOOTER_Y, { align: 'right' });
}

/** Fetch image URL to base64 data URL. Returns null on failure. */
async function fetchImageAsBase64(url: string): Promise<string | null> {
  try {
    const response = await fetch(url);
    if (!response.ok) return null;
    const blob = await response.blob();
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

// ── Main generator ───────────────────────────────────────────────────────

// Extend jsPDF type to stash accent color for multi-page use
declare module 'jspdf' {
  interface jsPDF {
    __accentRgb: RGB;
  }
}

export async function generateWaiverPDF(data: WaiverPDFData): Promise<jsPDF> {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'pt', format: 'letter' });

  const accent: RGB = data.tenantAccentColor
    ? hexToRgb(data.tenantAccentColor)
    : [183, 110, 121]; // rose-gold default

  // Stash accent for ensureSpace page breaks
  doc.__accentRgb = accent;

  let y = MT;

  // ── Top accent stripe ────────────────────────────────────────────────
  drawStripe(doc, accent);
  y += STRIPE_H + 16;

  // ── Logo + Tenant Name ───────────────────────────────────────────────
  let logoInserted = false;
  if (data.tenantLogoUrl) {
    try {
      const logoBase64 = await fetchImageAsBase64(data.tenantLogoUrl);
      if (logoBase64) {
        const fmt = logoBase64.includes('image/png') ? 'PNG' : 'JPEG';
        const sz = 36;
        doc.addImage(logoBase64, fmt, ML, y - 8, sz, sz);
        doc.setFontSize(22);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(...accent);
        doc.text(data.tenantName, ML + sz + 10, y + 16);
        y += sz + 6;
        logoInserted = true;
      }
    } catch {
      // Fall through to text-only header
    }
  }

  if (!logoInserted) {
    doc.setFontSize(22);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...accent);
    doc.text(data.tenantName, ML, y + 4);
    y += 24;
  }

  // ── Title ────────────────────────────────────────────────────────────
  y += 4;
  doc.setFontSize(12);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...MID);
  doc.text('Service Waiver & Release', ML, y);
  y += 18;

  // ── Accent divider ──────────────────────────────────────────────────
  doc.setDrawColor(...accent);
  doc.setLineWidth(1);
  doc.line(ML, y, ML + 80, y);
  y += 24;

  // ── Client info panel (light gray box) ──────────────────────────────
  const infoLines: [string, string][] = [];
  infoLines.push(['Client', data.clientName]);
  if (data.clientEmail) infoLines.push(['Email', data.clientEmail]);
  if (data.clientPhone) infoLines.push(['Phone', data.clientPhone]);
  if (data.eventName) infoLines.push(['Event', data.eventName]);
  infoLines.push(['Date', formatDate(data.signedAt)]);

  const rowH = 18;
  const panelPadY = 14;
  const panelH = panelPadY * 2 + infoLines.length * rowH;

  y = ensureSpace(doc, y, panelH + 8);

  // Draw panel background
  doc.setFillColor(...PANEL_BG);
  doc.roundedRect(ML, y, CW, panelH, 4, 4, 'F');

  let iy = y + panelPadY + 12;
  const labelX = ML + 16;
  const valX = ML + 80;

  for (const [label, value] of infoLines) {
    doc.setFontSize(8);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(...LIGHT);
    doc.text(label.toUpperCase(), labelX, iy);

    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...BLACK);
    doc.text(value, valX, iy);
    iy += rowH;
  }

  y += panelH + 24;

  // ── Waiver Agreement ────────────────────────────────────────────────
  y = ensureSpace(doc, y, 40);
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...MID);
  doc.text('WAIVER AGREEMENT', ML, y);
  y += 16;

  doc.setFontSize(9.5);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...DARK);

  const lineH = 14;
  const waiverLines: string[] = doc.splitTextToSize(data.waiverText, CW);

  for (let i = 0; i < waiverLines.length; i++) {
    y = ensureSpace(doc, y, lineH);
    doc.text(waiverLines[i], ML, y);
    y += lineH;
  }

  y += 20;

  // ── Signature section ───────────────────────────────────────────────
  y = ensureSpace(doc, y, 130);

  // Section label
  doc.setFontSize(8);
  doc.setFont('helvetica', 'bold');
  doc.setTextColor(...MID);
  doc.text('SIGNATURE', ML, y);
  y += 16;

  // Signature image
  if (data.signatureDataUrl) {
    try {
      const fmt = data.signatureDataUrl.includes('image/png') ? 'PNG' : 'JPEG';
      const sigW = 200;
      const sigH = 50;
      doc.addImage(data.signatureDataUrl, fmt, ML, y, sigW, sigH);
      y += sigH + 6;
    } catch {
      doc.setFontSize(9);
      doc.setFont('helvetica', 'italic');
      doc.setTextColor(...LIGHT);
      doc.text('[Signature on file]', ML, y + 16);
      y += 30;
    }
  }

  // Signature line
  doc.setDrawColor(...RULE);
  doc.setLineWidth(0.75);
  doc.line(ML, y, ML + 260, y);
  y += 14;

  // Name and date below line
  doc.setFontSize(9);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(...BLACK);
  doc.text(data.clientName, ML, y);

  doc.setFontSize(8);
  doc.setTextColor(...LIGHT);
  doc.text(formatDateTime(data.signedAt), ML + 264, y);
  y += 24;

  // ── SMS Consent (if applicable) ─────────────────────────────────────
  if (data.smsConsent !== undefined) {
    y = ensureSpace(doc, y, 24);
    doc.setFontSize(8);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(...MID);
    const consentText = data.smsConsent
      ? 'SMS consent: Opted in to receive text messages'
      : 'SMS consent: Declined';
    doc.text(consentText, ML, y);
    y += 20;
  }

  // ── Footers on all pages ────────────────────────────────────────────
  const totalPages = doc.getNumberOfPages();
  for (let p = 1; p <= totalPages; p++) {
    doc.setPage(p);
    drawStripe(doc, accent);
    drawFooter(doc, accent);
  }

  return doc;
}

// ── Browser download helper ──────────────────────────────────────────────

export async function downloadWaiverPDF(data: WaiverPDFData): Promise<void> {
  const doc = await generateWaiverPDF(data);
  const safeName = data.clientName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
  const dateStr = new Date(data.signedAt).toISOString().split('T')[0];
  doc.save(`waiver-${safeName}-${dateStr}.pdf`);
}
