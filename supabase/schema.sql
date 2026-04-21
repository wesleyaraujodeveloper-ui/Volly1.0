-- 
-- SCHEMA COMPLETO VOLY - GESTÃO DE VOLUNTÁRIOS
-- 

-- 0. EXTENSÕES E ENUMS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'user_access_level') THEN
        CREATE TYPE user_access_level AS ENUM ('ADMIN', 'LÍDER', 'CO-LÍDER', 'VOLUNTÁRIO');
    END IF;
END $$;

-- 1. TABELA: PROFILES (Sincronizada com auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    email TEXT UNIQUE NOT NULL,
    full_name TEXT,
    avatar_url TEXT,
    push_token TEXT,
    access_level user_access_level DEFAULT 'VOLUNTÁRIO',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. TABELA: DEPARTMENTS
CREATE TABLE IF NOT EXISTS public.departments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    leader_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    co_leader_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
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
    end_date TIMESTAMPTZ,
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
    google_event_id TEXT,
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

-- Trigger robusto para criar Profile Automaticamente após Auth.Users
-- Versão Ultra-Resiliente para criar Profile Automaticamente após Auth.Users
CREATE OR REPLACE FUNCTION public.handle_new_user() 
RETURNS trigger AS $$
DECLARE
  v_role_text TEXT;
  v_role_final user_access_level;
  v_dept_id UUID;
  v_dept_exists BOOLEAN;
BEGIN
  -- 1. Buscar dados do convite com normalização de e-mail (case-insensitive)
  SELECT role::TEXT, department_id 
  INTO v_role_text, v_dept_id
  FROM public.invitations 
  WHERE LOWER(email) = LOWER(new.email) 
  LIMIT 1;

  -- 2. Validar o Cargo de forma segura
  BEGIN
    IF v_role_text IS NOT NULL THEN
      v_role_final := v_role_text::user_access_level;
    ELSE
      v_role_final := 'VOLUNTÁRIO';
    END IF;
  EXCEPTION WHEN OTHERS THEN
    v_role_final := 'VOLUNTÁRIO';
  END;

  -- 3. Inserir no Profile (Tenta garantir que o perfil nasça de qualquer jeito)
  INSERT INTO public.profiles (id, email, full_name, avatar_url, access_level)
  VALUES (
    new.id, 
    new.email, 
    COALESCE(new.raw_user_meta_data->>'full_name', new.raw_user_meta_data->>'name', 'Voluntário'),
    COALESCE(new.raw_user_meta_data->>'avatar_url', new.raw_user_meta_data->>'picture'),
    v_role_final
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    avatar_url = EXCLUDED.avatar_url;

  -- 4. Vincular ao departamento apenas se ele existir (previne erros de FK)
  IF v_dept_id IS NOT NULL THEN
    SELECT EXISTS (SELECT 1 FROM public.departments WHERE id = v_dept_id) INTO v_dept_exists;
    IF v_dept_exists THEN
      INSERT INTO public.user_departments (user_id, department_id)
      VALUES (new.id, v_dept_id)
      ON CONFLICT DO NOTHING;
    END IF;
  END IF;

  RETURN new;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

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
CREATE POLICY "Usuários criam o próprio perfil" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);

ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Qualquer um vê departamentos" ON public.departments FOR SELECT USING (true);

ALTER TABLE public.events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Qualquer um vê eventos" ON public.events FOR SELECT USING (true);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Usuários vêem chat de seus eventos" ON public.messages FOR SELECT USING (true);
CREATE POLICY "Participantes ou Líderes enviam mensagens" ON public.messages 
FOR INSERT WITH CHECK (
  auth.uid() = user_id AND (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND access_level IN ('ADMIN', 'LÍDER', 'CO-LÍDER'))
    OR
    EXISTS (SELECT 1 FROM public.schedules WHERE event_id = messages.event_id AND user_id = auth.uid())
  )
);

-- --- RPCs DE ADMINISTRAÇÃO PRIVILEGIADA ---

-- Função segurada para criar departamentos
-- Remover todas as assinaturas possíveis para limpar o conflito (Apenas se for rodar manualmente)
-- DROP FUNCTION IF EXISTS create_department(TEXT, TEXT);
-- DROP FUNCTION IF EXISTS create_department(TEXT, TEXT, UUID);

