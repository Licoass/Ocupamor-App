import 'dotenv/config';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY (or SUPABASE_SERVICE_ROLE_KEY) must be set in your environment.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const specialties = [
  { nombre: 'Club de Juegos', color_tema: '#FF2E7A', orden: 1 },
  { nombre: 'Club de Tareas', color_tema: '#6A2CFF', orden: 2 },
  { nombre: 'Fisioterapia', color_tema: '#1EDB8F', orden: 3 },
  { nombre: 'Nutrición', color_tema: '#B7E000', orden: 4 },
  { nombre: 'Psicología', color_tema: '#00C2FF', orden: 5 },
  { nombre: 'Psicopedagogía', color_tema: '#FF9F00', orden: 6 },
  { nombre: 'Terapia de Lenguaje', color_tema: '#E000B7', orden: 7 },
  { nombre: 'Terapia Ocupacional', color_tema: '#8A00FF', orden: 8 }
];

async function seed() {
  console.log('🌱 Starting specialties seed...');
  
  const { data, error } = await supabase
    .from('especialidades')
    .upsert(specialties, { onConflict: 'nombre' })
    .select();

  if (error) {
    console.error('❌ Error seeding specialties:', error.message);
    process.exit(1);
  }

  console.log(`✅ Specialties seeded successfully. Loaded ${data.length} specialties.`);
  console.log(data.map(d => ` - ${d.nombre} (${d.color_tema})`).join('\n'));
}

seed();
