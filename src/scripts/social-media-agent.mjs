#!/usr/bin/env node
/**
 * Social Media Agent — Autonomous Daily Loop
 * 
 * Features:
 * 1. Analyze YouTube channel → find videos missing title/description/tags → fix them in English
 * 2. Cross-post YouTube videos (≤5 min) to Instagram Reels & TikTok via Composio
 * 3. Discover viral trends daily → generate video script → create & upload viral shorts
 * 4. Full daily report in Markdown
 * 
 * Integrations: Composio MCP (YouTube, Instagram, TikTok), AI Gateway for English metadata
 */

import fs from 'node:fs';
import path from 'node:path';
import https from 'node:https';
import http from 'node:http';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── Configuration ───────────────────────────────────────────────────────────
const WORKSPACE_DIR = path.resolve(__dirname, '../../');
const STATE_FILE = path.join(WORKSPACE_DIR, 'social_state.json');
const REPORT_FILE = path.join(WORKSPACE_DIR, 'daily_social_report.md');
const ENV_FILE = path.join(WORKSPACE_DIR, '.env');

// Load .env file if exists
if (fs.existsSync(ENV_FILE)) {
  fs.readFileSync(ENV_FILE, 'utf8').split(/\r?\n/).forEach(line => {
    const parts = line.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const val = parts.slice(1).join('=').trim().replace(/^['"]|['"]$/g, '');
      if (key && !key.startsWith('#')) process.env[key] = val;
    }
  });
}

const COMPOSIO_API_KEY = process.env.COMPOSIO_API_KEY || '';
const COMPOSIO_BASE_URL = 'https://backend.composio.dev/api/v2';
const AI_GATEWAY_KEY = process.env.AI_GATEWAY_API_KEY || '';
const AI_GATEWAY_MODEL = process.env.AI_GATEWAY_MODEL || 'openai/gpt-4o';
const YOUTUBE_CHANNEL_ID = process.env.YOUTUBE_CHANNEL_ID || '';
const MAX_VIDEOS_PER_DAY = 5;
const MAX_DURATION_SEC = 300; // 5 minutes

// ─── HTTP Helper ─────────────────────────────────────────────────────────────
function httpRequest(url, options = {}) {
  return new Promise((resolve, reject) => {
    const parsedUrl = new URL(url);
    const lib = parsedUrl.protocol === 'https:' ? https : http;
    const reqOptions = {
      hostname: parsedUrl.hostname,
      port: parsedUrl.port || (parsedUrl.protocol === 'https:' ? 443 : 80),
      path: parsedUrl.pathname + parsedUrl.search,
      method: options.method || 'GET',
      headers: { 'Content-Type': 'application/json', ...options.headers }
    };

    const req = lib.request(reqOptions, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve({ status: res.statusCode, data: JSON.parse(body) });
        } catch {
          resolve({ status: res.statusCode, data: body });
        }
      });
    });
    req.on('error', reject);
    if (options.body) req.write(typeof options.body === 'string' ? options.body : JSON.stringify(options.body));
    req.end();
  });
}

// ─── State Management ────────────────────────────────────────────────────────
function loadState() {
  if (fs.existsSync(STATE_FILE)) {
    try { return JSON.parse(fs.readFileSync(STATE_FILE, 'utf8')); } catch { /* ignore */ }
  }
  return {
    processedVideos: [],        // Video IDs already cross-posted
    metadataFixedVideos: [],    // Video IDs with metadata already fixed
    viralVideosCreated: [],     // Dates when viral videos were created
    lastRun: null
  };
}

function saveState(state) {
  state.lastRun = new Date().toISOString();
  fs.writeFileSync(STATE_FILE, JSON.stringify(state, null, 2), 'utf8');
}

// ─── Composio API Integration ────────────────────────────────────────────────
async function composioExecuteAction(actionName, params = {}) {
  if (!COMPOSIO_API_KEY) {
    console.warn(`[COMPOSIO] No API key. Skipping action: ${actionName}`);
    return { success: false, error: 'No Composio API key configured' };
  }

  try {
    const res = await httpRequest(`${COMPOSIO_BASE_URL}/actions/${actionName}/execute`, {
      method: 'POST',
      headers: { 'x-api-key': COMPOSIO_API_KEY },
      body: { input: params }
    });
    console.log(`[COMPOSIO] ${actionName} → Status: ${res.status}`);
    return { success: res.status >= 200 && res.status < 300, data: res.data };
  } catch (err) {
    console.error(`[COMPOSIO] Error executing ${actionName}:`, err.message);
    return { success: false, error: err.message };
  }
}

