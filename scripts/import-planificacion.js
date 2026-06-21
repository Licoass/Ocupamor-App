import xlsx from 'xlsx';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set in your environment.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Map Spanish month names to numbers
const monthMap = {
  enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6,
  julio: 7, agosto: 8, septiembre: 9, octubre: 10, noviembre: 11, diciembre: 12
};

// Map sheet names to specialty names in DB
const sheetSpecialtyMap = {
  'PLANIFICACION TO 2026': 'Terapia Ocupacional',
  'PLANIFICACION PS 2026': 'Psicología',
  'PLANIFICACION NT 2026': 'Nutrición',
  'PLANIFICACION FT 2026': 'Fisioterapia',
  'PLANIFICACION PP 2026': 'Psicopedagogía',
  'PLANIFICACION PP 2026 (2)': 'Psicopedagogía'
};

// Clean and normalize strings for matching
function normalizeText(text) {
  if (!text) return '';
  return String(text)
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim();
}

// Smart specialist matcher
function resolveSpecialists(cellText, dbSpecialists) {
  if (!cellText) return [];
  const parts = cellText.split(/[-/,]|\by\b/i).map(p => p.trim()).filter(Boolean);
  const matchedIds = new Set();
  
  parts.forEach(part => {
    const partNorm = normalizeText(part);
    dbSpecialists.forEach(s => {
      const sNorm = normalizeText(s.nombre_completo);
      // Clean prefixes
      const sClean = sNorm.replace(/^(to|doc|f\.?t|nt\.?|ps\.?|pp\.?|tl|t\.?o\.?|lcda\.?|lic\.?)\s+/g, "").trim();
      const words = sClean.split(/\s+/).filter(w => w.length > 2);
      
      if (partNorm.includes(sClean) || sClean.includes(partNorm)) {
        matchedIds.add(s.id);
      } else if (words.length > 0 && words.every(w => partNorm.includes(w))) {
        matchedIds.add(s.id);
      } else if (sClean.includes("merlin") && partNorm.includes("merly")) {
        matchedIds.add(s.id);
      } else if (sClean.includes("carballo") && partNorm.includes("carballo")) {
        matchedIds.add(s.id);
      }
    });
  });
  
  return Array.from(matchedIds);
}

