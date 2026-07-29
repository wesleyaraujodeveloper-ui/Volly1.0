const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');
const fetch = require('node-fetch');
const WebSocket = require('ws');
const express = require('express');
const os = require('os');
const { pipeline } = require('stream');
const { promisify } = require('util');
const streamPipeline = promisify(pipeline);
const crypto = require('crypto');
const ffmpeg = require('fluent-ffmpeg');

let ffmpegPath;
let ytdlpPath;
try {
  ffmpegPath = require('ffmpeg-static');
  
  // Se rodando dentro do pkg, precisamos copiar o binário virtual para o disco real
  if (process.pkg) {
    const extractedFfmpeg = path.join(os.tmpdir(), 'ffmpeg-volly.exe');
    if (!fs.existsSync(extractedFfmpeg)) {
      const ffmpegData = fs.readFileSync(ffmpegPath);
      fs.writeFileSync(extractedFfmpeg, ffmpegData);
      try { fs.chmodSync(extractedFfmpeg, 0o755); } catch(e) {}
    }
    ffmpegPath = extractedFfmpeg;

    const originalYtdlp = path.join(__dirname, 'node_modules', 'youtube-dl-exec', 'bin', 'yt-dlp.exe');
    const extractedYtdlp = path.join(os.tmpdir(), 'ytdlp-volly.exe');
    if (fs.existsSync(originalYtdlp)) {
      if (!fs.existsSync(extractedYtdlp)) {
        fs.writeFileSync(extractedYtdlp, fs.readFileSync(originalYtdlp));
        try { fs.chmodSync(extractedYtdlp, 0o755); } catch(e) {}
      }
      ytdlpPath = extractedYtdlp;
    }
  } else {
    ytdlpPath = path.join(__dirname, 'node_modules', 'youtube-dl-exec', 'bin', 'yt-dlp.exe');
  }
} catch (e) {
  ffmpegPath = 'ffmpeg'; // Fallback
}
ffmpeg.setFfmpegPath(ffmpegPath);

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

// --- DOWNLOAD MANAGER ---
class DownloadManager {
  static getDownloadDir() {
    const dir = path.join(os.homedir(), 'Documents', 'VollyMedia');
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    return dir;
  }

  static async downloadFile(url, filename) {
    const downloadDir = this.getDownloadDir();
    // Gera um nome único para evitar sobreposição caso existam arquivos com mesmo nome
    const safeFilename = crypto.randomBytes(4).toString('hex') + '_' + filename.replace(/[^a-zA-Z0-9.\-_]/g, '');
    const destPath = path.join(downloadDir, safeFilename);

    console.log(`Baixando mídia: ${filename}...`);

    try {
      if (url.includes('drive.google.com')) {
        await this.downloadGoogleDrive(url, destPath);
        console.log(`✅ Download do Drive concluído: ${filename} -> ${destPath}`);
        return destPath;
      }
      
      if (ytdlpPath && (url.includes('youtube.com') || url.includes('youtu.be'))) {
        console.log(`🎬 Link do YouTube/Drive detectado. Usando extrator avançado...`);
        const youtubedl = require('youtube-dl-exec').create(ytdlpPath);
        await youtubedl(url, { output: destPath, format: 'bestvideo[ext=mp4]+bestaudio[ext=m4a]/mp4/best' });
        console.log(`✅ Download concluído (via extrator): ${filename} -> ${destPath}`);
        return destPath;
      }
    } catch (err) {
      if (url.includes('drive.google.com')) {
        throw err;
      }
      console.log(`⚠️ Extrator avançado falhou, tentando método padrão... (${err.message})`);
    }

    const response = await fetch(url);
    if (!response.ok) throw new Error(`Falha ao baixar ${url}: ${response.statusText}`);

    const fileStream = fs.createWriteStream(destPath);
    await streamPipeline(response.body, fileStream);
    console.log(`✅ Download concluído: ${filename} -> ${destPath}`);
    return destPath;
  }

