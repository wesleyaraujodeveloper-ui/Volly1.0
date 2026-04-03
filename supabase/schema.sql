-- 
-- SCHEMA COMPLETO VOLY - GESTÃO DE VOLUNTÁRIOS
-- 

-- 0. EXTENSÕES E ENUMS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_access_level') THEN
        CREATE TYPE user_access_level AS ENUM ('ADMIN', 'LÍDER', 'VOLUNTÁRIO');
    END IF;
END $$;

-- 1. TABELA: PROFILES (Sincronizada com auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    access_level user_access_level DEFAULT 'VOLUNTÁRIO',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TABELA: DEPARTMENTS
CREATE TABLE IF NOT EXISTS public.departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. TABELA: ROLES (Funções técnicas/artísticas, ex: Guitarra, Recepcionista)
CREATE TABLE IF NOT EXISTS public.roles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    department_id UUID REFERENCES public.departments(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(name, department_id)
);

-- 4. TABELA DE LIGAÇÃO: USER_DEPARTMENTS (Permite múltiplos departamentos)
CREATE TABLE IF NOT EXISTS public.user_departments (
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    department_id UUID REFERENCES public.departments(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, department_id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. TABELA: EVENTS
CREATE TABLE IF NOT EXISTS public.events (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    description TEXT,
    event_date TIMESTAMPTZ NOT NULL,
    department_id UUID REFERENCES public.departments(id) ON DELETE SET NULL,
    chat_window_hours INTEGER DEFAULT 4,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. TABELA: SCHEDULES (Escalas)
CREATE TABLE IF NOT EXISTS public.schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    role_id UUID REFERENCES public.roles(id) ON DELETE SET NULL,
    status TEXT DEFAULT 'PENDENTE', -- PENDENTE, CONFIRMADO, AUSENTE
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(event_id, user_id) -- Impede duplicar a mesma pessoa no mesmo evento
);

-- 7. TABELA: PLAYLISTS
CREATE TABLE IF NOT EXISTS public.playlists (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
    name TEXT NOT NULL,
    links JSONB DEFAULT '[]', -- Lista de links para Spotify, YouTube, PDFs, etc.
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 8. TABELA: MESSAGES (Chat por Evento)
CREATE TABLE IF NOT EXISTS public.messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. TABELA: FEEDBACKS
CREATE TABLE IF NOT EXISTS public.feedbacks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
    user_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    rating INTEGER CHECK (rating >= 1 AND rating <= 5),
    comment TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- --- AUTOMATIZAÇÕES E TRIGGERS ---

-- Trigger para Updated_at
CREATE OR REPLACE FUNCTION update_timestamp()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_profiles_updated BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER tr_departments_updated BEFORE UPDATE ON public.departments FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER tr_events_updated BEFORE UPDATE ON public.events FOR EACH ROW EXECUTE FUNCTION update_timestamp();
CREATE TRIGGER tr_schedules_updated BEFORE UPDATE ON public.schedules FOR EACH ROW EXECUTE FUNCTION update_timestamp();

-- Trigger para criar Profile Automaticamente após Auth.Users
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url)
  VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'avatar_url');
  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- --- ÍNDICES PARA PERFORMANCE ---
CREATE INDEX idx_schedules_event_id ON public.schedules(event_id);
CREATE INDEX idx_schedules_user_id ON public.schedules(user_id);
CREATE INDEX idx_messages_event_id ON public.messages(event_id);
CREATE INDEX idx_events_date ON public.events(event_date);
CREATE INDEX idx_user_departments_user ON public.user_departments(user_id);

-- --- RLS (POLÍTICAS BÁSICAS) ---
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Qualquer um pode ver perfis" ON public.profiles FOR SELECT USING (true);
CREATE POLICY "Usuários editam o próprio perfil" ON public.profiles FOR UPDATE USING (auth.uid() = id);

ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Qualquer um vê departamentos" ON public.departments FOR SELECT USING (true);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Qualquer um vê eventos" ON public.events FOR SELECT USING (true);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuários vêem chat de seus eventos" ON public.messages FOR SELECT USING (true);
CREATE POLICY "Participantes ou Líderes enviam mensagens" ON public.messages 
FOR INSERT WITH CHECK (
  auth.uid() = user_id AND (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND access_level IN ('ADMIN', 'LÍDER'))
    OR
    EXISTS (SELECT 1 FROM public.schedules WHERE event_id = messages.event_id AND user_id = auth.uid())
  )
);
