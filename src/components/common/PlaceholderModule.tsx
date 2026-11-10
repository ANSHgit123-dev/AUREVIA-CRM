import React from 'react';
import { LucideIcon } from 'lucide-react';

interface PlaceholderProps {
  title: string;
  description: string;
  icon: LucideIcon;
  targetPhase: string;
}

export const PlaceholderModule: React.FC<PlaceholderProps> = ({
  title,
  description,
  icon: Icon,
  targetPhase,
}) => {
  return (
    <div className="bg-white rounded-2xl border border-surface-border p-12 text-center shadow-card max-w-2xl mx-auto my-12">
      <div className="h-14 w-14 rounded-2xl bg-navy-900 text-gold-500 flex items-center justify-center mx-auto mb-4 shadow-subtle">
        <Icon size={28} />
      </div>
      <h2 className="text-xl font-bold text-slate-900">{title}</h2>
      <p className="text-sm text-slate-500 mt-2 max-w-md mx-auto">{description}</p>
      <div className="mt-6 inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-slate-100 border border-slate-200 text-xs font-mono text-slate-700">
        <span className="h-2 w-2 rounded-full bg-gold-500 animate-pulse" />
        <span>Scheduled for {targetPhase}</span>
      </div>
    </div>
  );
};

