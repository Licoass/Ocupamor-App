import React, { useState, useEffect, useRef } from 'react';
import type { Specialist } from '../types';
import { useData } from '../context/DataContext';
import { X, Check, AlertCircle, RefreshCw, Upload, User } from 'lucide-react';

interface SpecialistModalProps {
  specialist: Specialist | null; // null if creating a new one
  onClose: () => void;
}

export const SpecialistModal: React.FC<SpecialistModalProps> = ({
  specialist,
  onClose
}) => {
  const { 
    saveSpecialist, 
    specialties, 
    setActiveEditing, 
    conflictNotification, 
    setConflictNotification 
  } = useData();

  // Local form state
  const [formState, setFormState] = useState<Partial<Specialist>>({
    nombre_completo: '',
    especialidad_id: '',
    foto_perfil: '',
    instagram: '',
    federacion_matricula: 'MPPS:',
    fecha_cumpleanos: '',
    url_drive_personal: ''
  });

  const [saveState, setSaveState] = useState<'saved' | 'saving' | 'error'>('saved');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  // Track changes that need to be auto-saved
  const isDirtyRef = useRef(false);
  const formStateRef = useRef(formState);
  
  useEffect(() => {
    formStateRef.current = formState;
  }, [formState]);

  // Load specialist details if editing
  useEffect(() => {
    if (specialist) {
      setFormState({
        id: specialist.id,
        nombre_completo: specialist.nombre_completo || '',
        especialidad_id: specialist.especialidad_id || '',
        foto_perfil: specialist.foto_perfil || '',
        instagram: specialist.instagram || '',
        federacion_matricula: specialist.federacion_matricula || 'MPPS:',
        fecha_cumpleanos: specialist.fecha_cumpleanos || '',
        url_drive_personal: specialist.url_drive_personal || ''
      });
    } else {
      const defaultSpecId = specialties[0]?.id || '';
      setFormState(prev => ({
        ...prev,
        especialidad_id: defaultSpecId
      }));
    }
  }, [specialist, specialties]);

  // Conflict Resolution warning
  useEffect(() => {
    if (conflictNotification && specialist) {
      alert(`Conflicto de Sincronización: ${conflictNotification}`);
      setConflictNotification(null);
    }
  }, [conflictNotification, specialist]);

  const handleSave = async () => {
    setSaveState('saving');
    const current = formState;
    if (!current.nombre_completo || !current.especialidad_id || !current.url_drive_personal) {
      setSaveState('error');
      setErrorMessage('Nombre, Especialidad y Link de Drive son requeridos.');
      return;
    }

    // Validate Google Drive personal link
    if (!current.url_drive_personal.startsWith('https://drive.google.com/')) {
      setSaveState('error');
      setErrorMessage('El link de Drive personal debe comenzar con https://drive.google.com/');
      return;
    }

    setErrorMessage(null);
    const success = await saveSpecialist(current);
    if (success) {
      setSaveState('saved');
      onClose();
    } else {
      setSaveState('error');
    }
  };

  const handleChange = (field: keyof Specialist, value: any) => {
    isDirtyRef.current = true;
    setFormState(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleInputFocus = (field: keyof Specialist) => {
    if (specialist?.id) {
      setActiveEditing({
        id: specialist.id,
        type: 'specialist',
        field: String(field)
      });
    }
  };

  const handleInputBlur = () => {
    setActiveEditing(null);
  };

  // Convert uploaded profile image to base64
  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate size (limit to 1MB to avoid large database transactions)
    if (file.size > 1.2 * 1024 * 1024) {
      alert('La imagen de perfil debe ser menor a 1MB.');
      return;
    }

    const reader = new FileReader();
    reader.onloadend = () => {
      handleChange('foto_perfil', reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-0 md:p-4">
      <div className="w-full h-full md:h-auto md:max-h-[90vh] md:max-w-xl bg-white rounded-none md:rounded-3xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-white shrink-0">
          <div>
            <h2 className="text-base font-bold text-slate-800">
              {specialist ? 'Editar Especialista' : 'Agregar Especialista'}
            </h2>
            <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
              {specialist ? 'Formulario de Edición' : 'Formulario de Creación'}
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
          
          {/* Avatar upload */}
          <div className="flex flex-col items-center justify-center p-4 bg-white rounded-2xl border border-slate-100 shadow-sm space-y-3">
            <div className="relative h-20 w-20 rounded-full bg-slate-50 border-2 border-slate-100 flex items-center justify-center overflow-hidden shadow-inner group">
              {formState.foto_perfil ? (
                <img 
                  src={formState.foto_perfil} 
                  alt="Profile Preview" 
                  className="h-full w-full object-cover" 
                />
              ) : (
                <User size={36} className="text-slate-300" />
              )}
            </div>
            
            <label className="cursor-pointer bg-slate-50 border border-slate-200 hover:bg-slate-100 text-slate-600 text-xs font-bold px-3 py-1.5 rounded-xl flex items-center gap-1.5 transition-colors">
              <Upload size={12} />
              <span>Cargar Foto</span>
              <input 
                type="file" 
                accept="image/*" 
                onChange={handleImageChange} 
                className="hidden" 
              />
            </label>
            <span className="text-[9px] text-slate-400 font-semibold">Máximo 1MB (Formatos: JPG, PNG)</span>
          </div>

          {/* Nombre completo */}
          <div className="space-y-1.5 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
              Nombre Completo *
            </label>
            <input
              type="text"
              value={formState.nombre_completo || ''}
              onChange={(e) => handleChange('nombre_completo', e.target.value)}
              onFocus={() => handleInputFocus('nombre_completo')}
              onBlur={handleInputBlur}
              placeholder="Ej. T.O BETANIA HERNANDEZ"
              className="w-full py-2.5 px-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-moradoDesarrollo/10 focus:border-brand-moradoDesarrollo transition-all"
              required
            />
          </div>

          {/* Specialty selection */}
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

          {/* Instagram & Federation */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            
            {/* Instagram */}
            <div className="space-y-1.5 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Usuario Instagram (sin @)
              </label>
              <input
                type="text"
                value={formState.instagram || ''}
                onChange={(e) => handleChange('instagram', e.target.value)}
                onFocus={() => handleInputFocus('instagram')}
                onBlur={handleInputBlur}
                placeholder="fto.wilmarygarcia"
                className="w-full py-2.5 px-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-moradoDesarrollo/10 focus:border-brand-moradoDesarrollo transition-all"
              />
            </div>

            {/* Federation */}
            <div className="space-y-1.5 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Federación / Matrícula
              </label>
              <input
                type="text"
                value={formState.federacion_matricula || 'MPPS:'}
                onChange={(e) => handleChange('federacion_matricula', e.target.value)}
                onFocus={() => handleInputFocus('federacion_matricula')}
                onBlur={handleInputBlur}
                placeholder="MPPS: 8463"
                className="w-full py-2.5 px-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-moradoDesarrollo/10 focus:border-brand-moradoDesarrollo transition-all"
              />
            </div>
          </div>

          {/* Birthday Date picker */}
          <div className="space-y-1.5 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
                Fecha de Cumpleaños
              </label>
              {!formState.fecha_cumpleanos && (
                <span className="text-[10px] font-bold text-rose-500 flex items-center gap-0.5 animate-pulse">
                  ⚠️ Alerta: Vacío
                </span>
              )}
            </div>
            <input
              type="date"
              value={formState.fecha_cumpleanos || ''}
              onChange={(e) => handleChange('fecha_cumpleanos', e.target.value)}
              onFocus={() => handleInputFocus('fecha_cumpleanos')}
              onBlur={handleInputBlur}
              className="w-full py-2.5 px-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-moradoDesarrollo/10 focus:border-brand-moradoDesarrollo transition-all"
            />
          </div>

          {/* Drive link */}
          <div className="space-y-1.5 bg-white p-4 rounded-2xl border border-slate-100 shadow-sm">
            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
              URL Carpeta Google Drive Personal *
            </label>
            <input
              type="url"
              value={formState.url_drive_personal || ''}
              onChange={(e) => handleChange('url_drive_personal', e.target.value)}
              onFocus={() => handleInputFocus('url_drive_personal')}
              onBlur={handleInputBlur}
              placeholder="https://drive.google.com/..."
              className="w-full py-2.5 px-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-moradoDesarrollo/10 focus:border-brand-moradoDesarrollo transition-all"
              required
            />
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
