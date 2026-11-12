import React from 'react';
import { PipelineStage } from '../../../types';
import { getStageLabel } from '../../../lib/formatters';

interface LeadStageBadgeProps {
  stage: PipelineStage;
  className?: string;
  size?: 'sm' | 'md';
}

export const LeadStageBadge: React.FC<LeadStageBadgeProps> = ({ stage, className = '', size = 'sm' }) => {
  const getBadgeStyle = (s: PipelineStage) => {
    switch (s) {
      case 'new':
        return 'bg-slate-50 text-slate-700 border-slate-200';
      case 'contacted':
        return 'bg-blue-50 text-blue-700 border-blue-200';
      case 'qualified':
        return 'bg-indigo-50 text-indigo-700 border-indigo-200';
      case 'site_visit_scheduled':
        return 'bg-amber-50 text-amber-700 border-amber-200';
      case 'site_visit_conducted':
        return 'bg-orange-50 text-orange-700 border-orange-200';
      case 'negotiation':
        return 'bg-purple-50 text-purple-700 border-purple-200';
      case 'token_paid':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200';
      case 'booked':
        return 'bg-emerald-50 text-emerald-800 border-emerald-300 font-medium';
      case 'lost':
        return 'bg-rose-50 text-rose-700 border-rose-200';
      default:
        return 'bg-slate-50 text-slate-700 border-slate-200';
    }
  };

  const sizeClasses = size === 'sm' ? 'px-1.5 py-0.5 text-[11px]' : 'px-2 py-0.5 text-xs';

  return (
    <span
      className={`inline-flex items-center font-medium rounded border ${getBadgeStyle(
        stage
      )} ${sizeClasses} ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current mr-1 opacity-75" />
      {getStageLabel(stage)}
    </span>
  );
};
