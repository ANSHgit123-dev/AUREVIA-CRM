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
    <div className="bg-white rounded-md border border-[#E5E8EB] p-12 text-center shadow-sm max-w-2xl mx-auto my-12">
      <div className="h-12 w-12 rounded-md bg-[#1E293B] text-white flex items-center justify-center mx-auto mb-4 shadow-sm">
        <Icon size={24} />
      </div>
      <h2 className="text-lg font-semibold text-[#1C2024]">{title}</h2>
      <p className="text-xs text-[#60646C] mt-2 max-w-md mx-auto">{description}</p>
      <div className="mt-6 inline-flex items-center gap-2 px-2.5 py-1 rounded bg-[#F1F3F5] border border-[#E5E8EB] text-[11px] font-mono text-[#60646C]">
        <span className="h-1.5 w-1.5 rounded-full bg-[#1E293B]" />
        <span>Scheduled for {targetPhase}</span>
      </div>
    </div>
  );
};

