const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const fetch = require('node-fetch');

// 1. Carregar configuração
const config = JSON.parse(fs.readFileSync('./config.json', 'utf8'));

if (!config.holyricsToken || config.holyricsToken === 'COLOQUE_SEU_TOKEN_AQUI') {
  console.error("ERRO: Você precisa configurar o seu Token do Holyrics no arquivo config.json!");
  process.exit(1);
}

const supabase = createClient(config.supabaseUrl, config.supabaseAnonKey);

console.log('=============================================');
console.log('🚀 Volly Connector Iniciado com Sucesso!');
console.log('🔑 Código de Conexão configurado:', config.connectionCode);
console.log('📡 Aguardando playlists na nuvem...');
console.log('=============================================');

// 2. Função para processar a playlist recebida
async function processarPlaylist(exportId, payload) {
  console.log(`[${new Date().toLocaleTimeString()}] Recebendo playlist da nuvem (ID: ${exportId})...`);
  
  try {
    const response = await fetch(`${config.holyricsUrl}?token=${config.holyricsToken}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });

    if (response.ok) {
      console.log(`✅ Sucesso! Músicas enviadas para o Holyrics local.`);
      // Atualizar no Supabase
      await supabase.from('holyrics_exports').update({ status: 'completed' }).eq('id', exportId);
    } else {
      const errorText = await response.text();
      console.error(`❌ Erro do Holyrics: ${response.status} - ${errorText}`);
      await supabase.from('holyrics_exports').update({ status: 'failed', message: `Erro Holyrics: ${response.status}` }).eq('id', exportId);
    }
  } catch (err) {
    console.error(`❌ Falha na conexão com o Holyrics local. O programa está aberto?`);
    await supabase.from('holyrics_exports').update({ status: 'failed', message: 'O Holyrics parece estar fechado no PC da igreja.' }).eq('id', exportId);
  }
}

// 3. Listener do Supabase (Escutando inserções na tabela holyrics_exports)
// Como o canal realtime as vezes precisa ser ativado no banco,
// vamos fazer um polling de segurança ultra-leve para garantir 100% de estabilidade sem depender de triggers no banco.
setInterval(async () => {
  try {
    const { data, error } = await supabase
      .from('holyrics_exports')
      .select('id, payload')
      .eq('connection_code', config.connectionCode)
      .eq('status', 'pending')
      .order('created_at', { ascending: true })
      .limit(1);

    if (data && data.length > 0) {
      const row = data[0];
      
      // Imediatamente marca como "processing" para não pegar de novo no próximo segundo
      await supabase.from('holyrics_exports').update({ status: 'processing' }).eq('id', row.id);
      
      // Processa e envia para o Holyrics local
      await processarPlaylist(row.id, row.payload);
    }
  } catch (err) {
    // ignorar falhas de polling temporárias
  }
}, 2000); // checa a cada 2 segundos
