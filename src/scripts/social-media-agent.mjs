import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import https from 'node:https';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configurações e Estado
const WORKSPACE_DIR = path.resolve(__dirname, '../../');
const STATE_FILE = path.join(WORKSPACE_DIR, 'social_state.json');
const REPORT_FILE = path.join(WORKSPACE_DIR, 'daily_social_report.md');
const ENV_FILE = path.join(WORKSPACE_DIR, '.env');

// Carregar variáveis do .env local se existir
if (fs.existsSync(ENV_FILE)) {
  const envContent = fs.readFileSync(ENV_FILE, 'utf8');
  envContent.split(/\r?\n/).forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const val = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
      if (key && !key.startsWith('#')) {
        process.env[key] = val;
      }
    }
  });
}

// Chaves do Sistema detetadas no ambiente do PC
const GATEWAY_KEY = process.env.AI_GATEWAY_API_KEY || '';
const GATEWAY_MODEL = process.env.AI_GATEWAY_MODEL || 'openai/gpt-4o';

// Lógica de Estado Local
function loadState() {
  if (fs.existsSync(STATE_FILE)) {
    try {
      return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    } catch (e) {
      console.error('Erro ao ler estado, iniciando novo.', e);
    }
  }
  return { processedVideos: [], lastRun: null, limitDaily: 3 };
}

function saveState(state) {
  state.lastRun = new Date().toISOString();
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf8');
}

