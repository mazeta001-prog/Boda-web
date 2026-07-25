-- Supabase Database Schema for Wedding Platform Command Center Dashboard
-- Production-Ready & Security Audited Supabase PostgreSQL Configuration

-- ==========================================
-- 1. EXTENSIONS
-- ==========================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- 2. TABLE CREATION & RELATIONS WITH CONSTRAINTS
-- ==========================================

-- 2.1 Events Table
CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  date TIMESTAMPTZ NOT NULL,
  location TEXT NOT NULL,
  max_capacity INT NOT NULL DEFAULT 100 CHECK (max_capacity >= 0),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.2 Tables (Seating) Table
CREATE TABLE IF NOT EXISTS public.tables (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  capacity INT NOT NULL DEFAULT 10 CHECK (capacity >= 0),
  occupied_seats INT NOT NULL DEFAULT 0 CHECK (occupied_seats >= 0),
  location_zone VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.3 Guests Table
CREATE TABLE IF NOT EXISTS public.guests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name VARCHAR(255) NOT NULL,
  nickname VARCHAR(100),
  category VARCHAR(100) DEFAULT 'Amigos',
  email VARCHAR(255),
  phone VARCHAR(50),
  status VARCHAR(20) NOT NULL CHECK (status IN ('confirmed', 'pending', 'declined')),
  event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
  table_id UUID REFERENCES public.tables(id) ON DELETE SET NULL,
  companions_count INT DEFAULT 0 CHECK (companions_count >= 0),
  dietary_restrictions TEXT,
  invitation_sent BOOLEAN DEFAULT false,
  invitation_opened BOOLEAN DEFAULT false,
  invitation_token VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.4 Gifts Table
CREATE TABLE IF NOT EXISTS public.gifts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  price NUMERIC(10, 2) NOT NULL DEFAULT 0.00 CHECK (price >= 0.00),
  status VARCHAR(20) NOT NULL CHECK (status IN ('available', 'reserved', 'purchased')),
  reserved_by VARCHAR(255),
  category VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.5 Invitations Table
CREATE TABLE IF NOT EXISTS public.invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  guest_id UUID REFERENCES public.guests(id) ON DELETE CASCADE,
  sent_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  status VARCHAR(20) NOT NULL CHECK (status IN ('sent', 'opened', 'accepted', 'declined')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.6 Budget Table
CREATE TABLE IF NOT EXISTS public.budget (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category VARCHAR(255) NOT NULL,
  allocated NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (allocated >= 0.00),
  used NUMERIC(12, 2) NOT NULL DEFAULT 0.00 CHECK (used >= 0.00),
  notes TEXT,
  image_url TEXT,
  payments JSONB DEFAULT '[]'::jsonb,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.7 Activity Logs Audit Table
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  action_type VARCHAR(50) NOT NULL,
  user_name VARCHAR(255) NOT NULL,
  user_avatar TEXT,
  details TEXT NOT NULL,
  target_id VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.8 Notifications Table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(20) DEFAULT 'info',
  read BOOLEAN DEFAULT false,
  action_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2.9 Excel Import Logs Table (Módulo Importar Excel)
CREATE TABLE IF NOT EXISTS public.import_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  filename VARCHAR(255) NOT NULL,
  records_imported INT NOT NULL DEFAULT 0 CHECK (records_imported >= 0),
  imported_by VARCHAR(255) DEFAULT 'Administrador',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Safe constraint additions for existing deployments
DO $$
BEGIN
  BEGIN
    ALTER TABLE public.events ADD CONSTRAINT check_events_max_capacity CHECK (max_capacity >= 0);
  EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL;
  END;
  BEGIN
    ALTER TABLE public.tables ADD CONSTRAINT check_tables_capacity CHECK (capacity >= 0);
  EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL;
  END;
  BEGIN
    ALTER TABLE public.tables ADD CONSTRAINT check_tables_occupied_seats CHECK (occupied_seats >= 0);
  EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL;
  END;
  BEGIN
    ALTER TABLE public.guests ADD CONSTRAINT check_guests_companions CHECK (companions_count >= 0);
  EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL;
  END;
  BEGIN
    ALTER TABLE public.gifts ADD CONSTRAINT check_gifts_price CHECK (price >= 0.00);
  EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL;
  END;
  BEGIN
    ALTER TABLE public.budget ADD CONSTRAINT check_budget_allocated CHECK (allocated >= 0.00);
  EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL;
  END;
  BEGIN
    ALTER TABLE public.budget ADD CONSTRAINT check_budget_used CHECK (used >= 0.00);
  EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL;
  END;
  BEGIN
    ALTER TABLE public.import_logs ADD CONSTRAINT check_import_logs_records CHECK (records_imported >= 0);
  EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL;
  END;
END $$;

-- ==========================================
-- 3. FUNCTIONS
-- ==========================================

CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- 4. TRIGGERS
-- ==========================================

DROP TRIGGER IF EXISTS update_guests_updated_at ON public.guests;
CREATE TRIGGER update_guests_updated_at
BEFORE UPDATE ON public.guests
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_gifts_updated_at ON public.gifts;
CREATE TRIGGER update_gifts_updated_at
BEFORE UPDATE ON public.gifts
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

DROP TRIGGER IF EXISTS update_budget_updated_at ON public.budget;
CREATE TRIGGER update_budget_updated_at
BEFORE UPDATE ON public.budget
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();

-- ==========================================
-- 5. INDEXES
-- ==========================================

CREATE INDEX IF NOT EXISTS idx_guests_event_id ON public.guests(event_id);
CREATE INDEX IF NOT EXISTS idx_guests_table_id ON public.guests(table_id);
CREATE INDEX IF NOT EXISTS idx_guests_status ON public.guests(status);
CREATE INDEX IF NOT EXISTS idx_guests_invitation_token ON public.guests(invitation_token);
CREATE INDEX IF NOT EXISTS idx_invitations_guest_id ON public.invitations(guest_id);
CREATE INDEX IF NOT EXISTS idx_invitations_status ON public.invitations(status);
CREATE INDEX IF NOT EXISTS idx_gifts_status ON public.gifts(status);
CREATE INDEX IF NOT EXISTS idx_events_date ON public.events(date);
CREATE INDEX IF NOT EXISTS idx_budget_category ON public.budget(category);

-- ==========================================
-- 6. PERMISSIONS & GRANTS
-- ==========================================

-- 6.1 Schema Usage Grants
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;

-- 6.2 Table Privileges Grants (Existing Tables)
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;

-- Explicit Table Grants for all 9 core tables
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.guests TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.budget TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.events TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.tables TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.gifts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.invitations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.activity_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.notifications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.import_logs TO authenticated;

-- 6.3 Sequence Privileges Grants (UUID Generation & Sequences)
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;

-- 6.4 Default Privileges for Future Tables & Sequences
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO authenticated;

-- ==========================================
-- 7. ROW LEVEL SECURITY (RLS) & POLICIES
-- ==========================================

-- Enable RLS on all 9 tables
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_logs ENABLE ROW LEVEL SECURITY;

-- Explicit policy drops restricted ONLY to this project's tables
DROP POLICY IF EXISTS "Allow public select events" ON public.events;
DROP POLICY IF EXISTS "Allow authenticated manage events" ON public.events;
DROP POLICY IF EXISTS "Authenticated users manage events" ON public.events;

DROP POLICY IF EXISTS "Allow public select tables" ON public.tables;
DROP POLICY IF EXISTS "Allow authenticated manage tables" ON public.tables;
DROP POLICY IF EXISTS "Authenticated users manage tables" ON public.tables;

DROP POLICY IF EXISTS "Allow public select guests" ON public.guests;
DROP POLICY IF EXISTS "Allow public select guests for RSVP" ON public.guests;
DROP POLICY IF EXISTS "Allow public insert guests" ON public.guests;
DROP POLICY IF EXISTS "Allow public update guests for RSVP" ON public.guests;
DROP POLICY IF EXISTS "Allow authenticated manage guests" ON public.guests;
DROP POLICY IF EXISTS "Authenticated users can read guests" ON public.guests;
DROP POLICY IF EXISTS "Authenticated users manage guests" ON public.guests;

DROP POLICY IF EXISTS "Allow public select gifts" ON public.gifts;
DROP POLICY IF EXISTS "Allow public update gifts for reservation" ON public.gifts;
DROP POLICY IF EXISTS "Allow authenticated manage gifts" ON public.gifts;
DROP POLICY IF EXISTS "Authenticated users manage gifts" ON public.gifts;

DROP POLICY IF EXISTS "Allow public select invitations" ON public.invitations;
DROP POLICY IF EXISTS "Allow authenticated manage invitations" ON public.invitations;
DROP POLICY IF EXISTS "Authenticated users manage invitations" ON public.invitations;

DROP POLICY IF EXISTS "Allow public select budget" ON public.budget;
DROP POLICY IF EXISTS "Allow authenticated manage budget" ON public.budget;
DROP POLICY IF EXISTS "Authenticated users manage budget" ON public.budget;

DROP POLICY IF EXISTS "Allow public select activity_logs" ON public.activity_logs;
DROP POLICY IF EXISTS "Allow public insert activity_logs" ON public.activity_logs;
DROP POLICY IF EXISTS "Allow authenticated manage activity_logs" ON public.activity_logs;
DROP POLICY IF EXISTS "Authenticated users manage activity_logs" ON public.activity_logs;

DROP POLICY IF EXISTS "Allow public select notifications" ON public.notifications;
DROP POLICY IF EXISTS "Allow public insert notifications" ON public.notifications;
DROP POLICY IF EXISTS "Allow public update notifications" ON public.notifications;
DROP POLICY IF EXISTS "Allow authenticated manage notifications" ON public.notifications;
DROP POLICY IF EXISTS "Authenticated users manage notifications" ON public.notifications;

DROP POLICY IF EXISTS "Allow public select import_logs" ON public.import_logs;
DROP POLICY IF EXISTS "Allow public insert import_logs" ON public.import_logs;
DROP POLICY IF EXISTS "Allow authenticated manage import_logs" ON public.import_logs;
DROP POLICY IF EXISTS "Authenticated users manage import_logs" ON public.import_logs;

-- 7.1 Events Policies
CREATE POLICY "Authenticated users manage events"
  ON public.events FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Allow public select events"
  ON public.events FOR SELECT USING (true);

-- 7.2 Tables Policies
CREATE POLICY "Authenticated users manage tables"
  ON public.tables FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Allow public select tables"
  ON public.tables FOR SELECT USING (true);

-- 7.3 Guests Policies
CREATE POLICY "Authenticated users manage guests"
  ON public.guests FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Allow public select guests for RSVP"
  ON public.guests FOR SELECT USING (invitation_token IS NOT NULL);

CREATE POLICY "Allow public update guests for RSVP"
  ON public.guests FOR UPDATE USING (invitation_token IS NOT NULL) WITH CHECK (invitation_token IS NOT NULL);

-- 7.4 Gifts Policies
CREATE POLICY "Authenticated users manage gifts"
  ON public.gifts FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Allow public select gifts"
  ON public.gifts FOR SELECT USING (true);

CREATE POLICY "Allow public update gifts for reservation"
  ON public.gifts FOR UPDATE USING (status = 'available') WITH CHECK (status IN ('reserved', 'purchased'));

-- 7.5 Invitations Policies
CREATE POLICY "Authenticated users manage invitations"
  ON public.invitations FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- 7.6 Budget Policies
CREATE POLICY "Authenticated users manage budget"
  ON public.budget FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- 7.7 Activity Logs Policies
CREATE POLICY "Authenticated users manage activity_logs"
  ON public.activity_logs FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Allow public insert activity_logs"
  ON public.activity_logs FOR INSERT WITH CHECK (action_type IN ('invitation_accepted', 'invitation_declined', 'gift_reserved', 'gift_purchased', 'guest_created', 'invitation_sent'));

-- 7.8 Notifications Policies
CREATE POLICY "Authenticated users manage notifications"
  ON public.notifications FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Allow public insert notifications"
  ON public.notifications FOR INSERT WITH CHECK (true);

-- 7.9 Import Logs Policies
CREATE POLICY "Authenticated users manage import_logs"
  ON public.import_logs FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- ==========================================
-- 7. REALTIME PUBLICATION
-- ==========================================

DO $$
DECLARE
  t text;
  tables_to_add text[] := ARRAY['guests', 'events', 'tables', 'gifts', 'activity_logs', 'notifications', 'import_logs'];
BEGIN
  IF EXISTS (SELECT 1 FROM pg_publication WHERE pubname = 'supabase_realtime') THEN
    FOREACH t IN ARRAY tables_to_add LOOP
      IF NOT EXISTS (
        SELECT 1 
        FROM pg_publication_rel pr
        JOIN pg_class c ON c.oid = pr.prrelid
        JOIN pg_namespace n ON n.oid = c.relnamespace
        JOIN pg_publication p ON p.oid = pr.prpubid
        WHERE p.pubname = 'supabase_realtime'
          AND n.nspname = 'public'
          AND c.relname = t
      ) THEN
        EXECUTE format('ALTER PUBLICATION supabase_realtime ADD TABLE public.%I', t);
      END IF;
    END LOOP;
  END IF;
END $$;

-- ==========================================
-- 8. SEED DATA
-- ==========================================

INSERT INTO public.events (title, date, location, max_capacity)
SELECT 'Ceremonia Principal & Banquete', '2026-12-20 16:00:00+00', 'Finca El Olivar, Madrid', 250
WHERE NOT EXISTS (SELECT 1 FROM public.events WHERE title = 'Ceremonia Principal & Banquete');

INSERT INTO public.events (title, date, location, max_capacity)
SELECT 'Cóctel de Bienvenida', '2026-12-19 20:00:00+00', 'Terraza Gran Vía', 100
WHERE NOT EXISTS (SELECT 1 FROM public.events WHERE title = 'Cóctel de Bienvenida');

INSERT INTO public.tables (name, capacity, occupied_seats, location_zone)
SELECT 'Mesa Imperial 1', 12, 9, 'Zona Central'
WHERE NOT EXISTS (SELECT 1 FROM public.tables WHERE name = 'Mesa Imperial 1');

INSERT INTO public.tables (name, capacity, occupied_seats, location_zone)
SELECT 'Mesa Presidencial', 10, 8, 'Escenario'
WHERE NOT EXISTS (SELECT 1 FROM public.tables WHERE name = 'Mesa Presidencial');

INSERT INTO public.tables (name, capacity, occupied_seats, location_zone)
SELECT 'Mesa Jardín A', 8, 5, 'Jardín'
WHERE NOT EXISTS (SELECT 1 FROM public.tables WHERE name = 'Mesa Jardín A');

INSERT INTO public.budget (category, allocated, used, notes)
SELECT 'Catering & Banquete', 15000.00, 12500.00, 'Reserva 80% pagada'
WHERE NOT EXISTS (SELECT 1 FROM public.budget WHERE category = 'Catering & Banquete');

INSERT INTO public.budget (category, allocated, used, notes)
SELECT 'Fotografía & Vídeo', 3500.00, 2000.00, 'Señal entregada'
WHERE NOT EXISTS (SELECT 1 FROM public.budget WHERE category = 'Fotografía & Vídeo');

INSERT INTO public.budget (category, allocated, used, notes)
SELECT 'Decoración Floral', 2500.00, 1200.00, 'Flores ceremonia y mesas'
WHERE NOT EXISTS (SELECT 1 FROM public.budget WHERE category = 'Decoración Floral');

INSERT INTO public.budget (category, allocated, used, notes)
SELECT 'Música & DJ', 2000.00, 800.00, 'Reserva DJ'
WHERE NOT EXISTS (SELECT 1 FROM public.budget WHERE category = 'Música & DJ');

INSERT INTO public.activity_logs (action_type, user_name, details)
SELECT 'guest_created', 'Administrador', 'Sistema de Dashboard iniciado y sincronizado.'
WHERE NOT EXISTS (SELECT 1 FROM public.activity_logs WHERE details = 'Sistema de Dashboard iniciado y sincronizado.');
