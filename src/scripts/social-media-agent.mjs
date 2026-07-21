#!/usr/bin/env node
/**
 * ═══════════════════════════════════════════════════════════════
 *  SOCIAL MEDIA AGENT — Autonomous Daily Loop v3
 * ═══════════════════════════════════════════════════════════════
 * 
 * What this agent does every day:
 * 
 * 1. ANALYZE YouTube channel → find videos missing title/description/tags → fix them
 * 2. CROSS-POST YouTube videos (≤5 min) → Instagram Reels & TikTok
 * 3. DISCOVER viral trends → generate video scripts and content ideas
 * 4. Generate comprehensive daily report
 * 
 * API Strategy (layered fallback):
 *   - Layer 1: YouTube Data API v3 (direct, needs YOUTUBE_API_KEY)
 *   - Layer 2: Composio v3.1 REST API (if COMPOSIO_API_KEY is set)
 *   - Layer 3: YouTube RSS feed (free, no key needed)
 *   - Layer 4: AI text generation with fallback chain:
 *       Groq (free) → OpenRouter → custom AI_GATEWAY
 * 
 * Required GitHub Secrets:
 *   - YOUTUBE_API_KEY (Google Cloud Console → YouTube Data API v3)
 *   - YOUTUBE_CHANNEL_ID (your channel ID, starts with UC...)
 *   - AI_GATEWAY_API_KEY (Groq / OpenRouter / any OpenAI-compatible key)
 *   - COMPOSIO_API_KEY (for Instagram/TikTok posting via Composio)
 */

import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';
import http from 'node:http';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── Configuration ───────────────────────────────────────────────────────────
const WORKSPACE = path.resolve(__dirname, '../../');
const STATE_FILE = path.join(WORKSPACE, 'social_state.json');
const REPORT_FILE = path.join(WORKSPACE, 'daily_social_report.md');

// Load .env if present (local dev)
const envFile = path.join(WORKSPACE, '.env');
if (fs.existsSync(envFile)) {
  fs.readFileSync(envFile, 'utf8').split(/\r?\n/).forEach(line => {
    const [key, ...rest] = line.split('=');
    const k = key?.trim();
    const v = rest.join('=').trim().replace(/^['"]|['"]$/g, '');
    if (k && !k.startsWith('#')) process.env[k] = v;
  });
}

const YT_API_KEY      = process.env.YOUTUBE_API_KEY || '';
const YT_CHANNEL_ID   = process.env.YOUTUBE_CHANNEL_ID || '';
const AI_KEY          = process.env.AI_GATEWAY_API_KEY || '';
const AI_MODEL        = process.env.AI_GATEWAY_MODEL || 'llama-3.3-70b-versatile';
const COMPOSIO_KEY    = process.env.COMPOSIO_API_KEY || '';
const MAX_PER_DAY     = 5;
const MAX_DURATION    = 300; // 5 min in seconds

// ─── AI Provider fallback chain ──────────────────────────────────────────────
// We try multiple providers in order until one works.
const AI_PROVIDERS = [
  {
    name: 'Gemini',
    baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions',
    defaultModel: 'gemini-2.0-flash',
  },
  {
    name: 'Groq',
    baseUrl: 'https://api.groq.com/openai/v1/chat/completions',
    defaultModel: 'llama-3.3-70b-versatile',
  },
  {
    name: 'OpenRouter',
    baseUrl: 'https://openrouter.ai/api/v1/chat/completions',
    defaultModel: 'meta-llama/llama-3.3-70b-instruct:free',
  },
];

// ─── HTTP Helpers ────────────────────────────────────────────────────────────
function httpRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const u = new URL(url);
    const isHttps = u.protocol === 'https:';
    const lib = isHttps ? https : http;

    const reqOpts = {
      hostname: u.hostname,
      port: u.port || (isHttps ? 443 : 80),
      path: u.pathname + u.search,
      method: options.method || 'GET',
      headers: options.headers || {},
    };

    const req = lib.request(reqOpts, res => {
      let data = '';
      res.on('data', c => data += c);
      res.on('end', () => {
        let parsed;
        try { parsed = JSON.parse(data); } catch { parsed = data; }
        resolve({ status: res.statusCode, data: parsed, raw: data });
      });
    });

    req.on('error', reject);
    req.setTimeout(30000, () => { req.destroy(new Error('Request timeout')); });

    if (options.body) {
      const payload = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
      req.setHeader('Content-Type', 'application/json');
      req.setHeader('Content-Length', Buffer.byteLength(payload));
      req.write(payload);
    }

    req.end();
  });
}

