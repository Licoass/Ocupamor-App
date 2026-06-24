import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import type { Specialist } from '../types';
import { SpecialistCard } from '../components/SpecialistCard';
import { SpecialistModal } from '../components/SpecialistModal';
import { SpecialistDetailsModal } from '../components/SpecialistDetailsModal';
import { Plus, Users } from 'lucide-react';

export const SpecialistsDirectory: React.FC = () => {
  const { specialists, specialties, deleteSpecialist } = useData();

  // Active specialty filter ('all' or specialty UUID)
  const [activeSpecialtyId, setActiveSpecialtyId] = useState<string>('all');

  // Modal control
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingSpec, setEditingSpec] = useState<Specialist | null>(null);
  const [selectedSpecForDetails, setSelectedSpecForDetails] = useState<Specialist | null>(null);

  // Compute specialist counts per specialty
  const specialtyCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    specialists.forEach(s => {
      const ids = s.especialidades_ids && s.especialidades_ids.length > 0 
        ? s.especialidades_ids 
        : (s.especialidad_id ? [s.especialidad_id] : []);
      
      ids.forEach(id => {
        counts[id] = (counts[id] || 0) + 1;
      });
    });
    return counts;
  }, [specialists]);

  // Filter specialists list
  const filteredSpecs = useMemo(() => {
    if (activeSpecialtyId === 'all') return specialists;
    return specialists.filter(s => {
      const ids = s.especialidades_ids && s.especialidades_ids.length > 0 
        ? s.especialidades_ids 
        : (s.especialidad_id ? [s.especialidad_id] : []);
      return ids.includes(activeSpecialtyId);
    });
  }, [specialists, activeSpecialtyId]);

  const handleEdit = (spec: Specialist) => {
    setEditingSpec(spec);
    setIsModalOpen(true);
  };

  const handleCreate = () => {
    setEditingSpec(null);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('¿Está seguro de que desea eliminar este especialista del directorio?')) {
      await deleteSpecialist(id);
    }
  };

  return (
    <div className="flex flex-col lg:flex-row gap-6 items-start">
      
      {/* LEFT SIDEBAR: Specialty List (Desktop) & Top Tabs (Mobile) */}
      
      {/* Desktop Sidebar (visible >= lg) */}
      <aside className="hidden lg:block w-64 bg-white rounded-2xl border border-slate-100 shadow-sm p-4 shrink-0">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider px-3 mb-3">
          Especialidades
        </h3>
        <nav className="space-y-1">
          <button
            onClick={() => setActiveSpecialtyId('all')}
            className={`
              w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-bold transition-all
              ${activeSpecialtyId === 'all' 
                ? 'bg-slate-100 text-slate-800' 
                : 'text-slate-600 hover:bg-slate-50'
              }
            `}
          >
            <span>Todos los Especialistas</span>
            <span className="bg-slate-200 text-slate-600 px-2 py-0.5 rounded-full text-[9px] font-bold">
              {specialists.length}
            </span>
          </button>

          {specialties.map(spec => {
            const count = specialtyCounts[spec.id] || 0;
            const isActive = activeSpecialtyId === spec.id;
            return (
              <button
                key={spec.id}
                onClick={() => setActiveSpecialtyId(spec.id)}
                className={`
                  w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-xs font-semibold transition-all
                  ${isActive 
                    ? 'bg-slate-100 text-slate-800 font-bold' 
                    : 'text-slate-600 hover:bg-slate-50'
                  }
                `}
              >
                <div className="flex items-center gap-2">
                  <span 
                    className="h-2 w-2 rounded-full" 
                    style={{ backgroundColor: spec.color_tema }}
                  />
                  <span>{spec.nombre}</span>
                </div>
                <span 
                  className="px-2 py-0.5 rounded-full text-[9px] font-bold"
                  style={{ 
                    backgroundColor: isActive ? '#e2e8f0' : `${spec.color_tema}15`,
                    color: isActive ? '#475569' : spec.color_tema 
                  }}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Mobile Horizontal Tabs (visible < lg) */}
      <div className="lg:hidden w-full bg-white rounded-2xl border border-slate-100 shadow-sm p-3 overflow-x-auto flex items-center gap-1.5 scrollbar-none shrink-0">
        <button
          onClick={() => setActiveSpecialtyId('all')}
          className={`
            px-4 py-2 rounded-xl text-xs font-bold shrink-0 transition-all
            ${activeSpecialtyId === 'all' 
              ? 'bg-slate-100 text-slate-800' 
              : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
            }
          `}
        >
          Todos ({specialists.length})
        </button>
        {specialties.map(spec => {
          const count = specialtyCounts[spec.id] || 0;
          const isActive = activeSpecialtyId === spec.id;
          return (
            <button
              key={spec.id}
              onClick={() => setActiveSpecialtyId(spec.id)}
              className={`
                px-4 py-2 rounded-xl text-xs font-bold shrink-0 flex items-center gap-1.5 transition-all
                ${isActive 
                  ? 'bg-slate-100 text-slate-800' 
                  : 'bg-slate-50 text-slate-500 hover:bg-slate-100'
                }
              `}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ backgroundColor: spec.color_tema }} />
              <span>{spec.nombre} ({count})</span>
            </button>
          );
        })}
      </div>

      {/* MAIN CONTAINER: Specialists Grid */}
      <div className="flex-1 w-full space-y-4">
        
        {/* Top bar: Add button */}
        <div className="flex justify-between items-center bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
          <div>
            <h2 className="text-sm font-bold text-slate-700">
              {activeSpecialtyId === 'all' 
                ? 'Todos los Especialistas' 
                : specialties.find(s => s.id === activeSpecialtyId)?.nombre
              }
            </h2>
            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5">
              Listando {filteredSpecs.length} especialistas activos
            </p>
          </div>

          <button
            onClick={handleCreate}
            className="bg-brand-moradoDesarrollo hover:bg-brand-moradoDesarrollo/95 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 shadow-sm shadow-brand-moradoDesarrollo/10"
          >
            <Plus size={16} />
            <span>Agregar Especialista</span>
          </button>
        </div>

        {/* Specialists grid */}
        {filteredSpecs.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 items-start">
            {filteredSpecs.map((spec) => (
              <SpecialistCard
                key={spec.id}
                specialist={spec}
                onEdit={handleEdit}
                onDelete={handleDelete}
                onViewDetails={(s) => setSelectedSpecForDetails(s)}
              />
            ))}
          </div>
        ) : (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center text-slate-400">
            <Users size={40} className="mx-auto text-slate-300 mb-3" />
            <p className="font-semibold text-sm">No se encontraron especialistas en esta área.</p>
            <p className="text-xs text-slate-400 mt-1">Haga clic en "+ Agregar Especialista" para crear uno nuevo.</p>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {isModalOpen && (
        <SpecialistModal
          specialist={editingSpec}
          onClose={() => setIsModalOpen(false)}
        />
      )}

      {/* Details Modal Popup */}
      {selectedSpecForDetails && (
        <SpecialistDetailsModal
          specialist={selectedSpecForDetails}
          onClose={() => setSelectedSpecForDetails(null)}
        />
      )}

    </div>
  );
};
