import React, { useState, useMemo, useRef } from 'react';
import * as XLSX from 'xlsx';
import { useData } from '../context/DataContext';
import type { Publication, Efemeride } from '../types';
import { PublicationCard } from '../components/PublicationCard';
import { PublicationModal } from '../components/PublicationModal';
import { 
  Plus, Calendar as CalendarIcon, ClipboardList, Clock, 
  CheckCircle, FileText, ChevronDown, ChevronUp, Share2,
  Upload, FileSpreadsheet, AlertCircle, X, Edit3
} from 'lucide-react';

export const PublicationsManager: React.FC = () => {
  const { 
    publications, 
    specialists, 
    specialties, 
    efemerides, 
    monthlyLinks,
    deletePublication, 
    importPublications, 
    importEfemerides,
    saveMonthlyLink
  } = useData();

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

  // Refs for hidden file inputs
  const excelInputRef = useRef<HTMLInputElement>(null);
  const calendarInputRef = useRef<HTMLInputElement>(null);

  // Import feedback status
  const [importStatus, setImportStatus] = useState<{
    type: 'success' | 'error' | 'loading' | null;
    message: string | null;
    details?: string | null;
  }>({ type: null, message: null });

  // Spanish month names mapping
  const monthMap: Record<string, number> = useMemo(() => ({
    enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6,
    julio: 7, agosto: 8, septiembre: 9, octubre: 10, noviembre: 11, diciembre: 12
  }), []);

  // Excel sheet name to database specialty mapping
  const sheetSpecialtyMap: Record<string, string> = useMemo(() => ({
    'PLANIFICACION TO 2026': 'Terapia Ocupacional',
    'PLANIFICACION PS 2026': 'Psicología',
    'PLANIFICACION NT 2026': 'Nutrición',
    'PLANIFICACION FT 2026': 'Fisioterapia',
    'PLANIFICACION PP 2026': 'Psicopedagogía',
    'PLANIFICACION PP 2026 (2)': 'Psicopedagogía'
  }), []);

  // Text normalization helper
  const normalizeText = (text: any) => {
    if (!text) return '';
    return String(text)
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim();
  };

  // Smart specialist resolver
  const resolveSpecialists = (cellText: string) => {
    if (!cellText) return [];
    const parts = cellText.split(/[-/,]|\by\b/i).map(p => p.trim()).filter(Boolean);
    const matchedIds = new Set<string>();
    
    const cleanSpecList = specialists.map(s => ({
      id: s.id,
      norm: normalizeText(s.nombre_completo),
      words: normalizeText(s.nombre_completo)
        .replace(/^(to|doc|f\.?t|nt\.?|ps\.?|pp\.?|tl|t\.?o\.?|lcda\.?|lic\.?)\s+/g, "")
        .trim()
        .split(/\s+/)
        .filter(w => w.length > 2)
    }));

    parts.forEach(part => {
      const partNorm = normalizeText(part);
      cleanSpecList.forEach(s => {
        const sCleanNorm = s.norm.replace(/^(to|doc|f\.?t|nt\.?|ps\.?|pp\.?|tl|t\.?o\.?|lcda\.?|lic\.?)\s+/g, "").trim();
        
        if (partNorm.includes(sCleanNorm) || sCleanNorm.includes(partNorm)) {
          matchedIds.add(s.id);
        } else if (s.words.length > 0 && s.words.every(w => partNorm.includes(w))) {
          matchedIds.add(s.id);
        } else if (sCleanNorm.includes("merlin") && partNorm.includes("merly")) {
          matchedIds.add(s.id);
        } else if (sCleanNorm.includes("carballo") && partNorm.includes("carballo")) {
          matchedIds.add(s.id);
        }
      });
    });
    
    return Array.from(matchedIds);
  };

  // Excel date parser helper
  const parseExcelDate = (value: any) => {
    if (!value) return null;
    if (value instanceof Date) {
      return value.toISOString().split('T')[0];
    }
    if (typeof value === 'number' || !isNaN(Number(value))) {
      const serial = Number(value);
      const date = new Date(Math.round((serial - 25569) * 86400 * 1000));
      return date.toISOString().split('T')[0];
    }
    const dateStr = String(value).trim();
    if (dateStr.includes('/')) {
      const parts = dateStr.split('/');
      if (parts.length === 3) {
        let day = parseInt(parts[0], 10);
        let month = parseInt(parts[1], 10);
        let year = parseInt(parts[2], 10);
        
        if (month > 12) {
          const temp = day;
          day = month;
          month = temp;
        }
        
        const date = new Date(year, month - 1, day);
        if (!isNaN(date.getTime())) {
          return date.toISOString().split('T')[0];
        }
      }
    }
    const parsed = Date.parse(dateStr);
    if (!isNaN(parsed)) {
      return new Date(parsed).toISOString().split('T')[0];
    }
    return null;
  };

  // Format parser helper
  const parseFormato = (formatText: any) => {
    const norm = normalizeText(formatText);
    if (norm.includes('reel') || norm.includes('video') || norm.includes('pelicula')) {
      return 'video';
    } else if (norm.includes('story') || norm.includes('historia')) {
      return 'story';
    } else if (norm.includes('carrusel') || norm.includes('carousel')) {
      return 'carrusel';
    }
    return 'feed';
  };

  // Excel Upload handler
  const handleExcelUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportStatus({ type: 'loading', message: 'Leyendo archivo Excel...' });
    
    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const data = evt.target?.result;
        if (!data) throw new Error('No se pudo leer el contenido del archivo.');

        const workbook = XLSX.read(data, { type: 'array' });
        const publicationsToInsert: any[] = [];
        let errorCount = 0;
        const skippedRows: string[] = [];

        // Build specialty map
        const specialtyMap: Record<string, string> = {};
        specialties.forEach(s => {
          specialtyMap[s.nombre] = s.id;
        });

        workbook.SheetNames.forEach(sheetName => {
          const specialtyName = sheetSpecialtyMap[sheetName];
          if (!specialtyName) return;

          const specialtyId = specialtyMap[specialtyName];
          if (!specialtyId) {
            console.error(`Especialidad "${specialtyName}" no encontrada en base de datos.`);
            return;
          }

          const sheet = workbook.Sheets[sheetName];
          const rawData = XLSX.utils.sheet_to_json<any[]>(sheet, { header: 1 });

          // Find header row (it contains "MES" and "TITULO")
          let headerRowIdx = -1;
          for (let r = 0; r < rawData.length; r++) {
            const row = rawData[r];
            if (row && row.some(cell => String(cell).trim().toUpperCase() === 'MES') && 
                row.some(cell => {
                  const str = String(cell).trim().toUpperCase();
                  return str.includes('TITULO') || str.includes('TÍTULO');
                })) {
              headerRowIdx = r;
              break;
            }
          }

          if (headerRowIdx === -1) return;

          const headers = rawData[headerRowIdx].map(h => String(h).trim().toUpperCase());
          const mesIdx = headers.indexOf('MES');
          const tituloIdx = headers.findIndex(h => h.includes('TITULO') || h.includes('TÍTULO'));
          const temarioIdx = headers.findIndex(h => h.includes('TEMARIO') || h.includes('DESCRIPCION') || h.includes('DESCRIPCIÓN'));
          const fechaIdx = headers.indexOf('FECHA');
          const formatoIdx = headers.findIndex(h => h.includes('FORMATO') || h.includes('PUBLICACION'));
          const especialistaIdx = headers.findIndex(h => h.includes('ESPECIALISTA') || h.includes('NOMBRE Y APELLIDO'));
          const observacionesIdx = headers.indexOf('OBSERVACIONES');

          for (let r = headerRowIdx + 1; r < rawData.length; r++) {
            const row = rawData[r];
            if (!row || row.length === 0) continue;

            const mesVal = row[mesIdx];
            const tituloVal = row[tituloIdx];

            if (!mesVal || !tituloVal) continue;

            const mesNorm = normalizeText(mesVal);
            const mesInt = monthMap[mesNorm];
            if (!mesInt) {
              skippedRows.push(`[Fila ${r+1} en ${sheetName}]: Mes "${mesVal}"`);
              errorCount++;
              continue;
            }

            const anio = 2026;
            const titulo = String(tituloVal).trim();
            const temarioVal = row[temarioIdx] || '';
            const observacionesVal = row[observacionesIdx] || '';
            const descripcion = (String(temarioVal) + '\n' + String(observacionesVal)).trim();

            const deadline = parseExcelDate(row[fechaIdx]);
            const formato = parseFormato(row[formatoIdx]);
            const especialistaVal = row[especialistaIdx] || '';
            const especialistasAsignados = resolveSpecialists(String(especialistaVal));

            let estado: 'Pendiente' | 'Diseñado' | 'Aprobado' | 'Publicado' = 'Pendiente';
            if (mesInt < 6) {
              estado = 'Publicado';
            } else if (mesInt === 6) {
              estado = 'Aprobado';
            } else {
              estado = 'Diseñado';
            }

            publicationsToInsert.push({
              mes: mesInt,
              anio,
              titulo,
              descripcion,
              formato,
              especialidad_id: specialtyId,
              especialistas_asignados: especialistasAsignados,
              deadline,
              estado,
              notas_internas: `Importado de Excel [Hoja: ${sheetName}, Fila: ${r+1}]`
            });
          }
        });

        if (publicationsToInsert.length === 0) {
          setImportStatus({
            type: 'error',
            message: 'No se encontraron actividades válidas en el archivo Excel.',
            details: skippedRows.length > 0 ? `Ignoradas: ${skippedRows.join(', ')}` : null
          });
          return;
        }

        setImportStatus({ type: 'loading', message: `Guardando ${publicationsToInsert.length} publicaciones...` });
        const result = await importPublications(publicationsToInsert);

        let successMsg = `Se importaron ${result.successCount} nuevas publicaciones correctamente.`;
        if (result.skippedCount > 0) {
          successMsg += ` Se omitieron ${result.skippedCount} duplicados.`;
        }

        setImportStatus({
          type: 'success',
          message: successMsg,
          details: skippedRows.length > 0 ? `Filas omitidas por mes inválido: ${skippedRows.length}` : null
        });

        if (excelInputRef.current) excelInputRef.current.value = '';
      } catch (err: any) {
        console.error('Error al procesar el archivo Excel:', err);
        setImportStatus({
          type: 'error',
          message: 'Error al procesar el archivo Excel.',
          details: err.message
        });
      }
    };

    reader.onerror = () => {
      setImportStatus({ type: 'error', message: 'Error al leer el archivo.' });
    };

    reader.readAsArrayBuffer(file);
  };

  // Calendar .ics upload handler
  const handleCalendarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setImportStatus({ type: 'loading', message: 'Leyendo archivo de calendario...' });

    const reader = new FileReader();
    reader.onload = async (evt) => {
      try {
        const text = evt.target?.result as string;
        if (!text) throw new Error('No se pudo leer el contenido del archivo.');

        const specialistNames = specialists.map(s => 
          normalizeText(s.nombre_completo.replace(/^(to|doc|f\.?t|nt\.?|ps\.?|pp\.?|tl|t\.?o\.?|lcda\.?|lic\.?)\s+/i, ''))
        );

        const unfoldedContent = text.replace(/\r?\n[ \t]/g, '');
        const events = unfoldedContent.split('BEGIN:VEVENT');
        events.shift();

        const efemeridesToInsert: any[] = [];
        let skippedBirthdays = 0;

        events.forEach(eventStr => {
          const lines = eventStr.split(/\r?\n/);
          let dtstart = '';
          let summary = '';

          lines.forEach(line => {
            if (line.startsWith('DTSTART')) {
              const parts = line.split(':');
              if (parts.length >= 2) {
                const match = parts[1].match(/(\d{8})/);
                if (match) dtstart = match[1];
              }
            } else if (line.startsWith('SUMMARY')) {
              const parts = line.split(':');
              if (parts.length >= 2) {
                parts.shift();
                summary = parts.join(':').trim();
              }
            }
          });

          if (!dtstart || !summary) return;

          const mes = parseInt(dtstart.substring(4, 6), 10);
          const dia = parseInt(dtstart.substring(6, 8), 10);
          const summaryNorm = normalizeText(summary);

          const isSpecialistBirthday = specialistNames.some(name => {
            return summaryNorm.includes(name) || name.includes(summaryNorm);
          });

          if (isSpecialistBirthday) {
            skippedBirthdays++;
            return;
          }

          let tipo: 'efeméride_venezuela' | 'evento_ocupamor' = 'efeméride_venezuela';
          if (summaryNorm.includes('ocupamor') || summaryNorm.includes('centro') || summaryNorm.includes('actividad') || summaryNorm.includes('charla')) {
            tipo = 'evento_ocupamor';
          }

          const importantKeywords = ['dia', 'mundial', 'internacional', 'salud', 'pediatra', 'nino', 'diabetes', 'sindrome', 'down', 'alimentacion', 'terapeuta', 'autismo', 'familia', 'enfermera', 'educacion'];
          const sugerenciaPost = importantKeywords.some(keyword => summaryNorm.includes(keyword));

          efemeridesToInsert.push({
            nombre: summary,
            dia,
            mes,
            tipo,
            descripcion_breve: summary.substring(0, 150),
            sugerencia_post: sugerenciaPost
          });
        });

        if (efemeridesToInsert.length === 0) {
          setImportStatus({
            type: 'error',
            message: 'No se encontraron efemérides válidas en el archivo de calendario.',
            details: `Cumpleaños omitidos: ${skippedBirthdays}`
          });
          return;
        }

        setImportStatus({ type: 'loading', message: `Guardando ${efemeridesToInsert.length} efemérides...` });
        const result = await importEfemerides(efemeridesToInsert);

        let successMsg = `Se importaron ${result.successCount} nuevas efemérides correctamente.`;
        if (result.skippedCount > 0) {
          successMsg += ` Se omitieron ${result.skippedCount} duplicados.`;
        }

        setImportStatus({
          type: 'success',
          message: successMsg,
          details: skippedBirthdays > 0 ? `Cumpleaños de especialistas filtrados y omitidos: ${skippedBirthdays}` : null
        });

        if (calendarInputRef.current) calendarInputRef.current.value = '';
      } catch (err: any) {
        console.error('Error al procesar el archivo de calendario:', err);
        setImportStatus({
          type: 'error',
          message: 'Error al procesar el archivo de calendario.',
          details: err.message
        });
      }
    };

    reader.onerror = () => {
      setImportStatus({ type: 'error', message: 'Error al leer el archivo.' });
    };

    reader.readAsText(file);
  };

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

  // Local state to manage the custom monthly Canva link edit modal
  const [isEditingLink, setIsEditingLink] = useState(false);
  const [tempLink, setTempLink] = useState('');

  // Fetch Canva link for the currently selected month and year
  const currentMonthlyLink = useMemo(() => {
    return monthlyLinks.find(l => l.mes === selectedMonth && l.anio === selectedYear);
  }, [monthlyLinks, selectedMonth, selectedYear]);

  const handleEditLinkOpen = () => {
    setTempLink(currentMonthlyLink?.url_canva || '');
    setIsEditingLink(true);
  };

  const handleSaveLink = async () => {
    await saveMonthlyLink(selectedMonth, selectedYear, tempLink.trim() || null);
    setIsEditingLink(false);
  };

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
      
      {/* Hidden file inputs for loaders */}
      <input 
        type="file" 
        ref={excelInputRef} 
        onChange={handleExcelUpload} 
        accept=".xlsx, .xls" 
        className="hidden" 
      />
      <input 
        type="file" 
        ref={calendarInputRef} 
        onChange={handleCalendarUpload} 
        accept=".ics" 
        className="hidden" 
      />

      {/* Import feedback banner */}
      {importStatus.type && (
        <div className={`
          p-4 rounded-2xl border flex items-start justify-between gap-3 shadow-sm transition-all duration-300
          ${importStatus.type === 'loading' ? 'bg-amber-50 text-amber-800 border-amber-200' : ''}
          ${importStatus.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-emerald-200' : ''}
          ${importStatus.type === 'error' ? 'bg-rose-50 text-rose-800 border-rose-200' : ''}
        `}>
          <div className="flex items-start gap-3">
            {importStatus.type === 'loading' ? (
              <Clock size={20} className="text-amber-500 animate-spin mt-0.5" />
            ) : importStatus.type === 'success' ? (
              <CheckCircle size={20} className="text-emerald-500 mt-0.5" />
            ) : (
              <AlertCircle size={20} className="text-rose-500 mt-0.5" />
            )}
            <div>
              <p className="text-sm font-bold">{importStatus.message}</p>
              {importStatus.details && (
                <p className="text-xs font-semibold opacity-80 mt-1">{importStatus.details}</p>
              )}
            </div>
          </div>
          {importStatus.type !== 'loading' && (
            <button 
              onClick={() => setImportStatus({ type: null, message: null })}
              className="p-1 rounded-lg hover:bg-black/5 text-slate-500 hover:text-slate-700 transition-colors"
            >
              <X size={16} />
            </button>
          )}
        </div>
      )}

      {/* Month Selector Horizontal Slider */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3 px-1">
          <span className="text-xs font-bold text-slate-500 uppercase tracking-wider block">
            Seleccionar Planificación
          </span>
          <div className="flex items-center gap-2 flex-wrap">
            {/* Cargar Excel Button */}
            <button
              onClick={() => excelInputRef.current?.click()}
              className="text-xs font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/60 rounded-xl px-3 py-1.5 flex items-center gap-1.5 transition-all duration-200 hover-lift shadow-sm shadow-emerald-500/5"
              title="Cargar archivo Excel con planificación de actividades (.xlsx)"
            >
              <FileSpreadsheet size={14} className="text-emerald-600" />
              <span>Cargar Excel</span>
            </button>

            {/* Cargar Calendario Button */}
            <button
              onClick={() => calendarInputRef.current?.click()}
              className="text-xs font-bold text-brand-moradoDesarrollo bg-brand-moradoDesarrollo/5 hover:bg-brand-moradoDesarrollo/10 border border-brand-moradoDesarrollo/10 rounded-xl px-3 py-1.5 flex items-center gap-1.5 transition-all duration-200 hover-lift shadow-sm shadow-brand-moradoDesarrollo/5"
              title="Cargar archivo de calendario con feriados y efemérides (.ics)"
            >
              <Upload size={14} className="text-brand-moradoDesarrollo" />
              <span>Cargar Efemérides</span>
            </button>

            <select 
              value={selectedYear} 
              onChange={(e) => setSelectedYear(Number(e.target.value))}
              className="text-xs font-bold text-slate-600 bg-slate-50 border border-slate-200 rounded-xl px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-brand-moradoDesarrollo"
            >
              <option value={2026}>Año 2026</option>
              <option value={2025}>Año 2025</option>
              <option value={2027}>Año 2027</option>
            </select>
          </div>
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

        {/* Canva review link card */}
        <div className="col-span-2 lg:col-span-1 bg-brand-fucsiaEmocion text-white rounded-2xl p-4 shadow-md shadow-brand-fucsiaEmocion/20 flex flex-col justify-center items-center text-center gap-1 hover-lift transition-all relative group select-none">
          {/* Edit Button in corner */}
          <button 
            onClick={(e) => { e.stopPropagation(); handleEditLinkOpen(); }}
            className="absolute top-2 right-2 p-1 rounded-lg bg-black/10 hover:bg-black/25 text-white/90 transition-all opacity-80 hover:scale-105"
            title="Configurar enlace de Canva para este mes"
          >
            <Edit3 size={12} />
          </button>
          
          <Share2 size={20} className="mb-0.5" />
          <span className="text-xs font-bold">Diseños en Canva</span>
          {currentMonthlyLink?.url_canva ? (
            <a 
              href={currentMonthlyLink.url_canva}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[9px] opacity-90 hover:opacity-100 font-semibold underline block max-w-full truncate"
              title={currentMonthlyLink.url_canva}
            >
              Abrir Canva ↗
            </a>
          ) : (
            <span className="text-[9px] opacity-75 font-semibold italic">Sin configurar</span>
          )}
        </div>
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
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 items-start">
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

      {/* Canva Link Edit Modal */}
      {isEditingLink && (
        <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div>
              <h3 className="text-sm font-bold text-slate-800">Configurar Enlace de Canva</h3>
              <p className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider mt-0.5">
                {months.find(m => m.value === selectedMonth)?.label} {selectedYear}
              </p>
            </div>
            
            <div className="space-y-1.5">
              <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Enlace / URL del proyecto Canva
              </label>
              <input
                type="url"
                value={tempLink}
                onChange={(e) => setTempLink(e.target.value)}
                placeholder="https://www.canva.com/design/..."
                className="w-full py-2.5 px-3 rounded-xl border border-slate-200 text-xs focus:outline-none focus:ring-2 focus:ring-brand-moradoDesarrollo/10 focus:border-brand-moradoDesarrollo transition-all"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsEditingLink(false)}
                className="px-3.5 py-1.5 rounded-xl text-xs font-bold text-slate-500 hover:bg-slate-100 transition-colors"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleSaveLink}
                className="px-4 py-1.5 bg-brand-moradoDesarrollo hover:bg-brand-moradoDesarrollo/95 text-white text-xs font-bold rounded-xl shadow-sm shadow-brand-moradoDesarrollo/10 transition-colors"
              >
                Guardar
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