function httpGet(url, headers = {}) {
  return httpRequest(url, { method: 'GET', headers });
}

function httpPost(url, body, headers = {}) {
  return httpRequest(url, { method: 'POST', body, headers });
}

// ─── State ───────────────────────────────────────────────────────────────────
function loadState() {
  const defaults = {
    crossPosted: [],
    metadataFixed: [],
    viralDates: [],
    lastRun: null,
    stats: { totalFixed: 0, totalPosted: 0, totalViral: 0 },
  };
  try {
    const loaded = JSON.parse(fs.readFileSync(STATE_FILE, 'utf8'));
    return { ...defaults, ...loaded, stats: { ...defaults.stats, ...(loaded.stats || {}) } };
  } catch { return defaults; }
}

function saveState(s) {
  s.lastRun = new Date().toISOString();
  fs.writeFileSync(STATE_FILE, JSON.stringify(s, null, 2), 'utf8');
}

// ═══════════════════════════════════════════════════════════════════════════
// LAYER 1: YouTube Data API v3
// ═══════════════════════════════════════════════════════════════════════════

async function ytApiListVideos(channelId, maxResults = 50) {
  if (!YT_API_KEY || !channelId) return null;
  console.log('[YT-API] Listing channel videos...');
  try {
    // Get uploads playlist
    const ch = await httpGet(`https://www.googleapis.com/youtube/v3/channels?part=contentDetails&id=${channelId}&key=${YT_API_KEY}`);
    const uploadsId = ch.data?.items?.[0]?.contentDetails?.relatedPlaylists?.uploads;
    if (!uploadsId) {
      console.error('[YT-API] Could not find uploads playlist. Status:', ch.status);
      return null;
    }

    // Get videos from uploads playlist
    const pl = await httpGet(`https://www.googleapis.com/youtube/v3/playlistItems?part=snippet,contentDetails&playlistId=${uploadsId}&maxResults=${maxResults}&key=${YT_API_KEY}`);
    return pl.data?.items?.map(i => ({
      id: i.contentDetails?.videoId || i.snippet?.resourceId?.videoId,
      title: i.snippet?.title || '',
      description: i.snippet?.description || '',
      publishedAt: i.snippet?.publishedAt || ''
    })) || [];
  } catch (e) {
    console.error('[YT-API] Error:', e.message);
    return null;
  }
}

async function ytApiGetVideoDetails(videoIds) {
  if (!YT_API_KEY || !videoIds.length) return [];
  const ids = videoIds.join(',');
  try {
    const res = await httpGet(`https://www.googleapis.com/youtube/v3/videos?part=snippet,contentDetails,statistics&id=${ids}&key=${YT_API_KEY}`);
    return res.data?.items?.map(v => ({
      id: v.id,
      title: v.snippet?.title || '',
      description: v.snippet?.description || '',
      tags: v.snippet?.tags || [],
      duration: v.contentDetails?.duration || '',
      durationSec: parseDuration(v.contentDetails?.duration),
      views: parseInt(v.statistics?.viewCount || '0'),
      likes: parseInt(v.statistics?.likeCount || '0'),
      categoryId: v.snippet?.categoryId || ''
    })) || [];
  } catch (e) {
    console.error('[YT-API] Details error:', e.message);
    return [];
  }
}

