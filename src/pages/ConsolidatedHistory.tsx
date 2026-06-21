import React, { useState, useMemo } from 'react';
import { useData } from '../context/DataContext';
import type { Publication } from '../types';
import { PublicationCard } from '../components/PublicationCard';
import { PublicationModal } from '../components/PublicationModal';
import { Download, Search, ClipboardList } from 'lucide-react';
import * as XLSX from 'xlsx';

export const ConsolidatedHistory: React.FC = () => {
  const { publications, specialists, specialties, deletePublication } = useData();

  // Modal controls
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingPub, setEditingPub] = useState<Publication | null>(null);

  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMonth, setSelectedMonth] = useState<string>(''); // empty means 'all'
  const [selectedYear, setSelectedYear] = useState<string>(''); // empty means 'all'
  const [selectedSpecialty, setSelectedSpecialty] = useState('');
  const [selectedStatus, setSelectedStatus] = useState('');
  const [selectedSpecialist, setSelectedSpecialist] = useState('');

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

  const years = [2025, 2026, 2027];

  // Filter all publications dynamically
  const filteredPubs = useMemo(() => {
    return publications.filter(p => {
      const matchSearch = p.titulo.toLowerCase().includes(searchQuery.toLowerCase()) || 
        (p.descripcion && p.descripcion.toLowerCase().includes(searchQuery.toLowerCase()));
      
      const matchMonth = selectedMonth === '' || p.mes === Number(selectedMonth);
      const matchYear = selectedYear === '' || p.anio === Number(selectedYear);
      const matchSpecialty = selectedSpecialty === '' || p.especialidad_id === selectedSpecialty;
      const matchStatus = selectedStatus === '' || p.estado === selectedStatus;
      const matchSpecialist = selectedSpecialist === '' || p.especialistas_asignados?.includes(selectedSpecialist);

      return matchSearch && matchMonth && matchYear && matchSpecialty && matchStatus && matchSpecialist;
    }).sort((a, b) => {
      // Sort by Year descending, Month descending, and then deadline date descending
      if (b.anio !== a.anio) return b.anio - a.anio;
      if (b.mes !== a.mes) return b.mes - a.mes;
      const dateA = a.deadline ? new Date(a.deadline).getTime() : 0;
      const dateB = b.deadline ? new Date(b.deadline).getTime() : 0;
      return dateB - dateA;
    });
  }, [publications, searchQuery, selectedMonth, selectedYear, selectedSpecialty, selectedStatus, selectedSpecialist]);

  const handleEdit = (pub: Publication) => {
    setEditingPub(pub);
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string) => {
    if (window.confirm('¿Está seguro de que desea eliminar esta publicación?')) {
      await deletePublication(id);
    }
  };

  // Excel Export Handler using SheetJS
  const handleExportToExcel = () => {
    if (filteredPubs.length === 0) {
      alert('No hay datos filtrados para exportar.');
      return;
    }

    const exportData = filteredPubs.map(p => {
      const assignedSpecs = specialists
        .filter(s => p.especialistas_asignados?.includes(s.id))
        .map(s => s.nombre_completo)
        .join(', ');
      
      const specialtyName = specialties.find(s => s.id === p.especialidad_id)?.nombre || '';
      const monthName = months.find(m => m.value === p.mes)?.label || String(p.mes);

      return {
        'Mes': monthName,
        'Año': p.anio,
        'Título': p.titulo,
        'Descripción': p.descripcion || '',
        'Formato': p.formato,
        'Especialidad': specialtyName,
        'Especialistas Asignados': assignedSpecs,
        'Estado': p.estado,
        'Fecha Límite (Deadline)': p.deadline || '',
        'Fecha Creación': p.created_at ? new Date(p.created_at).toLocaleDateString() : '',
        'Última Modificación': p.updated_at ? new Date(p.updated_at).toLocaleDateString() : ''
      };
    });

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, 'Publicaciones');

    // Adjust column widths for better design
    const max_widths = Object.keys(exportData[0]).map(key => {
      return { wch: Math.max(key.length + 3, 12) };
    });
    worksheet['!cols'] = max_widths;

    // Trigger Excel file download
    const filename = `Ocupamor_Historial_Disenos_${new Date().toISOString().split('T')[0]}.xlsx`;
    XLSX.writeFile(workbook, filename);
  };

  return (
    <div className="space-y-6">
      
      {/* Search and Filters panel */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 space-y-4">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider px-1">
          Filtros de Búsqueda
        </h3>

        {/* Filters Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
          
          {/* Text Search */}
          <div className="relative col-span-1 sm:col-span-2 lg:col-span-2">
            <span className="absolute inset-y-0 left-0 pl-3 flex items-center text-slate-400">
              <Search size={14} />
            </span>
            <input
              type="text"
              placeholder="Buscar por título o copy..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-1 focus:ring-brand-moradoDesarrollo"
            />
          </div>

          {/* Month filter */}
          <select
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="py-2 px-3 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none"
          >
            <option value="">Todos los Meses</option>
            {months.map(m => (
              <option key={m.value} value={m.value}>{m.label}</option>
            ))}
          </select>

          {/* Year filter */}
          <select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="py-2 px-3 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none"
          >
            <option value="">Todos los Años</option>
            {years.map(y => (
              <option key={y} value={y}>{y}</option>
            ))}
          </select>

          {/* Specialty filter */}
          <select
            value={selectedSpecialty}
            onChange={(e) => setSelectedSpecialty(e.target.value)}
            className="py-2 px-3 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none"
          >
            <option value="">Todas las Áreas</option>
            {specialties.map(spec => (
              <option key={spec.id} value={spec.id}>{spec.nombre}</option>
            ))}
          </select>

          {/* Status filter */}
          <select
            value={selectedStatus}
            onChange={(e) => setSelectedStatus(e.target.value)}
            className="py-2 px-3 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none"
          >
            <option value="">Todos los Estados</option>
            <option value="Pendiente">⚠️ Pendiente</option>
            <option value="Diseñado">🎨 Diseñado / Proceso</option>
            <option value="Aprobado">✅ Aprobado</option>
            <option value="Publicado">🚀 Publicado</option>
          </select>

          {/* Specialist filter */}
          <div className="col-span-1 sm:col-span-2 md:col-span-1">
            <select
              value={selectedSpecialist}
              onChange={(e) => setSelectedSpecialist(e.target.value)}
              className="w-full py-2 px-3 rounded-xl border border-slate-200 text-xs bg-white focus:outline-none"
            >
              <option value="">Todos los Especialistas</option>
              {specialists.map(spec => (
                <option key={spec.id} value={spec.id}>
                  {spec.nombre_completo}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Grid Header & Export button */}
      <div className="flex justify-between items-center bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
        <div>
          <h2 className="text-sm font-bold text-slate-700">Diseños Históricos</h2>
          <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5">
            Se encontraron {filteredPubs.length} diseños en total
          </p>
        </div>

        <button
          onClick={handleExportToExcel}
          className="bg-emerald-600 hover:bg-emerald-650 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-1.5 shadow-sm shadow-emerald-600/10"
          title="Exportar base de datos a Excel"
        >
          <Download size={15} />
          <span>Exportar a Excel</span>
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
          <ClipboardList size={40} className="mx-auto text-slate-300 mb-3" />
          <p className="font-semibold text-sm">No se encontraron diseños que coincidan con los filtros.</p>
          <p className="text-xs text-slate-400 mt-1">Pruebe ajustando los filtros de búsqueda.</p>
        </div>
      )}

      {/* Edit Modal */}
      {isModalOpen && (
        <PublicationModal
          publication={editingPub}
          onClose={() => setIsModalOpen(false)}
        />
      )}

    </div>
  );
};