  static async downloadGoogleDrive(url, destPath) {
    console.log(`☁️ Detectado link do Google Drive. Tentando baixar de forma nativa e sem limites...`);
    const https = require('https');
    
    let fileId = null;
    const match = url.match(/\/d\/([a-zA-Z0-9_-]+)/);
    if (match) fileId = match[1];
    else {
      try {
        const parsedUrl = new URL(url);
        fileId = parsedUrl.searchParams.get('id');
      } catch (e) {}
    }
    
    if (!fileId) {
      throw new Error("Não foi possível extrair o ID do arquivo do link do Google Drive.");
    }

    return new Promise((resolve, reject) => {
      const baseUrl = `https://drive.google.com/uc?export=download&id=${fileId}`;
      
      function fetchUrl(targetUrl, cookie = '') {
        const options = { headers: {} };
        if (cookie) options.headers['Cookie'] = cookie;

        https.get(targetUrl, options, (res) => {
          if (res.statusCode === 302 || res.statusCode === 303) {
            let newCookie = cookie;
            if (res.headers['set-cookie']) {
              newCookie = res.headers['set-cookie'].map(c => c.split(';')[0]).join('; ');
            }
            let loc = res.headers.location;
            if (loc.startsWith('/')) loc = 'https://drive.google.com' + loc;
            fetchUrl(loc, newCookie);
          } else if (res.statusCode === 200) {
            const contentType = res.headers['content-type'] || '';
            if (contentType.includes('text/html')) {
              let data = '';
              res.on('data', chunk => data += chunk);
              res.on('end', () => {
                const confirmMatch = data.match(/name="confirm"\s+value="([^"]+)"/i) || data.match(/confirm=([a-zA-Z0-9_-]+)/);
                const uuidMatch = data.match(/name="uuid"\s+value="([^"]+)"/i);
                
                if (confirmMatch) {
                  const confirmToken = confirmMatch[1];
                  // A url de action do form agora costuma ser https://drive.usercontent.google.com/download
                  const actionMatch = data.match(/action="([^"]+)"/i);
                  let nextUrl = actionMatch ? actionMatch[1] : `https://drive.usercontent.google.com/download`;
                  
                  // Adicionar parametros query ao invés de concatenar mal
                  const pUrl = new URL(nextUrl.startsWith('/') ? 'https://drive.usercontent.google.com' + nextUrl : nextUrl);
                  pUrl.searchParams.set('id', fileId);
                  pUrl.searchParams.set('export', 'download');
                  pUrl.searchParams.set('confirm', confirmToken);
                  if (uuidMatch) pUrl.searchParams.set('uuid', uuidMatch[1]);

                  console.log(`   Aviso de verificação (vírus/tamanho) do Google detectado. Bypass automático em andamento...`);
                  fetchUrl(pUrl.toString(), cookie);
                } else {
                  reject(new Error("O Google bloqueou o download e a tela de bypass falhou. O arquivo deve estar como 'Qualquer pessoa com o link'."));
                }
              });
            } else {
              const fileStream = fs.createWriteStream(destPath);
              res.pipe(fileStream);
              let downloaded = 0;
              let lastMb = -1;
              res.on('data', (chunk) => {
                downloaded += chunk.length;
                const mb = Math.floor(downloaded / (1024 * 1024));
                if (mb > lastMb && mb % 10 === 0 && mb > 0) {
                   console.log(`   Drive: Baixado ${mb}MB...`);
                   lastMb = mb;
                }
              });
              fileStream.on('finish', () => {
                fileStream.close();
                resolve();
              });
              fileStream.on('error', (err) => {
                try { fs.unlinkSync(destPath); } catch (e) {}
                reject(err);
              });
            }
          } else {
            reject(new Error(`Falha na comunicação com o Google Drive (Status HTTP: ${res.statusCode})`));
          }
        }).on('error', reject);
      }
      
