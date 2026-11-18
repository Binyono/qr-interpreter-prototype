/* =========================================================
   QR Live Interpreter — プロトタイプ
   受信機不要のリアルタイムAI同時通訳
   Guide（配信）と Participant（受信）を1枚の静的ページで動かす。
   バックエンドなし / PeerJS(WebRTC) P2P / 翻訳はブラウザから直接APIへ
   ========================================================= */
(() => {
  'use strict';

  /* ---------------------------------------------------------
     0. 基本定義
  --------------------------------------------------------- */
  const LS_KEY = 'qri.settings.v1';

  const LANGS = [
    { code:'en',    bcp47:'en-US', flag:'🇺🇸', ja:'英語',            native:'English' },
    { code:'zh-CN', bcp47:'zh-CN', flag:'🇨🇳', ja:'中国語（簡体）',  native:'简体中文' },
    { code:'zh-TW', bcp47:'zh-TW', flag:'🇹🇼', ja:'中国語（繁体）',  native:'繁體中文' },
    { code:'ko',    bcp47:'ko-KR', flag:'🇰🇷', ja:'韓国語',          native:'한국어' },
    { code:'es',    bcp47:'es-ES', flag:'🇪🇸', ja:'スペイン語',      native:'Español' },
    { code:'fr',    bcp47:'fr-FR', flag:'🇫🇷', ja:'フランス語',      native:'Français' },
    { code:'de',    bcp47:'de-DE', flag:'🇩🇪', ja:'ドイツ語',        native:'Deutsch' },
    { code:'pt',    bcp47:'pt-BR', flag:'🇧🇷', ja:'ポルトガル語',    native:'Português' },
    { code:'it',    bcp47:'it-IT', flag:'🇮🇹', ja:'イタリア語',      native:'Italiano' },
    { code:'th',    bcp47:'th-TH', flag:'🇹🇭', ja:'タイ語',          native:'ไทย' },
    { code:'vi',    bcp47:'vi-VN', flag:'🇻🇳', ja:'ベトナム語',      native:'Tiếng Việt' },
    { code:'id',    bcp47:'id-ID', flag:'🇮🇩', ja:'インドネシア語',  native:'Bahasa Indonesia' }
  ];
  const LANG_MAP = Object.fromEntries(LANGS.map(l => [l.code, l]));

  const DEFAULTS = {
    // guide
    engine: 'trial',                    // trial | openai | gemini
    openaiKey: '',
    openaiModel: 'gpt-6-luna',
    geminiKey: '',
    geminiModel: 'gemini-3.5-flash-lite',
    asr: 'webspeech',                   // webspeech | transcribe
    transcribeModel: 'gpt-transcribe',
    chunkSec: 6,
    glossary: [],                       // [{ja, tr}]
    previewLangs: ['en', 'zh-CN', 'ko'],
    peerHost: '',
    peerPort: '',
    peerPath: '',
    iceExtra: '',
    // participant
    myLang: '',
    pDisplay: 'both',                   // both | translation | original
    pFont: 1,
    pTts: true
  };

  const $  = (sel, root = document) => root.querySelector(sel);
  const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));
  const esc = (s) => String(s == null ? '' : s).replace(/[&<>"']/g, c => (
    { '&':'&amp;', '<':'&lt;', '>':'&gt;', '"':'&quot;', "'":'&#39;' }[c]
  ));
  const clamp = (n, lo, hi) => Math.min(hi, Math.max(lo, Number(n)));
  const timeLabel = (ts) => {
    const d = new Date(ts || Date.now());
    return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  };

  // 開発時の確認用（画面には出さない）
  window.__qriErrors = [];
  window.addEventListener('error', (e) => window.__qriErrors.push(String(e.message || e)));
  window.addEventListener('unhandledrejection', (e) => {
    window.__qriErrors.push('rejection: ' + String((e.reason && e.reason.message) || e.reason));
  });

  /* ---------------------------------------------------------
     1. 設定の保存と読み込み
  --------------------------------------------------------- */
  let S = loadSettings();

  function loadSettings() {
    try {
      const raw = JSON.parse(localStorage.getItem(LS_KEY) || '{}');
      const merged = Object.assign({}, DEFAULTS, raw || {});
      if (!Array.isArray(merged.glossary)) merged.glossary = [];
      if (!Array.isArray(merged.previewLangs) || !merged.previewLangs.length) {
        merged.previewLangs = DEFAULTS.previewLangs.slice();
      }
      return merged;
    } catch (e) {
      return Object.assign({}, DEFAULTS, { previewLangs: DEFAULTS.previewLangs.slice() });
    }
  }

  function saveSettings() {
    try { localStorage.setItem(LS_KEY, JSON.stringify(S)); } catch (e) { /* 容量不足などは無視 */ }
    updateEnginePill();
    updateAsrLabel();
  }

  /* ---------------------------------------------------------
     2. アプリ全体の状態
  --------------------------------------------------------- */
  const A = {
    role: 'guide',
    room: null,
    // guide
    peer: null,
    conns: new Map(),     // key -> {id, conn, lang, joined}
    connSeq: 0,
    seq: 0,
    history: [],
    lastSent: '',
    lastSentAt: 0,
    listening: false,
    rec: null,
    micStream: null,
    transcribeOn: false,
    finalBuf: '',
    finalTimer: null,
    lastEngineErrorAt: 0
  };

  const P = {
    peer: null,
    peerTrying: false,
    conn: null,
    retry: 0,
    retryTimer: null,
    joined: false,
    seen: new Set(),
    lastCaptionAt: 0
  };

  const VOICE = { unlocked: false, speaking: false, queue: [], voices: [] };

  /* ---------------------------------------------------------
     3. 起動
  --------------------------------------------------------- */
  document.addEventListener('DOMContentLoaded', boot);

  let booted = false;
  function boot() {
    if (booted) return;   // 二重起動よけ（スクリプトが二度読み込まれた場合）
    booted = true;
    buildLangGrid('#langGrid', pickMyLang);
    buildLangGrid('#pLangGrid', pickMyLang);
    bindUI();
    updateEnginePill();
    updateAsrLabel();
    applyParticipantLook();

    if ('speechSynthesis' in window) {
      refreshVoices();
      window.speechSynthesis.onvoiceschanged = refreshVoices;
    }

    const params = new URLSearchParams(location.search);
    const room = (params.get('room') || '').toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 8);
    if (room) {
      startParticipant(room, params.get('lang') || '');
    } else {
      startGuide();
    }
  }

  /* ---------------------------------------------------------
     4. 外部ライブラリ（vendor が無い場合はCDNから取得）
  --------------------------------------------------------- */
  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src;
      s.onload = () => resolve();
      s.onerror = () => reject(new Error('load failed: ' + src));
      document.head.appendChild(s);
    });
  }

  let libsPromise = null;
  function ensureLibs() {
    if (libsPromise) return libsPromise;
    libsPromise = (async () => {
      if (typeof window.Peer === 'undefined') {
        try { await loadScript('https://cdn.jsdelivr.net/npm/peerjs@1.5.4/dist/peerjs.min.js'); }
        catch (e) { console.warn('[libs] peerjs CDN 失敗', e); }
      }
      if (typeof window.qrcode === 'undefined') {
        try { await loadScript('https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js'); }
        catch (e) { console.warn('[libs] qrcode CDN 失敗', e); }
      }
    })();
    return libsPromise;
  }

  /* ---------------------------------------------------------
     5. 共通：PeerJS 設定
  --------------------------------------------------------- */
  function peerIdFor(room) {
    return 'qri-' + String(room).toLowerCase();
  }

  function randomRoom() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let out = '';
    const buf = new Uint32Array(6);
    if (window.crypto && crypto.getRandomValues) crypto.getRandomValues(buf);
    else for (let i = 0; i < 6; i++) buf[i] = Math.floor(Math.random() * 1e9);
    for (let i = 0; i < 6; i++) out += chars[buf[i] % chars.length];
    return out;
  }

  function iceServers() {
    const base = [
      { urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] },
      // 無料の公開TURN（ベストエフォート）。本番イベントでは自前のTURNを推奨。
      { urls: 'turn:openrelay.metered.ca:80', username: 'openrelayproject', credential: 'openrelayproject' },
      { urls: 'turn:openrelay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' },
      { urls: 'turn:openrelay.metered.ca:443?transport=tcp', username: 'openrelayproject', credential: 'openrelayproject' }
    ];
    const extra = String(S.iceExtra || '').trim();
    if (extra) {
      try {
        const parsed = JSON.parse(extra);
        if (Array.isArray(parsed)) return base.concat(parsed);
      } catch (e) { console.warn('[ice] JSONを解釈できません', e); }
    }
    return base;
  }

  function peerOptions() {
    const opts = { debug: 0, config: { iceServers: iceServers() } };
    const host = String(S.peerHost || '').trim();
    if (host) {
      opts.host = host;
      opts.port = Number(S.peerPort) || 443;
      opts.path = String(S.peerPath || '/').trim() || '/';
      opts.secure = true;
    }
    return opts;
  }

  function joinUrl(room) {
    const r = room || A.room;
    if (location.protocol === 'file:') return 'file://' + location.pathname + '?room=' + r;
    return location.origin + location.pathname + '?room=' + r;
  }

  /* ---------------------------------------------------------
     6. ガイド（配信）モード
  --------------------------------------------------------- */
  function startGuide() {
    A.role = 'guide';
    A.room = randomRoom();
    $('#viewGuide').classList.remove('hidden');
    $('#viewParticipant').classList.add('hidden');
    $('#roomCode').textContent = A.room;
    $('#linkParticipant').href = joinUrl();
    document.title = 'QR同時通訳 | ROOM ' + A.room;
    setGuideStatus('', '未開始');
    renderParticipants();
  }

  function setGuideStatus(kind, text) {
    const dot = $('#statusDot');
    dot.className = 'dot' + (kind ? ' ' + kind : '');
    $('#statusText').textContent = text;
  }

  async function onStartHosting() {
    if (A.peer) return;
    const btn = $('#btnStart');
    btn.disabled = true;
    btn.textContent = '接続しています…';
    setGuideStatus('wait', 'サーバーに接続中…');

    await ensureLibs();
    if (typeof window.Peer === 'undefined') {
      btn.disabled = false;
      btn.textContent = '配信を開始（QRを表示）';
      setGuideStatus('err', '接続できません');
      toast('通信ライブラリを読み込めませんでした。ネットワークを確認してください');
      return;
    }

    try {
      await createHostPeer();
    } catch (err) {
      console.warn('[host] 接続失敗', err);
      btn.disabled = false;
      btn.textContent = '配信を開始（QRを表示）';
      setGuideStatus('err', '接続できません');
      toast('PeerJSサーバーに接続できませんでした。時間をおいて、もう一度お試しください');
      return;
    }

    drawQR();
    $('#qrPlaceholder').classList.add('hidden');
    $('#qrBox').classList.remove('hidden');
    $('#qrHint').classList.remove('hidden');
    $('#joinRow').classList.remove('hidden');
    $('#joinUrl').value = joinUrl();
    btn.classList.add('hidden');
    setGuideStatus('wait', '参加者を待っています');
    $('#linkParticipant').href = joinUrl();
  }

  async function createHostPeer() {
    for (let attempt = 0; attempt < 3; attempt++) {
      try {
        A.peer = await newPeer(peerIdFor(A.room));
        break;
      } catch (err) {
        if (err && err.type === 'unavailable-id') {
          // 同じ部屋コードが先に使われていた → コードを引き直す
          A.room = randomRoom();
          $('#roomCode').textContent = A.room;
          continue;
        }
        throw err;
      }
    }
    if (!A.peer) throw new Error('peer-unavailable-id');
    bindHostPeer(A.peer);
  }

  function newPeer(id) {
    return new Promise((resolve, reject) => {
      let settled = false;
      const peer = new Peer(id, peerOptions());
      peer.on('open', () => { settled = true; resolve(peer); });
      peer.on('error', (err) => {
        if (!settled) {
          settled = true;
          try { peer.destroy(); } catch (e) {}
          reject(err);
        }
      });
    });
  }

  function bindHostPeer(peer) {
    peer.on('connection', (conn) => {
      const key = conn.peer + '#' + (++A.connSeq);
      const rec = { id: A.connSeq, key, conn, lang: null, joined: Date.now() };
      A.conns.set(key, rec);

      conn.on('open', () => {
        // hello を待つが、先に init を送っておく
        sendTo(rec, { t: 'init', room: A.room, ts: Date.now() });
      });
      conn.on('data', (data) => onGuestData(rec, data));
      conn.on('close', () => {
        A.conns.delete(key);
        renderParticipants();
        if (A.conns.size === 0 && A.peer) setGuideStatus('wait', '参加者を待っています');
      });
      conn.on('error', (e) => console.warn('[conn]', e && e.type));

      renderParticipants();
      setGuideStatus('live', '配信中');
    });

    peer.on('disconnected', () => {
      setGuideStatus('wait', '再接続しています…');
      try { peer.reconnect(); } catch (e) {}
    });

    peer.on('error', (err) => {
      const type = err && err.type;
      if (type === 'peer-unavailable') return;
      if (type === 'network' || type === 'server-error' || type === 'socket-error') {
        setGuideStatus('wait', '通信エラー（自動再接続）');
        try { peer.reconnect(); } catch (e) {}
      }
      console.warn('[peer]', type, err && err.message);
    });
  }

  function onGuestData(rec, msg) {
    if (!msg || typeof msg !== 'object') return;
    switch (msg.t) {
      case 'hello':
        rec.lang = normalizeLang(msg.lang);
        renderParticipants();
        sendHistory(rec);
        // その言語の訳がまだ無い過去字幕があれば、直近分だけ訳して送る
        if (A.history.length && !A.history[A.history.length - 1].tr[rec.lang]) refreshRecent(rec.lang, rec);
        break;
      case 'lang':
        rec.lang = normalizeLang(msg.lang);
        renderParticipants();
        if (msg.refresh) refreshRecent(rec.lang, rec);
        break;
      case 'ping':
        sendTo(rec, { t: 'pong', ts: Date.now() });
        break;
    }
  }

  function normalizeLang(code) {
    return LANG_MAP[code] ? code : 'en';
  }

  function sendTo(rec, obj) {
    try {
      if (rec.conn && rec.conn.open) rec.conn.send(obj);
    } catch (e) { console.warn('[send]', e && e.message); }
  }

  function broadcast(obj) {
    for (const rec of A.conns.values()) sendTo(rec, obj);
  }

  function sendHistory(rec) {
    const items = A.history.slice(-12).map(item => ({
      id: item.id,
      ja: item.ja,
      ts: item.ts,
      tr: rec.lang && item.tr[rec.lang] ? { [rec.lang]: item.tr[rec.lang] } : {}
    }));
    if (items.length) sendTo(rec, { t: 'history', items });
  }

  function renderParticipants() {
    const list = Array.from(A.conns.values());
    $('#peerCount').textContent = String(list.length);

    const counts = new Map();
    list.forEach(r => {
      const k = r.lang || '?';
      counts.set(k, (counts.get(k) || 0) + 1);
    });

    const box = $('#participants');
    if (!list.length) { box.innerHTML = ''; return; }
    box.innerHTML = Array.from(counts.entries()).map(([code, n]) => {
      const L = LANG_MAP[code];
      return '<span class="pchip">' + (L ? L.flag : '❔') + ' ' + (L ? esc(L.ja) : '言語未選択') + ' <b>' + n + '</b></span>';
    }).join('');
  }

  /* ---------------- QRコード ---------------- */
  function drawQR() {
    const box = $('#qrBox');
    if (location.protocol === 'file:') {
      box.innerHTML = '<p class="qr-warn">HTTPSで公開するとQRが使えます<br>（Netlify Drop などにフォルダをアップ）</p>';
      return;
    }
    const url = joinUrl();
    try {
      if (typeof window.qrcode === 'undefined') throw new Error('qrcode 未読込');
      const qr = window.qrcode(0, 'M');
      qr.addData(url);
      qr.make();
      box.innerHTML = qr.createSvgTag({ cellSize: 8, margin: 12, scalable: true, alt: '参加用QRコード' });
    } catch (e) {
      console.warn('[qr] 生成失敗', e);
      box.innerHTML = '<p class="qr-warn">QRを生成できませんでした<br>' + esc(url) + '</p>';
    }
  }

  /* ---------------- 字幕の配信 ---------------- */
  async function publishCaption(rawJa) {
    const ja = String(rawJa || '').trim();
    if (!ja) return;
    const t = Date.now();
    if (ja === A.lastSent && t - A.lastSentAt < 1200) return;   // 二重送信よけ
    A.lastSent = ja;
    A.lastSentAt = t;

    const item = { id: 'c' + (++A.seq), ja, tr: {}, ts: t };
    A.history.push(item);
    if (A.history.length > 60) A.history.shift();

    addGuideEntry(item);
    broadcast({ t: 'cap', id: item.id, ja: item.ja, ts: item.ts });

    const langs = targetLangs();
    await Promise.all(langs.map(async (lang) => {
      const res = await translateOne(ja, lang);
      item.tr[lang] = res;
      syncGuideEntry(item);
      broadcast({ t: 'tr', id: item.id, tr: { [lang]: res } });
    }));
  }

  function targetLangs() {
    const set = new Set();
    for (const rec of A.conns.values()) if (rec.lang) set.add(rec.lang);
    if (!set.size) (S.previewLangs || []).forEach(l => { if (LANG_MAP[l]) set.add(l); });
    return Array.from(set);
  }

  function addGuideEntry(item) {
    const log = $('#guideLog');
    const empty = log.querySelector('.empty');
    if (empty) empty.remove();

    const el = document.createElement('article');
    el.className = 'g-entry';
    el.dataset.id = item.id;
    el.innerHTML =
      '<div class="g-head"><span class="g-time">' + timeLabel(item.ts) + '</span>' +
      '<span>日本語 →</span></div>' +
      '<p class="g-ja">' + esc(item.ja) + '</p>' +
      '<div class="g-tr" data-tr></div>';
    log.prepend(el);
    syncGuideEntry(item);

    const count = A.history.length;
    $('#liveCount').textContent = count + '件';
    while (log.children.length > 60) log.removeChild(log.lastElementChild);
  }

  function syncGuideEntry(item) {
    const el = document.querySelector('.g-entry[data-id="' + item.id + '"]');
    if (!el) return;
    const box = el.querySelector('[data-tr]');
    if (!box) return;

    const langs = Array.from(new Set([...Object.keys(item.tr), ...targetLangs()]));
    box.innerHTML = langs.map(code => {
      const L = LANG_MAP[code];
      if (!L) return '';
      const r = item.tr[code];
      const cls = r ? (r.degraded ? 'g-text degraded' : 'g-text') : 'g-text pending';
      const text = r ? esc(r.text) : '翻訳中…';
      const tag = r && r.degraded ? '<span class="tag">簡易</span>' : '';
      return '<div class="g-row"><span class="g-flag">' + L.flag + '</span>' +
             '<span class="g-lang">' + esc(L.ja) + '</span>' +
             '<span class="' + cls + '">' + text + tag + '</span></div>';
    }).join('');
  }

  // 言語を変えた参加者に、直近の数件をその言語で送り直す
  async function refreshRecent(lang, targetRec) {
    const recent = A.history.slice(-3);
    for (const item of recent) {
      if (!item.tr[lang]) {
        const res = await translateOne(item.ja, lang);
        item.tr[lang] = res;
        syncGuideEntry(item);
      }
      const rec = targetRec || Array.from(A.conns.values()).find(r => r.lang === lang);
      if (rec) sendTo(rec, { t: 'history', items: [{ id: item.id, ja: item.ja, ts: item.ts, tr: { [lang]: item.tr[lang] } }] });
    }
  }

  /* ---------------------------------------------------------
     7. 翻訳エンジン
  --------------------------------------------------------- */
  function buildSystemPrompt(langCode) {
    const L = LANG_MAP[langCode] || LANG_MAP.en;
    const gl = (S.glossary || []).filter(g => g && g.ja && g.tr);
    const glLine = gl.length ? gl.map(g => g.ja + ' → ' + g.tr).join(' / ') : '（登録なし）';
    return [
      'あなたは国際会議の同時通訳者です。日本語の話し言葉を ' + L.native + '（' + L.ja + '）に訳してください。',
      '出力は訳文だけ。前置き・解説・括弧書き・原文の繰り返し・ローマ字読みは書かない。',
      '聞き手がその場で理解できる、自然で簡潔な話し言葉にする。',
      '「えー」「あの」「その」などのフィラーは取り除き、言いよどみは整える。',
      '原文にない情報を足さない。数字・人名・社名・日時は正確に。',
      '固有名詞・専門用語の訳語（必ず従う）: ' + glLine
    ].join('\n');
  }

  function buildUserContent(text) {
    const recent = A.history.slice(-4, -1).map(h => '・' + h.ja).join('\n');
    return (recent ? '【直前の文脈（参考。訳さない）】\n' + recent + '\n\n' : '') + '【訳す文】\n' + text;
  }

  function cleanTr(text) {
    let out = String(text || '').trim();
    out = out.replace(/^「([\s\S]*)」$/m, '$1').replace(/^"([\s\S]*)"$/m, '$1');
    return out.trim();
  }

  async function translateOne(ja, lang) {
    const useOpenAI = S.engine === 'openai' && String(S.openaiKey || '').trim();
    const useGemini = S.engine === 'gemini' && String(S.geminiKey || '').trim();

    if (useOpenAI) {
      try { return await openaiTranslate(ja, lang); }
      catch (e) { noteEngineError('OpenAI', e); }
    } else if (useGemini) {
      try { return await geminiTranslate(ja, lang); }
      catch (e) { noteEngineError('Gemini', e); }
    }
    return await trialTranslate(ja, lang);
  }

  function noteEngineError(name, err) {
    console.warn('[' + name + ']', err && err.message);
    const now = Date.now();
    if (now - A.lastEngineErrorAt < 20000) return;
    A.lastEngineErrorAt = now;
    toast(name + 'の翻訳に失敗しました（' + ((err && err.message) || 'エラー') + '）。簡易翻訳で続けます');
  }

  async function mymemoryTranslate(text, lang) {
    const url = 'https://api.mymemory.translated.net/get?q=' + encodeURIComponent(text) +
                '&langpair=' + encodeURIComponent('ja|' + lang);
    const r = await fetch(url, { cache: 'no-store' });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const d = await r.json();
    const t = d && d.responseData && d.responseData.translatedText;
    if (!t || /MYMEMORY WARNING/i.test(t) || String(d.responseStatus) !== '200') throw new Error('no result');
    return cleanTr(t);
  }

  async function googleTrialTranslate(text, lang) {
    const url = 'https://translate.googleapis.com/translate_a/single?client=gtx&sl=ja&tl=' +
                encodeURIComponent(lang) + '&dt=t&q=' + encodeURIComponent(text);
    const r = await fetch(url, { cache: 'no-store' });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    const d = await r.json();
    const out = (d && d[0] ? d[0] : []).map(seg => (seg && seg[0]) || '').join('').trim();
    if (!out) throw new Error('no result');
    return out;
  }

  async function trialTranslate(text, lang) {
    // 1) MyMemory（CORS可・APIキー不要）
    try {
      const t = await mymemoryTranslate(text, lang);
      return { text: t, engine: 'trial', engineName: 'お試し翻訳' };
    } catch (e) { /* 次へ */ }
    // 2) Google の公開エンドポイント（非公式）
    try {
      const t = await googleTrialTranslate(text, lang);
      return { text: t, engine: 'trial', engineName: 'お試し翻訳' };
    } catch (e) { /* 次へ */ }
    // 3) オフライン：用語集の置換だけ行い、明示する
    let out = text;
    for (const g of (S.glossary || [])) {
      if (g && g.ja && g.tr) out = out.split(g.ja).join(g.tr);
    }
    return { text: '（翻訳エンジンに接続できません）' + out, engine: 'offline', engineName: 'オフライン', degraded: true };
  }

  async function httpErrorText(r) {
    let msg = 'HTTP ' + r.status;
    try {
      const d = await r.json();
      msg = (d && d.error && d.error.message) || (d && d.message) || msg;
    } catch (e) {}
    return msg;
  }

  async function openaiTranslate(text, lang) {
    const body = {
      model: String(S.openaiModel || 'gpt-6-luna').trim(),
      messages: [
        { role: 'system', content: buildSystemPrompt(lang) },
        { role: 'user', content: buildUserContent(text) }
      ]
    };
    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + String(S.openaiKey).trim()
      },
      body: JSON.stringify(body)
    });
    if (!r.ok) throw new Error(await httpErrorText(r));
    const d = await r.json();
    const out = cleanTr(d && d.choices && d.choices[0] && d.choices[0].message && d.choices[0].message.content);
    if (!out) throw new Error('空の応答');
    return { text: out, engine: 'openai', engineName: 'OpenAI' };
  }

  async function geminiTranslate(text, lang) {
    const model = String(S.geminiModel || 'gemini-3.5-flash-lite').trim();
    const url = 'https://generativelanguage.googleapis.com/v1beta/models/' +
                encodeURIComponent(model) + ':generateContent?key=' + encodeURIComponent(String(S.geminiKey).trim());
    const body = {
      systemInstruction: { parts: [{ text: buildSystemPrompt(lang) }] },
      contents: [{ role: 'user', parts: [{ text: buildUserContent(text) }] }]
    };
    const r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body)
    });
    if (!r.ok) throw new Error(await httpErrorText(r));
    const d = await r.json();
    const parts = (d && d.candidates && d.candidates[0] && d.candidates[0].content && d.candidates[0].content.parts) || [];
    const out = cleanTr(parts.map(p => p.text || '').join(''));
    if (!out) throw new Error('空の応答');
    return { text: out, engine: 'gemini', engineName: 'Gemini' };
  }

  /* ---------------------------------------------------------
     8. 音声認識（ガイド）
  --------------------------------------------------------- */
  function pickMime() {
    if (typeof MediaRecorder === 'undefined') return '';
    const cands = ['audio/webm;codecs=opus', 'audio/webm', 'audio/mp4', 'audio/ogg;codecs=opus'];
    for (const m of cands) {
      try { if (MediaRecorder.isTypeSupported(m)) return m; } catch (e) {}
    }
    return '';
  }

  async function toggleMic() {
    if (S.asr === 'transcribe') {
      if (A.transcribeOn) stopTranscribe();
      else await startTranscribe();
      return;
    }
    if (A.listening) stopWebSpeech();
    else startWebSpeech();
  }

  function setMicUI(on) {
    $('#btnMic').classList.toggle('live', on);
    if (on) {
      $('#micState').textContent = S.asr === 'transcribe'
        ? '録音中（' + (Number(S.chunkSec) || 6) + '秒ごとに送信）'
        : '聞き取り中…';
    } else {
      $('#micState').textContent = 'マイク停止中';
      $('#interim').textContent = '';
    }
  }

  function noteMic(msg) {
    $('#micNote').textContent = msg || '';
  }

  function startWebSpeech() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      noteMic('このブラウザは Web Speech API に未対応です。「高精度API（Whisper系）」か、Android の Chrome をお使いください。');
      toast('音声認識が使えないブラウザです。設定でWhisper系に切り替えるか、下の入力欄でテストできます');
      return;
    }
    let fatal = false;

    const rec = new SR();
    rec.lang = 'ja-JP';
    rec.continuous = true;
    rec.interimResults = true;
    rec.maxAlternatives = 1;

    rec.onstart = () => {
      A.listening = true;
      setMicUI(true);
      noteMic('');
    };

    rec.onresult = (ev) => {
      let interim = '';
      for (let i = ev.resultIndex; i < ev.results.length; i++) {
        const res = ev.results[i];
        const txt = (res[0] && res[0].transcript || '').trim();
        if (res.isFinal) queueFinal(txt);
        else interim += txt;
      }
      $('#interim').textContent = interim ? '「' + interim + '」' : '';
    };

    rec.onerror = (ev) => {
      const err = ev && ev.error;
      if (err === 'not-allowed' || err === 'service-not-allowed') {
        fatal = true;
        A.listening = false;
        setMicUI(false);
        noteMic('マイクの使用が許可されていません。ブラウザのアドレスバー横の設定からマイクを許可してください（HTTPSのページが必要です）。');
      } else if (err === 'no-speech') {
        // 無音。自動再開に任せる
      } else if (err === 'network') {
        noteMic('音声認識サーバーに接続できませんでした。通信環境を確認するか、Whisper系モードをお試しください。');
      } else if (err === 'aborted') {
        // stop() による終了
      } else {
        noteMic('音声認識エラー: ' + err);
      }
    };

    rec.onend = () => {
      if (A.listening && !fatal) {
        setTimeout(() => { try { rec.start(); } catch (e) {} }, 320);
      } else {
        A.listening = false;
        setMicUI(false);
      }
    };

    A.rec = rec;
    try { rec.start(); } catch (e) { noteMic('音声認識を開始できませんでした'); }
  }

  function stopWebSpeech() {
    A.listening = false;
    try { if (A.rec) A.rec.stop(); } catch (e) {}
    A.rec = null;
    flushFinal();
    setMicUI(false);
  }

  // 短い確定結果を少しだけまとめて、文の切れ目で送る（区切り最適化）
  function queueFinal(text) {
    const t = String(text || '').trim();
    if (!t) return;
    A.finalBuf = (A.finalBuf ? A.finalBuf + ' ' : '') + t;
    clearTimeout(A.finalTimer);
    const endsSentence = /[。．.！？!?…]$/.test(t);
    if (endsSentence || A.finalBuf.length >= 70) flushFinal();
    else A.finalTimer = setTimeout(flushFinal, 650);
  }

  function flushFinal() {
    clearTimeout(A.finalTimer);
    const t = A.finalBuf.trim();
    A.finalBuf = '';
    $('#interim').textContent = '';
    if (t) publishCaption(t);
  }

  /* ---------------- 高精度API（録音して送る） ---------------- */
  async function startTranscribe() {
    if (!String(S.openaiKey || '').trim()) {
      toast('高精度の音声認識には OpenAI APIキーが必要です（⚙️設定）');
      return;
    }
    try {
      A.micStream = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true }
      });
    } catch (e) {
      noteMic('マイクを使えませんでした（' + (e && e.name) + '）。HTTPSのページか、マイクの許可を確認してください。');
      return;
    }
    A.transcribeOn = true;
    setMicUI(true);
    noteMic('');
    transcribeLoop();
  }

  function stopTranscribe() {
    A.transcribeOn = false;
    setMicUI(false);
    if (A.micStream) {
      A.micStream.getTracks().forEach(t => { try { t.stop(); } catch (e) {} });
      A.micStream = null;
    }
  }

  async function transcribeLoop() {
    const stream = A.micStream;
    while (A.transcribeOn && stream) {
      const ms = clamp(Number(S.chunkSec) || 6, 3, 15) * 1000;
      let blob = null;
      try { blob = await recordChunk(stream, ms); }
      catch (e) { noteMic('録音に失敗しました'); break; }
      if (!A.transcribeOn) break;
      if (!blob || blob.size < 4000) continue;
      try {
        const text = await transcribeBlob(blob);
        if (text) publishCaption(text);
      } catch (e) {
        console.warn('[transcribe]', e);
        noteMic('音声認識APIでエラー: ' + ((e && e.message) || e));
      }
    }
  }

  function recordChunk(stream, ms) {
    return new Promise((resolve, reject) => {
      const mime = pickMime();
      let rec;
      try {
        rec = mime ? new MediaRecorder(stream, { mimeType: mime, audioBitsPerSecond: 64000 })
                   : new MediaRecorder(stream);
      } catch (e) { reject(e); return; }
      const chunks = [];
      rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
      rec.onstop = () => {
        const type = (mime || 'audio/webm').split(';')[0];
        resolve(new Blob(chunks, { type }));
      };
      rec.onerror = (e) => reject(e);
      try { rec.start(); } catch (e) { reject(e); return; }
      setTimeout(() => { try { rec.stop(); } catch (e) {} }, ms);
    });
  }

  async function transcribeBlob(blob) {
    const fd = new FormData();
    const type = blob.type || 'audio/webm';
    const ext = type.includes('mp4') ? 'mp4' : type.includes('ogg') ? 'ogg' : 'webm';
    fd.append('file', blob, 'chunk.' + ext);
    fd.append('model', String(S.transcribeModel || 'gpt-transcribe').trim());
    fd.append('language', 'ja');
    const terms = (S.glossary || []).filter(g => g && g.ja).map(g => g.ja).join('、');
    if (terms) fd.append('prompt', terms);

    const r = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: { 'Authorization': 'Bearer ' + String(S.openaiKey).trim() },
      body: fd
    });
    if (!r.ok) throw new Error(await httpErrorText(r));
    const d = await r.json();
    return String((d && (d.text || d.transcript)) || '').trim();
  }

  /* ---------------------------------------------------------
     9. 参加者（受信）モード
  --------------------------------------------------------- */
  function startParticipant(room, langParam) {
    A.role = 'participant';
    A.room = room;
    $('#viewGuide').classList.add('hidden');
    $('#viewParticipant').classList.remove('hidden');
    $('#pRoom').textContent = room;
    document.title = 'ROOM ' + room + ' | QR同時通訳';
    setPStatus('', '接続中…');
    highlightLang();

    if (langParam && LANG_MAP[langParam]) {
      S.myLang = langParam;
      saveSettings();
      enterStage();
    }

    ensureLibs().then(connectParticipant);
  }

  function setPStatus(kind, text) {
    const dot = $('#pDot');
    dot.className = 'dot' + (kind ? ' ' + kind : '');
    $('#pStatus').textContent = text;
  }

  function connectParticipant() {
    if (typeof window.Peer === 'undefined') {
      setPStatus('err', '通信ライブラリの読込失敗');
      setTimeout(connectParticipant, 1500);
      return;
    }
    if (!P.peer) {
      try {
        P.peer = new window.Peer(peerOptions());
      } catch (e) {
        setPStatus('err', '接続できません');
        return;
      }
      P.peer.on('open', () => { openConn(); });
      P.peer.on('error', (err) => {
        const type = err && err.type;
        if (type === 'peer-unavailable') {
          setPStatus('wait', 'ガイドの開始待ち');
          $('#pWaiting').classList.remove('hidden');
          $('#pWaitingText').textContent = 'ガイドの配信開始を待っています…';
          scheduleRetry();
        } else if (type === 'network' || type === 'server-error' || type === 'socket-error') {
          setPStatus('wait', '通信エラー。再接続中…');
          try { P.peer.reconnect(); } catch (e) {}
        } else if (type === 'unavailable-id') {
          try { P.peer.destroy(); } catch (e) {}
          P.peer = null;
          setTimeout(connectParticipant, 600);
        } else {
          console.warn('[peer]', type, err && err.message);
        }
      });
      P.peer.on('disconnected', () => {
        setPStatus('wait', '切断。再接続中…');
        try { P.peer.reconnect(); } catch (e) {}
      });
    } else if (P.peer.open) {
      openConn();
    }
  }

  function openConn() {
    if (!P.peer || !P.peer.open) return;
    if (P.conn && P.conn.open) return;
    let conn;
    try {
      conn = P.peer.connect(peerIdFor(A.room), { reliable: true, serialization: 'json' });
    } catch (e) {
      setPStatus('err', '接続できません');
      scheduleRetry();
      return;
    }
    P.conn = conn;

    conn.on('open', () => {
      P.retry = 0;
      setPStatus('live', '接続しました');
      if (S.myLang) sendHello();
    });
    conn.on('data', onHostData);
    conn.on('close', () => {
      if (!P.joined) return;
      setPStatus('wait', '切断されました。再接続中…');
      scheduleRetry();
    });
    conn.on('error', (e) => console.warn('[conn]', e && e.type));
  }

  function scheduleRetry() {
    clearTimeout(P.retryTimer);
    const delay = Math.min(12000, 2500 * Math.pow(1.7, Math.min(P.retry++, 5)));
    P.retryTimer = setTimeout(() => {
      if (!P.conn || !P.conn.open) openConn();
    }, delay);
  }

  function sendHello() {
    if (!P.conn || !P.conn.open) return;
    P.conn.send({ t: 'hello', lang: S.myLang || 'en' });
  }

  function onHostData(msg) {
    if (!msg || typeof msg !== 'object') return;
    switch (msg.t) {
      case 'cap':
        renderPEntry({ id: msg.id, ja: msg.ja, ts: msg.ts, tr: {} });
        break;
      case 'tr':
        applyTr(msg.id, msg.tr || {});
        break;
      case 'history':
        (msg.items || []).forEach(it => renderPEntry(it, { silent: true }));
        break;
      case 'init':
        if (!P.joined && S.myLang) sendHello();
        break;
    }
  }

  /* ---------------- 言語選択 ---------------- */
  function buildLangGrid(sel, onPick) {
    const el = $(sel);
    if (!el) return;
    el.innerHTML = LANGS.map(L =>
      '<button class="lang-btn" type="button" data-lang="' + L.code + '">' +
        '<span class="flag" aria-hidden="true">' + L.flag + '</span>' +
        '<span class="lang-name">' + esc(L.native) + '</span>' +
        '<span class="lang-ja">' + esc(L.ja) + '</span>' +
      '</button>'
    ).join('');
    el.addEventListener('click', (e) => {
      const btn = e.target.closest('.lang-btn');
      if (!btn) return;
      onPick(btn.dataset.lang);
    });
  }

  function highlightLang() {
    $$('.lang-btn').forEach(b => b.classList.toggle('on', b.dataset.lang === S.myLang));
    const tag = $('#pLangTag');
    if (tag) {
      const L = LANG_MAP[S.myLang];
      tag.textContent = L ? (L.flag + ' ' + L.native) : '';
    }
  }

  function pickMyLang(code) {
    if (!LANG_MAP[code]) return;
    const changed = S.myLang !== code;
    S.myLang = code;
    saveSettings();
    highlightLang();
    enterStage();
    if (P.conn && P.conn.open) {
      if (P.joined) {
        P.conn.send({ t: 'lang', lang: code, refresh: true });
      } else {
        sendHello();
      }
    }
    if (changed) {
      // 言語を変えたら前の言語の字幕は消す（混ざると読みにくいため）
      const box = $('#pCaptions');
      box.innerHTML = '<div id="pWaiting" class="p-waiting"><div class="wave" aria-hidden="true"><span></span><span></span><span></span></div><p id="pWaitingText">この言語の字幕を待っています…</p></div>';
      P.seen.clear();
    }
    P.joined = true;
    closeSheet();
  }

  function enterStage() {
    $('#pLangPick').classList.add('hidden');
    $('#pStage').classList.remove('hidden');
    applyParticipantLook();
    if (!S.pTts) $('#btnTts').classList.remove('on');
    else $('#btnTts').classList.add('on');
    if (VOICE.unlocked) $('#btnVoice').classList.add('hidden');
    if (A.role === 'participant') P.joined = true;
    if (P.joined && P.conn && P.conn.open) sendHello();
  }

  function applyParticipantLook() {
    const box = $('#pCaptions');
    if (box) {
      box.className = 'p-captions mode-' + (S.pDisplay || 'both');
    }
    const stage = $('#pStage');
    if (stage) stage.style.setProperty('--fs', String(clamp(S.pFont || 1, 0.85, 1.5)));
    const btn = $('#btnDisplay');
    if (btn) btn.textContent = S.pDisplay === 'translation' ? '訳だけ表示' : S.pDisplay === 'original' ? '原文だけ表示' : '訳＋原文';
    const tts = $('#btnTts');
    if (tts) {
      tts.classList.toggle('on', !!S.pTts);
      tts.textContent = S.pTts ? '🔊 自動読み上げ ON' : '🔈 自動読み上げ OFF';
    }
  }

  /* ---------------- 字幕の描画 ---------------- */
  function renderPEntry(item, opts = {}) {
    const box = $('#pCaptions');
    if (!box) return;
    const wait = $('#pWaiting');
    if (wait) wait.remove();

    const existing = box.querySelector('.p-entry[data-id="' + item.id + '"]');
    if (existing) { applyTr(item.id, item.tr || {}); return; }

    const tr = item.tr && item.tr[S.myLang];
    const el = document.createElement('article');
    el.className = 'p-entry';
    el.dataset.id = item.id;
    el.innerHTML =
      '<p class="p-tr pending" data-tr></p>' +
      '<p class="p-ja">' + esc(item.ja) + '</p>';
    box.appendChild(el);

    if (tr) fillPEntry(el, tr, opts.silent);

    P.lastCaptionAt = Date.now();
    trimEntries(box);
    scrollToLatest();
    updateJump();
  }

  function applyTr(id, trMap) {
    const el = document.querySelector('.p-entry[data-id="' + id + '"]');
    if (!el) return;
    const tr = trMap && trMap[S.myLang];
    if (!tr) return;
    fillPEntry(el, tr, false);
  }

  function fillPEntry(el, tr, silent) {
    const p = el.querySelector('[data-tr]');
    if (!p || p.dataset.filled === '1') return;
    p.textContent = tr.text;
    p.classList.remove('pending');
    p.classList.toggle('degraded', !!tr.degraded);
    p.dataset.filled = '1';
    if (!silent && S.pTts) speakQueue(tr.text, S.myLang);
    if (!silent && !VOICE.unlocked) {
      $('#btnVoice').classList.remove('hidden');
    }
  }

  function trimEntries(box) {
    while (box.querySelectorAll('.p-entry').length > 80) {
      const first = box.querySelector('.p-entry');
      if (first) first.remove(); else break;
    }
  }

  function scrollToLatest() {
    const box = $('#pCaptions');
    if (!box) return;
    if (nearBottom(box)) box.scrollTop = box.scrollHeight;
  }

  function nearBottom(el) {
    return el.scrollHeight - el.scrollTop - el.clientHeight < 90;
  }

  function updateJump() {
    const box = $('#pCaptions');
    const btn = $('#btnJump');
    if (!box || !btn) return;
    btn.classList.toggle('hidden', nearBottom(box) || !box.querySelector('.p-entry'));
  }

  /* ---------------- 読み上げ ---------------- */
  function refreshVoices() {
    try { VOICE.voices = window.speechSynthesis.getVoices() || []; } catch (e) { VOICE.voices = []; }
  }

  function pickVoice(langCode) {
    const L = LANG_MAP[langCode];
    if (!L || !VOICE.voices.length) return null;
    const want = L.bcp47.toLowerCase();
    const prefix = want.split('-')[0];
    let best = null;
    for (const v of VOICE.voices) {
      const vl = String(v.lang || '').toLowerCase().replace('_', '-');
      if (vl === want) { best = v; if (v.localService) break; }
    }
    if (best) return best;
    for (const v of VOICE.voices) {
      const vl = String(v.lang || '').toLowerCase().replace('_', '-');
      if (vl.split('-')[0] === prefix) { best = v; if (v.localService) break; }
    }
    return best;
  }

  const SPEAK_OK = {
    'en':'Ready', 'zh-CN':'准备好了', 'zh-TW':'準備好了', 'ko':'준비되었습니다',
    'es':'Listo', 'fr':'Prêt', 'de':'Bereit', 'pt':'Pronto', 'it':'Pronto',
    'th':'พร้อม', 'vi':'Sẵn sàng', 'id':'Siap'
  };

  function unlockVoice() {
    if (!('speechSynthesis' in window)) {
      toast('この端末は読み上げ（音声合成）に対応していません');
      return;
    }
    try {
      // 無音だとロック解除と見なされない端末があるため、短い実音声を1回鳴らす
      const u = new SpeechSynthesisUtterance(SPEAK_OK[S.myLang] || 'Ready');
      u.lang = LANG_MAP[S.myLang] ? LANG_MAP[S.myLang].bcp47 : 'en-US';
      const v = pickVoice(S.myLang);
      if (v) u.voice = v;
      u.rate = 1;
      window.speechSynthesis.speak(u);
      VOICE.unlocked = true;
      $('#btnVoice').classList.add('hidden');
      toast('音声を有効にしました（このあと自動で読み上げます）');
    } catch (e) {
      toast('音声を開始できませんでした');
    }
  }

  function speakQueue(text, langCode) {
    if (!('speechSynthesis' in window)) return;
    if (!S.pTts) return;
    if (!VOICE.unlocked) {
      $('#btnVoice').classList.remove('hidden');
      return;
    }
    // 遅れがたまったら古いものを捨てて、今の話に追いつく
    if (VOICE.queue.length >= 2) VOICE.queue.shift();
    VOICE.queue.push({ text, lang: langCode });
    pumpSpeech();
  }

  function pumpSpeech() {
    if (VOICE.speaking || !VOICE.queue.length) return;
    const job = VOICE.queue.shift();
    const L = LANG_MAP[job.lang];
    let u;
    try {
      u = new SpeechSynthesisUtterance(job.text);
    } catch (e) { return; }
    u.lang = L ? L.bcp47 : 'en-US';
    const v = pickVoice(job.lang);
    if (v) u.voice = v;
    u.rate = 1;
    u.pitch = 1;
    u.onend = () => { VOICE.speaking = false; setTimeout(pumpSpeech, 60); };
    u.onerror = () => { VOICE.speaking = false; setTimeout(pumpSpeech, 60); };
    VOICE.speaking = true;
    try { window.speechSynthesis.speak(u); }
    catch (e) { VOICE.speaking = false; }
  }

  /* ---------------------------------------------------------
     10. UI の配線
  --------------------------------------------------------- */
  function bindUI() {
    $('#btnStart').addEventListener('click', onStartHosting);
    $('#btnMic').addEventListener('click', toggleMic);
    $('#btnSendText').addEventListener('click', sendManual);
    $('#manualText').addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') sendManual();
    });
    $('#btnClear').addEventListener('click', () => {
      A.history = [];
      $('#guideLog').innerHTML = '<p class="empty">ここに「話した日本語」と各言語の翻訳が表示されます。</p>';
      $('#liveCount').textContent = '0件';
    });

    $('#btnCopy').addEventListener('click', async () => {
      const url = $('#joinUrl').value || joinUrl();
      try {
        if (navigator.share) { await navigator.share({ title: 'QR同時通訳', url }); return; }
      } catch (e) { /* キャンセル */ }
      try {
        await navigator.clipboard.writeText(url);
        toast('参加用URLをコピーしました');
      } catch (e) {
        const inp = $('#joinUrl');
        inp.select();
        toast('長押しでコピーしてください');
      }
    });

    $('#linkParticipant').addEventListener('click', (e) => {
      e.preventDefault();
      location.href = joinUrl();
    });

    // 設定
    $('#btnSettings').addEventListener('click', () => openSheet('guide'));
    $('#enginePill').addEventListener('click', () => openSheet('guide'));
    $('#btnPSettings').addEventListener('click', () => openSheet('participant'));
    $('#btnSheetClose').addEventListener('click', closeSheet);
    $('#sheetBackdrop').addEventListener('click', closeSheet);
    $('#btnSheetSave').addEventListener('click', saveSheet);

    $$('input[name="engine"]').forEach(r => r.addEventListener('change', updateEngineFields));
    $$('input[name="asr"]').forEach(r => r.addEventListener('change', updateAsrFields));

    $('#btnGlossAdd').addEventListener('click', addGloss);
    $('#glossTr').addEventListener('keydown', (e) => { if (e.key === 'Enter') addGloss(); });
    $('#glossList').addEventListener('click', (e) => {
      const btn = e.target.closest('.del');
      if (!btn) return;
      const i = Number(btn.dataset.i);
      S.glossary.splice(i, 1);
      saveSettings();
      renderGloss();
    });

    $('#previewLangs').addEventListener('change', (e) => {
      const cb = e.target.closest('input[type="checkbox"]');
      if (!cb) return;
      const code = cb.value;
      const i = S.previewLangs.indexOf(code);
      if (cb.checked && i < 0) S.previewLangs.push(code);
      if (!cb.checked && i >= 0) S.previewLangs.splice(i, 1);
      if (!S.previewLangs.length) S.previewLangs.push('en');
      saveSettings();
      renderPreviewChecks();
    });

    // 参加者の操作
    $('#btnVoice').addEventListener('click', unlockVoice);
    $('#btnTts').addEventListener('click', () => {
      S.pTts = !S.pTts;
      saveSettings();
      applyParticipantLook();
      if (S.pTts && !VOICE.unlocked) {
        $('#btnVoice').classList.remove('hidden');
        toast('「音声を有効にする」を1回押すと読み上げが始まります');
      }
    });
    $('#btnDisplay').addEventListener('click', () => {
      S.pDisplay = S.pDisplay === 'both' ? 'translation' : S.pDisplay === 'translation' ? 'original' : 'both';
      saveSettings();
      applyParticipantLook();
    });
    $('#btnFont').addEventListener('click', () => {
      const sizes = [1, 1.15, 1.3, 1.45, 0.9];
      const i = sizes.findIndex(v => Math.abs(v - S.pFont) < 0.01);
      S.pFont = sizes[(i + 1) % sizes.length];
      saveSettings();
      applyParticipantLook();
    });
    $('#btnJump').addEventListener('click', () => {
      const box = $('#pCaptions');
      box.scrollTop = box.scrollHeight;
      updateJump();
    });
    $('#pCaptions').addEventListener('scroll', updateJump);

    $('#btnHelp').addEventListener('click', () => {
      $('#helpSheet').classList.remove('hidden');
      $('#sheetBackdrop').classList.remove('hidden');
    });
    $('#btnHelpClose').addEventListener('click', () => {
      $('#helpSheet').classList.add('hidden');
      if ($('#sheet').classList.contains('hidden')) $('#sheetBackdrop').classList.add('hidden');
    });

    $('#pDisplay').addEventListener('change', (e) => {
      S.pDisplay = e.target.value;
      saveSettings();
      applyParticipantLook();
    });
    $('#pFont').addEventListener('input', (e) => {
      S.pFont = clamp(e.target.value, 0.85, 1.5);
      saveSettings();
      applyParticipantLook();
    });
    $('#pTts').addEventListener('change', (e) => {
      S.pTts = e.target.checked;
      saveSettings();
      applyParticipantLook();
    });
  }

  function sendManual() {
    const ta = $('#manualText');
    const text = ta.value.trim();
    if (!text) { ta.focus(); return; }
    ta.value = '';
    publishCaption(text);
  }

  /* ---------------- 設定シート ---------------- */
  function openSheet(mode) {
    fillSheet();
    $$('.sheet-section[data-mode]').forEach(sec => {
      sec.classList.toggle('hidden', sec.dataset.mode !== mode);
    });
    $('#sheetTitle').textContent = mode === 'guide' ? '設定（ガイド）' : '設定（参加者）';
    $('#sheet').classList.remove('hidden');
    $('#sheetBackdrop').classList.remove('hidden');
    $('#helpSheet').classList.add('hidden');
  }

  function closeSheet() {
    $('#sheet').classList.add('hidden');
    $('#helpSheet').classList.add('hidden');
    $('#sheetBackdrop').classList.add('hidden');
  }

  function fillSheet() {
    $$('input[name="engine"]').forEach(r => { r.checked = r.value === S.engine; });
    $('#openaiKey').value = S.openaiKey || '';
    $('#openaiModel').value = S.openaiModel || '';
    $('#geminiKey').value = S.geminiKey || '';
    $('#geminiModel').value = S.geminiModel || '';

    $$('input[name="asr"]').forEach(r => { r.checked = r.value === S.asr; });
    $('#transcribeModel').value = S.transcribeModel || '';
    $('#chunkSec').value = S.chunkSec || 6;

    $('#peerHost').value = S.peerHost || '';
    $('#peerPort').value = S.peerPort || '';
    $('#peerPath').value = S.peerPath || '';
    $('#iceExtra').value = S.iceExtra || '';
    $('#iceExtraP').value = S.iceExtra || '';

    $('#pDisplay').value = S.pDisplay || 'both';
    $('#pFont').value = S.pFont || 1;
    $('#pTts').checked = !!S.pTts;

    renderGloss();
    renderPreviewChecks();
    updateEngineFields();
    updateAsrFields();
    highlightLang();
  }

  function saveSheet() {
    const engine = (document.querySelector('input[name="engine"]:checked') || {}).value || 'trial';
    const asr = (document.querySelector('input[name="asr"]:checked') || {}).value || 'webspeech';

    S.engine = engine;
    S.openaiKey = $('#openaiKey').value.trim();
    S.openaiModel = $('#openaiModel').value.trim() || DEFAULTS.openaiModel;
    S.geminiKey = $('#geminiKey').value.trim();
    S.geminiModel = $('#geminiModel').value.trim() || DEFAULTS.geminiModel;
    S.asr = asr;
    S.transcribeModel = $('#transcribeModel').value.trim() || DEFAULTS.transcribeModel;
    S.chunkSec = clamp($('#chunkSec').value || 6, 3, 15);
    S.peerHost = $('#peerHost').value.trim();
    S.peerPort = $('#peerPort').value.trim();
    S.peerPath = $('#peerPath').value.trim();
    S.iceExtra = (A.role === 'guide' ? $('#iceExtra').value : $('#iceExtraP').value).trim();

    S.pDisplay = $('#pDisplay').value;
    S.pFont = clamp($('#pFont').value, 0.85, 1.5);
    S.pTts = $('#pTts').checked;

    saveSettings();
    applyParticipantLook();
    if (A.role === 'guide' && A.peer) setGuideStatus('live', '配信中');
    closeSheet();
    toast('設定を保存しました');
  }

  function updateEngineFields() {
    const engine = (document.querySelector('input[name="engine"]:checked') || {}).value || 'trial';
    $$('.field[data-engine]').forEach(f => f.classList.toggle('hidden', f.dataset.engine !== engine));
  }

  function updateAsrFields() {
    const asr = (document.querySelector('input[name="asr"]:checked') || {}).value || 'webspeech';
    $$('.field[data-asr]').forEach(f => f.classList.toggle('hidden', f.dataset.asr !== asr));
  }

  function updateEnginePill() {
    const pill = $('#enginePill');
    if (!pill) return;
    const hasKey = (S.engine === 'openai' && String(S.openaiKey || '').trim()) ||
                   (S.engine === 'gemini' && String(S.geminiKey || '').trim());
    let label;
    let cls = 'pill';
    if (S.engine === 'openai' && hasKey) label = 'OpenAI';
    else if (S.engine === 'gemini' && hasKey) label = 'Gemini';
    else if (S.engine === 'trial') label = 'お試しモード';
    else { label = 'キー未設定（お試し動作）'; cls += ' bad'; }
    pill.className = cls;
    pill.textContent = label;
  }

  function updateAsrLabel() {
    const el = $('#asrMode');
    if (!el) return;
    el.textContent = S.asr === 'transcribe'
      ? '音声認識: ' + (S.transcribeModel || 'gpt-transcribe') + '（' + (Number(S.chunkSec) || 6) + '秒区切り）'
      : '音声認識: Web Speech（ja-JP）';
  }

  function renderGloss() {
    const box = $('#glossList');
    if (!box) return;
    if (!S.glossary.length) {
      box.innerHTML = '<p class="muted small">まだ登録がありません（例: 金閣寺 → Kinkaku-ji）</p>';
      return;
    }
    box.innerHTML = S.glossary.map((g, i) =>
      '<div class="gloss-item"><b>' + esc(g.ja) + '</b><span class="arrow">→</span><span>' + esc(g.tr) + '</span>' +
      '<button class="del" type="button" data-i="' + i + '" aria-label="削除">✕</button></div>'
    ).join('');
  }

  function addGloss() {
    const ja = $('#glossJa').value.trim();
    const tr = $('#glossTr').value.trim();
    if (!ja || !tr) { toast('日本語と訳語の両方を入れてください'); return; }
    S.glossary.push({ ja, tr });
    saveSettings();
    renderGloss();
    $('#glossJa').value = '';
    $('#glossTr').value = '';
  }

  function renderPreviewChecks() {
    const box = $('#previewLangs');
    if (!box) return;
    box.innerHTML = LANGS.slice(0, 8).map(L => {
      const on = S.previewLangs.includes(L.code);
      return '<label class="chip-check' + (on ? ' on' : '') + '">' +
        '<input type="checkbox" value="' + L.code + '"' + (on ? ' checked' : '') + '>' +
        L.flag + ' ' + esc(L.ja) + '</label>';
    }).join('');
  }

  /* ---------------- トースト ---------------- */
  let toastTimer = null;
  function toast(msg, ms = 3200) {
    const el = $('#toast');
    if (!el) return;
    el.textContent = msg;
    el.classList.remove('hidden');
    clearTimeout(toastTimer);
    toastTimer = setTimeout(() => el.classList.add('hidden'), ms);
  }

})();
