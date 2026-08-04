-- Supabase Database Migration Script for Wedding Platform
-- Target Environment: Existing Production Database (Incremental Updates)
-- Purpose: Apply missing columns, constraints, functions, triggers, indexes, RLS policies, grants, and Realtime publications without recreating existing tables or inserting seed data.

-- ==========================================
-- 1. EXTENSIONS
-- ==========================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==========================================
-- 2. ALTER TABLES: ADD MISSING COLUMNS SAFELY
-- ==========================================

-- 2.1 Events Table
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS max_capacity INT NOT NULL DEFAULT 100;
ALTER TABLE public.events ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- 2.2 Tables (Seating) Table
ALTER TABLE public.tables ADD COLUMN IF NOT EXISTS capacity INT NOT NULL DEFAULT 10;
ALTER TABLE public.tables ADD COLUMN IF NOT EXISTS occupied_seats INT NOT NULL DEFAULT 0;
ALTER TABLE public.tables ADD COLUMN IF NOT EXISTS location_zone VARCHAR(100);
ALTER TABLE public.tables ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- 2.3 Guests Table
ALTER TABLE public.guests ADD COLUMN IF NOT EXISTS nickname VARCHAR(100);
ALTER TABLE public.guests ADD COLUMN IF NOT EXISTS category VARCHAR(100) DEFAULT 'Amigos';
ALTER TABLE public.guests ADD COLUMN IF NOT EXISTS email VARCHAR(255);
ALTER TABLE public.guests ADD COLUMN IF NOT EXISTS phone VARCHAR(50);
ALTER TABLE public.guests ADD COLUMN IF NOT EXISTS event_id UUID REFERENCES public.events(id) ON DELETE SET NULL;
ALTER TABLE public.guests ADD COLUMN IF NOT EXISTS table_id UUID REFERENCES public.tables(id) ON DELETE SET NULL;
ALTER TABLE public.guests ADD COLUMN IF NOT EXISTS companions_count INT DEFAULT 0;
ALTER TABLE public.guests ADD COLUMN IF NOT EXISTS dietary_restrictions TEXT;
ALTER TABLE public.guests ADD COLUMN IF NOT EXISTS invitation_sent BOOLEAN DEFAULT false;
ALTER TABLE public.guests ADD COLUMN IF NOT EXISTS invitation_opened BOOLEAN DEFAULT false;
ALTER TABLE public.guests ADD COLUMN IF NOT EXISTS invitation_token VARCHAR(100);
ALTER TABLE public.guests ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.guests ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 2.4 Gifts Table
ALTER TABLE public.gifts ADD COLUMN IF NOT EXISTS price NUMERIC(10, 2) NOT NULL DEFAULT 0.00;
ALTER TABLE public.gifts ADD COLUMN IF NOT EXISTS reserved_by VARCHAR(255);
ALTER TABLE public.gifts ADD COLUMN IF NOT EXISTS category VARCHAR(100);
ALTER TABLE public.gifts ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.gifts ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 2.5 Invitations Table
ALTER TABLE public.invitations ADD COLUMN IF NOT EXISTS guest_id UUID REFERENCES public.guests(id) ON DELETE CASCADE;
ALTER TABLE public.invitations ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ;
ALTER TABLE public.invitations ADD COLUMN IF NOT EXISTS opened_at TIMESTAMPTZ;
ALTER TABLE public.invitations ADD COLUMN IF NOT EXISTS accepted_at TIMESTAMPTZ;
ALTER TABLE public.invitations ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- 2.6 Budget Table
ALTER TABLE public.budget ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.budget ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE public.budget ADD COLUMN IF NOT EXISTS payments JSONB DEFAULT '[]'::jsonb;
ALTER TABLE public.budget ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();
ALTER TABLE public.budget ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT NOW();

-- 2.7 Activity Logs Table
ALTER TABLE public.activity_logs ADD COLUMN IF NOT EXISTS user_avatar TEXT;
ALTER TABLE public.activity_logs ADD COLUMN IF NOT EXISTS target_id VARCHAR(255);
ALTER TABLE public.activity_logs ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- 2.8 Notifications Table
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS type VARCHAR(20) DEFAULT 'info';
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS read BOOLEAN DEFAULT false;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS action_url TEXT;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- 2.9 Import Logs Table
ALTER TABLE public.import_logs ADD COLUMN IF NOT EXISTS filename VARCHAR(255);
ALTER TABLE public.import_logs ADD COLUMN IF NOT EXISTS records_imported INT NOT NULL DEFAULT 0;
ALTER TABLE public.import_logs ADD COLUMN IF NOT EXISTS imported_by VARCHAR(255) DEFAULT 'Administrador';
ALTER TABLE public.import_logs ADD COLUMN IF NOT EXISTS created_at TIMESTAMPTZ DEFAULT NOW();

