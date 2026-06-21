import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set in your environment.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Normalize text for matching
function normalizeText(text) {
  if (!text) return '';
  return text.toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim();
}

async function importFeriados() {
  console.log('📅 Starting iCalendar feriados import...');

  // 1. Fetch specialists list to filter out their birthdays from general efemerides
  const { data: dbSpecialists, error: listErr } = await supabase.from('especialistas').select('nombre_completo');
  if (listErr) {
    console.error('❌ Error reading specialists from DB:', listErr.message);
    process.exit(1);
  }
  const specialistNames = dbSpecialists.map(s => normalizeText(s.nombre_completo.replace(/^(to|doc|f\.?t|nt\.?|ps\.?|pp\.?|tl|t\.?o\.?|lcda\.?|lic\.?)\s+/i, '')));

  const filePath = path.resolve('Feriados RRSS_aee98c4e8a895eb14800277aa1b98e6ad0f599cb5e17ddda6303705b8953480e@group.calendar.google.com.ics');
  let fileContent = '';
  try {
    fileContent = fs.readFileSync(filePath, 'utf8');
  } catch (err) {
    console.error('❌ Error reading .ics file:', err.message);
    process.exit(1);
  }

  // Unfold lines: iCalendar lines are folded at 75 octets with a CRLF followed by a space
  // Replace CRLF+space with empty string
  const unfoldedContent = fileContent.replace(/\r?\n[ \t]/g, '');

  const events = unfoldedContent.split('BEGIN:VEVENT');
  // Skip the first element as it contains VCALENDAR headers
  events.shift();

  const efemeridesToInsert = [];

  events.forEach((eventStr, index) => {
    const lines = eventStr.split(/\r?\n/);
    let dtstart = '';
    let summary = '';

    lines.forEach(line => {
      if (line.startsWith('DTSTART')) {
        const parts = line.split(':');
        if (parts.length >= 2) {
          // extract the date part (8 digits, e.g. 20231114)
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

    const year = parseInt(dtstart.substring(0, 4), 10);
    const mes = parseInt(dtstart.substring(4, 6), 10);
    const dia = parseInt(dtstart.substring(6, 8), 10);

    const summaryNorm = normalizeText(summary);

    // Skip if it matches a specialist's birthday to avoid duplicate birthdays
    const isSpecialistBirthday = specialistNames.some(name => {
      return summaryNorm.includes(name) || name.includes(summaryNorm);
    });

    if (isSpecialistBirthday) {
      // console.log(`⏭️ Skipping specialist birthday from calendar: "${summary}"`);
      return;
    }

    // Classify as "efeméride_venezuela" or "evento_ocupamor"
    // General terms denote venezuela holidays, specific Ocupamor words denote center events
    let tipo = 'efeméride_venezuela';
    if (summaryNorm.includes('ocupamor') || summaryNorm.includes('centro') || summaryNorm.includes('actividad') || summaryNorm.includes('charla')) {
      tipo = 'evento_ocupamor';
    }

    // Deduce if it should suggest creating a post (e.g. important health and childhood days)
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

  console.log(`Parsed ${efemeridesToInsert.length} efemerides. Inserting into Supabase...`);

  // To prevent duplicates, fetch existing ones
  const { data: existingEfemerides, error: fetchErr } = await supabase
    .from('efemerides')
    .select('nombre, dia, mes');

  if (fetchErr) {
    console.error('❌ Error fetching existing efemerides:', fetchErr.message);
    process.exit(1);
  }

  const existingSet = new Set(
    existingEfemerides.map(e => `${e.dia}_${e.mes}_${normalizeText(e.nombre)}`)
  );

  const filteredInserts = efemeridesToInsert.filter(e => {
    const key = `${e.dia}_${e.mes}_${normalizeText(e.nombre)}`;
    const isDup = existingSet.has(key);
    return !isDup;
  });

  if (filteredInserts.length === 0) {
    console.log('✅ No new efemerides to import.');
    return;
  }

  // Supabase has a max insert limit or we can just insert them in chunks if there are too many. 
  // There are ~100-200, which is perfectly fine for a single insert.
  const { data, error } = await supabase
    .from('efemerides')
    .insert(filteredInserts)
    .select();

  if (error) {
    console.error('❌ Error inserting efemerides:', error.message);
    process.exit(1);
  }

  console.log(`✅ Loaded ${data.length} efemerides successfully.`);
}

importFeriados();
