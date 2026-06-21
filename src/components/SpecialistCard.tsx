import React from 'react';
import type { Specialist } from '../types';
import { FolderOpen, Edit3, Trash2, Calendar, CheckCircle2, AlertCircle } from 'lucide-react';

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

interface SpecialistCardProps {
  specialist: Specialist;
  onEdit: (spec: Specialist) => void;
  onDelete: (id: string) => void;
}

export const SpecialistCard: React.FC<SpecialistCardProps> = ({
  specialist,
  onEdit,
  onDelete
}) => {
  const specialtyColor = specialist.especialidades?.color_tema || '#94a3b8';
  const hasBirthday = !!specialist.fecha_cumpleanos;

  // Instagram URL resolver
  const handleInstagramClick = (e: React.MouseEvent) => {
    if (!specialist.instagram) {
      e.preventDefault();
      return;
    }
    const cleanUser = specialist.instagram.replace('@', '').trim();
    window.open(`https://instagram.com/${cleanUser}`, '_blank', 'noopener,noreferrer');
  };

  // Format date to "11 de Julio"
  const formatBirthday = (dateStr: string | null) => {
    if (!dateStr) return '';
    try {
      const date = new Date(dateStr + 'T00:00:00');
      return date.toLocaleDateString('es-VE', { day: 'numeric', month: 'long' });
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <div className="glass-card bg-white p-5 rounded-2xl border border-slate-100 flex flex-col justify-between hover-lift hover-glow h-full">
      <div className="space-y-4">
        {/* Top: Avatar, Name & Status */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            {/* Profile Avatar (48x48px circle) */}
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

            {/* Name & Registry */}
            <div>
              <h3 className="font-display font-bold text-slate-800 text-sm leading-tight">
                {specialist.nombre_completo}
              </h3>
              <span className="text-[10px] text-slate-400 font-bold block mt-0.5">
                {specialist.federacion_matricula || 'MPPS:'}
              </span>
            </div>
          </div>

          {/* Validation Status Indicator */}
          {hasBirthday ? (
            <div className="flex items-center text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-full text-[9px] font-bold" title="Perfil completo">
              <CheckCircle2 size={12} className="mr-0.5" />
              <span>Completo</span>
            </div>
          ) : (
            <div className="flex items-center text-rose-600 bg-rose-50 border border-rose-100 px-2 py-0.5 rounded-full text-[9px] font-bold pulse-soft" title="Falta fecha de cumpleaños">
              <AlertCircle size={12} className="mr-0.5" />
              <span>Sin Cumpleaños</span>
            </div>
          )}
        </div>

        {/* Specialty badge */}
        <div>
          <span 
            className="text-[10px] font-bold px-2 py-0.5 rounded-full border inline-block"
            style={{ 
              color: specialtyColor, 
              borderColor: `${specialtyColor}30`, 
              backgroundColor: `${specialtyColor}08` 
            }}
          >
            {specialist.especialidades?.nombre || 'General'}
          </span>
        </div>

        {/* Birthday information if present */}
        {hasBirthday && (
          <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-500">
            <Calendar size={13} className="text-slate-400" />
            <span>Cumpleaños: {formatBirthday(specialist.fecha_cumpleanos)}</span>
          </div>
        )}
      </div>

      <div className="pt-4 border-t border-slate-50 mt-4 flex items-center justify-between gap-2">
        {/* Instagram Account */}
        {specialist.instagram ? (
          <button 
            onClick={handleInstagramClick}
            className="flex items-center gap-1 text-xs font-semibold text-brand-moradoDesarrollo hover:underline"
          >
            <InstagramIcon className="w-3.5 h-3.5" />
            <span className="truncate max-w-[120px]">@{specialist.instagram.replace('@', '')}</span>
          </button>
        ) : (
          <span className="text-xs text-slate-400 italic">Sin Instagram</span>
        )}

        {/* Actions bar */}
        <div className="flex items-center gap-1 shrink-0">
          {/* Drive Personal Link */}
          <a
            href={specialist.url_drive_personal}
            target="_blank"
            rel="noopener noreferrer"
            className="p-1.5 text-slate-400 hover:text-brand-fucsiaEmocion hover:bg-slate-50 rounded-lg transition-colors"
            title="Carpeta Google Drive"
          >
            <FolderOpen size={16} />
          </a>
          <button
            onClick={() => onEdit(specialist)}
            className="p-1.5 text-slate-400 hover:text-brand-moradoDesarrollo hover:bg-slate-50 rounded-lg transition-colors"
            title="Editar especialista"
          >
            <Edit3 size={15} />
          </button>
          <button
            onClick={() => onDelete(specialist.id)}
            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-50 rounded-lg transition-colors"
            title="Eliminar especialista"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </div>
    </div>
  );
};