-- Criar a versão definitiva com 3 parâmetros
CREATE OR REPLACE FUNCTION create_department(p_name TEXT, p_desc TEXT DEFAULT NULL, p_leader_id UUID DEFAULT NULL)
RETURNS public.departments AS $$
DECLARE
    v_admin_count INT;
    v_new_dept public.departments;
BEGIN
    SELECT COUNT(*) INTO v_admin_count FROM public.profiles 
    WHERE id = auth.uid() AND access_level = 'ADMIN';

    IF v_admin_count = 0 THEN
        RAISE EXCEPTION 'Acesso negado. Apenas ADMINS podem criar departamentos.';
    END IF;

    INSERT INTO public.departments (name, description, leader_id) 
    VALUES (p_name, p_desc, p_leader_id)
    RETURNING * INTO v_new_dept;

    RETURN v_new_dept;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Adição da função de atualização de líder
CREATE OR REPLACE FUNCTION update_department_leader(p_dept_id UUID, p_leader_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND access_level = 'ADMIN') THEN
        RAISE EXCEPTION 'Acesso negado. Apenas ADMINS podem alterar líderes de departamentos.';
    END IF;

    UPDATE public.departments 
    SET leader_id = p_leader_id
    WHERE id = p_dept_id;

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função para gerenciar o vínculo entre usuários e departamentos
CREATE OR REPLACE FUNCTION manage_user_department(p_user_id UUID, p_dept_id UUID, p_action TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    v_admin_count INT;
BEGIN
    SELECT COUNT(*) INTO v_admin_count FROM public.profiles 
    WHERE id = auth.uid() AND access_level IN ('ADMIN', 'LÍDER', 'CO-LÍDER');

    IF v_admin_count = 0 THEN
        RAISE EXCEPTION 'Acesso negado. Apenas ADMINS, LÍDERES e CO-LÍDERES podem gerenciar membros.';
    END IF;

    IF p_action = 'ADD' THEN
        INSERT INTO public.user_departments (user_id, department_id)
        VALUES (p_user_id, p_dept_id)
        ON CONFLICT DO NOTHING;
    ELSIF p_action = 'REMOVE' THEN
        DELETE FROM public.user_departments
        WHERE user_id = p_user_id AND department_id = p_dept_id;
    END IF;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Função segurada para alterar cargo de usuário
CREATE OR REPLACE FUNCTION update_user_role(p_user_id UUID, p_new_role user_access_level)
RETURNS BOOLEAN AS $$
DECLARE
    v_admin_count INT;
BEGIN
    -- Verifica se quem chama é ADMIN
    SELECT COUNT(*) INTO v_admin_count FROM public.profiles 
    WHERE id = auth.uid() AND access_level = 'ADMIN';

    IF v_admin_count = 0 THEN
        RAISE EXCEPTION 'Acesso negado. Apenas ADMINS podem alterar restrições de cargo.';
    END IF;

    -- Prevenção para não deixar o sistema sem nenhum ADMIN caso ele esteja demitindo a si mesmo único
    IF p_new_role != 'ADMIN' AND p_user_id = auth.uid() THEN
        SELECT COUNT(*) INTO v_admin_count FROM public.profiles WHERE access_level = 'ADMIN';
        IF v_admin_count <= 1 THEN
            RAISE EXCEPTION 'Não é possível remover o único administrador restante do sistema.';
        END IF;
    END IF;

    UPDATE public.profiles 
    SET access_level = p_new_role
    WHERE id = p_user_id;

    RETURN FOUND;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- --- VÍNCULOS MÚLTIPLOS (FUNÇÕES DE VOLUNTÁRIOS) ---

CREATE TABLE IF NOT EXISTS public.user_roles (
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    role_id UUID REFERENCES public.roles(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    PRIMARY KEY (user_id, role_id)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Leitura global de habilidades" ON public.user_roles FOR SELECT USING (true);

ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Qualquer um vê funções" ON public.roles FOR SELECT USING (true);

-- RPC: Criar função atrelada ao departamento
CREATE OR REPLACE FUNCTION create_department_role(p_dept_id UUID, p_name TEXT)
RETURNS public.roles AS $$
DECLARE
    v_admin_count INT;
    v_new_role public.roles;
BEGIN
    SELECT COUNT(*) INTO v_admin_count FROM public.profiles 
    WHERE id = auth.uid() AND access_level IN ('ADMIN', 'LÍDER', 'CO-LÍDER');

    IF v_admin_count = 0 THEN
        RAISE EXCEPTION 'Acesso negado. Apenas ADMINS, LÍDERES e CO-LÍDERES podem criar funções departamentais.';
    END IF;

    INSERT INTO public.roles (name, department_id) 
    VALUES (p_name, p_dept_id)
    RETURNING * INTO v_new_role;

    RETURN v_new_role;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- RPC: Toggle vínculo voluntário -> função
CREATE OR REPLACE FUNCTION toggle_user_role(p_user_id UUID, p_role_id UUID, p_action TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    v_admin_count INT;
BEGIN
    SELECT COUNT(*) INTO v_admin_count FROM public.profiles 
    WHERE id = auth.uid() AND access_level IN ('ADMIN', 'LÍDER', 'CO-LÍDER');

    IF v_admin_count = 0 THEN
        RAISE EXCEPTION 'Acesso negado. Apenas ADMINS, LÍDERES e CO-LÍDERES podem alterar o vínculo de voluntários.';
    END IF;

    IF p_action = 'ADD' THEN
        INSERT INTO public.user_roles (user_id, role_id) 
        VALUES (p_user_id, p_role_id) 
        ON CONFLICT DO NOTHING;
    ELSIF p_action = 'REMOVE' THEN
        DELETE FROM public.user_roles 
        WHERE user_id = p_user_id AND role_id = p_role_id;
    END IF;

    RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- --- MÚLTIPLOS DEPARTAMENTOS POR EVENTO (N:N) ---

CREATE TABLE IF NOT EXISTS public.event_departments (
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
    department_id UUID REFERENCES public.departments(id) ON DELETE CASCADE,
    PRIMARY KEY (event_id, department_id)
);

ALTER TABLE public.event_departments ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Leitura global de departamentos do evento" ON public.event_departments FOR SELECT USING (true);

-- --- DISPONIBILIDADE POR EVENTO ESPECÍFICO ---

CREATE TABLE IF NOT EXISTS public.user_event_availabilities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
    periods TEXT[] DEFAULT '{}',
    is_available BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(user_id, event_id)
);

ALTER TABLE public.user_event_availabilities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários gerenciam própria disponibilidade por evento" 
ON public.user_event_availabilities FOR ALL USING (auth.uid() = user_id);

-- --- MURAL SOCIAL (POSTS INDEPENDENTES) ---

CREATE TABLE IF NOT EXISTS public.posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Posts são visíveis para todos os usuários autenticados"
  ON public.posts FOR SELECT
  USING (auth.role() = 'authenticated');

CREATE POLICY "Usuários podem criar seus próprios posts"
  ON public.posts FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Usuários podem deletar seus próprios posts"
  ON public.posts FOR DELETE
  USING (auth.uid() = user_id);

-- Curtidas em Posts
CREATE TABLE IF NOT EXISTS public.post_likes (
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  PRIMARY KEY (post_id, user_id)
);

ALTER TABLE public.post_likes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Curtidas são visíveis para todos" ON public.post_likes FOR SELECT USING (true);
CREATE POLICY "Usuários podem curtir posts" ON public.post_likes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Usuários podem descurtir posts" ON public.post_likes FOR DELETE USING (auth.uid() = user_id);

-- Comentários em Posts
CREATE TABLE IF NOT EXISTS public.post_comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID REFERENCES public.posts(id) ON DELETE CASCADE,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.post_comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Comentários são visíveis para todos" ON public.post_comments FOR SELECT USING (true);
CREATE POLICY "Usuários podem comentar" ON public.post_comments FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Usuários podem deletar seus comentários" ON public.post_comments FOR DELETE USING (auth.uid() = user_id);