      fetchUrl(baseUrl);
    });
  }

  static async convertToMp4(sourcePath) {
    return new Promise((resolve, reject) => {
      const ext = path.extname(sourcePath).toLowerCase();
      // Se já for mp4 (ou não for vídeo que possamos converter facilmente, ex: imagem), retorna o original
      if (ext === '.mp4' || ext === '.jpg' || ext === '.jpeg' || ext === '.png' || ext === '.mp3') {
        return resolve(sourcePath);
      }

      // Prepara o caminho final com extensão .mp4
      const destPath = sourcePath.substring(0, sourcePath.lastIndexOf('.')) + '.mp4';
      
      console.log(`🔄 Convertendo ${path.basename(sourcePath)} para MP4...`);
      let lastProgress = -1;

      ffmpeg(sourcePath)
        .toFormat('mp4')
        .videoCodec('libx264')
        .audioCodec('aac')
        .on('progress', (progress) => {
          if (progress.percent) {
            const currentPercent = Math.floor(progress.percent);
            // Mostrar log a cada 10% para não poluir
            if (currentPercent > lastProgress && currentPercent % 10 === 0) {
              console.log(`   Progresso da conversão: ${currentPercent}%`);
              lastProgress = currentPercent;
            }
          }
        })
        .on('error', (err) => {
          console.error(`❌ Erro na conversão de ${sourcePath}:`, err.message);
          // Em caso de erro, devolve o original para tentar adicionar de qualquer jeito
          resolve(sourcePath);
        })
        .on('end', () => {
          console.log(`✅ Conversão concluída: ${path.basename(destPath)}`);
          // Deleta o original não suportado
          try {
            fs.unlinkSync(sourcePath);
          } catch (e) {
             // ignora erro ao deletar
          }
          resolve(destPath);
        })
        .save(destPath);
    });
  }
}

