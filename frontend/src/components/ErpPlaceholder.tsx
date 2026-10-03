import React from 'react';
import { Construction } from 'lucide-react';

interface Props {
  title: string;
}

export const ErpPlaceholder: React.FC<Props> = ({ title }) => {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[60vh] animate-in fade-in duration-500">
      <div className="w-16 h-16 bg-blue-50 text-blue-500 rounded-2xl flex items-center justify-center mb-6 shadow-sm">
        <Construction className="w-8 h-8" />
      </div>
      <h2 className="text-2xl font-bold text-slate-800 mb-2">{title}</h2>
      <p className="text-slate-500 max-w-md text-center">
        This module is currently being built out as part of the Educational ERP integration phase.
      </p>
    </div>
  );
};
