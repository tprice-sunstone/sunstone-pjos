'use client';

import { useEffect, useRef, useState } from 'react';
import QRCodeLib from 'qrcode';
import { Button } from '@/components/ui/Button';

// ============================================================================
// QRCode Component
// ============================================================================

interface QRCodeProps {
  url: string;
  size?: number;
  tenantName?: string;
  eventName?: string;
  showDownload?: boolean;
  showPrint?: boolean;
}

export function QRCode({
  url,
  size = 200,
  tenantName,
  eventName,
  showDownload = false,
  showPrint = false,
}: QRCodeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (!canvasRef.current) return;
    QRCodeLib.toCanvas(canvasRef.current, url, {
      width: size,
      margin: 2,
      color: { dark: '#111827', light: '#ffffff' },
    }).catch(() => setError(true));
  }, [url, size]);

  const handleDownload = () => {
    if (!canvasRef.current) return;
    const link = document.createElement('a');
    const safeName = (eventName || tenantName || 'qrcode')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-');
    link.download = `${safeName}-qr.png`;
    link.href = canvasRef.current.toDataURL('image/png');
    link.click();
  };

  const handlePrint = () => {
    if (!canvasRef.current) return;
    const dataUrl = canvasRef.current.toDataURL('image/png');
    const win = window.open('', '_blank');
    if (!win) return;
    win.document.write(`
      <html>
        <head><title>QR Code - ${eventName || tenantName || 'Sunstone'}</title></head>
        <body style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;margin:0;font-family:system-ui,sans-serif;">
          ${tenantName ? `<h1 style="font-size:24px;margin-bottom:4px;color:#111827;">${tenantName}</h1>` : ''}
          ${eventName ? `<p style="font-size:16px;color:#6b7280;margin-top:0;margin-bottom:24px;">${eventName}</p>` : ''}
          <img src="${dataUrl}" width="${size}" height="${size}" />
          <p style="margin-top:24px;font-size:14px;color:#6b7280;">Scan to sign waiver &amp; join queue</p>
        </body>
      </html>
    `);
    win.document.close();
    win.onload = () => {
      win.print();
      win.close();
    };
  };

  if (error) {
    return (
      <div className="flex items-center justify-center rounded-lg border border-border-default bg-surface-raised p-8">
        <p className="text-sm text-text-secondary">Failed to generate QR code</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4">
      {tenantName && (
        <div className="text-center">
          <p className="text-lg font-semibold text-text-primary">{tenantName}</p>
          {eventName && (
            <p className="text-sm text-text-secondary mt-0.5">{eventName}</p>
          )}
        </div>
      )}

      <div className="rounded-xl border border-border-default bg-white p-4 shadow-sm">
        <canvas ref={canvasRef} />
      </div>

      <p className="text-xs text-text-tertiary">Scan to sign waiver &amp; join queue</p>

      {(showDownload || showPrint) && (
        <div className="flex items-center gap-2">
          {showDownload && (
            <Button variant="secondary" size="sm" onClick={handleDownload}>
              <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v2a2 2 0 002 2h12a2 2 0 002-2v-2M7 10l5 5m0 0l5-5m-5 5V3" />
              </svg>
              Download
            </Button>
          )}
          {showPrint && (
            <Button variant="secondary" size="sm" onClick={handlePrint}>
              <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
              </svg>
              Print
            </Button>
          )}
        </div>
      )}
    </div>
  );
}

// ============================================================================
// FullScreenQR Component
// ============================================================================

interface FullScreenQRProps {
  url: string;
  tenantName?: string;
  eventName?: string;
  onClose: () => void;
}

export function FullScreenQR({ url, tenantName, eventName, onClose }: FullScreenQRProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    QRCodeLib.toCanvas(canvasRef.current, url, {
      width: 400,
      margin: 3,
      color: { dark: '#111827', light: '#ffffff' },
    }).catch(() => {});
  }, [url]);

  // Close on Escape key
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white cursor-pointer"
      onClick={onClose}
    >
      <div className="flex flex-col items-center gap-6" onClick={(e) => e.stopPropagation()}>
        {tenantName && (
          <div className="text-center">
            <h1 className="text-3xl font-display font-semibold text-text-primary">
              {tenantName}
            </h1>
            {eventName && (
              <p className="text-lg text-text-secondary mt-1">{eventName}</p>
            )}
          </div>
        )}

        <div className="rounded-2xl border-2 border-border-default bg-white p-6 shadow-lg">
          <canvas ref={canvasRef} />
        </div>

        <p className="text-base text-text-secondary">
          Scan to sign your waiver &amp; join the queue
        </p>

        <button
          onClick={onClose}
          className="mt-4 text-sm text-text-tertiary hover:text-text-secondary transition-colors"
        >
          Tap anywhere to close
        </button>
      </div>
    </div>
  );
}