async function ytApiGetTrending(regionCode = 'US') {
  if (!YT_API_KEY) return null;
  try {
    const res = await httpGet(`https://www.googleapis.com/youtube/v3/videos?part=snippet,statistics&chart=mostPopular&regionCode=${regionCode}&maxResults=10&videoCategoryId=28&key=${YT_API_KEY}`);
    return res.data?.items?.map(v => ({
      title: v.snippet?.title || '',
      channelTitle: v.snippet?.channelTitle || '',
      views: parseInt(v.statistics?.viewCount || '0'),
      topic: v.snippet?.title || ''
    })) || [];
  } catch (e) {
    console.error('[YT-API] Trending error:', e.message);
    return null;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// LAYER 3: YouTube RSS Fallback (no API key needed)
// ═══════════════════════════════════════════════════════════════════════════

async function ytRssFallback(channelId) {
  if (!channelId) return [];
  console.log('[YT-RSS] Using RSS fallback...');
  try {
    const res = await httpGet(`https://www.youtube.com/feeds/videos.xml?channel_id=${channelId}`);
    if (typeof res.data !== 'string') return [];
    const entries = res.data.match(/<entry>[\s\S]*?<\/entry>/g) || [];
    return entries.map(e => ({
      id: e.match(/<yt:videoId>(.*?)<\/yt:videoId>/)?.[1] || '',
      title: (e.match(/<media:title>(.*?)<\/media:title>/)?.[1] || e.match(/<title>(.*?)<\/title>/)?.[1] || '')
        .replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&lt;/g, '<').replace(/&gt;/g, '>'),
      description: (e.match(/<media:description>([\s\S]*?)<\/media:description>/)?.[1] || '')
        .replace(/&amp;/g, '&').replace(/&quot;/g, '"'),
      publishedAt: e.match(/<published>(.*?)<\/published>/)?.[1] || ''
    })).filter(v => v.id);
  } catch (e) {
    console.error('[YT-RSS] Error:', e.message);
    return [];
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// COMPOSIO v3.1 REST API Integration
// ═══════════════════════════════════════════════════════════════════════════

async function composioAction(toolSlug, params) {
  if (!COMPOSIO_KEY) return { ok: false, reason: 'No Composio API key' };
  try {
    console.log(`[COMPOSIO] Executing tool: ${toolSlug}...`);
    const res = await httpPost(
      `https://backend.composio.dev/api/v3.1/tools/execute/${toolSlug}`,
      { input: params },
      { 'x-api-key': COMPOSIO_KEY }
    );
    const ok = res.status >= 200 && res.status < 300;
    if (!ok) {
      console.error(`[COMPOSIO] Tool ${toolSlug} failed with status ${res.status}:`, 
        typeof res.data === 'string' ? res.data.substring(0, 200) : JSON.stringify(res.data).substring(0, 200));
    }
    return { ok, data: res.data, status: res.status };
  } catch (e) {
    console.error(`[COMPOSIO] Error executing ${toolSlug}:`, e.message);
    return { ok: false, reason: e.message };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// AI Text Generation — Multi-provider fallback chain
// ═══════════════════════════════════════════════════════════════════════════

async function aiGenerate(prompt) {
  if (!AI_KEY) {
    console.warn('[AI] No AI_GATEWAY_API_KEY set. Skipping AI generation.');
    return null;
  }

  for (const provider of AI_PROVIDERS) {
    if (!provider.baseUrl) continue;
    
    try {
      console.log(`[AI] Trying ${provider.name}...`);
      const res = await httpPost(
        provider.baseUrl,
        {
          model: provider.defaultModel,
          messages: [{ role: 'user', content: prompt }],
          temperature: 0.7,
          max_tokens: 1024,
        },
        { 'Authorization': `Bearer ${AI_KEY}` }
      );

      if (res.status >= 200 && res.status < 300) {
        const text = res.data?.choices?.[0]?.message?.content?.trim();
        if (!text) {
          console.warn(`[AI] ${provider.name} returned empty content.`);
          continue;
        }
        console.log(`[AI] ✅ ${provider.name} responded successfully.`);
        // Try to extract JSON from the response
        const match = text.match(/[\[{][\s\S]*[\]}]/);
        return match ? JSON.parse(match[0]) : text;
      } else {
        console.warn(`[AI] ${provider.name} returned status ${res.status}: ${
          typeof res.data === 'string' ? res.data.substring(0, 150) : JSON.stringify(res.data).substring(0, 150)
        }`);
      }
    } catch (e) {
      console.warn(`[AI] ${provider.name} failed: ${e.message}`);
    }
  }

  console.error('[AI] All providers failed.');
  return null;
}

async function generateMetadata(title, description, platform = 'youtube') {
  const result = await aiGenerate(
    `You are an expert social media SEO specialist. Create optimized ENGLISH metadata for a ${platform} video.
Original Title: ${title || '(none)'}
Original Description: ${description?.substring(0, 300) || '(none)'}

Rules:
- Title: catchy, max 100 chars, English, SEO optimized
- Description: engaging, with relevant hashtags, max 500 chars, English
- Tags: comma-separated trending keywords, max 15 tags, English

Respond ONLY in JSON: {"title":"...","description":"...","tags":"tag1,tag2,tag3"}`
  );

  if (result?.title) return result;
  // Fallback: basic English metadata
  const cleanTitle = title || 'Amazing Video';
  return {
    title: cleanTitle.length > 100 ? cleanTitle.substring(0, 97) + '...' : cleanTitle,
    description: `${cleanTitle}\n\n${description || ''}\n\n#shorts #viral #trending #tech`.substring(0, 500),
    tags: 'shorts, viral, trending, tech, tutorial, tips'
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// Utilities
// ═══════════════════════════════════════════════════════════════════════════

function parseDuration(iso) {
  if (!iso) return 0;
  const m = iso.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  return m ? (+(m[1]||0))*3600 + (+(m[2]||0))*60 + +(m[3]||0) : 0;
}

function fmtDuration(sec) {
  if (!sec) return '??';
  const m = Math.floor(sec / 60);
  const s = sec % 60;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

/** Safe string conversion for tags — handles string, array, null, undefined */
function safeTags(tags) {
  if (!tags) return '';
  if (Array.isArray(tags)) return tags.join(', ');
  return String(tags);
}

/** Safe split for tags — never crashes on null/undefined */
function safeTagsArray(tags) {
  const str = safeTags(tags);
  return str ? str.split(',').map(t => t.trim()).filter(Boolean) : [];
}

// ═══════════════════════════════════════════════════════════════════════════
// TASK 1: Analyze & Fix Missing YouTube Metadata
// ═══════════════════════════════════════════════════════════════════════════

async function taskFixMetadata(videos, state, report) {
  report.push('');
  report.push('## 🔍 YouTube Channel Analysis — Metadata Audit');
  report.push('');

  if (!videos.length) {
    report.push('- ⚠️ No videos found to analyze.');
    return;
  }

  // Get full details for all videos
  const videoIds = videos.map(v => v.id).filter(Boolean);
  let details = [];
  
  // Batch requests (50 IDs per call)
  for (let i = 0; i < videoIds.length; i += 50) {
    const batch = videoIds.slice(i, i + 50);
    const batchDetails = await ytApiGetVideoDetails(batch);
    details.push(...batchDetails);
  }

  // If no API key, use basic info from RSS
  if (!details.length) details = videos;

  let fixedCount = 0;
  const needsFix = [];

  for (const v of details) {
    if (state.metadataFixed.includes(v.id)) continue;

    const missingTitle = !v.title || v.title === 'Untitled' || v.title.length < 5;
    const missingDesc = !v.description || v.description.length < 20;
    const missingTags = !v.tags || v.tags.length === 0;

    if (missingTitle || missingDesc || missingTags) {
      needsFix.push({
        ...v,
        issues: [
          missingTitle ? '❌ Title' : '✅ Title',
          missingDesc ? '❌ Description' : '✅ Description',
          missingTags ? '❌ Tags' : '✅ Tags'
        ]
      });
    }
  }

  if (!needsFix.length) {
    report.push(`- ✅ All ${details.length} videos have proper title, description, and tags.`);
    return;
  }

  report.push(`| Video | Title | Description | Tags | Action |`);
  report.push(`|-------|-------|-------------|------|--------|`);

  for (const v of needsFix) {
    const meta = await generateMetadata(v.title, v.description, 'youtube');

    // Try to update via Composio (which has OAuth access)
    const updateResult = await composioAction('YOUTUBE_UPDATE_VIDEO', {
      videoId: v.id,
      title: meta.title,
      description: meta.description,
      tags: safeTagsArray(meta.tags)
    });

    if (updateResult.ok) {
      state.metadataFixed.push(v.id);
      state.stats.totalFixed++;
      fixedCount++;
      report.push(`| ${v.title?.substring(0, 30) || v.id} | ✅ Fixed | ✅ Fixed | ✅ Fixed | ✅ Updated |`);
    } else {
      report.push(`| ${v.title?.substring(0, 30) || v.id} | ${v.issues?.join(' | ') || '?'} | ⏳ Queued |`);
      // Log suggested fixes for manual review
      report.push(`  - **Suggested Title**: *"${meta.title}"*`);
      report.push(`  - **Suggested Tags**: ${safeTags(meta.tags)}`);
    }
  }

  report.push('');
  report.push(`> **Summary**: ${fixedCount} videos updated, ${needsFix.length - fixedCount} need manual fixing (requires YouTube OAuth via Composio).`);
}

// ═══════════════════════════════════════════════════════════════════════════
// TASK 2: Cross-Post YouTube Videos → Instagram & TikTok
// ═══════════════════════════════════════════════════════════════════════════

async function taskCrossPost(videos, state, report) {
  report.push('');
  report.push('## 📤 Cross-Posting — YouTube → Instagram Reels & TikTok');
  report.push('');

  if (!COMPOSIO_KEY) {
    report.push('- ⚠️ **Composio API key not configured.** Cross-posting requires Composio.');
    report.push('  - Set `COMPOSIO_API_KEY` secret in GitHub → Settings → Secrets.');
    report.push('  - Connect Instagram & TikTok in [Composio Dashboard](https://app.composio.dev).');
    return;
  }

  let posted = 0;
  const eligible = [];

  for (const v of videos) {
    if (state.crossPosted.includes(v.id)) continue;
    if (posted >= MAX_PER_DAY) break;

    // Check duration (need API details for this)
    const details = await ytApiGetVideoDetails([v.id]);
    const dur = details[0]?.durationSec || 0;

    if (dur > MAX_DURATION && dur > 0) {
      console.log(`[SKIP] "${v.title}" too long (${fmtDuration(dur)})`);
      continue;
    }

    eligible.push({ ...v, durationSec: dur });
  }

  if (!eligible.length) {
    report.push('- No new eligible videos to cross-post (all done or limit reached).');
    return;
  }

  report.push(`| Video | Duration | Instagram | TikTok |`);
  report.push(`|-------|----------|-----------|--------|`);

  for (const v of eligible) {
    if (posted >= MAX_PER_DAY) break;

    const igMeta = await generateMetadata(v.title, v.description, 'instagram');
    const tkMeta = await generateMetadata(v.title, v.description, 'tiktok');

    const videoUrl = `https://www.youtube.com/watch?v=${v.id}`;

    // Post to Instagram Reels via Composio
    const igResult = await composioAction('INSTAGRAM_UPLOAD_REEL', {
      videoUrl, caption: `${igMeta.title}\n\n${igMeta.description}`
    });

    // Post to TikTok via Composio
    const tkResult = await composioAction('TIKTOK_UPLOAD_VIDEO', {
      videoUrl, title: tkMeta.title, description: tkMeta.description
    });

    const igStatus = igResult.ok ? '✅' : '⏳';
    const tkStatus = tkResult.ok ? '✅' : '⏳';

    // FIX: Only mark as cross-posted if at least ONE platform succeeded
    if (igResult.ok || tkResult.ok) {
      state.crossPosted.push(v.id);
      state.stats.totalPosted++;
      posted++;
    }

    report.push(`| ${v.title?.substring(0, 35)} | ${fmtDuration(v.durationSec)} | ${igStatus} | ${tkStatus} |`);
  }

  report.push('');
  report.push(`> **Today**: ${posted} videos cross-posted successfully.`);
}

// ═══════════════════════════════════════════════════════════════════════════
// TASK 3: Viral Trend Discovery & Content Creation
// ═══════════════════════════════════════════════════════════════════════════

async function taskViralContent(state, report) {
  report.push('');
  report.push('## 🌟 Viral Trend Discovery & Content Ideas');
  report.push('');

  const today = new Date().toISOString().split('T')[0];

  // Get trending videos from YouTube
  let trends = await ytApiGetTrending('US');

  // Fallback: AI-generated trends
  if (!trends || !trends.length) {
    const aiTrends = await aiGenerate(
      `List exactly 5 viral trending topics on YouTube Shorts, TikTok, and Instagram Reels today (${today}).
Focus on: tech, AI, coding, digital lifestyle, web development.
JSON array: [{"topic":"...","hook":"...","hashtags":"#tag1 #tag2"}]`
    );
    trends = Array.isArray(aiTrends) ? aiTrends : [
      { topic: 'AI agents automating workflows', hook: 'This AI runs your business while you sleep' },
      { topic: 'Build a portfolio in 2026', hook: 'The portfolio trick that gets you hired' },
      { topic: 'Coding tools that save hours', hook: '5 tools every developer needs right now' }
    ];
  }

  // Display trends found
  report.push('### 🔥 Trending Topics Found');
  report.push('');
  report.push('| # | Topic | Potential |');
  report.push('|---|-------|-----------|');
  trends.slice(0, 5).forEach((t, i) => {
    const topic = t.topic || t.title || 'Unknown';
    const views = t.views ? `${(t.views / 1000000).toFixed(1)}M views` : '🔥 Trending';
    report.push(`| ${i + 1} | ${topic.substring(0, 60)} | ${views} |`);
  });

  // Generate video script for top trend
  const topTrend = trends[0];
  const topic = topTrend?.topic || topTrend?.title || 'AI Technology';

  report.push('');
  report.push('### 📝 Generated Video Script');
  report.push('');

  const script = await aiGenerate(
    `Create a complete 60-second YouTube Shorts / TikTok / Reels video script about: "${topic}"
Requirements:
- Opening HOOK (first 3 seconds): must stop the scroll
- 3-4 key points delivered fast
- Call to action at the end (subscribe, follow)
- All in ENGLISH
- Include on-screen text overlay suggestions
JSON: {"title":"...","description":"...","tags":"...","hook":"...","keyPoints":["..."],"callToAction":"...","overlays":["..."]}`
  );

  if (script?.title) {
    report.push(`- **Title**: *"${script.title}"*`);
    report.push(`- **Hook**: *"${script.hook || 'Check this out!'}"*`);
    if (script.keyPoints?.length) {
      report.push('- **Key Points**:');
      script.keyPoints.forEach(p => report.push(`  - ${p}`));
    }
    report.push(`- **CTA**: *"${script.callToAction || 'Follow for more!'}"*`);
    report.push(`- **Tags**: ${safeTags(script.tags) || 'viral, shorts, tech'}`);

    // Try uploading via Composio
    if (COMPOSIO_KEY && !state.viralDates.includes(today)) {
      const ytUpload = await composioAction('YOUTUBE_UPLOAD_SHORT', {
        title: script.title, description: script.description,
        tags: safeTagsArray(script.tags)
      });
      const igUpload = await composioAction('INSTAGRAM_CREATE_REEL', {
        caption: `${script.title}\n\n${script.description}`
      });
      const tkUpload = await composioAction('TIKTOK_UPLOAD_VIDEO', {
        title: script.title, description: script.description
      });

      report.push('');
      report.push('### 📤 Upload Status');
      report.push(`- YouTube Shorts: ${ytUpload.ok ? '✅ Uploaded' : '⏳ ' + (ytUpload.reason || 'Needs video file')}`);
      report.push(`- Instagram Reels: ${igUpload.ok ? '✅ Posted' : '⏳ ' + (igUpload.reason || 'Needs video file')}`);
      report.push(`- TikTok: ${tkUpload.ok ? '✅ Posted' : '⏳ ' + (tkUpload.reason || 'Needs video file')}`);

      // Only mark viral date if at least one upload succeeded
      if (ytUpload.ok || igUpload.ok || tkUpload.ok) {
        state.viralDates.push(today);
        state.stats.totalViral++;
      }
    }
  } else {
    report.push('- ⚠️ Could not generate script (no AI key or all API providers failed).');
    report.push(`- **Manual topic suggestion**: *"${topic}"*`);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Main Execution Loop
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  const startTime = Date.now();
  
  console.log('╔═══════════════════════════════════════════════════════╗');
  console.log('║  SOCIAL MEDIA AGENT — Autonomous Daily Loop v3      ║');
  console.log(`║  ${new Date().toISOString()}                  ║`);
  console.log('╚═══════════════════════════════════════════════════════╝');

  const state = loadState();
  const report = [];

  // Header
  const now = new Date();
  report.push(`# 📊 Daily Social Media Report`);
  report.push(`### ${now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`);
  report.push('');
  report.push('| Service | Status |');
  report.push('|---------|--------|');
  report.push(`| YouTube API | ${YT_API_KEY ? '✅ Connected' : '⚠️ No key'} |`);
  report.push(`| YouTube Channel | ${YT_CHANNEL_ID || '⚠️ Not set'} |`);
  report.push(`| AI Gateway | ${AI_KEY ? '✅ Active' : '⚠️ No key'} |`);
  report.push(`| Composio (IG/TT) | ${COMPOSIO_KEY ? '✅ Connected' : '⚠️ No key'} |`);

  try {
    // ── Fetch all YouTube videos ──
    console.log('\n── Fetching YouTube videos...');
    let videos = await ytApiListVideos(YT_CHANNEL_ID);
    if (!videos) videos = await ytRssFallback(YT_CHANNEL_ID);
    console.log(`   Found ${videos.length} videos.`);

    // ── TASK 1: Fix metadata ──
    console.log('\n── TASK 1: Analyzing metadata...');
    await taskFixMetadata(videos, state, report);

    // ── TASK 2: Cross-post ──
    console.log('\n── TASK 2: Cross-posting...');
    await taskCrossPost(videos, state, report);

    // ── TASK 3: Viral content ──
    console.log('\n── TASK 3: Viral content...');
    await taskViralContent(state, report);

  } catch (err) {
    console.error('Critical error:', err);
    report.push(`\n## ❌ Error\n\`\`\`\n${err.message}\n${err.stack?.split('\n').slice(0, 3).join('\n')}\n\`\`\``);
  }

  // ── Summary ──
  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  report.push('');
  report.push('---');
  report.push('## 📈 Cumulative Statistics');
  report.push('');
  report.push(`| Metric | Value |`);
  report.push(`|--------|-------|`);
  report.push(`| Metadata fixes (total) | ${state.stats.totalFixed} |`);
  report.push(`| Cross-posts (total) | ${state.stats.totalPosted} |`);
  report.push(`| Viral videos (total) | ${state.stats.totalViral} |`);
  report.push(`| Last run | ${now.toISOString()} |`);
  report.push(`| Execution time | ${elapsed}s |`);
  report.push('');
  report.push('---');
  report.push(`*Generated by Social Media Agent v3 • ${now.toISOString()}*`);

  saveState(state);
  fs.writeFileSync(REPORT_FILE, report.join('\n'), 'utf8');
  console.log(`\n✅ Done in ${elapsed}s. Report: ${REPORT_FILE}`);
}

main().catch(err => {
  console.error('Fatal error:', err);
  process.exit(1);
});
