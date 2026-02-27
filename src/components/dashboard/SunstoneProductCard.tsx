'use client';

import { useRouter } from 'next/navigation';
import type { SunstoneProductData } from '@/types';

export function SunstoneProductCard({ data }: { data: SunstoneProductData }) {
  const router = useRouter();
  if (!data) return null;

  const isExternal = data.actionRoute.startsWith('http');

  return (
    <div
      className="col-span-full border border-[var(--border-default)]"
      style={{
        borderRadius: 'var(--card-radius, 16px)',
        boxShadow: 'var(--shadow-card)',
        overflow: 'hidden',
      }}
    >
      <div style={{ display: 'flex', minHeight: 140 }}>
        {/* Image placeholder — gradient with sparkle icon */}
        <div
          className="hidden sm:flex"
          style={{
            width: 160,
            flexShrink: 0,
            background: 'linear-gradient(145deg, var(--accent-400), var(--accent-600))',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            position: 'relative',
          }}
        >
          {data.imageUrl ? (
            <img
              src={data.imageUrl}
              alt={data.title}
              style={{ width: '100%', height: '100%', objectFit: 'cover' }}
            />
          ) : (
            <span
              style={{
                color: 'var(--text-on-accent)',
                fontSize: 11,
                fontWeight: 600,
                letterSpacing: '0.1em',
                textTransform: 'uppercase',
                opacity: 0.55,
              }}
            >
              Sunstone
            </span>
          )}
        </div>

        {/* Content */}
        <div
          style={{
            flex: 1,
            padding: 18,
            background: 'linear-gradient(135deg, var(--accent-50), var(--surface-raised))',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
          }}
        >
          {/* Top row: label + badge */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span
              className="text-accent-600 uppercase"
              style={{ fontSize: 10, fontWeight: 600, letterSpacing: '0.08em' }}
            >
              From Sunstone
            </span>
            {data.badge && (
              <span
                className="bg-accent-500 text-[var(--text-on-accent)]"
                style={{
                  fontSize: 9,
                  fontWeight: 600,
                  padding: '2px 8px',
                  borderRadius: 9999,
                  letterSpacing: '0.02em',
                }}
              >
                {data.badge}
              </span>
            )}
          </div>

          {/* Product name */}
          <p
            className="text-text-primary"
            style={{
              fontFamily: 'var(--font-heading)',
              fontSize: 18,
              fontWeight: 600,
              lineHeight: 1.3,
              marginTop: 6,
            }}
          >
            {data.title}
          </p>

          {/* Description */}
          <p
            className="text-text-secondary"
            style={{ fontSize: 12, marginTop: 4, lineHeight: 1.5 }}
          >
            {data.body}
          </p>

          {/* CTA */}
          {isExternal ? (
            <a
              href={data.actionRoute}
              target="_blank"
              rel="noopener noreferrer"
              className="text-accent-600 hover:text-accent-700 transition-colors"
              style={{
                display: 'inline-block',
                fontSize: 13,
                fontWeight: 600,
                marginTop: 12,
                textDecoration: 'none',
              }}
            >
              {data.actionLabel} &rarr;
            </a>
          ) : (
            <button
              onClick={() => router.push(data.actionRoute)}
              className="text-accent-600 hover:text-accent-700 transition-colors"
              style={{
                fontSize: 13,
                fontWeight: 600,
                marginTop: 12,
                background: 'none',
                border: 'none',
                padding: 0,
                cursor: 'pointer',
                textAlign: 'left',
              }}
            >
              {data.actionLabel} &rarr;
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