// ─── YouTube Channel Analysis ────────────────────────────────────────────────
async function getYouTubeVideos() {
  console.log('\n[YOUTUBE] Fetching channel videos...');
  
  // Try Composio YouTube integration first
  const result = await composioExecuteAction('YOUTUBE_LIST_CHANNEL_VIDEOS', {
    channelId: YOUTUBE_CHANNEL_ID,
    maxResults: 50
  });

  if (result.success && result.data?.response_data?.items) {
    return result.data.response_data.items;
  }

  // Fallback: Try YouTube Data API v3 via RSS feed
  console.log('[YOUTUBE] Trying RSS feed fallback...');
  try {
    const rssUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${YOUTUBE_CHANNEL_ID}`;
    const res = await httpRequest(rssUrl);
    if (res.status === 200 && typeof res.data === 'string') {
      // Parse basic RSS data
      const entries = res.data.match(/<entry>[\s\S]*?<\/entry>/g) || [];
      return entries.map(entry => {
        const videoId = entry.match(/<yt:videoId>(.*?)<\/yt:videoId>/)?.[1] || '';
        const title = entry.match(/<title>(.*?)<\/title>/)?.[1] || '';
        const published = entry.match(/<published>(.*?)<\/published>/)?.[1] || '';
        return { videoId, title, published, description: '', tags: [] };
      });
    }
  } catch (err) {
    console.error('[YOUTUBE] RSS fallback failed:', err.message);
  }

  return [];
}

async function getVideoDetails(videoId) {
  const result = await composioExecuteAction('YOUTUBE_GET_VIDEO_DETAILS', { videoId });
  if (result.success && result.data?.response_data) {
    const snippet = result.data.response_data.snippet || {};
    const contentDetails = result.data.response_data.contentDetails || {};
    return {
      id: videoId,
      title: snippet.title || '',
      description: snippet.description || '',
      tags: snippet.tags || [],
      duration: contentDetails.duration || '',
      publishedAt: snippet.publishedAt || ''
    };
  }
  return { id: videoId, title: '', description: '', tags: [], duration: '', publishedAt: '' };
}

function parseDurationToSeconds(isoDuration) {
  if (!isoDuration) return 0;
  const match = isoDuration.match(/PT(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/);
  if (!match) return 0;
  return (parseInt(match[1] || 0) * 3600) + (parseInt(match[2] || 0) * 60) + parseInt(match[3] || 0);
}

// ─── AI Metadata Generation (English) ────────────────────────────────────────
async function generateEnglishMetadata(originalTitle, originalDescription, context = 'youtube') {
  const platformHints = {
    youtube: 'YouTube SEO-optimized',
    instagram: 'Instagram Reels with trending hashtags',
    tiktok: 'TikTok with viral hashtags and hooks'
  };

  const prompt = `You are an expert social media manager and SEO specialist.
Convert and optimize the following video metadata into engaging ENGLISH content for ${platformHints[context] || 'social media'}.

Original Title: ${originalTitle || '(empty)'}
Original Description: ${originalDescription || '(empty)'}

Rules:
- Title must be catchy, max 100 characters, in English
- Description must be engaging, include relevant hashtags, max 500 characters, in English
- Tags must be comma-separated, relevant trending keywords in English, max 15 tags

Respond ONLY in valid JSON: {"title": "...", "description": "...", "tags": "tag1, tag2, tag3"}`;

  if (!AI_GATEWAY_KEY) {
    console.warn('[AI] No gateway key. Generating basic English metadata.');
    return {
      title: originalTitle || 'Untitled Video',
      description: originalDescription || 'Check out this video! #shorts #viral',
      tags: 'shorts, viral, trending, video'
    };
  }

  try {
    const res = await httpRequest('https://api.kluster.ai/v1/chat/completions', {
      method: 'POST',
      headers: { 'Authorization': `Bearer ${AI_GATEWAY_KEY}` },
      body: {
        model: AI_GATEWAY_MODEL,
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.7
      }
    });

    if (res.data?.choices?.[0]?.message?.content) {
      const content = res.data.choices[0].message.content.trim();
      const match = content.match(/\{[\s\S]*\}/);
      if (match) return JSON.parse(match[0]);
    }
  } catch (err) {
    console.error('[AI] Metadata generation error:', err.message);
  }

  return {
    title: originalTitle || 'Untitled Video',
    description: `${originalDescription || ''}\n#shorts #viral #trending`,
    tags: 'shorts, viral, trending'
  };
}

