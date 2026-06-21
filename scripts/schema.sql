-- SCHEMA FOR OCUPAMOR DESIGN MANAGEMENT SYSTEM
-- Run this in the Supabase SQL Editor.

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Clean existing tables if needed (uncomment for clean re-run)
-- DROP TRIGGER IF EXISTS trg_especialista_birthday ON especialistas;
-- DROP FUNCTION IF EXISTS handle_especialista_birthday();
-- DROP TABLE IF EXISTS cumpleanos_automaticos CASCADE;
-- DROP TABLE IF EXISTS efemerides CASCADE;
-- DROP TABLE IF EXISTS publicaciones CASCADE;
-- DROP TABLE IF EXISTS especialistas CASCADE;
-- DROP TABLE IF EXISTS especialidades CASCADE;

-- 1. Table: especialidades
CREATE TABLE IF NOT EXISTS especialidades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre TEXT UNIQUE NOT NULL,
    color_tema TEXT NOT NULL, -- hex color (e.g. '#6A2CFF')
    orden INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS for especialidades
ALTER TABLE especialidades ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permitir todo a usuarios autenticados" ON especialidades
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 2. Table: especialistas
CREATE TABLE IF NOT EXISTS especialistas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre_completo TEXT UNIQUE NOT NULL,
    especialidad_id UUID NOT NULL REFERENCES especialidades(id) ON DELETE RESTRICT,
    foto_perfil TEXT, -- URL to Supabase Storage bucket
    instagram TEXT, -- without @
    federacion_matricula TEXT NOT NULL DEFAULT 'MPPS:',
    fecha_cumpleanos DATE, -- can be NULL, triggers alert if NULL
    url_drive_personal TEXT NOT NULL, -- Personal Drive URL (CRITICAL)
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS for especialistas
ALTER TABLE especialistas ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permitir todo a usuarios autenticados" ON especialistas
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 3. Table: publicaciones
CREATE TABLE IF NOT EXISTS publicaciones (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    mes INTEGER NOT NULL CHECK (mes >= 1 AND mes <= 12),
    anio INTEGER NOT NULL,
    titulo TEXT NOT NULL,
    descripcion TEXT,
    formato TEXT NOT NULL CHECK (formato IN ('story', 'feed', 'carrusel', 'video')),
    especialidad_id UUID NOT NULL REFERENCES especialidades(id) ON DELETE RESTRICT,
    especialistas_asignados UUID[] NOT NULL DEFAULT '{}',
    deadline DATE,
    estado TEXT NOT NULL CHECK (estado IN ('Pendiente', 'Diseñado', 'Aprobado', 'Publicado')) DEFAULT 'Pendiente',
    notas_internas TEXT,
    url_drive_revision TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL
);

-- Enable RLS for publicaciones
ALTER TABLE publicaciones ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permitir todo a usuarios autenticados" ON publicaciones
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 4. Table: efemerides
CREATE TABLE IF NOT EXISTS efemerides (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre TEXT NOT NULL,
    dia INTEGER NOT NULL CHECK (dia >= 1 AND dia <= 31),
    mes INTEGER NOT NULL CHECK (mes >= 1 AND mes <= 12),
    tipo TEXT NOT NULL CHECK (tipo IN ('efeméride_venezuela', 'evento_ocupamor')),
    descripcion_breve TEXT CHECK (char_length(descripcion_breve) <= 150),
    sugerencia_post BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS for efemerides
ALTER TABLE efemerides ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permitir todo a usuarios autenticados" ON efemerides
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 5. Table: cumpleanos_automaticos
CREATE TABLE IF NOT EXISTS cumpleanos_automaticos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    especialista_id UUID UNIQUE NOT NULL REFERENCES especialistas(id) ON DELETE CASCADE,
    mes INTEGER NOT NULL CHECK (mes >= 1 AND mes <= 12),
    dia INTEGER NOT NULL CHECK (dia >= 1 AND dia <= 31),
    es_story BOOLEAN NOT NULL DEFAULT true,
    notificacion_enviada BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Enable RLS for cumpleanos_automaticos
ALTER TABLE cumpleanos_automaticos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Permitir todo a usuarios autenticados" ON cumpleanos_automaticos
    FOR ALL TO authenticated USING (true) WITH CHECK (true);

-- 6. Trigger: Automatic Birthday Generation on specialists update/insert
CREATE OR REPLACE FUNCTION handle_especialista_birthday()
RETURNS TRIGGER AS $$
BEGIN
    IF NEW.fecha_cumpleanos IS NOT NULL THEN
        INSERT INTO cumpleanos_automaticos (especialista_id, mes, dia, es_story, notificacion_enviada)
        VALUES (
            NEW.id,
            EXTRACT(MONTH FROM NEW.fecha_cumpleanos)::INTEGER,
            EXTRACT(DAY FROM NEW.fecha_cumpleanos)::INTEGER,
            TRUE,
            FALSE
        )
        ON CONFLICT (especialista_id) DO UPDATE
        SET mes = EXCLUDED.mes,
            dia = EXCLUDED.dia,
            notificacion_enviada = FALSE;
    ELSE
        DELETE FROM cumpleanos_automaticos WHERE especialista_id = NEW.id;
    END IF;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER trg_especialista_birthday
AFTER INSERT OR UPDATE OF fecha_cumpleanos ON especialistas
FOR EACH ROW EXECUTE FUNCTION handle_especialista_birthday();

-- Create Realtime publication channel publication subscriptions
-- Note: You should enable Realtime for 'publicaciones' and 'especialistas' tables 
-- in the Supabase Dashboard under Database -> Replication -> supabase_realtime.
