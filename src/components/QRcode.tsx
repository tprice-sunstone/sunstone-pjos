'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import QRCodeLib from 'qrcode';
import { Button } from '@/components/ui/Button';

export interface QRCodeProps {
  url: string;
  size?: number;
  tenantName?: string;
  eventName?: string;
  showDownload?: boolean;
  showPrint?: boolean;
  className?: string;
}

export function QRCode({
  url,
  size = 256,
  tenantName,
  eventName,
  showDownload = false,
  showPrint = false,
  className = '',
}: QRCodeProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [dataUrl, setDataUrl] = useState<string>('');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    if (!url) return;

    const canvas = canvasRef.current;
    if (!canvas) return;

    QRCodeLib.toCanvas(canvas, url, {
      width: size,
      margin: 2,
      color: {
        dark: '#111827',
        light: '#ffffff',
      },
      errorCorrectionLevel: 'M',
    })
      .then(() => {
        setDataUrl(canvas.toDataURL('image/png'));
        setError('');
      })
      .catch((err: Error) => {
        setError('Failed to generate QR code');
        console.error('QR generation error:', err);
      });
  }, [url, size]);

  const handleDownload = useCallback(() => {
    if (!dataUrl) return;
    const link = document.createElement('a');
    const parts = [tenantName, eventName, 'qr-code'].filter(Boolean);
    const filename = parts
      .join('-')
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '-')
      .replace(/-+/g, '-');
    link.download = `${filename}.png`;
    link.href = dataUrl;
    link.click();
  }, [dataUrl, tenantName, eventName]);

  const handlePrint = useCallback(() => {
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>QR Code${tenantName ? ` — ${tenantName}` : ''}</title>
          <style>
            @import url('https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,600&family=Inter:wght@400;500&display=swap');
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body {
              display: flex;
              flex-direction: column;
              align-items: center;
              justify-content: center;
              min-height: 100vh;
              background: #fff;
              font-family: 'Inter', sans-serif;
            }
            img { max-width: 400px; width: 80vw; }
            .tenant-name {
              font-family: 'Fraunces', serif;
              font-size: 28px;
              font-weight: 600;
              color: #111827;
              margin-top: 24px;
              text-align: center;
            }
            .event-name {
              font-size: 18px;
              color: #4b5563;
              margin-top: 8px;
              text-align: center;
            }
            .instruction {
              font-size: 14px;
              color: #9ca3af;
              margin-top: 16px;
              text-align: center;
            }
          </style>
        </head>
        <body>
          <img src="${dataUrl}" alt="QR Code" />
          ${tenantName ? `<div class="tenant-name">${tenantName}</div>` : ''}
          ${eventName ? `<div class="event-name">${eventName}</div>` : ''}
          <div class="instruction">Scan to Sign Waiver &amp; Join Queue</div>
          <script>window.onload = () => { window.print(); window.close(); }</script>
        </body>
      </html>
    `);
    printWindow.document.close();
  }, [dataUrl, tenantName, eventName]);

  if (error) {
    return (
      <div className={`text-center text-sm text-red-500 ${className}`}>
        {error}
      </div>
    );
  }

  return (
    <div className={`flex flex-col items-center ${className}`}>
      <div className="bg-white rounded-2xl p-8 shadow-sm border border-[var(--border-subtle)]">
        <canvas ref={canvasRef} style={{ display: 'block' }} />
      </div>

      {tenantName && (
        <h2 className="font-display text-2xl font-semibold text-text-primary text-center mt-5">
          {tenantName}
        </h2>
      )}

      {eventName && (
        <p className="text-lg text-text-secondary text-center mt-1">
          {eventName}
        </p>
      )}

      {(showDownload || showPrint) && (
        <div className="flex items-center gap-3 mt-5">
          {showDownload && (
            <Button variant="secondary" size="sm" onClick={handleDownload}>
              <svg className="w-4 h-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Download
            </Button>
          )}
          {showPrint && (
            <Button variant="ghost" size="sm" onClick={handlePrint}>
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

/* ─── Full-Screen QR Display ─── */

export interface FullScreenQRProps {
  url: string;
  tenantName?: string;
  eventName?: string;
  onClose: () => void;
}

export function FullScreenQR({
  url,
  tenantName,
  eventName,
  onClose,
}: FullScreenQRProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (!url || !canvasRef.current) return;
    QRCodeLib.toCanvas(canvasRef.current, url, {
      width: Math.min(window.innerWidth * 0.7, window.innerHeight * 0.55, 500),
      margin: 2,
      color: { dark: '#111827', light: '#ffffff' },
      errorCorrectionLevel: 'M',
    }).catch(console.error);
  }, [url]);

  // Close on Escape
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKey);
    return () => window.removeEventListener('keydown', handleKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-[100] bg-white flex flex-col items-center justify-center"
      onClick={onClose}
    >
      {/* Close button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          onClose();
        }}
        className="absolute top-4 right-4 p-3 rounded-xl hover:bg-gray-100 transition-colors min-h-[48px] min-w-[48px] flex items-center justify-center"
        aria-label="Close full-screen QR"
      >
        <svg className="w-6 h-6 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      <div onClick={(e) => e.stopPropagation()} className="flex flex-col items-center px-6">
        <canvas ref={canvasRef} style={{ display: 'block' }} />

        {tenantName && (
          <h1 className="font-display text-3xl sm:text-4xl font-semibold text-gray-900 text-center mt-6">
            {tenantName}
          </h1>
        )}

        {eventName && (
          <p className="text-xl text-gray-500 text-center mt-2">
            {eventName}
          </p>
        )}

        <p className="text-base text-gray-400 text-center mt-5">
          Scan to Sign Waiver &amp; Join Queue
        </p>
      </div>
    </div>
  );
}