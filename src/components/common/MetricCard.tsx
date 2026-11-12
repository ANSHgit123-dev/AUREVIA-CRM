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
  icon?: LucideIcon;
  variant?: 'default' | 'gold' | 'emerald' | 'rose';
  className?: string;
}

export const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  subtitle,
  trend,
  icon: Icon,
  variant = 'default',
  className,
}) => {
  return (
    <div
      className={cn(
        'bg-white border border-[#E5E8EB] rounded-md p-3.5 shadow-none transition-colors',
        className
      )}
    >
      <div className="flex items-center justify-between">
        <span className="text-[11px] font-medium text-slate-500 uppercase tracking-wider truncate">
          {title}
        </span>
        {Icon && <Icon size={14} className="text-slate-400 shrink-0 ml-2" />}
      </div>

      <div className="mt-1">
        <span className="text-xl font-semibold text-slate-900 tracking-tight font-mono block">
          {value}
        </span>
      </div>

      {(subtitle || trend) && (
        <div className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-500 min-w-0">
          {trend && (
            <span
              className={cn(
                'font-medium font-mono shrink-0',
                trend.isPositive ? 'text-emerald-700' : 'text-rose-700'
              )}
            >
              {trend.isPositive ? '+' : ''}{trend.value}
            </span>
          )}
          {subtitle && (
            <span className="truncate text-slate-500">
              {subtitle}
            </span>
          )}
        </div>
      )}
    </div>
  );
};
