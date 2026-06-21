import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('Error: VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY must be set in your environment.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

const specialistsData = [
  {
    "nombre_completo": "TO YULIBETH ALCALA",
    "especialidad": "Club de Juegos",
    "instagram": "",
    "federacion_matricula": "MPPS:",
    "fecha_cumpleanos": null,
    "url_drive_personal": "https://drive.google.com/drive/folders/1BN2dt_oVKIVA2wijNUz8xwwqW2WJIEjw?usp=drive_link"
  },
  {
    "nombre_completo": "DOC. ONAILY VETRANO",
    "especialidad": "Club de Tareas",
    "instagram": "",
    "federacion_matricula": "MPPS:",
    "fecha_cumpleanos": "1986-12-30",
    "url_drive_personal": "https://drive.google.com/drive/folders/1ZNw7lWH_Dj07zto-urdhRPdxkHkGofwD?usp=drive_link"
  },
  {
    "nombre_completo": "F.T DORIANGELYS COVA",
    "especialidad": "Fisioterapia",
    "instagram": "",
    "federacion_matricula": "MPPS:",
    "fecha_cumpleanos": "2001-05-02",
    "url_drive_personal": "https://drive.google.com/drive/folders/1_NtSPw5Dg7BTCB2607MwzPB1idq-xXMN?usp=drive_link"
  },
  {
    "nombre_completo": "F.T MIGUEL INFANTE",
    "especialidad": "Fisioterapia",
    "instagram": "",
    "federacion_matricula": "MPPS:",
    "fecha_cumpleanos": null,
    "url_drive_personal": "https://drive.google.com/drive/folders/1BF8J3LH-wJuKS7hmHzgDlAx2HVw1iKNy?usp=drive_link"
  },
  {
    "nombre_completo": "F.T YAISIBIT PATIÑO",
    "especialidad": "Fisioterapia",
    "instagram": "",
    "federacion_matricula": "MPPS:",
    "fecha_cumpleanos": "1998-03-26",
    "url_drive_personal": "https://drive.google.com/drive/folders/1Pc8RP_iWqK-Dj_gU6ItwrD6FqBEfaXse?usp=drive_link"
  },
  {
    "nombre_completo": "NT. ADERLING PARISCA",
    "especialidad": "Nutrición",
    "instagram": "",
    "federacion_matricula": "MPPS:",
    "fecha_cumpleanos": null,
    "url_drive_personal": "https://drive.google.com/drive/folders/1EAc3D1Dccm6F2bJw_3bq68T9hXFG-zZe?usp=drive_link"
  },
  {
    "nombre_completo": "NT. STEPHANNIE MORA",
    "especialidad": "Nutrición",
    "instagram": "",
    "federacion_matricula": "MPPS:",
    "fecha_cumpleanos": null,
    "url_drive_personal": "https://drive.google.com/drive/folders/1x7RHk_As_XdrJTjXrV3KRn22AjbhKVVt?usp=drive_link"
  },
  {
    "nombre_completo": "PS. JHOANA CASTILLO",
    "especialidad": "Psicología",
    "instagram": "",
    "federacion_matricula": "MPPS:",
    "fecha_cumpleanos": "1994-10-25",
    "url_drive_personal": "https://drive.google.com/drive/folders/1Bifhs3AOurANkc0oMltdD-7Hoxct4P7O?usp=drive_link"
  },
  {
    "nombre_completo": "PS. NELSON COLMENARES",
    "especialidad": "Psicología",
    "instagram": "",
    "federacion_matricula": "MPPS:",
    "fecha_cumpleanos": null,
    "url_drive_personal": "https://drive.google.com/drive/folders/15AtRox9YUHxiDNI7pDg0INJq4ktaJU7P?usp=drive_link"
  },
  {
    "nombre_completo": "PS. SIRAMAD GONZÁLEZ",
    "especialidad": "Psicología",
    "instagram": "",
    "federacion_matricula": "MPPS:",
    "fecha_cumpleanos": null,
    "url_drive_personal": "https://drive.google.com/drive/folders/1ZeQMzcXYRciITRizENKYVO1eoWmOz_hi?usp=drive_link"
  },
  {
    "nombre_completo": "PP. FRANCIA REYES",
    "especialidad": "Psicopedagogía",
    "instagram": "",
    "federacion_matricula": "MPPS:",
    "fecha_cumpleanos": "1966-03-29",
    "url_drive_personal": "https://drive.google.com/drive/folders/1P9OoJlZPCQtRHUwfj1t50pWYhCtku3SM?usp=drive_link"
  },
  {
    "nombre_completo": "PP. MERLIN CARBALLO",
    "especialidad": "Psicopedagogía",
    "instagram": "",
    "federacion_matricula": "MPPS:",
    "fecha_cumpleanos": "1979-09-19",
    "url_drive_personal": "https://drive.google.com/drive/folders/1Yhh1r5yWfDpMn-EKq0buNDTi8Ko0Jw0U?usp=drive_link"
  },
  {
    "nombre_completo": "TL YESENIA MORA",
    "especialidad": "Terapia de Lenguaje",
    "instagram": "",
    "federacion_matricula": "MPPS:",
    "fecha_cumpleanos": null,
    "url_drive_personal": "https://drive.google.com/drive/folders/1zLK5zVrnGo0zyjzEoRV4vU1fkLqKluHE?usp=drive_link"
  },
  {
    "nombre_completo": "T.O BETANIA HERNANDEZ",
    "especialidad": "Terapia Ocupacional",
    "instagram": "FTO.WILMARYGARCIA",
    "federacion_matricula": "MPPS:",
    "fecha_cumpleanos": "1994-09-09",
    "url_drive_personal": "https://drive.google.com/drive/folders/1vJD3_PcMJLt4S2FT9eob39NSs029x98L?usp=drive_link"
  },
  {
    "nombre_completo": "T.O ELIMAR ROJAS",
    "especialidad": "Terapia Ocupacional",
    "instagram": "",
    "federacion_matricula": "MPPS:",
    "fecha_cumpleanos": "1999-04-22",
    "url_drive_personal": "https://drive.google.com/drive/folders/1ZijRGBSkbJ_VEZBIE6J3wZyKOoK0tsI5?usp=drive_link"
  },
  {
    "nombre_completo": "T.O MARIA PEÑA",
    "especialidad": "Terapia Ocupacional",
    "instagram": "",
    "federacion_matricula": "MPPS:",
    "fecha_cumpleanos": "1993-04-09",
    "url_drive_personal": "https://drive.google.com/drive/folders/1Osda4cb4V09bimO00D6dCPlKGopmdKwb?usp=drive_link"
  },
  {
    "nombre_completo": "T.O/F.T WILMARY GARCIA",
    "especialidad": "Terapia Ocupacional",
    "instagram": "FTO.WILMARYGARCIA",
    "federacion_matricula": "MPPS:",
    "fecha_cumpleanos": "2000-10-24",
    "url_drive_personal": "https://drive.google.com/drive/folders/1eaEFJbeG2wdq7vl1myhSwUt-lZK7APJW?usp=drive_link"
  }
];

async function seed() {
  console.log('🌱 Starting specialists seed...');

  // 1. Fetch specialties to map names to UUIDs
  const { data: specialties, error: specError } = await supabase
    .from('especialidades')
    .select('id, nombre');

  if (specError) {
    console.error('❌ Error fetching specialties:', specError.message);
    process.exit(1);
  }

  const specialtyMap = {};
  specialties.forEach(s => {
    specialtyMap[s.nombre] = s.id;
  });

  // 2. Prepare specialists insert data
  const insertData = specialistsData.map(sp => {
    const specialtyId = specialtyMap[sp.especialidad];
    if (!specialtyId) {
      console.warn(`⚠️ Warning: Specialty "${sp.especialidad}" for specialist "${sp.nombre_completo}" not found in database. Skipping.`);
      return null;
    }
    return {
      nombre_completo: sp.nombre_completo,
      especialidad_id: specialtyId,
      instagram: sp.instagram,
      federacion_matricula: sp.federacion_matricula,
      fecha_cumpleanos: sp.fecha_cumpleanos,
      url_drive_personal: sp.url_drive_personal
    };
  }).filter(Boolean);

  // 3. Upsert specialists
  const { data, error } = await supabase
    .from('especialistas')
    .upsert(insertData, { onConflict: 'nombre_completo' })
    .select();

  if (error) {
    console.error('❌ Error seeding specialists:', error.message);
    process.exit(1);
  }

  console.log(`✅ ${data.length} specialists loaded successfully.`);
}

seed();