-- 2.10 Settings Table (Configuración Global: Presupuesto Total y Fecha Límite RSVP)
CREATE TABLE IF NOT EXISTS public.settings (
  id INT PRIMARY KEY DEFAULT 1,
  total_budget_goal NUMERIC(12, 2) DEFAULT 1000000.00,
  rsvp_deadline TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS total_budget_goal NUMERIC(12, 2) DEFAULT 1000000.00;
ALTER TABLE public.settings ADD COLUMN IF NOT EXISTS rsvp_deadline TIMESTAMPTZ;
ALTER TABLE public.settings ALTER COLUMN rsvp_deadline DROP NOT NULL;

INSERT INTO public.settings (id, total_budget_goal, rsvp_deadline)
VALUES (1, 1000000.00, NOW() + INTERVAL '30 days')
ON CONFLICT (id) DO NOTHING;

-- ==========================================
-- 3. CONSTRAINTS (SAFE ADDITION)
-- ==========================================
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
    ALTER TABLE public.guests DROP CONSTRAINT IF EXISTS guests_status_check;
    ALTER TABLE public.guests ADD CONSTRAINT guests_status_check CHECK (status IN ('confirmed', 'pending', 'declined', 'not_sent', 'tentative'));
  EXCEPTION WHEN duplicate_object THEN NULL; WHEN duplicate_table THEN NULL; WHEN undefined_object THEN NULL;
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
-- 4. FUNCTIONS & PROCEDURES
-- ==========================================
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==========================================
-- 5. TRIGGERS
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
-- 6. INDEXES
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
-- 7. PERMISSIONS & GRANTS
-- ==========================================
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT USAGE ON SCHEMA public TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO authenticated;
GRANT SELECT ON ALL TABLES IN SCHEMA public TO anon;

GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.guests TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.budget TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.events TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.tables TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.gifts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.invitations TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.activity_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.notifications TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.import_logs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.settings TO authenticated;
GRANT SELECT ON TABLE public.settings TO anon;

-- Anon-role grants matching the public-write RLS policies below (RSVP confirm/decline,
-- gift reservation, activity/notification logging). RLS alone does not grant these —
-- Postgres checks the table-level GRANT before RLS is ever evaluated, so without these
-- the anon role gets "permission denied for table X" regardless of policy contents.
GRANT UPDATE ON TABLE public.guests TO anon;
GRANT INSERT ON TABLE public.guests TO anon;
GRANT UPDATE ON TABLE public.gifts TO anon;
GRANT INSERT ON TABLE public.activity_logs TO anon;
GRANT INSERT ON TABLE public.notifications TO anon;

GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO authenticated;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO authenticated;

-- ==========================================
-- 8. ROW LEVEL SECURITY (RLS) & POLICIES
-- ==========================================
ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tables ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.guests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.gifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.budget ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.import_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.settings ENABLE ROW LEVEL SECURITY;

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

DROP POLICY IF EXISTS "Allow public select settings" ON public.settings;
DROP POLICY IF EXISTS "Allow authenticated manage settings" ON public.settings;
DROP POLICY IF EXISTS "Authenticated users manage settings" ON public.settings;

-- Policies for Events
CREATE POLICY "Authenticated users manage events"
  ON public.events FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Allow public select events"
  ON public.events FOR SELECT USING (true);

-- Policies for Tables
CREATE POLICY "Authenticated users manage tables"
  ON public.tables FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Allow public select tables"
  ON public.tables FOR SELECT USING (true);

-- Policies for Guests
CREATE POLICY "Authenticated users manage guests"
  ON public.guests FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- Public search is by first/last name (not invitation_token), so anon SELECT
-- must not be gated on invitation_token — that column is never populated by
-- the guest creation flow, which silently hid every guest from RSVP search.
CREATE POLICY "Allow public select guests for RSVP"
  ON public.guests FOR SELECT USING (true);

CREATE POLICY "Allow public insert guests"
  ON public.guests FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public update guests for RSVP"
  ON public.guests FOR UPDATE USING (true) WITH CHECK (true);

-- Policies for Gifts
CREATE POLICY "Authenticated users manage gifts"
  ON public.gifts FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Allow public select gifts"
  ON public.gifts FOR SELECT USING (true);

CREATE POLICY "Allow public update gifts for reservation"
  ON public.gifts FOR UPDATE USING (status = 'available') WITH CHECK (status IN ('reserved', 'purchased'));

-- Policies for Invitations
CREATE POLICY "Authenticated users manage invitations"
  ON public.invitations FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- Policies for Budget
CREATE POLICY "Authenticated users manage budget"
  ON public.budget FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- Policies for Activity Logs
CREATE POLICY "Authenticated users manage activity_logs"
  ON public.activity_logs FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Allow public insert activity_logs"
  ON public.activity_logs FOR INSERT WITH CHECK (action_type IN ('invitation_accepted', 'invitation_declined', 'gift_reserved', 'gift_purchased', 'guest_created', 'invitation_sent'));

-- Policies for Notifications
CREATE POLICY "Authenticated users manage notifications"
  ON public.notifications FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "Allow public insert notifications"
  ON public.notifications FOR INSERT WITH CHECK (true);

-- Policies for Import Logs
CREATE POLICY "Authenticated users manage import_logs"
  ON public.import_logs FOR ALL TO authenticated USING (auth.uid() IS NOT NULL) WITH CHECK (auth.uid() IS NOT NULL);

-- Policies for Settings
CREATE POLICY "Allow public select settings"
  ON public.settings FOR SELECT USING (true);

CREATE POLICY "Authenticated users manage settings"
  ON public.settings FOR ALL USING (true) WITH CHECK (true);

-- ==========================================
-- 9. REALTIME PUBLICATION
-- ==========================================
DO $$
DECLARE
  t text;
  tables_to_add text[] := ARRAY['guests', 'events', 'tables', 'gifts', 'budget', 'activity_logs', 'notifications', 'import_logs', 'settings'];
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