// Convert Excel dates (serial numbers or strings) to YYYY-MM-DD
function parseExcelDate(value) {
  if (!value) return null;
  
  // If it's already a Date object
  if (value instanceof Date) {
    return value.toISOString().split('T')[0];
  }
  
  // If it's a number (Excel date serial)
  if (typeof value === 'number' || !isNaN(Number(value))) {
    const serial = Number(value);
    const date = new Date(Math.round((serial - 25569) * 86400 * 1000));
    return date.toISOString().split('T')[0];
  }
  
  // If it's a string (e.g. "21/03/2026" or "2026-03-21")
  const dateStr = String(value).trim();
  if (dateStr.includes('/')) {
    const parts = dateStr.split('/');
    if (parts.length === 3) {
      // Assuming DD/MM/YYYY or MM/DD/YYYY. Let's try to parse
      let day = parseInt(parts[0], 10);
      let month = parseInt(parts[1], 10);
      let year = parseInt(parts[2], 10);
      
      // If month > 12, swap day and month
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
}

// Map format text to allowed formats
function parseFormato(formatText) {
  const norm = normalizeText(formatText);
  if (norm.includes('reel') || norm.includes('video') || norm.includes('pelicula')) {
    return 'video';
  } else if (norm.includes('story') || norm.includes('historia')) {
    return 'story';
  } else if (norm.includes('carrusel') || norm.includes('carousel')) {
    return 'carrusel';
  }
  return 'feed'; // default
}

async function importExcel() {
  console.log('📊 Starting Excel planificacion import...');

  // 1. Fetch specialties & specialists from DB
  const { data: dbSpecialties, error: specErr } = await supabase.from('especialidades').select('id, nombre');
  const { data: dbSpecialists, error: listErr } = await supabase.from('especialistas').select('id, nombre_completo');

  if (specErr || listErr) {
    console.error('❌ Error reading database specialists/specialties:', specErr?.message || listErr?.message);
    process.exit(1);
  }

  const specialtyMap = {};
  dbSpecialties.forEach(s => {
    specialtyMap[s.nombre] = s.id;
  });

  const filePath = path.resolve('PLANIFICACION OCUPAMOR ABRIL -JULIO 2026.xlsx');
  const workbook = xlsx.readFile(filePath);

  const publicationsToInsert = [];
  let errorCount = 0;
  let successCount = 0;

  workbook.SheetNames.forEach(sheetName => {
    const specialtyName = sheetSpecialtyMap[sheetName];
    if (!specialtyName) {
      console.log(`⚠️ Skipping sheet [${sheetName}] (Not mapped to any specialty)`);
      return;
    }

    const specialtyId = specialtyMap[specialtyName];
    if (!specialtyId) {
      console.error(`❌ Error: Specialty "${specialtyName}" not found in database. Run seed:especialidades first.`);
      process.exit(1);
    }

    const sheet = workbook.Sheets[sheetName];
    const rawData = xlsx.utils.sheet_to_json(sheet, { header: 1 });
    
    // Find header row (it contains "MES" and "TITULO")
    let headerRowIdx = -1;
    for (let r = 0; r < rawData.length; r++) {
      const row = rawData[r];
      if (row.includes('MES') && (row.includes('TITULO') || row.includes('TÍTULO'))) {
        headerRowIdx = r;
        break;
      }
    }

    if (headerRowIdx === -1) {
      console.warn(`⚠️ Warning: Could not find header row (with MES/TITULO) in sheet "${sheetName}". Skipping.`);
      return;
    }

    const headers = rawData[headerRowIdx].map(h => String(h).trim().toUpperCase());
    const mesIdx = headers.indexOf('MES');
    const tituloIdx = headers.findIndex(h => h.includes('TITULO') || h.includes('TÍTULO'));
    const temarioIdx = headers.findIndex(h => h.includes('TEMARIO') || h.includes('DESCRIPCION') || h.includes('DESCRIPCIÓN'));
    const fechaIdx = headers.indexOf('FECHA');
    const formatoIdx = headers.findIndex(h => h.includes('FORMATO') || h.includes('PUBLICACION'));
    const especialistaIdx = headers.findIndex(h => h.includes('ESPECIALISTA') || h.includes('NOMBRE Y APELLIDO'));
    const observacionesIdx = headers.indexOf('OBSERVACIONES');

    // Parse data rows
    for (let r = headerRowIdx + 1; r < rawData.length; r++) {
      const row = rawData[r];
      if (!row || row.length === 0) continue;

      const mesVal = row[mesIdx];
      const tituloVal = row[tituloIdx];
      
      if (!mesVal || !tituloVal) continue; // Skip empty rows

      const mesNorm = normalizeText(mesVal);
      const mesInt = monthMap[mesNorm];
      if (!mesInt) {
        console.warn(`[${sheetName}:Row ${r+1}] ⚠️ Invalid month name "${mesVal}". Skipping.`);
        errorCount++;
        continue;
      }

      const anio = 2026; // Default to 2026 as per spreadsheet name
      const titulo = String(tituloVal).trim();
      const temarioVal = row[temarioIdx] || '';
      const observacionesVal = row[observacionesIdx] || '';
      const descripcion = (String(temarioVal) + '\n' + String(observacionesVal)).trim();
      
      const deadline = parseExcelDate(row[fechaIdx]);
      const formato = parseFormato(row[formatoIdx]);
      
      const especialistaVal = row[especialistaIdx] || '';
      const especialistasAsignados = resolveSpecialists(String(especialistaVal), dbSpecialists);

      if (especialistasAsignados.length === 0 && String(especialistaVal).trim() !== '') {
        console.warn(`[${sheetName}:Row ${r+1}] ⚠️ Could not map specialist name "${especialistaVal}".`);
      }

      // Default status:
      // If month is April (4) or May (5), mark as "Publicado".
      // If month is June (6), mark as "Aprobado".
      // Else (July - 7), mark as "Pendiente" or "Diseñado"
      let estado = 'Pendiente';
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

  console.log(`Parsed ${publicationsToInsert.length} publications to import.`);

  // 3. Upsert publications into DB
  // To prevent duplicates, we can fetch existing publications for 2026 and map by (mes, anio, titulo)
  const { data: existingPubs, error: fetchErr } = await supabase
    .from('publicaciones')
    .select('mes, anio, titulo');

  if (fetchErr) {
    console.error('❌ Error fetching existing publications:', fetchErr.message);
    process.exit(1);
  }

  const existingSet = new Set(
    existingPubs.map(p => `${p.mes}_${p.anio}_${normalizeText(p.titulo)}`)
  );

  const filteredInserts = publicationsToInsert.filter(p => {
    const key = `${p.mes}_${p.anio}_${normalizeText(p.titulo)}`;
    const isDup = existingSet.has(key);
    if (isDup) {
      console.log(`⏭️ Skipping duplicate publication: "${p.titulo}" (${p.mes}/2026)`);
    }
    return !isDup;
  });

  if (filteredInserts.length === 0) {
    console.log('✅ No new publications to import.');
    console.log(`Summary: ${successCount} successful, ${errorCount} errors skipped.`);
    return;
  }

  const { data, error } = await supabase
    .from('publicaciones')
    .insert(filteredInserts)
    .select();

  if (error) {
    console.error('❌ Error inserting publications:', error.message);
    process.exit(1);
  }

  console.log(`✅ Loaded ${data.length} publications successfully.`);
}

importExcel();
