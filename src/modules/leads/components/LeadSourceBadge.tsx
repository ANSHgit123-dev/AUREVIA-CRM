import React from 'react';
import { LeadSource } from '../../../types';
import { getSourceLabel } from '../../../lib/formatters';
import { Globe, Megaphone, Building2, Users, Compass, Share2 } from 'lucide-react';

interface LeadSourceBadgeProps {
  source: LeadSource;
  className?: string;
}

export const LeadSourceBadge: React.FC<LeadSourceBadgeProps> = ({ source, className = '' }) => {
  const getIcon = (s: LeadSource) => {
    switch (s) {
      case 'website':
        return <Globe size={11} className="mr-1 text-sky-600" />;
      case 'google_ads':
      case 'google_search':
        return <Megaphone size={11} className="mr-1 text-blue-600" />;
      case 'meta_ads':
        return <Megaphone size={11} className="mr-1 text-indigo-600" />;
      case '99acres':
      case 'magicbricks':
      case 'real_estate_portal':
        return <Building2 size={11} className="mr-1 text-amber-600" />;
      case 'channel_partner':
        return <Share2 size={11} className="mr-1 text-emerald-600" />;
      case 'walk_in':
        return <Compass size={11} className="mr-1 text-purple-600" />;
      case 'referral':
        return <Users size={11} className="mr-1 text-teal-600" />;
      default:
        return <Globe size={11} className="mr-1 text-slate-500" />;
    }
  };

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium bg-slate-50 text-slate-700 border border-slate-200/80 ${className}`}
    >
      {getIcon(source)}
      <span className="truncate">{getSourceLabel(source)}</span>
    </span>
  );
};

