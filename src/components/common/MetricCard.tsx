import React from 'react';
import { LucideIcon } from 'lucide-react';
import { cn } from '../../lib/utils';

interface MetricCardProps {
  title: string;
  value: string;
  subtitle?: string;
  trend?: {
    value: string;
    isPositive: boolean;
  };
  icon: LucideIcon;
  variant?: 'default' | 'gold' | 'emerald' | 'rose';
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  trend,
  icon: Icon,
  variant = 'default',
}) => {
  return (
    <div className="bg-white rounded-xl border border-surface-border p-5 shadow-card hover:border-slate-300 transition-all">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium text-slate-500 uppercase tracking-wider">{title}</p>
          <h3 className="text-2xl font-bold text-slate-900 mt-1 font-mono tracking-tight">{value}</h3>
        </div>
        <div
          className={cn(
            'p-2.5 rounded-lg shrink-0',
            variant === 'gold' && 'bg-amber-50 text-amber-700 border border-amber-200/60',
            variant === 'emerald' && 'bg-emerald-50 text-emerald-700 border border-emerald-200/60',
            variant === 'rose' && 'bg-rose-50 text-rose-700 border border-rose-200/60',
            variant === 'default' && 'bg-slate-50 text-navy-900 border border-slate-200'
          )}
        >
          <Icon size={20} />
        </div>
      </div>

      {(subtitle || trend) && (
        <div className="mt-3 flex items-center gap-2 text-xs">
          {trend && (
            <span
              className={cn(
                'font-semibold font-mono',
                trend.isPositive ? 'text-emerald-600' : 'text-rose-600'
              )}
            >
              {trend.isPositive ? '+' : ''}{trend.value}
            </span>
          )}
          {subtitle && <span className="text-slate-500">{subtitle}</span>}
        </div>
      )}
    </div>
  );
};

