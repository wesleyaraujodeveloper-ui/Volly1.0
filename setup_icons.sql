-- 1. Adicionar a coluna icon_url na tabela departments
ALTER TABLE public.departments ADD COLUMN icon_url TEXT;

-- 2. Criar o bucket de storage para os ícones
INSERT INTO storage.buckets (id, name, public) VALUES ('department-icons', 'department-icons', true)
ON CONFLICT (id) DO NOTHING;

-- 3. Configurar políticas de segurança (RLS) para o bucket
CREATE POLICY "Ícones são públicos para leitura" ON storage.objects
  FOR SELECT USING (bucket_id = 'department-icons');

CREATE POLICY "Usuários autenticados podem enviar ícones" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'department-icons' 
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Usuários autenticados podem atualizar ícones" ON storage.objects
  FOR UPDATE USING (
    bucket_id = 'department-icons' 
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "Usuários autenticados podem deletar ícones" ON storage.objects
  FOR DELETE USING (
    bucket_id = 'department-icons' 
    AND auth.role() = 'authenticated'
  );
