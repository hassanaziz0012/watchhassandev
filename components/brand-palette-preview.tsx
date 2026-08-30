'use client';

import { useState } from 'react';
import { Palette, Check } from 'lucide-react';

const shades = [
  { name: 'primary-50', shade: '50', hsl: 'hsl(207, 95%, 98%)', hex: '#f0f8ff', bgClass: 'bg-primary-50', textDark: true },
  { name: 'primary-100', shade: '100', hsl: 'hsl(207, 96%, 93%)', hex: '#d8eeff', bgClass: 'bg-primary-100', textDark: true },
  { name: 'primary-200', shade: '200', hsl: 'hsl(207, 97%, 85%)', hex: '#b5e0ff', bgClass: 'bg-primary-200', textDark: true },
  { name: 'primary-300', shade: '300', hsl: 'hsl(207, 98%, 75%)', hex: '#81cbff', bgClass: 'bg-primary-300', textDark: true },
  { name: 'primary-400', shade: '400', hsl: 'hsl(207, 99%, 63%)', hex: '#45b1ff', bgClass: 'bg-primary-400', textDark: false },
  { name: 'primary-500', shade: '500 (Base)', hsl: 'hsl(207, 100%, 50%)', hex: '#0095ff', bgClass: 'bg-primary-500', textDark: false, isBase: true },
  { name: 'primary-600', shade: '600', hsl: 'hsl(207, 99%, 43%)', hex: '#007ceb', bgClass: 'bg-primary-600', textDark: false },
  { name: 'primary-700', shade: '700', hsl: 'hsl(207, 98%, 36%)', hex: '#0063c4', bgClass: 'bg-primary-700', textDark: false },
  { name: 'primary-800', shade: '800', hsl: 'hsl(207, 97%, 28%)', hex: '#004e9c', bgClass: 'bg-primary-800', textDark: false },
  { name: 'primary-900', shade: '900', hsl: 'hsl(207, 96%, 20%)', hex: '#003975', bgClass: 'bg-primary-900', textDark: false },
  { name: 'primary-950', shade: '950', hsl: 'hsl(207, 95%, 13%)', hex: '#00234d', bgClass: 'bg-primary-950', textDark: false },
  { name: 'primary-1000', shade: '1000', hsl: 'hsl(207, 94%, 7%)', hex: '#001229', bgClass: 'bg-primary-1000', textDark: false },
];

export function BrandPalettePreview() {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const copyShade = (hsl: string, index: number) => {
    navigator.clipboard.writeText(hsl);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 1500);
  };

  return (
    <div className="rounded-2xl bg-primary-1000/60 border border-primary-950/80 p-5 space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Palette className="h-4 w-4 text-primary-400" />
          <h3 className="text-sm font-semibold text-primary-100">Brand Color Spectrum (12 Shades)</h3>
        </div>
        <span className="text-xs font-mono text-primary-400 bg-primary-950/80 px-2.5 py-1 rounded-full border border-primary-900/60">
          Base: hsl(207, 100%, 50%)
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-12 gap-2">
        {shades.map((shade, idx) => (
          <button
            key={shade.name}
            onClick={() => copyShade(shade.hsl, idx)}
            title={`Click to copy: ${shade.hsl}`}
            className="group relative flex flex-col items-center p-2 rounded-xl border border-primary-900/40 hover:border-primary-400/60 transition-all hover:scale-105 active:scale-95 bg-black/40 text-center"
          >
            <div
              className={`w-full h-8 rounded-lg ${shade.bgClass} flex items-center justify-center shadow-inner relative`}
            >
              {copiedIndex === idx && (
                <Check className={`h-4 w-4 ${shade.textDark ? 'text-black' : 'text-white'}`} />
              )}
              {shade.isBase && copiedIndex !== idx && (
                <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-primary-300 ring-2 ring-black animate-pulse" />
              )}
            </div>
            <div className="mt-2 space-y-0.5 w-full">
              <p className="text-[11px] font-medium text-primary-200 truncate">{shade.shade}</p>
              <p className="text-[9px] font-mono text-primary-400/80 truncate">{shade.hex}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
}
