const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const WebSocket = require('ws');
const express = require('express');

// Polyfill para Supabase no Node.js
global.WebSocket = WebSocket;

process.title = "Volly Connector";

const configPath = path.join(process.cwd(), 'config.json');
let config = {};

// Carrega ou cria o config.json
if (fs.existsSync(configPath)) {
  try {
    config = JSON.parse(fs.readFileSync(configPath, 'utf8'));
  } catch(e) {
    console.error("Erro ao ler config.json, criando um novo...");
    config = {};
  }
}

// Configurações padrão se faltar
if (!config.supabaseUrl) config.supabaseUrl = "https://heydiykcilykfsekdkfe.supabase.co";
if (!config.supabaseAnonKey) config.supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhleWRpeWtjaWx5a2ZzZWtka2ZlIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ1Mzc3NTksImV4cCI6MjA5MDExMzc1OX0.UNe1-t8DWnYPUqBYQ3iY4B4Ev1VI3h7tCwYU1MXiRKc";
if (!config.holyricsPort) config.holyricsPort = "8091";

fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

const supabase = createClient(config.supabaseUrl, config.supabaseAnonKey);

let isPollingRunning = false;
let pollingInterval = null;

async function processarPlaylist(exportId, payload) {
  console.log(`[${new Date().toLocaleTimeString()}] Recebendo playlist da nuvem (ID: ${exportId})...`);
  try {
    const holyricsUrl = `http://localhost:${config.holyricsPort}/api/playlist/add`;
    const response = await fetch(`${holyricsUrl}?token=${config.holyricsToken}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (response.ok) {
      console.log(`✅ Sucesso! Músicas enviadas para o Holyrics local.`);
      await supabase.from('holyrics_exports').update({ status: 'completed' }).eq('id', exportId);
    } else {
      const errorText = await response.text();
      console.error(`❌ Erro do Holyrics: ${response.status} - ${errorText}`);
      await supabase.from('holyrics_exports').update({ status: 'failed', message: `Erro Holyrics: ${response.status}` }).eq('id', exportId);
    }
  } catch (err) {
    console.error(`❌ Falha na conexão com o Holyrics local na porta ${config.holyricsPort}. O programa está aberto e a porta está correta?`);
    await supabase.from('holyrics_exports').update({ status: 'failed', message: 'O Holyrics parece estar fechado no PC da igreja ou a porta está incorreta.' }).eq('id', exportId);
  }
}

function startPolling() {
  if (isPollingRunning) return;
  isPollingRunning = true;
  
  console.log('=============================================');
  console.log('🚀 Volly Connector Ativo!');
  console.log('🔑 Código de Conexão:', config.connectionCode);
  console.log(`📡 Ouvindo o Holyrics na porta: ${config.holyricsPort}`);
  console.log('');
  console.log('⚙️  Precisa alterar a configuração ou gerar novo código?');
  console.log('👉 Acesse no seu navegador: http://localhost:3050');
  console.log('');
  console.log('📡 Aguardando playlists na nuvem...');
  console.log('=============================================');

  pollingInterval = setInterval(async () => {
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
        await supabase.from('holyrics_exports').update({ status: 'processing' }).eq('id', row.id);
        await processarPlaylist(row.id, row.payload);
      }
    } catch (err) {}
  }, 2000);
}

// ---------------------------------------------------
// Servidor Web para Assistente de Configuração
// ---------------------------------------------------
const app = express();
app.use(express.json());

// Servir arquivos estáticos (pkg detecta a pasta public configurada)
app.use(express.static(path.join(__dirname, 'public')));

app.get('/api/config', (req, res) => {
  res.json({
    connectionCode: config.connectionCode || '',
    holyricsToken: config.holyricsToken === 'COLOQUE_SEU_TOKEN_AQUI' ? '' : (config.holyricsToken || ''),
    holyricsPort: config.holyricsPort || '8091',
    isRunning: isPollingRunning
  });
});

app.post('/api/config', (req, res) => {
  const { connectionCode, holyricsToken, holyricsPort } = req.body;
  
  if (!connectionCode || !holyricsToken || !holyricsPort) {
    return res.status(400).json({ success: false, message: 'Dados incompletos.' });
  }

  config.connectionCode = connectionCode;
  config.holyricsToken = holyricsToken;
  config.holyricsPort = holyricsPort;
  
  // Limpa holyricsUrl antiga para não sujar o config.json
  if(config.holyricsUrl) delete config.holyricsUrl;

  fs.writeFileSync(configPath, JSON.stringify(config, null, 2));

  if (!isPollingRunning) {
    startPolling();
  } else {
    // Se a porta mudou, atualiza a exibição (apenas ilustrativo, na próxima requisição ele usará a nova)
    console.log(`🔄 Configurações atualizadas: Nova porta ${config.holyricsPort}`);
  }

  // Tentar puxar a janela do console para a frente
  try {
    const { exec } = require('child_process');
    exec(`powershell -Command "Add-Type -AssemblyName VisualBasic; [Microsoft.VisualBasic.Interaction]::AppActivate('Volly Connector')"`);
  } catch (e) {}

  res.json({ success: true });
});

const PORT = 3050;
app.listen(PORT, async () => {
  console.log(`🌐 Painel de Controle local iniciado na porta ${PORT}`);
  
  const isConfigured = config.connectionCode && 
                       config.holyricsToken && 
                       config.holyricsToken !== 'COLOQUE_SEU_TOKEN_AQUI';

  if (!isConfigured) {
    console.log('⚠️ Configuração pendente! Abrindo Assistente no navegador...');
    try {
        const open = (await import('open')).default;
        await open(`http://localhost:${PORT}`);
    } catch(e) {
        console.log(`Por favor, acesse http://localhost:${PORT} no seu navegador.`);
    }
  } else {
    startPolling();
  }
});
