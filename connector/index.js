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
    const { execSync } = require('child_process');
    execSync(`powershell -Command "Add-Type -AssemblyName VisualBasic; [Microsoft.VisualBasic.Interaction]::AppActivate('Volly Connector')"`);
  } catch (e) {}

  // Criar atalho na pasta Inicializar do Windows (Startup)
  try {
    const { execSync } = require('child_process');
    const startupPath = path.join(process.env.APPDATA, 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Startup', 'VollyConnector.lnk');
    const targetPath = path.join(__dirname, 'iniciar_vollyconnector.bat');
    
    const vbsScript = `
Set oWS = WScript.CreateObject("WScript.Shell")
sLinkFile = "${startupPath}"
Set oLink = oWS.CreateShortcut(sLinkFile)
oLink.TargetPath = "${targetPath}"
oLink.WorkingDirectory = "${__dirname}"
oLink.Description = "Inicializacao Automatica do Volly Connector"
oLink.Save
`;
    const vbsPath = path.join(require('os').tmpdir(), 'CreateVollyShortcut.vbs');
    fs.writeFileSync(vbsPath, vbsScript);
    execSync(`cscript /nologo "${vbsPath}"`);
    fs.unlinkSync(vbsPath);
  } catch(e) {
    console.log("Aviso: Não foi possível recriar o atalho de inicialização automática.");
  }

  res.json({ success: true });
});

// ---------------------------------------------------
// Endpoint para servir o script de Playlist do Holyrics
// ---------------------------------------------------
app.get('/api/holyrics-script', (req, res) => {
  const jsContent = `
function request(action, headers, content, info) {
    if (action === 'playlist/add') {
        try {
            var data = content;
            var itemsList = data.items;
            var totalItems = (itemsList.length !== undefined) ? itemsList.length : itemsList.size();
            
            h.log("Recebendo " + totalItems + " músicas do Volly...");
            
            // Busca TODAS as músicas de uma vez só para não depender dos filtros do Holyrics
            var result = h.hly('GetSongs', {});
            var allSongs = result.data ? result.data : result;
            var totalDb = (allSongs && allSongs.length !== undefined) ? allSongs.length : ((allSongs && allSongs.size) ? allSongs.size() : 0);
            
            var sucessoCount = 0;
            
            // Passa por cada música da playlist
            for (var i = 0; i < totalItems; i++) {
                var song = itemsList[i] || (itemsList.get && itemsList.get(i));
                
                if (song && song.type === 'song' && song.title) {
                    var targetTitle = song.title.toLowerCase().trim();
                    var foundId = null;
                    
                    // Procura manualmente no banco inteiro (100% garantido de achar o título exato)
                    for (var j = 0; j < totalDb; j++) {
                        var dbSong = allSongs[j] || (allSongs.get && allSongs.get(j));
                        if (dbSong && dbSong.title) {
                            if (dbSong.title.toLowerCase().trim() === targetTitle) {
                                foundId = dbSong.id;
                                break;
                            }
                        }
                    }
                    
                    if (foundId) {
                        h.hly('AddSongsToPlaylist', { id: foundId });
                        h.log("✅ Adicionada: " + song.title);
                        sucessoCount++;
                    } else {
                        h.log("❌ Não encontrada no banco: " + song.title);
                    }
                }
            }
            
            return { 
                status: 'ok', 
                message: 'Sucesso! ' + sucessoCount + ' músicas adicionadas.' 
            };
            
        } catch (e) {
            h.log("Erro no script: " + e.toString());
            return { status: 'error', message: e.toString() };
        }
    }
    
    return true;
}
`;
  res.json({ script: jsContent });
});

// ---------------------------------------------------
// Endpoint para receber o Live Slide do Holyrics
// ---------------------------------------------------
app.post('/api/live-slide', async (req, res) => {
  const { text, title } = req.body;
  if (!config.connectionCode) return res.status(400).send('No connection code');
  
  try {
    // Envia o slide em tempo real para a nuvem via Supabase RPC ou Update
    // Aqui usamos uma tabela live_events (assumindo que será criada depois)
    await supabase.from('live_events').upsert([{
      connection_code: config.connectionCode,
      current_text: text,
      current_title: title,
      updated_at: new Date().toISOString()
    }]);
  } catch (e) {
    console.error("Erro ao fazer push do live slide:", e);
  }
  
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