async function processarPlaylist(exportId, payload) {
  console.log(`[${new Date().toLocaleTimeString()}] Recebendo playlist da nuvem (ID: ${exportId})...`);
  try {
    // 1. Processar mídias: Baixar arquivos e atualizar payload
    if (payload && payload.items && Array.isArray(payload.items)) {
      for (let i = 0; i < payload.items.length; i++) {
        let item = payload.items[i];
        if (item.type === 'media' && item.url) {
          try {
            let localPath = await DownloadManager.downloadFile(item.url, item.title || 'media.mp4');
            // Tenta converter se não for suportado
            localPath = await DownloadManager.convertToMp4(localPath);
            item.file = localPath; // Substitui URL pelo caminho local
            // Opcional: tentar enviar via HTTP API direta para o Holyrics se a API AddToPlaylist existir
            try {
              const addToPlaylistUrl = `http://localhost:${config.holyricsPort}/api/AddToPlaylist?token=${config.holyricsToken}`;
              const mediaResponse = await fetch(addToPlaylistUrl, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  type: 'media',
                  file: localPath
                })
              });
              if(mediaResponse.ok) {
                 console.log(`✅ Mídia enviada com sucesso para o Holyrics via API nativa: ${item.title}`);
                 item.addedViaApi = true; // Marca para o script não tentar adicionar de novo
              } else {
                 console.log(`⚠️ Falha ao adicionar mídia via API nativa, será enviada via script. Status: ${mediaResponse.status}`);
              }
            } catch (apiErr) {
              console.log(`⚠️ Endpoint AddToPlaylist indisponível, fallback para script.`);
            }
          } catch (err) {
             console.error(`❌ Erro ao baixar mídia ${item.title}:`, err.message);
          }
        }
      }
    }

    // 2. Enviar para Holyrics (Músicas e Mídias que não foram via API)
    const holyricsUrl = `http://localhost:${config.holyricsPort}/api/playlist/add`;
    const response = await fetch(`${holyricsUrl}?token=${config.holyricsToken}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    if (response.ok) {
      console.log(`✅ Sucesso! Músicas e arquivos enviados para o Holyrics local.`);
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

async function verificarPendentes() {
  try {
    const { data, error } = await supabase
      .from('holyrics_exports')
      .select('id, payload')
      .eq('connection_code', config.connectionCode)
      .eq('status', 'pending')
      .order('created_at', { ascending: true });

    if (data && data.length > 0) {
      console.log(`Encontradas ${data.length} playlists pendentes na nuvem. Processando...`);
      for (const row of data) {
        await supabase.from('holyrics_exports').update({ status: 'processing' }).eq('id', row.id);
        await processarPlaylist(row.id, row.payload);
      }
    }
  } catch (err) {
    console.error("Erro ao verificar pendentes iniciais:", err);
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
  console.log('📡 Aguardando playlists na nuvem (Modo Tempo Real)...');
  console.log('=============================================');

  // Verifica se tem algo pendente que não foi processado enquanto o connector estava desligado
  verificarPendentes();

  // Em vez de um setInterval que sobrecarrega o banco, usamos Supabase Realtime
  pollingInterval = supabase
    .channel('holyrics_exports_changes')
    .on(
      'postgres_changes',
      {
        event: 'INSERT',
        schema: 'public',
        table: 'holyrics_exports',
        filter: `connection_code=eq.${config.connectionCode}`
      },
      async (payload) => {
        const row = payload.new;
        if (row && row.status === 'pending') {
          await supabase.from('holyrics_exports').update({ status: 'processing' }).eq('id', row.id);
          await processarPlaylist(row.id, row.payload);
        }
      }
    )
    .subscribe((status) => {
      if (status === 'SUBSCRIBED') {
        console.log('✅ Conectado ao banco de forma silenciosa. Aguardando Músicas...');
        console.log('=============================================');
        console.log('🛑 IMPORTANTE: NÃO FECHE ESTA TELA!');
        console.log('🛑 Se você fechar esta janela, o Volly Connector irá parar e as músicas não chegarão ao Holyrics.');
        console.log('🛑 Apenas minimize esta janela e deixe-a rodando em segundo plano.');
        console.log('=============================================');
      } else if (status === 'CHANNEL_ERROR') {
        console.log('⚠️ Erro de canal no Realtime. Tente reiniciar o connector mais tarde.');
      }
    });
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
    execSync(`powershell -Command "Add-Type -AssemblyName VisualBasic; [Microsoft.VisualBasic.Interaction]::AppActivate('Volly Connector')"`, { stdio: 'ignore' });
  } catch (e) {}

  // Criar atalho na pasta Inicializar do Windows (Startup)
  try {
    const { execSync } = require('child_process');
    const startupPath = path.join(process.env.APPDATA, 'Microsoft', 'Windows', 'Start Menu', 'Programs', 'Startup', 'VollyConnector.lnk');
    const isPkg = typeof process.pkg !== 'undefined';
    const exeDir = isPkg ? path.dirname(process.execPath) : __dirname;
    const targetPath = isPkg ? process.execPath : path.join(__dirname, 'iniciar_vollyconnector.bat');
    
    const vbsScript = `
Set oWS = WScript.CreateObject("WScript.Shell")
sLinkFile = "${startupPath}"
Set oLink = oWS.CreateShortcut(sLinkFile)
oLink.TargetPath = "${targetPath}"
oLink.WorkingDirectory = "${exeDir}"
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
                        // Adiciona na aba de Letras (padrão)
                        h.hly('AddSongsToPlaylist', { id: foundId });
                        
                        // Adiciona uma cópia na aba de Mídia
                        try {
                            if (typeof h.addSongToPlaylist === 'function') {
                                h.addSongToPlaylist({
                                    id: foundId,
                                    media_playlist: true,
                                    index: -1
                                });
                            } else {
                                h.hly('AddSongsToPlaylist', { id: foundId, media_playlist: true });
                            }
                        } catch(e) {
                            h.log("Aviso: Falha ao tentar enviar para aba Mídia. Erro: " + e.message);
                        }
                        
                        h.log("✅ Adicionada (Letras e Mídia): " + song.title);
                        sucessoCount++;
                    } else {
                        h.log("❌ Não encontrada no banco: " + song.title);
                    }
                } else if (song && song.type === 'media' && !song.addedViaApi && song.file) {
                    // Fallback se a API nativa não funcionou: tenta injetar via plugin
                    try {
                        h.hly('AddToPlaylist', { file: song.file });
                        h.log("✅ Mídia adicionada via script: " + song.title);
                        sucessoCount++;
                    } catch (e) {
                        h.log("❌ Falha ao adicionar mídia via script: " + song.title);
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
    console.log('=============================================');
    console.log('🛑 IMPORTANTE: NÃO FECHE ESTA TELA PRETA!');
    console.log('🛑 Ela é o coração do Volly Connector. Se você fechar agora, a tela do navegador não voltará a abrir.');
    console.log('🛑 Após salvar as configurações no navegador, apenas minimize esta janela.');
    console.log('=============================================');
    try {
        const { exec } = require('child_process');
        if (process.platform === 'win32') {
            exec(`start http://localhost:${PORT}`);
        } else if (process.platform === 'darwin') {
            exec(`open http://localhost:${PORT}`);
        } else {
            exec(`xdg-open http://localhost:${PORT}`);
        }
    } catch(e) {
        console.log(`Por favor, acesse http://localhost:${PORT} no seu navegador.`);
    }
  } else {
    startPolling();
  }
});

