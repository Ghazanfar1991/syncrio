import React from 'react';

export const PremiumStat: React.FC<{ title:string, value:string, delta?:string, icon?:React.ReactNode, accent?:string, loading?: boolean }> = ({ title, value, delta, icon, accent, loading }) => (
  <div className="relative rounded-3xl p-5 bg-white/60 dark:bg-neutral-900/60 backdrop-blur-sm border border-black/5 dark:border-white/5 shadow-lg overflow-hidden transition-transform hover:-translate-y-1">
    <div className="absolute -right-8 -top-8 w-36 h-36 rounded-full opacity-20" style={{ background: accent || 'linear-gradient(135deg,#fff7ed, #fff)' }} />
    <div className="flex items-start justify-between">
      <div>
        <div className="text-xs opacity-70">{title}</div>
        {loading ? (
          <div className="mt-2 h-8 bg-gray-200 dark:bg-neutral-700 rounded animate-pulse"></div>
        ) : (
          <div className="mt-2 text-2xl font-semibold tracking-tight">{value}</div>
        )}
        {delta && <div className="mt-1 text-xs opacity-60">{delta}</div>}
      </div>
      <div className="p-2 rounded-lg bg-black/5 dark:bg-white/8">{icon}</div>
    </div>
  </div>
);

export const PlatformBar: React.FC<{label:string, value:number, icon?:React.ReactNode, loading?: boolean}> = ({ label, value, icon, loading }) => (
  <div className="space-y-2">
    <div className="flex items-center justify-between text-sm opacity-85">
      <div className="flex items-center gap-2">{icon}<span>{label}</span></div>
      {loading ? (
        <div className="w-8 h-4 bg-gray-200 dark:bg-neutral-700 rounded animate-pulse"></div>
      ) : (
        <div className="text-xs opacity-60">{value}%</div>
      )}
    </div>
    <div className="h-2 rounded-full bg-gradient-to-r from-slate-100 to-white dark:from-neutral-800 dark:to-neutral-900 overflow-hidden">
      {loading ? (
        <div className="h-full bg-gray-200 dark:bg-neutral-700 rounded-full animate-pulse"></div>
      ) : (
        <div className="h-full rounded-full transition-all duration-500" style={{ width: `${value}%`, background: 'linear-gradient(90deg,#7c3aed,#06b6d4)' }} />
      )}
    </div>
  </div>
);
