import React from 'react';
import type { Publication, Specialist } from '../types';
import { Edit3, Trash2, Calendar, FileText, Film, Layers, Smartphone } from 'lucide-react';

interface PublicationCardProps {
  publication: Publication;
  allSpecialists: Specialist[];
  onEdit: (pub: Publication) => void;
  onDelete: (id: string) => void;
}

export const PublicationCard: React.FC<PublicationCardProps> = ({
  publication,
  allSpecialists,
  onEdit,
  onDelete
}) => {
  const specialtyColor = publication.especialidades?.color_tema || '#94a3b8';
  const format = publication.formato;
  const status = publication.estado;

  // Format icon resolver
  const getFormatIcon = () => {
    switch (format) {
      case 'story':
        return <Smartphone size={14} className="text-indigo-600" />;
      case 'carrusel':
        return <Layers size={14} className="text-amber-600" />;
      case 'video':
        return <Film size={14} className="text-rose-600" />;
      case 'feed':
      default:
        return <FileText size={14} className="text-emerald-600" />;
    }
  };

  const getFormatLabel = () => {
    switch (format) {
      case 'story': return 'Story';
      case 'carrusel': return 'Carrusel';
      case 'video': return 'Video';
      case 'feed':
      default: return 'Feed';
    }
  };

  // Status badge style resolver
  const getStatusStyles = () => {
    switch (status) {
      case 'Publicado':
        return 'bg-sky-50 text-sky-700 border-sky-100';
      case 'Aprobado':
        return 'bg-emerald-50 text-emerald-700 border-emerald-100';
      case 'Diseñado':
        return 'bg-purple-50 text-purple-700 border-purple-100';
      case 'Pendiente':
      default:
        return 'bg-amber-50 text-amber-700 border-amber-100';
    }
  };

  // Stacked avatars of assigned specialists
  const assignedSpecs = allSpecialists.filter(spec => 
    publication.especialistas_asignados?.includes(spec.id)
  );

  // Format date to local Spanish "SÁB, 11 de Jul"
  const formatDateSpanish = (dateStr: string | null) => {
    if (!dateStr) return 'Sin fecha';
    try {
      const date = new Date(dateStr + 'T00:00:00'); // avoid timezone offset issues
      const formatter = new Intl.DateTimeFormat('es-VE', {
        weekday: 'short',
        day: 'numeric',
        month: 'short'
      });
      const parts = formatter.formatToParts(date);
      let weekday = parts.find(p => p.type === 'weekday')?.value || '';
      let day = parts.find(p => p.type === 'day')?.value || '';
      let month = parts.find(p => p.type === 'month')?.value || '';
      
      // Capitalize first letters and format
      weekday = weekday.toUpperCase().replace('.', '');
      month = month.charAt(0).toUpperCase() + month.slice(1).replace('.', '');
      
      return `${weekday}, ${day} de ${month}`;
    } catch (e) {
      return dateStr;
    }
  };

  return (
    <div 
      className="glass-card flex flex-col justify-between p-5 rounded-2xl border-l-[6px] hover-lift hover-glow h-full"
      style={{ borderLeftColor: specialtyColor }}
    >
      <div className="space-y-3">
        {/* Top bar: Format & Date */}
        <div className="flex items-center justify-between text-xs font-semibold">
          <div className="flex items-center gap-1.5 px-2 py-0.5 bg-slate-100/60 rounded-md border border-slate-200/30 text-slate-600">
            {getFormatIcon()}
            <span>{getFormatLabel()}</span>
          </div>
          
          <div className="flex items-center gap-1 text-slate-400">
            <Calendar size={12} />
            <span>{formatDateSpanish(publication.deadline)}</span>
          </div>
        </div>

        {/* Title & Description */}
        <div>
          <h3 className="font-display font-bold text-slate-800 text-sm leading-snug line-clamp-2" title={publication.titulo}>
            {publication.titulo}
          </h3>
          {publication.descripcion && (
            <p className="text-slate-400 text-xs font-medium mt-1.5 line-clamp-3 leading-relaxed">
              {publication.descripcion}
            </p>
          )}
        </div>
      </div>

      <div className="space-y-4 pt-4 border-t border-slate-50 mt-4">
        {/* Specialty and status badges */}
        <div className="flex items-center justify-between gap-2">
          <span 
            className="text-[10px] font-bold px-2 py-0.5 rounded-full border"
            style={{ 
              color: specialtyColor, 
              borderColor: `${specialtyColor}30`, 
              backgroundColor: `${specialtyColor}08` 
            }}
          >
            {publication.especialidades?.nombre || 'General'}
          </span>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${getStatusStyles()}`}>
            {status}
          </span>
        </div>

        {/* Stacked avatars and action buttons */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex -space-x-2 overflow-hidden" title={`${assignedSpecs.length} especialistas asignados`}>
            {assignedSpecs.length > 0 ? (
              assignedSpecs.map((spec) => (
                <div 
                  key={spec.id}
                  className="inline-block h-6 w-6 rounded-full ring-2 ring-white bg-slate-100 flex items-center justify-center overflow-hidden"
                  title={spec.nombre_completo}
                >
                  {spec.foto_perfil ? (
                    <img 
                      src={spec.foto_perfil} 
                      alt={spec.nombre_completo} 
                      className="h-full w-full object-cover" 
                    />
                  ) : (
                    <span className="text-[9px] font-bold text-slate-500">
                      {spec.nombre_completo.split(' ').pop()?.substring(0, 2).toUpperCase() || 'SP'}
                    </span>
                  )}
                </div>
              ))
            ) : (
              <span className="text-[10px] text-slate-400 italic">Sin asignar</span>
            )}
          </div>

          {/* Action Buttons */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => onEdit(publication)}
              className="p-1.5 text-slate-400 hover:text-brand-moradoDesarrollo hover:bg-slate-50 rounded-lg transition-colors"
              title="Editar publicación"
            >
              <Edit3 size={15} />
            </button>
            <button
              onClick={() => onDelete(publication.id)}
              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-slate-50 rounded-lg transition-colors"
              title="Eliminar publicación"
            >
              <Trash2 size={15} />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