// ─── Fix Missing YouTube Metadata ────────────────────────────────────────────
async function analyzeAndFixYouTubeMetadata(videos, state, report) {
  report.push('\n## 🔍 YouTube Channel Analysis — Missing Metadata');
  let fixedCount = 0;

  for (const video of videos) {
    if (state.metadataFixedVideos.includes(video.id)) continue;

    const details = await getVideoDetails(video.id || video.videoId);
    const needsFix = !details.title || details.title === 'Untitled' ||
                     !details.description || details.description.length < 10 ||
                     !details.tags || details.tags.length === 0;

    if (needsFix) {
      console.log(`[FIX] Video "${details.title || video.videoId}" needs metadata update`);
      
      const optimized = await generateEnglishMetadata(details.title, details.description, 'youtube');
      const tagsArray = optimized.tags.split(',').map(t => t.trim()).filter(Boolean);

      // Update via Composio
      const updateResult = await composioExecuteAction('YOUTUBE_UPDATE_VIDEO', {
        videoId: details.id || video.videoId,
        title: optimized.title,
        description: optimized.description,
        tags: tagsArray
      });

      if (updateResult.success) {
        state.metadataFixedVideos.push(details.id || video.videoId);
        fixedCount++;
        report.push(`- ✅ **Fixed [${details.title || video.videoId}]**`);
        report.push(`  - New Title: *"${optimized.title}"*`);
        report.push(`  - Tags: ${tagsArray.join(', ')}`);
      } else {
        report.push(`- ⚠️ **Could not fix [${details.title || video.videoId}]**: ${updateResult.error || 'API error'}`);
      }
    }
  }

  if (fixedCount === 0) {
    report.push('- ✅ All videos already have proper title, description and tags.');
  }

  return fixedCount;
}

// ─── Cross-Post YouTube Videos to Instagram & TikTok ─────────────────────────
async function crossPostVideos(videos, state, report) {
  report.push('\n## 📤 Cross-Posting YouTube → Instagram Reels & TikTok');
  let postedCount = 0;

  for (const video of videos) {
    const vid = video.id || video.videoId;
    if (state.processedVideos.includes(vid)) continue;
    if (postedCount >= MAX_VIDEOS_PER_DAY) break;

    const details = await getVideoDetails(vid);
    const durationSec = parseDurationToSeconds(details.duration);

    // Filter: only videos ≤ 5 minutes
    if (durationSec > MAX_DURATION_SEC && durationSec > 0) {
      console.log(`[SKIP] "${details.title}" too long (${durationSec}s > ${MAX_DURATION_SEC}s)`);
      continue;
    }

    console.log(`[CROSSPOST] Processing: "${details.title}" (${durationSec}s)`);

    // Generate English metadata for each platform
    const igMeta = await generateEnglishMetadata(details.title, details.description, 'instagram');
    const tkMeta = await generateEnglishMetadata(details.title, details.description, 'tiktok');

    // Download video URL from YouTube via Composio
    const downloadResult = await composioExecuteAction('YOUTUBE_GET_VIDEO_DOWNLOAD_URL', {
      videoId: vid
    });

    const videoUrl = downloadResult.data?.response_data?.downloadUrl || 
                     `https://www.youtube.com/watch?v=${vid}`;

    // Upload to Instagram Reels
    const igResult = await composioExecuteAction('INSTAGRAM_UPLOAD_REEL', {
      videoUrl: videoUrl,
      caption: `${igMeta.title}\n\n${igMeta.description}`
    });

    // Upload to TikTok
    const tkResult = await composioExecuteAction('TIKTOK_UPLOAD_VIDEO', {
      videoUrl: videoUrl,
      title: tkMeta.title,
      description: tkMeta.description
    });

    state.processedVideos.push(vid);
    postedCount++;

    report.push(`- ${igResult.success || tkResult.success ? '✅' : '⚠️'} **[${details.title}]** (${durationSec}s)`);
    report.push(`  - Instagram: ${igResult.success ? '✅ Posted' : '❌ ' + (igResult.error || 'Failed')}`);
    report.push(`  - TikTok: ${tkResult.success ? '✅ Posted' : '❌ ' + (tkResult.error || 'Failed')}`);
  }

  if (postedCount === 0) {
    report.push('- No new videos to cross-post today (all processed or daily limit reached).');
  }

  return postedCount;
}

