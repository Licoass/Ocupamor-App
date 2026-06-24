import React, { useState } from 'react';
import type { Specialist, Publication } from '../types';
import { useData } from '../context/DataContext';
import { X, Calendar, FolderOpen, AlertCircle, Bookmark } from 'lucide-react';

const InstagramIcon: React.FC<React.SVGProps<SVGSVGElement>> = (props) => (
  <svg
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    {...props}
  >
    <rect x="2" y="2" width="20" height="20" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" y1="6.5" x2="17.51" y2="6.5" />
  </svg>
);

interface SpecialistDetailsModalProps {
  specialist: Specialist;
  onClose: () => void;
}

export const SpecialistDetailsModal: React.FC<SpecialistDetailsModalProps> = ({
  specialist,
  onClose
}) => {
  const { publications, setActiveTab, setFocusedPublicationId } = useData();
  const [activeMonthTab, setActiveMonthTab] = useState<number>(new Date().getMonth() + 1);

  const months = [
    { value: 1, label: 'Ene' },
    { value: 2, label: 'Feb' },
    { value: 3, label: 'Mar' },
    { value: 4, label: 'Abr' },
    { value: 5, label: 'May' },
    { value: 6, label: 'Jun' },
    { value: 7, label: 'Jul' },
    { value: 8, label: 'Ago' },
    { value: 9, label: 'Sep' },
    { value: 10, label: 'Oct' },
    { value: 11, label: 'Nov' },
    { value: 12, label: 'Dic' }
  ];

  // Resolve birthday
  const formatBirthday = (dateStr: string | null) => {
    if (!dateStr) return 'N/A';
    try {
      const date = new Date(dateStr + 'T00:00:00');
      return date.toLocaleDateString('es-VE', { day: 'numeric', month: 'long' });
    } catch (e) {
      return dateStr;
    }
  };

  // Filter and group activities
  const specialistPubs = publications.filter(p => 
    p.especialistas_asignados?.includes(specialist.id)
  );

  const activePubs = specialistPubs
    .filter(p => p.mes === activeMonthTab)
    .sort((a, b) => b.anio - a.anio || (a.deadline && b.deadline ? a.deadline.localeCompare(b.deadline) : 0));

  const handleInstagramClick = () => {
    if (!specialist.instagram) return;
    const cleanUser = specialist.instagram.replace('@', '').trim();
    window.open(`https://instagram.com/${cleanUser}`, '_blank', 'noopener,noreferrer');
  };

  const handleActivityClick = (pub: Publication) => {
    setFocusedPublicationId(pub.id);
    setActiveTab('planificador');
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      {/* Modal Card Container */}
      <div className="w-full max-w-xl bg-white rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200 max-h-[85vh]">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
          <div className="flex items-center gap-3">
            <div className="h-12 w-12 rounded-full bg-slate-100 border-2 border-white shadow-sm flex items-center justify-center overflow-hidden shrink-0">
              {specialist.foto_perfil ? (
                <img 
                  src={specialist.foto_perfil} 
                  alt={specialist.nombre_completo} 
                  className="h-full w-full object-cover" 
                />
              ) : (
                <span className="text-sm font-bold text-slate-500">
                  {specialist.nombre_completo.split(' ').pop()?.substring(0, 2).toUpperCase() || 'SP'}
                </span>
              )}
            </div>
            <div>
              <h2 className="text-sm font-bold text-slate-800 leading-tight">
                {specialist.nombre_completo}
              </h2>
              <span className="text-[10px] text-slate-400 font-bold block mt-0.5">
                {specialist.federacion_matricula || 'MPPS:'}
              </span>
            </div>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Modal Body */}
        <div className="flex-1 p-6 overflow-y-auto space-y-5 bg-slate-50/50 select-text">
          
          {/* Specialties Badges */}
          <div className="flex flex-wrap gap-1.5 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block w-full mb-1">Especialidades Asignadas</span>
            {specialist.especialidades && specialist.especialidades.length > 0 ? (
              specialist.especialidades.map(spec => (
                <span 
                  key={spec.id}
                  className="text-[10px] font-bold px-2.5 py-0.5 rounded-full border"
                  style={{ 
                    color: spec.color_tema, 
                    borderColor: `${spec.color_tema}30`, 
                    backgroundColor: `${spec.color_tema}08` 
                  }}
                >
                  {spec.nombre}
                </span>
              ))
            ) : (
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full border text-slate-400 border-slate-200 bg-slate-50">
                General
              </span>
            )}
          </div>

          {/* Grid fields for credentials */}
          <div className="grid grid-cols-2 gap-4">
            
            {/* Instagram */}
            <div className="space-y-1 bg-white p-3 rounded-2xl border border-slate-100 shadow-sm flex flex-col justify-between">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Instagram</span>
              {specialist.instagram ? (
                <button 
                  onClick={handleInstagramClick}
                  className="flex items-center gap-1 text-xs font-bold text-brand-moradoDesarrollo hover:underline mt-1 text-left"
                >
                  <InstagramIcon className="w-4 h-4 shrink-0" />
                  <span className="truncate">@{specialist.instagram.replace('@', '')}</span>
                </button>
              ) : (
                <span className="text-xs text-slate-400 font-semibold italic mt-1">Sin Instagram</span>
              )}
            </div>

            {/* Birthday */}
            <div className="space-y-1 bg-white p-3 rounded-2xl border border-slate-100 shadow-sm">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Fecha de Cumpleaños</span>
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-700 mt-1">
                <Calendar size={14} className="text-slate-400 shrink-0" />
                <span>{formatBirthday(specialist.fecha_cumpleanos)}</span>
              </div>
            </div>
          </div>

          {/* Personal Drive folder link */}
          <div className="space-y-1 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider">Carpeta de Google Drive Personal</span>
            <div className="flex items-center justify-between gap-3 mt-1 bg-slate-50 border border-slate-100 rounded-xl p-2.5">
              <span className="text-xs font-semibold text-slate-600 truncate select-all flex-1" title={specialist.url_drive_personal}>
                {specialist.url_drive_personal}
              </span>
              <a
                href={specialist.url_drive_personal}
                target="_blank"
                rel="noopener noreferrer"
                className="p-1.5 text-brand-fucsiaEmocion hover:bg-white rounded-lg transition-all shrink-0 border border-slate-100/50 shadow-sm"
                title="Abrir carpeta en Drive"
              >
                <FolderOpen size={16} />
              </a>
            </div>
          </div>

          {/* Enero - Diciembre Activities Breakdown */}
          <div className="space-y-3 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
            <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wider block">Desglose Mensual de Actividades</span>
            
            {/* Month Tabs Bar */}
            <div className="flex items-center gap-1 overflow-x-auto pb-1.5 scrollbar-none border-b border-slate-100 shrink-0">
              {months.map(m => {
                const isActive = activeMonthTab === m.value;
                const monthHasPubs = specialistPubs.some(p => p.mes === m.value);
                return (
                  <button
                    key={m.value}
                    onClick={() => setActiveMonthTab(m.value)}
                    className={`
                      px-3 py-1.5 rounded-lg text-[11px] font-bold shrink-0 transition-all relative
                      ${isActive 
                        ? 'bg-brand-moradoDesarrollo text-white shadow-sm shadow-brand-moradoDesarrollo/10' 
                        : 'text-slate-500 hover:bg-slate-50'
                      }
                    `}
                  >
                    <span>{m.label}</span>
                    {monthHasPubs && (
                      <span 
                        className={`
                          absolute top-0.5 right-0.5 h-1.5 w-1.5 rounded-full
                          ${isActive ? 'bg-white' : 'bg-brand-moradoDesarrollo'}
                        `} 
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {/* List of Activities for Active Month */}
            <div className="space-y-2 pt-1">
              {activePubs.length > 0 ? (
                activePubs.map(pub => {
                  const themeColor = pub.especialidades?.color_tema || '#94a3b8';
                  return (
                    <div 
                      key={pub.id}
                      onClick={() => handleActivityClick(pub)}
                      className="flex items-center justify-between p-3 rounded-xl border border-slate-100 hover:border-brand-moradoDesarrollo/20 bg-slate-50/50 hover:bg-brand-moradoDesarrollo/[0.02] cursor-pointer transition-all select-none group"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <Bookmark 
                          size={14} 
                          style={{ color: themeColor }} 
                          className="shrink-0 group-hover:scale-110 transition-transform" 
                        />
                        <div className="min-w-0">
                          <span className="text-xs font-bold text-slate-700 block truncate leading-tight group-hover:text-brand-moradoDesarrollo transition-colors">
                            {pub.titulo}
                          </span>
                          <span className="text-[9px] text-slate-400 font-bold uppercase mt-0.5 block">
                            {pub.formato} • {pub.estado} • {pub.anio}
                          </span>
                        </div>
                      </div>
                      <span className="text-[10px] font-semibold text-brand-moradoDesarrollo bg-brand-moradoDesarrollo/5 px-2 py-0.5 rounded-lg shrink-0 opacity-0 group-hover:opacity-100 transition-opacity">
                        Ir a diseño ➜
                      </span>
                    </div>
                  );
                })
              ) : (
                <div className="flex flex-col items-center justify-center p-6 text-center text-slate-400 border border-dashed border-slate-200 rounded-xl bg-slate-50/20">
                  <AlertCircle size={20} className="text-slate-300 mb-1 shrink-0" />
                  <span className="text-xs font-semibold">Sin actividades asignadas en este mes</span>
                </div>
              )}
            </div>

          </div>

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-end bg-white shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-100 hover:bg-slate-200 rounded-xl text-xs font-bold text-slate-600 transition-colors"
          >
            Cerrar
          </button>
        </div>

      </div>
    </div>
  );
};
