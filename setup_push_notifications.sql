-- Adiciona a coluna expo_push_token na tabela profiles, caso não exista
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS expo_push_token text;

-- Cria uma tabela para armazenar as notificações internas (Inbox de Notificações)
CREATE TABLE IF NOT EXISTS notifications (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid REFERENCES profiles(id) ON DELETE CASCADE NOT NULL,
  title text NOT NULL,
  body text NOT NULL,
  type text DEFAULT 'SYSTEM',
  related_id uuid,
  is_read boolean DEFAULT false,
  created_at timestamp with time zone DEFAULT now()
);

-- Políticas de segurança da tabela notifications
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Usuários podem ver suas próprias notificações"
  ON notifications
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Usuários podem atualizar o status de leitura de suas notificações"
  ON notifications
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Administradores podem inserir notificações para usuários"
  ON notifications
  FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE id = auth.uid() AND (access_level = 'ADMIN' OR access_level = 'LÍDER')
    )
  );