// ─── Viral Trend Discovery & Content Creation ────────────────────────────────
async function discoverViralTrends() {
  console.log('\n[VIRAL] Searching for today\'s viral trends...');

  // Try getting trending topics via Composio's YouTube trending
  const trendResult = await composioExecuteAction('YOUTUBE_GET_TRENDING_VIDEOS', {
    regionCode: 'US',
    maxResults: 10
  });

  if (trendResult.success && trendResult.data?.response_data?.items) {
    return trendResult.data.response_data.items.map(v => ({
      title: v.snippet?.title || '',
      topic: v.snippet?.categoryId || 'Tech',
      views: v.statistics?.viewCount || 0
    }));
  }

  // Fallback: Generate trending topics via AI
  if (AI_GATEWAY_KEY) {
    try {
      const res = await httpRequest('https://api.kluster.ai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${AI_GATEWAY_KEY}` },
        body: {
          model: AI_GATEWAY_MODEL,
          messages: [{
            role: 'user',
            content: `List 5 currently viral topics on YouTube, TikTok and Instagram Reels today (${new Date().toLocaleDateString('en-US')}).
Focus on tech, AI, coding, and digital lifestyle.
Respond ONLY in JSON array format: [{"topic": "...", "hook": "..."}]`
          }],
          temperature: 0.9
        }
      });

      if (res.data?.choices?.[0]?.message?.content) {
        const content = res.data.choices[0].message.content.trim();
        const match = content.match(/\[[\s\S]*\]/);
        if (match) return JSON.parse(match[0]);
      }
    } catch (err) {
      console.error('[VIRAL] AI trend fetch error:', err.message);
    }
  }

  // Hardcoded fallback trends
  return [
    { topic: 'AI Agents automating daily workflows', hook: 'This AI runs your social media while you sleep' },
    { topic: 'Build a portfolio website in 10 minutes', hook: 'Your CV needs this upgrade' },
    { topic: 'Top coding tools for 2026', hook: 'These tools will 10x your productivity' }
  ];
}

