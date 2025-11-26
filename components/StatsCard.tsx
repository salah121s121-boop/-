import React from 'react';
import { LucideIcon } from 'lucide-react';

interface StatsCardProps {
  label: string;
  value: string | number;
  unit?: string;
  icon: LucideIcon;
  color?: string;
}

const StatsCard: React.FC<StatsCardProps> = ({ label, value, unit, icon: Icon, color = "text-emerald-400" }) => {
  return (
    <div className="bg-gray-800 rounded-xl p-3 flex flex-col items-center justify-center border border-gray-700 shadow-lg">
      <div className={`p-2 rounded-full bg-gray-900/50 mb-2 ${color}`}>
        <Icon size={20} />
      </div>
      <span className="text-gray-400 text-xs mb-1 font-medium">{label}</span>
      <div className="font-mono font-bold text-lg text-white">
        {value}
        {unit && <span className="text-xs text-gray-500 ml-1">{unit}</span>}
      </div>
    </div>
  );
};

export default StatsCard;
