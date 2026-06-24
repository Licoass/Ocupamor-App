export interface Specialty {
  id: string;
  nombre: string;
  color_tema: string;
  orden: number;
  created_at?: string;
}

export interface Specialist {
  id: string;
  nombre_completo: string;
  especialidad_id?: string | null;
  especialidades_ids?: string[]; // Array of specialties
  foto_perfil: string | null;
  instagram: string | null;
  federacion_matricula: string;
  fecha_cumpleanos: string | null; // YYYY-MM-DD
  url_drive_personal: string;
  created_at?: string;
  updated_at?: string;
  // Join helper field
  especialidades?: Specialty[];
}

export type PublicationFormat = 'story' | 'feed' | 'carrusel' | 'video';
export type PublicationStatus = 'Pendiente' | 'Diseñado' | 'Aprobado' | 'Publicado';

export interface Publication {
  id: string;
  mes: number; // 1-12
  anio: number;
  titulo: string;
  descripcion: string | null;
  formato: PublicationFormat;
  especialidad_id: string;
  especialistas_asignados: string[]; // UUID[] array of specialists
  deadline: string | null; // YYYY-MM-DD
  estado: PublicationStatus;
  notas_internas: string | null;
  url_drive_revision: string | null;
  created_at?: string;
  updated_at?: string;
  updated_by?: string | null;
  // Join helper fields
  especialidades?: Specialty;
}

export interface Efemeride {
  id: string;
  nombre: string;
  dia: number;
  mes: number;
  tipo: 'efeméride_venezuela' | 'evento_ocupamor';
  descripcion_breve: string | null;
  sugerencia_post: boolean;
  created_at?: string;
}

export interface AutomaticBirthday {
  id: string;
  especialista_id: string;
  mes: number;
  dia: number;
  es_story: boolean;
  notificacion_enviada: boolean;
  created_at?: string;
  // Join helper field
  especialistas?: Specialist;
}

export interface RealtimeStatus {
  status: 'synced' | 'syncing' | 'error';
  message?: string;
}

export interface MonthlyLink {
  id: string;
  mes: number;
  anio: number;
  url_canva: string | null;
  created_at?: string;
  updated_at?: string;
}
