import React from 'react';
import { brand } from '../config/brand';

/** Shared loading visual (school logo + product name) shown while data loads. */
export const BrandedLoader: React.FC<{ label?: string; compact?: boolean }> = ({ label, compact }) => {
  return (
    <div className={`flex flex-col items-center justify-center gap-3 animate-in fade-in duration-300 ${compact ? 'py-2' : 'flex-1 py-24'}`}>
      <img
        src={brand.logo}
        alt={brand.productName}
        className={`${compact ? 'h-10 w-10' : 'h-16 w-16'} rounded-2xl object-contain animate-[pulse_1.8s_ease-in-out_infinite]`}
      />
      {!compact && (
        <span className="text-lg font-bold tracking-wide text-[var(--color-ink)]">{brand.productName}</span>
      )}
      <p className={`text-slate-400 ${compact ? 'text-[10px]' : 'text-xs'}`}>{label || 'Loading…'}</p>
    </div>
  );
};

export default BrandedLoader;
