import React, { useState, useEffect, useRef } from 'react';
import type { Publication, PublicationFormat, PublicationStatus } from '../types';
import { useData } from '../context/DataContext';
import { X, Check, AlertCircle, RefreshCw, ChevronDown, ChevronUp } from 'lucide-react';

interface PublicationModalProps {
  publication: Publication | null; // null if creating a new one
  defaultMonth?: number;
  defaultYear?: number;
  onClose: () => void;
}

export const PublicationModal: React.FC<PublicationModalProps> = ({
  publication,
  defaultMonth = new Date().getMonth() + 1,
  defaultYear = new Date().getFullYear(),
  onClose
}) => {
  const { 
    savePublication, 
    specialties, 
    specialists, 
    setActiveEditing, 
    conflictNotification, 
    setConflictNotification 
  } = useData();

  // Local form state
  const [formState, setFormState] = useState<Partial<Publication>>({
    titulo: '',
    descripcion: '',
    deadline: '',
    formato: 'feed' as PublicationFormat,
    especialidad_id: '',
    especialistas_asignados: [],
    estado: 'Pendiente' as PublicationStatus,
    notas_internas: '',
    url_drive_revision: '',
    mes: defaultMonth,
    anio: defaultYear
  });

  const [saveState, setSaveState] = useState<'saved' | 'saving' | 'error'>('saved');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Specialists dropdown selection state
  const [isSpecDropdownOpen, setIsSpecDropdownOpen] = useState(false);
  const specDropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (specDropdownRef.current && !specDropdownRef.current.contains(event.target as Node)) {
        setIsSpecDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  // Track if there are unsaved changes that need to be flushed
  const isDirtyRef = useRef(false);
  const formStateRef = useRef(formState);
  
  useEffect(() => {
    formStateRef.current = formState;
  }, [formState]);

  // Load publication details if editing
  useEffect(() => {
    if (publication) {
      setFormState({
        id: publication.id,
        titulo: publication.titulo || '',
        descripcion: publication.descripcion || '',
        deadline: publication.deadline || '',
        formato: publication.formato || 'feed',
        especialidad_id: publication.especialidad_id || '',
        especialistas_asignados: publication.especialistas_asignados || [],
        estado: publication.estado || 'Pendiente',
        notas_internas: publication.notas_internas || '',
        url_drive_revision: publication.url_drive_revision || '',
        mes: publication.mes,
        anio: publication.anio
      });
    } else {
      // Set default specialty if available
      const defaultSpecId = specialties[0]?.id || '';
      setFormState(prev => ({
        ...prev,
        especialidad_id: defaultSpecId
      }));
    }
  }, [publication, specialties]);

  // Conflict Resolution: If another user modified this record, update local state
  useEffect(() => {
    if (conflictNotification && publication) {
      // Find updated publication in the list (context has updated it)
      // For simplicity, we let the user know and we can reload the field
      alert(`Conflicto de Sincronización: ${conflictNotification}`);
      setConflictNotification(null);
    }
  }, [conflictNotification, publication]);

  const handleSave = async () => {
    setSaveState('saving');
    const current = formState;
    if (!current.titulo || !current.especialidad_id) {
      setSaveState('error');
      setErrorMessage('Título y Especialidad son requeridos.');
      return;
    }

    setErrorMessage(null);
    const success = await savePublication(current);
    if (success) {
      setSaveState('saved');
      onClose();
    } else {
      setSaveState('error');
    }
  };

  const handleChange = (field: keyof Publication, value: any) => {
    isDirtyRef.current = true;
    setFormState(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleInputFocus = (field: keyof Publication) => {
    if (publication?.id) {
      setActiveEditing({
        id: publication.id,
        type: 'publication',
        field: String(field)
      });
    }
  };

  const handleInputBlur = () => {
    setActiveEditing(null);
  };

  // Toggle specialist assignment in the array
  const handleToggleSpecialist = (specId: string) => {
    const currentList = formState.especialistas_asignados || [];
    let newList;
    if (currentList.includes(specId)) {
      newList = currentList.filter(id => id !== specId);
    } else {
      newList = [...currentList, specId];
    }
    handleChange('especialistas_asignados', newList);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-0 md:p-4">
      {/* Modal Card */}
      <div className="w-full h-full md:h-auto md:max-h-[90vh] md:max-w-2xl bg-white rounded-none md:rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
          <div>
            <h2 className="text-base font-bold text-slate-800">
              {publication ? 'Editar Publicación' : 'Agregar Nueva Publicación'}
            </h2>
            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
              {publication ? 'Formulario de Edición' : 'Formulario de Creación'}
            </p>
          </div>
          <button 
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-50 rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Form Body */}
        <div className="flex-1 p-6 overflow-y-auto space-y-5 bg-slate-50/50">
          
          {/* Title input */}
          <div className="space-y-1.5 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
              Título del Diseño *
            </label>
            <input
              type="text"
              value={formState.titulo || ''}
              onChange={(e) => handleChange('titulo', e.target.value)}
              onFocus={() => handleInputFocus('titulo')}
              onBlur={handleInputBlur}
              placeholder="Ej. Tips de Integración Sensorial en Casa"
              className="w-full py-2.5 px-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-moradoDesarrollo/10 focus:border-brand-moradoDesarrollo transition-all"
              required
            />
          </div>

          {/* Grid fields */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Format select */}
            <div className="space-y-1.5 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Formato
              </label>
              <select
                value={formState.formato || 'feed'}
                onChange={(e) => handleChange('formato', e.target.value as PublicationFormat)}
                className="w-full py-2.5 px-3 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-moradoDesarrollo/10 focus:border-brand-moradoDesarrollo transition-all"
              >
                <option value="feed">📸 Feed / Post Estático</option>
                <option value="story">📱 Story</option>
                <option value="carrusel">🎞️ Carrusel</option>
                <option value="video">🎥 Video / Reel</option>
              </select>
            </div>

            {/* Specialty select */}
            <div className="space-y-1.5 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Especialidad *
              </label>
              <select
                value={formState.especialidad_id || ''}
                onChange={(e) => handleChange('especialidad_id', e.target.value)}
                className="w-full py-2.5 px-3 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-moradoDesarrollo/10 focus:border-brand-moradoDesarrollo transition-all"
                required
              >
                <option value="" disabled>Seleccione especialidad</option>
                {specialties.map(spec => (
                  <option key={spec.id} value={spec.id}>
                    {spec.nombre}
                  </option>
                ))}
              </select>
            </div>

            {/* Date picker */}
            <div className="space-y-1.5 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Fecha de Publicación *
              </label>
              <input
                type="date"
                value={formState.deadline || ''}
                onChange={(e) => handleChange('deadline', e.target.value)}
                onFocus={() => handleInputFocus('deadline')}
                onBlur={handleInputBlur}
                className="w-full py-2.5 px-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-moradoDesarrollo/10 focus:border-brand-moradoDesarrollo transition-all"
                required
              />
            </div>

            {/* Status select */}
            <div className="space-y-1.5 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Estado
              </label>
              <select
                value={formState.estado || 'Pendiente'}
                onChange={(e) => handleChange('estado', e.target.value as PublicationStatus)}
                className="w-full py-2.5 px-3 rounded-xl border border-slate-200 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-brand-moradoDesarrollo/10 focus:border-brand-moradoDesarrollo transition-all"
              >
                <option value="Pendiente">⚠️ Pendiente</option>
                <option value="Diseñado">🎨 Diseñado / En Proceso</option>
                <option value="Aprobado">✅ Aprobado</option>
                <option value="Publicado">🚀 Publicado</option>
              </select>
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
              Descripción / Copys del Post
            </label>
            <textarea
              value={formState.descripcion || ''}
              onChange={(e) => handleChange('descripcion', e.target.value)}
              onFocus={() => handleInputFocus('descripcion')}
              onBlur={handleInputBlur}
              rows={3}
              placeholder="Escriba los copys o detalles del diseño"
              className="w-full py-2.5 px-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-moradoDesarrollo/10 focus:border-brand-moradoDesarrollo transition-all"
            />
          </div>

          {/* Specialists multi-select */}
          <div className="space-y-1.5 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block mb-2">
              Especialistas Asignados
            </label>
            
            {/* Custom Premium Dropdown Container */}
            <div ref={specDropdownRef} className="relative">
              {/* Trigger Input-Like Bar */}
              <div 
                onClick={() => setIsSpecDropdownOpen(!isSpecDropdownOpen)}
                className="w-full min-h-[42px] py-2 px-3 rounded-xl border border-slate-200 text-sm bg-white focus-within:ring-2 focus-within:ring-brand-moradoDesarrollo/10 focus-within:border-brand-moradoDesarrollo transition-all flex items-center justify-between gap-2 cursor-pointer select-none"
              >
                <div className="flex flex-wrap gap-1.5 items-center">
                  {(formState.especialistas_asignados || []).length === 0 ? (
                    <span className="text-slate-400 text-xs font-medium">Seleccionar especialistas...</span>
                  ) : (
                    specialists
                      .filter(s => formState.especialistas_asignados?.includes(s.id))
                      .map(spec => (
                        <div 
                          key={spec.id} 
                          className="flex items-center gap-1 bg-brand-moradoDesarrollo/10 border border-brand-moradoDesarrollo/20 text-brand-moradoDesarrollo text-xs font-bold px-2 py-0.5 rounded-lg shrink-0"
                          onClick={(e) => e.stopPropagation()} // Prevent opening dropdown when clicking on chip
                        >
                          <div className="h-5 w-5 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden shrink-0">
                            {spec.foto_perfil ? (
                              <img src={spec.foto_perfil} alt={spec.nombre_completo} className="h-full w-full object-cover" />
                            ) : (
                              <span className="text-[7px] font-bold text-slate-500">
                                {spec.nombre_completo.split(' ').pop()?.substring(0, 2).toUpperCase() || 'SP'}
                              </span>
                            )}
                          </div>
                          <span className="max-w-[180px] truncate text-[11px] font-bold">
                            {spec.nombre_completo} <span className="text-[9px] font-semibold text-slate-400">({spec.especialidades?.nombre || 'General'})</span>
                          </span>
                          <button
                            type="button"
                            onClick={() => handleToggleSpecialist(spec.id)}
                            className="text-brand-moradoDesarrollo hover:text-rose-600 transition-colors ml-0.5 p-0.5"
                          >
                            <X size={10} />
                          </button>
                        </div>
                      ))
                  )}
                </div>
                <div className="text-slate-400 shrink-0">
                  {isSpecDropdownOpen ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </div>
              </div>

              {/* Absolute Dropdown Panel */}
              {isSpecDropdownOpen && (
                <div className="absolute left-0 right-0 mt-1 bg-white border border-slate-200/80 rounded-xl shadow-xl z-50 max-h-48 overflow-y-auto p-1.5 space-y-0.5 animate-in fade-in slide-in-from-top-1 duration-150">
                  {specialists.map(spec => {
                    const isSelected = formState.especialistas_asignados?.includes(spec.id);
                    return (
                      <div
                        key={spec.id}
                        onClick={() => handleToggleSpecialist(spec.id)}
                        className={`
                          flex items-center justify-between p-2 rounded-lg text-xs font-semibold cursor-pointer select-none transition-colors
                          ${isSelected 
                            ? 'bg-brand-moradoDesarrollo/5 text-brand-moradoDesarrollo' 
                            : 'text-slate-600 hover:bg-slate-50'
                          }
                        `}
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <div className="h-5 w-5 rounded-full bg-slate-100 flex items-center justify-center overflow-hidden shrink-0">
                            {spec.foto_perfil ? (
                              <img src={spec.foto_perfil} alt={spec.nombre_completo} className="h-full w-full object-cover" />
                            ) : (
                              <span className="text-[8px] font-bold text-slate-500">
                                {spec.nombre_completo.split(' ').pop()?.substring(0, 2).toUpperCase() || 'SP'}
                              </span>
                            )}
                          </div>
                          <span className="truncate">
                            {spec.nombre_completo} <span className="text-[10px] text-slate-400 font-normal ml-1">({spec.especialidades?.nombre || 'General'})</span>
                          </span>
                        </div>
                        <div className="flex items-center shrink-0 ml-2">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            readOnly
                            className="h-3.5 w-3.5 rounded border-slate-300 text-brand-moradoDesarrollo focus:ring-brand-moradoDesarrollo"
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          {/* Drive link & Internal notes */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Drive link */}
            <div className="space-y-1.5 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Enlace del Diseño / Revisión
              </label>
              <input
                type="url"
                value={formState.url_drive_revision || ''}
                onChange={(e) => handleChange('url_drive_revision', e.target.value)}
                onFocus={() => handleInputFocus('url_drive_revision')}
                onBlur={handleInputBlur}
                placeholder="Ej. https://canva.link/... o link de Drive"
                className="w-full py-2.5 px-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-moradoDesarrollo/10 focus:border-brand-moradoDesarrollo transition-all"
              />
            </div>

            {/* Internal notes */}
            <div className="space-y-1.5 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Notas Internas
              </label>
              <textarea
                value={formState.notas_internas || ''}
                onChange={(e) => handleChange('notas_internas', e.target.value)}
                onFocus={() => handleInputFocus('notas_internas')}
                onBlur={handleInputBlur}
                rows={1}
                placeholder="Ej. Revisar copys finales"
                className="w-full py-2.5 px-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-moradoDesarrollo/10 focus:border-brand-moradoDesarrollo transition-all"
              />
            </div>
          </div>

          {errorMessage && (
            <div className="flex items-center gap-2 p-3.5 rounded-xl bg-rose-50 text-rose-700 text-xs font-semibold border border-rose-100">
              <AlertCircle size={16} className="text-rose-500 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between bg-white shrink-0">
          {/* Status Indicator */}
          <div className="flex items-center gap-1.5 text-xs font-semibold">
            {saveState === 'saved' && (
              <span className="flex items-center gap-1 text-emerald-600">
                <Check size={14} />
                <span>Guardado</span>
              </span>
            )}
            {saveState === 'saving' && (
              <span className="flex items-center gap-1 text-amber-600">
                <RefreshCw size={14} className="animate-spin" />
                <span>Guardando...</span>
              </span>
            )}
            {saveState === 'error' && (
              <span className="flex items-center gap-1 text-rose-600">
                <AlertCircle size={14} />
                <span>Sin guardar</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={saveState === 'saving'}
              className="bg-brand-moradoDesarrollo hover:bg-brand-moradoDesarrollo/95 disabled:bg-slate-300 text-white font-bold px-5 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-sm shadow-brand-moradoDesarrollo/10 transition-colors"
            >
              {saveState === 'saving' ? (
                <>
                  <RefreshCw size={12} className="animate-spin" />
                  <span>Guardando...</span>
                </>
              ) : (
                <span>Guardar</span>
              )}
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
