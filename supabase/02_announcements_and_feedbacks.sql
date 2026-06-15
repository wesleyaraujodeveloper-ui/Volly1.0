-- Migration: Announcements & Feedbacks RLS

-- 1. TABELA ANNOUNCEMENTS (Avisos Oficiais)
CREATE TABLE IF NOT EXISTS public.announcements (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    institution_id UUID REFERENCES public.institutions(id) ON DELETE CASCADE,
    author_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    expires_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.announcements ENABLE ROW LEVEL SECURITY;

-- Políticas para Avisos Oficiais
-- Todos da instituição (ou Master) podem ver
CREATE POLICY "Announcements: Leitura Institucional" ON public.announcements FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.access_level = 'MASTER')
  OR institution_id = (SELECT p.institution_id FROM public.profiles p WHERE p.id = auth.uid())
);

-- Somente Líderes, Admins e Master podem inserir
CREATE POLICY "Announcements: Inserção Permitida" ON public.announcements FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND (access_level IN ('MASTER', 'ADMIN', 'LÍDER')))
  AND (institution_id = (SELECT institution_id FROM public.profiles WHERE id = auth.uid()) OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND access_level = 'MASTER'))
);

-- Somente autor ou Master/Admin podem deletar
CREATE POLICY "Announcements: Exclusão" ON public.announcements FOR DELETE USING (
  auth.uid() = author_id 
  OR EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND access_level IN ('MASTER', 'ADMIN'))
);


-- 2. RLS PARA FEEDBACKS
-- Tabela feedbacks já existe, apenas garantir RLS
ALTER TABLE public.feedbacks ENABLE ROW LEVEL SECURITY;

-- Voluntários podem inserir feedbacks apenas de si mesmos
CREATE POLICY "Feedbacks: Voluntários podem inserir" ON public.feedbacks FOR INSERT WITH CHECK (
  auth.uid() = user_id
);

-- Voluntários podem ler o próprio feedback, Líderes/Admins/Master podem ler todos da sua instituição
CREATE POLICY "Feedbacks: Leitura" ON public.feedbacks FOR SELECT USING (
  auth.uid() = user_id
  OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.access_level = 'MASTER')
  OR EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.access_level IN ('ADMIN', 'LÍDER', 'CO-LÍDER') AND p.institution_id = (
    SELECT e.institution_id FROM public.events e WHERE e.id = feedbacks.event_id
  ))
);

-- Opcional: Adicionar a tabela de notificações se ainda não estiver configurada no schema base
CREATE TABLE IF NOT EXISTS public.notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'SYSTEM',
    is_read BOOLEAN DEFAULT false,
    link_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Notificacoes: Usuario ve as suas" ON public.notifications FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Notificacoes: Sistema insere" ON public.notifications FOR INSERT WITH CHECK (true);
CREATE POLICY "Notificacoes: Auto atualiza" ON public.notifications FOR UPDATE USING (auth.uid() = user_id);