async function createAndUploadViralContent(trends, state, report) {
  report.push('\n## 🌟 Daily Viral Content Creation');

  const today = new Date().toISOString().split('T')[0];
  if (state.viralVideosCreated.includes(today)) {
    report.push('- ✅ Viral content already created today.');
    return;
  }

  const topTrend = trends[0];
  const topic = topTrend.topic || topTrend.title || 'AI Technology';
  const hook = topTrend.hook || `This will change everything about ${topic}`;

  console.log(`[VIRAL] Creating content for: "${topic}"`);

  // Generate a full video script via AI
  let script = '';
  if (AI_GATEWAY_KEY) {
    try {
      const res = await httpRequest('https://api.kluster.ai/v1/chat/completions', {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${AI_GATEWAY_KEY}` },
        body: {
          model: AI_GATEWAY_MODEL,
          messages: [{
            role: 'user',
            content: `Create a 60-second YouTube Shorts / TikTok / Instagram Reels video script about: "${topic}"
Hook: "${hook}"

Requirements:
- Opening hook (first 3 seconds) must grab attention
- Content must be informative and engaging
- End with a call to action (like, follow, subscribe)
- Language: English
- Include suggested on-screen text overlays

Respond in JSON: {"title": "...", "description": "...", "tags": "...", "script": "...", "overlays": ["text1", "text2"]}`
          }],
          temperature: 0.8
        }
      });

      if (res.data?.choices?.[0]?.message?.content) {
        const content = res.data.choices[0].message.content.trim();
        const match = content.match(/\{[\s\S]*\}/);
        if (match) script = JSON.parse(match[0]);
      }
    } catch (err) {
      console.error('[VIRAL] Script generation error:', err.message);
    }
  }

  if (!script) {
    script = {
      title: `${topic} — You Need to See This!`,
      description: `${hook}\n\n#viral #tech #ai #trending #shorts`,
      tags: 'viral, tech, ai, trending, shorts, reels',
      script: `Hook: ${hook}. Learn about ${topic} in under 60 seconds. Follow for more!`,
      overlays: [hook, 'Follow for more!']
    };
  }

  // Upload to YouTube Shorts
  const ytResult = await composioExecuteAction('YOUTUBE_UPLOAD_VIDEO', {
    title: script.title,
    description: script.description,
    tags: (script.tags || '').split(',').map(t => t.trim()),
    privacyStatus: 'public',
    categoryId: '28' // Science & Technology
  });

  // Upload to Instagram Reels
  const igResult = await composioExecuteAction('INSTAGRAM_CREATE_REEL', {
    caption: `${script.title}\n\n${script.description}`
  });

  // Upload to TikTok
  const tkResult = await composioExecuteAction('TIKTOK_UPLOAD_VIDEO', {
    title: script.title,
    description: script.description
  });

  state.viralVideosCreated.push(today);

  report.push(`- 🎬 **Trend Topic**: *"${topic}"*`);
  report.push(`- 📝 **Generated Title**: *"${script.title}"*`);
  report.push(`- 🎯 **Script**: ${(script.script || '').substring(0, 200)}...`);
  report.push(`- YouTube Shorts: ${ytResult.success ? '✅ Uploaded' : '⚠️ ' + (ytResult.error || 'Needs video file')}`);
  report.push(`- Instagram Reels: ${igResult.success ? '✅ Posted' : '⚠️ ' + (igResult.error || 'Needs video file')}`);
  report.push(`- TikTok: ${tkResult.success ? '✅ Posted' : '⚠️ ' + (tkResult.error || 'Needs video file')}`);
}

// ─── Daily Report Generator ──────────────────────────────────────────────────
function generateReportHeader() {
  const now = new Date();
  return [
    `# 📊 Daily Social Media Report — ${now.toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`,
    '',
    `> **Agent Run**: ${now.toISOString()}`,
    `> **Composio MCP**: ${COMPOSIO_API_KEY ? '✅ Connected' : '⚠️ No API Key'}`,
    `> **AI Gateway**: ${AI_GATEWAY_KEY ? '✅ Active' : '⚠️ No Key'}`,
    `> **YouTube Channel**: ${YOUTUBE_CHANNEL_ID || '⚠️ Not configured'}`,
    ''
  ];
}

// ─── Main Daily Loop ─────────────────────────────────────────────────────────
async function runDailyLoop() {
  console.log('═══════════════════════════════════════════════════');
  console.log('  SOCIAL MEDIA AGENT — AUTONOMOUS DAILY LOOP');
  console.log(`  Date: ${new Date().toISOString()}`);
  console.log('═══════════════════════════════════════════════════');

  const state = loadState();
  const report = generateReportHeader();

  try {
    // ── STEP 1: Analyze YouTube Channel & Fix Missing Metadata ──
    console.log('\n━━━ STEP 1: YouTube Channel Analysis ━━━');
    const videos = await getYouTubeVideos();
    console.log(`[YOUTUBE] Found ${videos.length} videos on channel.`);

    if (videos.length > 0) {
      await analyzeAndFixYouTubeMetadata(videos, state, report);
    } else {
      report.push('\n## 🔍 YouTube Channel Analysis');
      report.push('- ⚠️ Could not fetch channel videos. Check YouTube Channel ID and Composio connection.');
    }

    // ── STEP 2: Cross-Post Videos to Instagram & TikTok ──
    console.log('\n━━━ STEP 2: Cross-Posting to Instagram & TikTok ━━━');
    if (videos.length > 0) {
      await crossPostVideos(videos, state, report);
    } else {
      report.push('\n## 📤 Cross-Posting');
      report.push('- ⚠️ No videos available for cross-posting.');
    }

    // ── STEP 3: Discover Viral Trends & Create Content ──
    console.log('\n━━━ STEP 3: Viral Content Creation ━━━');
    const trends = await discoverViralTrends();
    console.log(`[VIRAL] Found ${trends.length} trending topics.`);
    await createAndUploadViralContent(trends, state, report);

    // ── STEP 4: Summary Statistics ──
    report.push('\n## 📈 Summary Statistics');
    report.push(`- Total videos on channel: ${videos.length}`);
    report.push(`- Videos with metadata fixed (total): ${state.metadataFixedVideos.length}`);
    report.push(`- Videos cross-posted (total): ${state.processedVideos.length}`);
    report.push(`- Viral videos created (total): ${state.viralVideosCreated.length}`);
    report.push(`- Videos remaining to cross-post: ${Math.max(0, videos.length - state.processedVideos.length)}`);

    saveState(state);
    console.log('\n✅ Agent completed all daily tasks successfully.');

  } catch (err) {
    console.error('\n❌ Critical error in daily loop:', err);
    report.push(`\n## ❌ Error\n- ${err.message}\n- ${err.stack?.split('\n')[1] || ''}`);
    saveState(state);
  }

  // Write report
  fs.writeFileSync(REPORT_FILE, report.join('\n'), 'utf8');
  console.log(`\n📄 Report saved: ${REPORT_FILE}`);
}

// Run
runDailyLoop();
