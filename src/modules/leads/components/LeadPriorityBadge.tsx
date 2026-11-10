import React from 'react';
import { Flame } from 'lucide-react';

interface LeadPriorityBadgeProps {
  priority: 'hot' | 'warm' | 'cold';
  showIcon?: boolean;
  className?: string;
}

export const LeadPriorityBadge: React.FC<LeadPriorityBadgeProps> = ({
  priority,
  showIcon = true,
  className = '',
}) => {
  const config = {
    hot: {
      label: 'Hot',
      bg: 'bg-rose-50',
      text: 'text-rose-700',
      border: 'border-rose-200',
      iconColor: 'text-rose-500 fill-rose-500',
    },
    warm: {
      label: 'Warm',
      bg: 'bg-amber-50',
      text: 'text-amber-700',
      border: 'border-amber-200',
      iconColor: 'text-amber-500 fill-amber-500',
    },
    cold: {
      label: 'Cold',
      bg: 'bg-slate-100',
      text: 'text-slate-600',
      border: 'border-slate-200',
      iconColor: 'text-slate-400',
    },
  }[priority] || {
    label: priority,
    bg: 'bg-slate-100',
    text: 'text-slate-700',
    border: 'border-slate-200',
    iconColor: 'text-slate-400',
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-medium border ${config.bg} ${config.text} ${config.border} ${className}`}
    >
      {showIcon && <Flame size={12} className={`mr-1 ${config.iconColor}`} />}
      {config.label}
    </span>
  );
};

