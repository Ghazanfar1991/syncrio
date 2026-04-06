import React from 'react';
import { RefreshCw } from 'lucide-react';

interface LineChartProps {
  series: number[];
  series2?: number[];
  loading?: boolean;
}

export const LineChart: React.FC<LineChartProps> = ({ series, series2, loading }) => {
  if (loading) {
    return (
      <div className="w-full h-[160px] bg-gray-100 dark:bg-neutral-800 rounded-lg animate-pulse flex items-center justify-center">
        <RefreshCw className="w-8 h-8 text-gray-400 animate-spin" />
      </div>
    )
  }

  const w = 520; const h = 160; const pad = 10;
  const all = [...series, ...(series2 || [])];
  const max = Math.max(...all) || 1;
  const stepX = (w - pad * 2) / (series.length - 1);
  const path = (arr: number[]) => arr.map((v,i)=> {
    const x = pad + i * stepX;
    const y = h - pad - (v / max) * (h - pad * 2);
    return `${i===0? 'M':'L'}${x},${y}`;
  }).join(' ');

  return (
    <svg viewBox={`0 0 ${w} ${h}`} className="w-full h-[160px]">
      <defs>
        <linearGradient id="a" x1="0" x2="0" y1="0" y2="1">
          <stop offset="0%" stopColor="currentColor" stopOpacity="0.12" />
          <stop offset="100%" stopColor="currentColor" stopOpacity="0" />
        </linearGradient>
      </defs>
      {series2 && (
        <>
          <path d={path(series2)} stroke="currentColor" strokeWidth={2} className="opacity-40 text-slate-400 dark:text-slate-500 fill-none" />
          <path d={`${path(series2)} L ${w-pad},${h-pad} L ${pad},${h-pad} Z`} fill="url(#a)" className="text-slate-400 dark:text-slate-500" />
        </>
      )}
      <path d={path(series)} stroke="currentColor" strokeWidth={2.5} className="text-indigo-600 dark:text-indigo-400 fill-none" />
    </svg>
  );
};
