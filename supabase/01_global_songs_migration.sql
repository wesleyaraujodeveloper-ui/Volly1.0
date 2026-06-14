-- Migration: Global Songs & Event Songs

-- 1. TABELA GLOBAL SONGS
CREATE TABLE IF NOT EXISTS public.global_songs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title TEXT NOT NULL,
    artist TEXT NOT NULL,
    tags TEXT[] DEFAULT '{}',
    created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    usage_count INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(title, artist) -- Evita duplicatas exatas logo de cara
);

ALTER TABLE public.global_songs ENABLE ROW LEVEL SECURITY;

-- Todos podem ver as músicas globais
CREATE POLICY "Leitura global de músicas" ON public.global_songs FOR SELECT USING (true);

-- Autenticados podem adicionar novas músicas globais
CREATE POLICY "Usuários autenticados podem inserir músicas globais" ON public.global_songs FOR INSERT WITH CHECK (auth.role() = 'authenticated');

-- 2. TABELA EVENT SONGS (Músicas selecionadas para um evento)
CREATE TABLE IF NOT EXISTS public.event_songs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    event_id UUID REFERENCES public.events(id) ON DELETE CASCADE,
    song_id UUID REFERENCES public.global_songs(id) ON DELETE CASCADE,
    "order" INTEGER DEFAULT 0,
    youtube_url TEXT,
    spotify_url TEXT,
    notes TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(event_id, song_id) -- Impede que a mesma música seja adicionada duas vezes no mesmo evento
);

ALTER TABLE public.event_songs ENABLE ROW LEVEL SECURITY;

-- Visibilidade: Isolamento Institucional do Evento (usando a mesma lógica das messages/events)
CREATE POLICY "Event songs visíveis na instituição do evento" ON public.event_songs FOR SELECT USING (
  EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.access_level = 'MASTER')
  OR EXISTS (SELECT 1 FROM public.events e JOIN public.profiles p ON e.institution_id = p.institution_id WHERE e.id = event_songs.event_id AND p.id = auth.uid())
);

-- Inserção: Só pode inserir se fizer parte da instituição do evento
CREATE POLICY "Usuários podem adicionar músicas no evento" ON public.event_songs FOR INSERT WITH CHECK (
  EXISTS (SELECT 1 FROM public.events e JOIN public.profiles p ON e.institution_id = p.institution_id WHERE e.id = event_songs.event_id AND p.id = auth.uid())
);

-- Atualização/Delete
CREATE POLICY "Usuários podem gerenciar músicas do evento" ON public.event_songs FOR UPDATE USING (
  EXISTS (SELECT 1 FROM public.events e JOIN public.profiles p ON e.institution_id = p.institution_id WHERE e.id = event_songs.event_id AND p.id = auth.uid())
);

CREATE POLICY "Usuários podem remover músicas do evento" ON public.event_songs FOR DELETE USING (
  EXISTS (SELECT 1 FROM public.events e JOIN public.profiles p ON e.institution_id = p.institution_id WHERE e.id = event_songs.event_id AND p.id = auth.uid())
);

-- 3. FUNÇÃO PARA INCREMENTAR O USAGE_COUNT DE UMA MÚSICA
-- Toda vez que inserirmos na event_songs, queremos aumentar o usage_count
CREATE OR REPLACE FUNCTION increment_song_usage()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.global_songs
    SET usage_count = usage_count + 1
    WHERE id = NEW.song_id;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_increment_song_usage
AFTER INSERT ON public.event_songs
FOR EACH ROW EXECUTE FUNCTION increment_song_usage();

-- Trigger para decrementar o usage_count se for deletada do evento
CREATE OR REPLACE FUNCTION decrement_song_usage()
RETURNS TRIGGER AS $$
BEGIN
    UPDATE public.global_songs
    SET usage_count = GREATEST(usage_count - 1, 0)
    WHERE id = OLD.song_id;
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER tr_decrement_song_usage
AFTER DELETE ON public.event_songs
FOR EACH ROW EXECUTE FUNCTION decrement_song_usage();
