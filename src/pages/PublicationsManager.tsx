import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import type { Publication, Efemeride } from '../types';
import { PublicationCard } from '../components/PublicationCard';
import { PublicationModal } from '../components/PublicationModal';
import { 
  Plus, Calendar as CalendarIcon, ClipboardList, Clock, 
  CheckCircle, FileText, ChevronDown, ChevronUp, Share2 
} from 'lucide-react';

export const PublicationsManager: React.FC = () => {
  const { publications, specialists, specialties, efemerides, deletePublication } = useData();

  // Selected Month/Year state
  const [selectedMonth, setSelectedMonth] = useState<number>(new Date().getMonth() + 1); // 1-12
  const [selectedYear, setSelectedYear] = useState<number>(2026); // Excel is 2026

  // Modal states
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPub, setEditingPub] = useState<Publication | null>(null);

  // Expanded/Collapsed panel for Holidays
  const [holidaysExpanded, setHolidaysExpanded] = useState(false);

  // Filters state
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSpecialty, setSelectedSpecialty] = useState('');
  const [selectedFormat, setSelectedFormat] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');

  // Months list for horizontal calendar
  const months = [
    { value: 1, label: 'Enero' },
    { value: 2, label: 'Febrero' },
    { value: 3, label: 'Marzo' },
    { value: 4, label: 'Abril' },
    { value: 5, label: 'Mayo' },
    { value: 6, label: 'Junio' },
    { value: 7, label: 'Julio' },
    { value: 8, label: 'Agosto' },
    { value: 9, label: 'Septiembre' },
    { value: 10, label: 'Octubre' },
    { value: 11, label: 'Noviembre' },
    { value: 12, label: 'Diciembre' }
  ];

  // Drive general folder from JSON
  const generalDriveLink = 'https://drive.google.com/drive/folders/12J6PWjxRoOCIc9rPc-aq_RXgOY9or-lP?usp=drive_link';

  // Filter publications by current month and year
  const monthlyPubs = useMemo(() => {
    return publications.filter(p => p.mes === selectedMonth && p.anio === selectedYear);
  }, [publications, selectedMonth, selectedYear]);

  // Statistics calculation for the active month
  const stats = useMemo(() => {
    const total = monthlyPubs.length;
    const pending = monthlyPubs.filter(p => p.estado === 'Pendiente').length;
    const inDesign = monthlyPubs.filter(p => p.estado === 'Diseñado').length;
    const approvedOrPub = monthlyPubs.filter(p => p.estado === 'Aprobado' || p.estado === 'Publicado').length;

    return { total, pending, inDesign, approvedOrPub };
  }, [monthlyPubs]);

  // Filtered publications according to UI filters
  const filteredPubs = useMemo(() => {
    return monthlyPubs.filter(p => {
      const matchSearch = p.titulo.toLowerCase().includes(searchQuery.toLowerCase()) || 
        (p.descripcion && p.descripcion.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchSpecialty = selectedSpecialty === '' || p.especialidad_id === selectedSpecialty;
      const matchFormat = selectedFormat === '' || p.formato === selectedFormat;
      const matchStatus = selectedStatus === '' || p.estado === selectedStatus;

      return matchSearch && matchSpecialty && matchFormat && matchStatus;
    });
  }, [monthlyPubs, searchQuery, selectedSpecialty, selectedFormat, selectedStatus]);

  // Filter holidays of the selected month
  const monthlyHolidays = useMemo(() => {
    return efemerides.filter(e => e.mes === selectedMonth).sort((a: Efemeride, b: Efemeride) => a.dia - b.dia);
  }, [efemerides, selectedMonth]);

  // Calculate birthdays of specialists for selected month
  const monthlyBirthdays = useMemo(() => {
    return specialists.filter(spec => {
      if (!spec.fecha_cumpleanos) return false;
      const birthMonth = new Date(spec.fecha_cumpleanos + 'T00:00:00').getMonth() + 1;
      return birthMonth === selectedMonth;
    }).map(spec => {
      const birthDay = new Date(spec.fecha_cumpleanos + 'T00:00:00').getDate();
      return {
        dia: birthDay,
        nombre: `Cumpleaños de ${spec.nombre_completo}`,
        especialista: spec
      };
    }).sort((a, b) => a.dia - b.dia);
  }, [specialists, selectedMonth]);

  const handleEdit = (pub: Publication) => {
    setEditingPub(pub);
    setIsModalOpen(true);
  };

  const handleCreate = () => {
    setEditingPub(null);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('¿Está seguro de que desea eliminar esta publicación?')) {
      await deletePublication(id);
    }
  };

  // Prefill new post modal based on holiday / birthday suggestion
  const handleSuggestPost = (title: string, day: number) => {
    // Format date string as YYYY-MM-DD
    const pad = (n: number) => String(n).padStart(2, '0');
    const defaultDate = `${selectedYear}-${pad(selectedMonth)}-${pad(day)}`;

    setEditingPub({
      id: '',
      titulo: `Post: ${title}`,
      descripcion: `Publicación especial alusiva a la fecha.`,
      deadline: defaultDate,
      formato: 'feed',
      especialidad_id: specialties[0]?.id || '',
      especialistas_asignados: [],
      estado: 'Pendiente',
      notas_internas: 'Sugerido automáticamente desde el panel de efemérides.',
      url_drive_revision: '',
      mes: selectedMonth,
      anio: selectedYear
    });
    setIsModalOpen(true);
  };

  return (
    <div className="space-y-6">
      
      {/* Month Selector Horizontal Slider */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
        <div className="flex items-center justify-between mb-3 px-1">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
            Seleccionar Planificación
          </span>
          <select 
            value={selectedYear} 
            onChange={(e) => setSelectedYear(Number(e.target.value))}
            className="text-xs font-bold text-slate-600 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 focus:outline-none focus:ring-1 focus:ring-brand-moradoDesarrollo"
          >
            <option value={2026}>Año 2026</option>
            <option value={2025}>Año 2025</option>
            <option value={2027}>Año 2027</option>
          </select>
        </div>
        
        {/* Horizontal Scroll list of Months */}
        <div className="flex items-center gap-2 overflow-x-auto pb-2 scrollbar-thin">
          {months.map((m) => {
            const isSelected = selectedMonth === m.value;
            return (
              <button
                key={m.value}
                onClick={() => setSelectedMonth(m.value)}
                className={`
                  px-5 py-2.5 rounded-xl text-xs font-bold shrink-0 transition-all duration-200
                  ${isSelected 
                    ? 'bg-brand-moradoDesarrollo text-white shadow-sm shadow-brand-moradoDesarrollo/25 scale-[1.03]' 
                    : 'bg-slate-50 text-slate-500 hover:bg-slate-100 hover:text-slate-700'
                  }
                `}
              >
                {m.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Overview stats cards & Drive Link */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
        
        {/* Stat 1 */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-4 hover-lift">
          <div className="p-3 rounded-xl bg-slate-50 text-slate-600">
            <ClipboardList size={22} />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Total Diseños</p>
            <p className="text-xl font-bold text-slate-700">{stats.total}</p>
          </div>
        </div>

        {/* Stat 2 */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-4 hover-lift">
          <div className="p-3 rounded-xl bg-amber-50 text-amber-600">
            <Clock size={22} />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Pendientes</p>
            <p className="text-xl font-bold text-amber-600">{stats.pending}</p>
          </div>
        </div>

        {/* Stat 3 */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-4 hover-lift">
          <div className="p-3 rounded-xl bg-purple-50 text-purple-600">
            <FileText size={22} />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">En Proceso</p>
            <p className="text-xl font-bold text-purple-600">{stats.inDesign}</p>
          </div>
        </div>

        {/* Stat 4 */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex items-center gap-4 hover-lift">
          <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600">
            <CheckCircle size={22} />
          </div>
          <div>
            <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Listos / Pub</p>
            <p className="text-xl font-bold text-emerald-600">{stats.approvedOrPub}</p>
          </div>
        </div>

        {/* Drive review link card */}
        <a 
          href={generalDriveLink}
          target="_blank"
          rel="noopener noreferrer"
          className="col-span-2 lg:col-span-1 bg-brand-fucsiaEmocion hover:bg-brand-fucsiaEmocion/95 text-white rounded-2xl p-4 shadow-md shadow-brand-fucsiaEmocion/20 flex flex-col justify-center items-center text-center gap-1 hover-lift transition-all"
        >
          <Share2 size={20} />
          <span className="text-xs font-bold">Diseños en Revisión</span>
          <span className="text-[9px] opacity-85 font-semibold">Abrir Google Drive</span>
        </a>
      </div>

      {/* Expandable holidays & special dates panel */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <button
          onClick={() => setHolidaysExpanded(!holidaysExpanded)}
          className="w-full px-6 py-4 flex items-center justify-between font-display font-bold text-slate-800 text-sm hover:bg-slate-50 transition-colors"
        >
          <div className="flex items-center gap-2">
            <span>📅 Fechas Especiales y Efemérides de {months.find(m => m.value === selectedMonth)?.label.toUpperCase()}</span>
            <span className="px-2 py-0.5 rounded-full bg-slate-100 text-[10px] text-slate-600">
              {monthlyHolidays.length + monthlyBirthdays.length} eventos
            </span>
          </div>
          {holidaysExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
        </button>

        {holidaysExpanded && (
          <div className="px-6 pb-6 border-t border-slate-50 pt-4 bg-slate-50/20 max-h-60 overflow-y-auto space-y-2">
            
            {/* Birthday events */}
            {monthlyBirthdays.length > 0 && (
              <div className="space-y-1.5">
                <h4 className="text-[10px] font-bold text-brand-moradoDesarrollo uppercase tracking-wider">🎉 Cumpleaños del Mes</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {monthlyBirthdays.map((b, idx) => (
                    <div key={`birth-${idx}`} className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-100 text-xs">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-brand-moradoDesarrollo">Día {b.dia}:</span>
                        <span className="font-semibold text-slate-700">{b.nombre}</span>
                      </div>
                      <button 
                        onClick={() => handleSuggestPost(b.nombre, b.dia)}
                        className="flex items-center gap-1 text-[10px] font-bold text-brand-fucsiaEmocion hover:text-brand-fucsiaEmocion/80"
                      >
                        <Plus size={12} />
                        <span>+ Post</span>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* General holidays */}
            <div className="space-y-1.5 pt-2">
              <h4 className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">🌿 Efemérides & Feriados</h4>
              {monthlyHolidays.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {monthlyHolidays.map((h: Efemeride, idx: number) => (
                    <div key={`holiday-${idx}`} className="flex items-center justify-between p-2.5 rounded-xl bg-white border border-slate-100 text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="font-bold text-slate-500">Día {h.dia}:</span>
                        <span className="font-semibold text-slate-700 truncate" title={h.nombre}>{h.nombre}</span>
                      </div>
                      {h.sugerencia_post && (
                        <button 
                          onClick={() => handleSuggestPost(h.nombre, h.dia)}
                          className="flex items-center gap-1 text-[10px] font-bold text-brand-fucsiaEmocion hover:text-brand-fucsiaEmocion/80 shrink-0"
                        >
                          <Plus size={12} />
                          <span>+ Post</span>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-slate-400 text-xs italic">No hay efemérides registradas para este mes.</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* Filters Toolbar */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4 flex flex-col md:flex-row md:items-center justify-between gap-4">
        
        {/* Search & dropdown filters */}
        <div className="flex-1 grid grid-cols-1 sm:grid-cols-4 gap-3">
          {/* Search box */}
          <input
            type="text"
            placeholder="Buscar por título..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full py-2 px-3 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-brand-moradoDesarrollo focus:border-brand-moradoDesarrollo"
          />

          {/* Specialty Filter */}
          <select
            value={selectedSpecialty}
            onChange={(e) => setSelectedSpecialty(e.target.value)}
            className="w-full py-2 px-3 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-brand-moradoDesarrollo"
          >
            <option value="">Todas las Áreas</option>
            {specialties.map(spec => (
              <option key={spec.id} value={spec.id}>{spec.nombre}</option>
            ))}
          </select>

          {/* Format Filter */}
          <select
            value={selectedFormat}
            onChange={(e) => setSelectedFormat(e.target.value)}
            className="w-full py-2 px-3 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-brand-moradoDesarrollo"
          >
            <option value="">Todos los Formatos</option>
            <option value="feed">Post Estático (Feed)</option>
            <option value="story">Story</option>
            <option value="carrusel">Carrusel</option>
            <option value="video">Video / Reel</option>
          </select>

          {/* Status Filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="w-full py-2 px-3 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none focus:ring-1 focus:ring-brand-moradoDesarrollo"
          >
            <option value="">Todos los Estados</option>
            <option value="Pendiente">⚠️ Pendiente</option>
            <option value="Diseñado">🎨 Diseñado / En Proceso</option>
            <option value="Aprobado">✅ Aprobado</option>
            <option value="Publicado">🚀 Publicado</option>
          </select>
        </div>

        {/* Add Design button */}
        <button
          onClick={handleCreate}
          className="bg-brand-moradoDesarrollo hover:bg-brand-moradoDesarrollo/95 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center justify-center gap-1.5 shadow-sm shadow-brand-moradoDesarrollo/10 shrink-0"
        >
          <Plus size={16} />
          <span>Agregar Diseño</span>
        </button>
      </div>

      {/* Publications Grid */}
      {filteredPubs.length > 0 ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredPubs.map((pub) => (
            <PublicationCard
              key={pub.id}
              publication={pub}
              allSpecialists={specialists}
              onEdit={handleEdit}
              onDelete={handleDelete}
            />
          ))}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center text-slate-400">
          <CalendarIcon size={40} className="mx-auto text-slate-300 mb-3" />
          <p className="font-semibold text-sm">No se encontraron diseños para este mes o filtros.</p>
          <p className="text-xs text-slate-400 mt-1">Haga clic en "+ Agregar Diseño" para crear uno nuevo.</p>
        </div>
      )}

      {/* Add/Edit Modal */}
      {isModalOpen && (
        <PublicationModal
          publication={editingPub}
          defaultMonth={selectedMonth}
          defaultYear={selectedYear}
          onClose={() => setIsModalOpen(false)}
        />
      )}

    </div>
  );
};
