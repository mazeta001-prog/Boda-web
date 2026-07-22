-- Supabase Database Schema for Wedding Platform Command Center Dashboard

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Events Table
CREATE TABLE IF NOT EXISTS public.events (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  date TIMESTAMPTZ NOT NULL,
  location TEXT NOT NULL,
  max_capacity INT NOT NULL DEFAULT 100,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Tables (Seating) Table
CREATE TABLE IF NOT EXISTS public.tables (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name VARCHAR(100) NOT NULL,
  capacity INT NOT NULL DEFAULT 10,
  occupied_seats INT NOT NULL DEFAULT 0,
  location_zone VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Guests Table
CREATE TABLE IF NOT EXISTS public.guests (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  full_name VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  phone VARCHAR(50),
  status VARCHAR(20) NOT NULL CHECK (status IN ('confirmed', 'pending', 'declined')),
  event_id UUID REFERENCES public.events(id) ON DELETE SET NULL,
  table_id UUID REFERENCES public.tables(id) ON DELETE SET NULL,
  companions_count INT DEFAULT 0,
  dietary_restrictions TEXT,
  invitation_sent BOOLEAN DEFAULT false,
  invitation_opened BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Gifts Table
CREATE TABLE IF NOT EXISTS public.gifts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
  status VARCHAR(20) NOT NULL CHECK (status IN ('available', 'reserved', 'purchased')),
  reserved_by VARCHAR(255),
  category VARCHAR(100),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Invitations Table
CREATE TABLE IF NOT EXISTS public.invitations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  guest_id UUID REFERENCES public.guests(id) ON DELETE CASCADE,
  sent_at TIMESTAMPTZ,
  opened_at TIMESTAMPTZ,
  accepted_at TIMESTAMPTZ,
  status VARCHAR(20) NOT NULL CHECK (status IN ('sent', 'opened', 'accepted', 'declined')),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Budget Table
CREATE TABLE IF NOT EXISTS public.budget (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  category VARCHAR(255) NOT NULL,
  allocated NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  used NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Activity Logs Audit Table
CREATE TABLE IF NOT EXISTS public.activity_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  action_type VARCHAR(50) NOT NULL,
  user_name VARCHAR(255) NOT NULL,
  user_avatar TEXT,
  details TEXT NOT NULL,
  target_id VARCHAR(255),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Notifications Table
CREATE TABLE IF NOT EXISTS public.notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  title VARCHAR(255) NOT NULL,
  message TEXT NOT NULL,
  type VARCHAR(20) DEFAULT 'info',
  read BOOLEAN DEFAULT false,
  action_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Realtime Publication for Supabase Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.guests, public.events, public.tables, public.gifts, public.activity_logs, public.notifications;

-- Seed Data (Initial Production Ready Structure)
INSERT INTO public.events (title, date, location, max_capacity) VALUES
('Ceremonia Principal & Banquete', '2026-12-20 16:00:00+00', 'Finca El Olivar, Madrid', 250),
('Cóctel de Bienvenida', '2026-12-19 20:00:00+00', 'Terraza Gran Vía', 100);

INSERT INTO public.tables (name, capacity, occupied_seats, location_zone) VALUES
('Mesa Imperial 1', 12, 9, 'Zona Central'),
('Mesa Presidencial', 10, 8, 'Escenario'),
('Mesa Jardín A', 8, 5, 'Jardín');

INSERT INTO public.budget (category, allocated, used, notes) VALUES
('Catering & Banquete', 15000.00, 12500.00, 'Reserva 80% pagada'),
('Fotografía & Vídeo', 3500.00, 2000.00, 'Señal entregada'),
('Decoración Floral', 2500.00, 1200.00, 'Flores ceremonia y mesas'),
('Música & DJ', 2000.00, 800.00, 'Reserva DJ');

INSERT INTO public.activity_logs (action_type, user_name, details) VALUES
('guest_created', 'Administrador', 'Sistema de Dashboard iniciado y sincronizado.');
