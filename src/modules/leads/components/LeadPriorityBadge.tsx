import React from 'react';

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
      bg: 'bg-red-50',
      text: 'text-red-700',
      border: 'border-red-200',
      dotColor: 'bg-red-600',
    },
    warm: {
      label: 'Warm',
      bg: 'bg-amber-50',
      text: 'text-amber-700',
      border: 'border-amber-200',
      dotColor: 'bg-amber-500',
    },
    cold: {
      label: 'Cold',
      bg: 'bg-slate-50',
      text: 'text-slate-600',
      border: 'border-slate-200',
      dotColor: 'bg-slate-400',
    },
  }[priority] || {
    label: priority,
    bg: 'bg-slate-50',
    text: 'text-slate-700',
    border: 'border-slate-200',
    dotColor: 'bg-slate-400',
  };

  return (
    <span
      className={`inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-medium border ${config.bg} ${config.text} ${config.border} ${className}`}
    >
      {showIcon && <span className={`w-1.5 h-1.5 rounded-full mr-1 ${config.dotColor}`} />}
      {config.label}
    </span>
  );
};