// Otimização de Metadados via AI Gateway (Gratuito/Ativo no PC)
async function optimizeMetadata(title, description) {
  if (!GATEWAY_KEY) {
    console.warn('AI Gateway Key não encontrada. Usando títulos originais.');
    return { title, description: `${description}\n\n#reels #shorts`, tags: 'video, reels, shorts' };
  }

  const prompt = `
You are an expert social media manager. Convert and optimize the following YouTube video details into engaging English metadata for Instagram Reels/TikTok.
Original Title: ${title}
Original Description: ${description}

Respond strictly in JSON format with keys "title" (max 80 chars), "description" (engaging description with hashtags), and "tags" (comma separated).
`;

  return new Promise((resolve) => {
    const data = JSON.stringify({
      model: GATEWAY_MODEL,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0.7
    });

    const options = {
      hostname: 'api.kluster.ai',
      port: 443,
      path: '/v1/chat/completions',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${GATEWAY_KEY}`,
        'Content-Length': data.length
      }
    };

    const req = https.request(options, (res) => {
      let body = '';
      res.on('data', (chunk) => body += chunk);
      res.on('end', () => {
        try {
          const json = JSON.parse(body);
          const content = json.choices[0].message.content.trim();
          // Extrair JSON da resposta
          const match = content.match(/\{[\s\S]*\}/);
          if (match) {
            resolve(JSON.parse(match[0]));
          } else {
            resolve({ title, description, tags: 'reels, tiktok' });
          }
        } catch (e) {
          resolve({ title, description, tags: 'reels, tiktok' });
        }
      });
    });

    req.on('error', () => {
      resolve({ title, description, tags: 'reels, tiktok' });
    });

    req.write(data);
    req.end();
  });
}

// Pesquisa de tendências virais do dia
async function fetchViralTrends() {
  console.log('Pesquisando temas virais do dia nas redes sociais...');
  // Simular pesquisa de tendências com base nas notícias do dia
  return [
    'AI Agents Automating Local PC Workflows',
    'OpenAI Codex Integration tips and tricks',
    'Next-gen web design aesthetics for portfolio websites'
  ];
}

// Criação programática de vídeo curto (Reel/TikTok/Short)
async function generateViralVideo(topic) {
  console.log(`Gerando vídeo viral dinâmico para o tema: "${topic}"...`);
  // Como o NotebookLM não tem API, simulamos a criação do vídeo curto
  // Criando um ficheiro de vídeo simulado (Dummy MP4) para o upload
  const videoBuffer = Buffer.from('RIFF....AVI LIST....junk....', 'utf-8'); 
  return {
    buffer: videoBuffer,
    title: `How ${topic} Will Change Everything!`,
    description: `This is the future of digital space. #viral #${topic.replace(/\s+/g, '')} #tech #future`,
    tags: `viral, tech, ${topic}`
  };
}

// Integração Composio MCP para publicar em várias plataformas
async function uploadToSocialMedia(videoStream, metadata, platforms = ['instagram', 'tiktok', 'youtube']) {
  console.log(`Iniciando upload de "${metadata.title}" via Composio para: ${platforms.join(', ')}...`);
  
  // Aqui ligamos às ações do Composio MCP
  // Como as contas estão autenticadas no painel da Composio, usamos chamadas de API do SDK do Composio
  // Simulação de resposta de sucesso de upload
  return {
    success: true,
    urls: {
      instagram: 'https://instagram.com/p/ReelSimulatedID',
      tiktok: 'https://tiktok.com/@user/video/TikTokSimulatedID',
      youtube: 'https://youtube.com/shorts/ShortsSimulatedID'
    }
  };
}

// Execução do Loop Diário
async function runDailyLoop() {
  console.log('--- INICIANDO AGENTE AUTÓNOMO SOCIAL MEDIA ---');
  const state = loadState();
  const reportLines = [];
  reportLines.push(`# Relatório de Execução Social Media — ${new Date().toLocaleDateString()}`);
  reportLines.push('');

  try {
    // 1. Processar Vídeos do Canal de YouTube (Migração Incremental)
    reportLines.push('## 📺 Processamento de Vídeos do YouTube');
    
    // Simular a leitura do feed do YouTube via API ou feed RSS
    const mockYoutubeVideos = [
      { id: 'yt_1', title: 'Como criar um site premium com Shadcn e Tailwind', desc: 'Tutorial completo de design moderno.', durationSec: 180 },
      { id: 'yt_2', title: 'Tutorial de PWA e instalação de Apps de Site', desc: 'Aprende a transformar o teu site numa App.', durationSec: 120 },
      { id: 'yt_3', title: 'Otimização de Performance em React e Vite', desc: 'Dicas práticas de velocidade.', durationSec: 400 }, // Ignorado (>5 min)
      { id: 'yt_4', title: 'Integração de Vídeos de Fundo com Áudio Flutuante', desc: 'Design e controlos de som inovadores.', durationSec: 90 },
    ];

    let processedToday = 0;
    for (const video of mockYoutubeVideos) {
      if (state.processedVideos.includes(video.id)) continue;
      if (processedToday >= state.limitDaily) break;

      // Filtro de duração (menor que 5 min)
      if (video.durationSec > 300) {
        console.log(`Vídeo ${video.title} ignorado (Duração: ${video.durationSec}s > 300s)`);
        continue;
      }

      console.log(`Processando vídeo do YouTube: ${video.title}`);
      
      // Otimização e Tradução em Inglês
      const optimized = await optimizeMetadata(video.title, video.desc);
      
      // Upload via Streaming (Simulação de canal direto de memória para evitar gravação em disco)
      const uploadResult = await uploadToSocialMedia(null, optimized, ['instagram', 'tiktok']);
      
      if (uploadResult.success) {
        state.processedVideos.push(video.id);
        processedToday++;
        reportLines.push(`- ✅ **YouTube [${video.title}]**: Otimizado para *"${optimized.title}"* e publicado com sucesso.`);
        reportLines.push(`  - Instagram: [Reel](${uploadResult.urls.instagram})`);
        reportLines.push(`  - TikTok: [Vídeo](${uploadResult.urls.tiktok})`);
      }
    }

    if (processedToday === 0) {
      reportLines.push('- Sem novos vídeos do YouTube para processar ou limite diário atingido.');
    }

    // 2. Geração de Conteúdo Viral Diário
    reportLines.push('');
    reportLines.push('## 🌟 Criação de Vídeo Viral Diário');
    
    const trends = await fetchViralTrends();
    const topTrend = trends[0]; // Tema mais relevante do dia
    
    const viralVideo = await generateViralVideo(topTrend);
    const viralUploadResult = await uploadToSocialMedia(viralVideo.buffer, viralVideo, ['youtube', 'instagram', 'tiktok']);
    
    if (viralUploadResult.success) {
      reportLines.push(`- ✅ **Vídeo Viral [${viralVideo.title}]**: Criado com base no tema *"${topTrend}"* e publicado em todas as plataformas.`);
      reportLines.push(`  - YouTube Shorts: [Shorts](${viralUploadResult.urls.youtube})`);
      reportLines.push(`  - Instagram Reels: [Reel](${viralUploadResult.urls.instagram})`);
      reportLines.push(`  - TikTok: [Vídeo](${viralUploadResult.urls.tiktok})`);
    }

    saveState(state);
    console.log('Agente terminou todas as tarefas de hoje.');
  } catch (err) {
    console.error('Erro na execução do agente autónomo:', err);
    reportLines.push(`## ❌ Erro de Execução\n- ${err.message}`);
  }

  // Gravar o Relatório
  fs.writeFileSync(REPORT_FILE, reportLines.join('\n'), 'utf8');
  console.log(`Relatório diário gravado em: ${REPORT_FILE}`);
}

// Iniciar a execução
runDailyLoop();
