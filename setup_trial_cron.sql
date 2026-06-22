-- 1. ADICIONA A COLUNA DE CONTROLE DO TIMER
ALTER TABLE public.institutions 
ADD COLUMN IF NOT EXISTS trial_end_date TIMESTAMPTZ DEFAULT NULL;

-- 2. HABILITA A EXTENSÃO DO PG_CRON (CASO AINDA NÃO ESTEJA HABILITADA)
-- Obs: A extensão pg_cron geralmente precisa ser habilitada via painel do Supabase
-- (Database -> Extensions -> pg_cron), mas tentaremos ativá-la aqui.
CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 3. CRIAÇÃO DA FUNÇÃO QUE VARRE E BLOQUEIA AS INSTITUIÇÕES VENCIDAS
CREATE OR REPLACE FUNCTION public.check_expired_trials()
RETURNS void AS $$
BEGIN
    UPDATE public.institutions 
    SET active = false 
    WHERE trial_end_date IS NOT NULL 
      AND trial_end_date < NOW() 
      AND active = true;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. CRIAÇÃO DO CRON JOB PARA RODAR TODO DIA À MEIA NOITE (00:00)
-- (O job será criado abaixo)

-- Agenda para rodar todo dia à meia-noite
SELECT cron.schedule(
  'auto_deactivate_expired_trials',  -- Nome do job
  '0 0 * * *',                       -- Expressão Cron (Todo dia às 00:00)
  $$ SELECT public.check_expired_trials(); $$
);
