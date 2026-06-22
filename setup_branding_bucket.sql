-- Script para criar e configurar o bucket 'branding' no Supabase Storage

-- 1. Cria o bucket 'branding' e o torna público para leitura
INSERT INTO storage.buckets (id, name, public) 
VALUES ('branding', 'branding', true)
ON CONFLICT (id) DO NOTHING;

-- Remove políticas anteriores caso você queira rodar o script novamente
DROP POLICY IF EXISTS "Public Access for branding bucket" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can upload to branding" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can update branding" ON storage.objects;
DROP POLICY IF EXISTS "Authenticated users can delete from branding" ON storage.objects;

-- 2. Política: Qualquer um pode visualizar/ler (SELECT) os arquivos em 'branding'
CREATE POLICY "Public Access for branding bucket" 
ON storage.objects FOR SELECT 
USING ( bucket_id = 'branding' );

-- 3. Política: Usuários autenticados podem fazer upload (INSERT) em 'branding'
CREATE POLICY "Authenticated users can upload to branding" 
ON storage.objects FOR INSERT 
TO authenticated 
WITH CHECK ( bucket_id = 'branding' );

-- 4. Política: Usuários autenticados podem atualizar (UPDATE) arquivos em 'branding'
CREATE POLICY "Authenticated users can update branding" 
ON storage.objects FOR UPDATE 
TO authenticated 
USING ( bucket_id = 'branding' );

-- 5. Política: Usuários autenticados podem excluir (DELETE) arquivos em 'branding'
CREATE POLICY "Authenticated users can delete from branding" 
ON storage.objects FOR DELETE 
TO authenticated 
USING ( bucket_id = 'branding' );
