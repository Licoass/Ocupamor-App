import React from 'react';
import { useData } from '../context/DataContext';
import { RefreshCw, CheckCircle2, AlertTriangle } from 'lucide-react';

export const RealtimeIndicator: React.FC = () => {
  const { syncStatus, fetchData } = useData();

  if (syncStatus === 'synced') {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 text-emerald-700 text-xs font-medium border border-emerald-100 shadow-sm transition-all duration-300">
        <CheckCircle2 size={14} className="text-emerald-500 pulse-soft" />
        <span>Sincronizado</span>
      </div>
    );
  }

  if (syncStatus === 'syncing') {
    return (
      <div className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-50 text-amber-700 text-xs font-medium border border-amber-100 shadow-sm transition-all duration-300">
        <RefreshCw size={14} className="text-amber-500 animate-spin" />
        <span>Sincronizando...</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-rose-50 text-rose-700 text-xs font-medium border border-rose-100 shadow-sm transition-all duration-300">
      <div className="flex items-center gap-1">
        <AlertTriangle size={14} className="text-rose-500" />
        <span>Problemas de conexión</span>
      </div>
      <button
        onClick={fetchData}
        className="px-2 py-0.5 rounded bg-rose-200/50 hover:bg-rose-200 hover:text-rose-800 transition-colors duration-150 font-bold"
      >
        Reintentar
      </button>
    </div>
  );
};
