/**
 * Chat listeners — read-only, no accounts, no tokens.
 *
 * Twitch: anonymous IRC over WebSocket (the "justinfan" guest login). Official
 * and stable.
 *
 * Kick: the Pusher socket kick.com's own chat page uses. THIS IS NOT AN OFFICIAL
 * API. If Kick changes it, this file is the one to fix — Twitch is unaffected,
 * and the control page says which side dropped.
 *
 * Uses the global WebSocket, so it needs Node 22 or newer. On an older Node the
 * rest of the studio still runs; the control page says why chat doesn't.
 */

const KICK_PUSHER = 'wss://ws-us2.pusher.com/app/32cbd69e4b950bf97679?protocol=7&client=js&version=8.4.0&flash=false';
const RETRY_MS = 5000;
const KEEPALIVE_MS = 30000;
// Both sides answer our keepalive, so a socket this quiet is dead, not idle.
const STALE_MS = 90000;

/** "LMS", "LMS!" and "LMS pls" enter; "LMSS" and "i want to LMS" do not. */
function matchesKeyword(text, keyword) {
  const t = String(text || '').trim().toLowerCase();
  const k = String(keyword || '').trim().toLowerCase();
  return !!k && t.startsWith(k) && !/^[\p{L}\p{N}_]/u.test(t.slice(k.length));
}

/** Accepts "name", "#name" or a pasted channel URL. */
const channelName = s => String(s || '').trim().toLowerCase().replace(/\/+$/, '').replace(/^.*\//, '').replace(/^#/, '');

/** One IRC line → {user, name, text}, or null if it isn't a chat message. */
function parseTwitch(line) {
  const m = /^(?:@(\S+) )?:(\w+)!\S+ PRIVMSG #\w+ :(.*)$/.exec(line);
  if (!m) return null;
  const dn = /(?:^|;)display-name=([^;]*)/.exec(m[1] || '');
  const user = m[2].toLowerCase();
  // A display name that is more than a change of case (a localised name) is not
  // what viewers see next to the handle, so fall back to the login.
  const name = dn && dn[1].toLowerCase() === user ? dn[1] : m[2];
  return { user, name, text: m[3] };
}

/** One Pusher frame → {user, name, text}, or null if it isn't a chat message. */
function parseKick(frame) {
  try {
    const m = JSON.parse(frame);
    if (!/ChatMessageEvent$/.test(m.event || '')) return null;
    const d = JSON.parse(m.data);
    if (!d || !d.sender || typeof d.content !== 'string') return null;
    return { user: String(d.sender.slug || d.sender.username).toLowerCase(), name: d.sender.username, text: d.content };
  } catch (e) { return null; }
}

/** One socket that stays up: reconnects on close, and replaces one that has gone quiet. */
function keepOpen(platform, url, hello, onFrame, keepalive, status) {
  let ws = null, lastSeen = 0;
  function open() {
    status(platform, 'connecting');
    const sock = ws = new WebSocket(url);
    lastSeen = Date.now();
    sock.onopen = () => hello(sock);
    sock.onmessage = ev => { lastSeen = Date.now(); onFrame(String(ev.data), sock); };
    sock.onerror = () => {};                    // onclose always follows
    sock.onclose = () => {
      if (sock !== ws) return;                  // already replaced by the watchdog
      ws = null;
      status(platform, 'disconnected — retrying');
      setTimeout(open, RETRY_MS);
    };
  }
  setInterval(() => {
    if (!ws) return;
    if (Date.now() - lastSeen > STALE_MS) {
      // A dropped connection can look open for minutes. Don't wait for it.
      const dead = ws; ws = null;
      try { dead.close(); } catch (e) { /* fine */ }
      return open();
    }
    if (ws.readyState === WebSocket.OPEN) ws.send(keepalive);
  }, KEEPALIVE_MS);
  open();
}

function twitch(channel, onChat, status) {
  keepOpen('twitch', 'wss://irc-ws.chat.twitch.tv:443', ws => {
    ws.send('CAP REQ :twitch.tv/tags');
    ws.send('NICK justinfan' + (10000 + Math.floor(Math.random() * 80000)));
    ws.send('JOIN #' + channel);
  }, (frame, ws) => frame.split('\r\n').forEach(line => {
    if (line.startsWith('PING')) return ws.send('PONG' + line.slice(4));
    if (/^:\S+ 366 /.test(line)) return status('twitch', 'connected to #' + channel);
    const msg = parseTwitch(line);
    if (msg) onChat(Object.assign({ platform: 'twitch' }, msg));
  }), 'PING :wheel-studio', status);
}

async function kickChatroom(slug) {
  const res = await fetch('https://kick.com/api/v2/channels/' + encodeURIComponent(slug), {
    signal: AbortSignal.timeout(10000),
    headers: { Accept: 'application/json', 'User-Agent': 'Mozilla/5.0' }
  });
  if (!res.ok) throw new Error('HTTP ' + res.status);
  const j = await res.json();
  if (!j.chatroom || !j.chatroom.id) throw new Error('no chatroom in the reply');
  return j.chatroom.id;
}

async function kick(slug, chatroomId, onChat, status) {
  // kick.com sits behind Cloudflare and may one day refuse this lookup, which is
  // what kickChatroomId in config.json is for.
  while (!chatroomId) {
    try { chatroomId = await kickChatroom(slug); }
    catch (e) {
      status('kick', 'cannot look up "' + slug + '" (' + e.message + ') — retrying in 60s, ' +
                     'or set kickChatroomId in server/config.json');
      await new Promise(r => setTimeout(r, 60000));
    }
  }
  keepOpen('kick', KICK_PUSHER, ws => ws.send(JSON.stringify({
    event: 'pusher:subscribe', data: { auth: '', channel: 'chatrooms.' + chatroomId + '.v2' }
  })), (frame, ws) => {
    if (frame.includes('"pusher:ping"')) return ws.send(JSON.stringify({ event: 'pusher:pong', data: {} }));
    if (frame.includes('subscription_succeeded')) return status('kick', 'connected to ' + (slug || 'chatroom ' + chatroomId));
    const msg = parseKick(frame);
    if (msg) onChat(Object.assign({ platform: 'kick' }, msg));
  }, JSON.stringify({ event: 'pusher:ping', data: {} }), status);
}

/** A pasted YouTube link (watch, /live/, youtu.be, embed) or a bare id → the 11-char video id. */
function youtubeId(s) {
  s = String(s || '').trim();
  const m = /(?:v=|\/live\/|\/video\/|youtu\.be\/|\/embed\/)([A-Za-z0-9_-]{11})/.exec(s);
  return m ? m[1] : /^[A-Za-z0-9_-]{11}$/.test(s) ? s : '';
}

/**
 * YouTube: no socket and no key. Reads the same public chat page youtube.com's own
 * popout chat uses — THIS IS NOT AN OFFICIAL API, like Kick. If YouTube changes it,
 * this function is the one to fix. The live stream is found from youtubeChannel
 * (the @handle), so there is nothing to paste per stream; youtubeVideo, if set,
 * overrides that for a stream the channel page doesn't show.
 */
const YT_HEAD = { 'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/140.0 Safari/537.36',
                  'Accept-Language': 'en-US,en', Cookie: 'SOCS=CAI' };   // SOCS: skips the EU cookie wall
const ytText = r => (r.runs || []).map(x => x.text || (x.emoji && x.emoji.shortcuts && x.emoji.shortcuts[0]) || '').join('');

async function youtubeLiveId(cfg) {
  const own = youtubeId(cfg.youtubeVideo);
  if (own) return own;
  const h = channelName(cfg.youtubeChannel).replace(/^@/, '');
  const html = await (await fetch('https://www.youtube.com/@' + encodeURIComponent(h) + '/live',
                                  { headers: YT_HEAD, signal: AbortSignal.timeout(10000) })).text();
  const m = /<link rel="canonical" href="https:\/\/www\.youtube\.com\/watch\?v=([\w-]{11})/.exec(html);
  return m && /"isLive(?:Now|Content)":true/.test(html) ? m[1] : '';
}

function youtube(cfg, onChat, status) {
  let last = '';
  const say = t => { if (t !== last) status('youtube', last = t); };
  const wait = ms => new Promise(r => setTimeout(r, ms));
  (async () => {
    for (;;) {
      if (!channelName(cfg.youtubeChannel) && !youtubeId(cfg.youtubeVideo)) { say('off — no YouTube channel set'); await wait(3000); continue; }
      try {
        const vid = await youtubeLiveId(cfg);
        if (!vid) { say('not live — checking every 30s'); await wait(30000); continue; }
        const page = await (await fetch('https://www.youtube.com/live_chat?is_popout=1&v=' + vid,
                                        { headers: YT_HEAD, signal: AbortSignal.timeout(10000) })).text();
        const ver = (/"clientVersion":"([^"]+)"/.exec(page) || [])[1];
        let cont = (/"continuation":"([^"]+)"/.exec(page) || [])[1];
        if (!ver || !cont) throw new Error('no live chat on that stream');
        const since = Date.now() * 1000;             // µs; what was already in chat isn't an entry
        say('connected');
        while (cont) {
          const r = await fetch('https://www.youtube.com/youtubei/v1/live_chat/get_live_chat?prettyPrint=false', {
            method: 'POST', headers: Object.assign({ 'Content-Type': 'application/json' }, YT_HEAD),
            signal: AbortSignal.timeout(10000),
            body: JSON.stringify({ context: { client: { clientName: 'WEB', clientVersion: ver } }, continuation: cont })
          });
          if (!r.ok) throw new Error('HTTP ' + r.status);
          const lc = ((await r.json()).continuationContents || {}).liveChatContinuation || {};
          (lc.actions || []).forEach(a => {
            const m = a.addChatItemAction && a.addChatItemAction.item.liveChatTextMessageRenderer;
            if (!m || Number(m.timestampUsec) < since) return;
            onChat({ platform: 'youtube', user: m.authorExternalChannelId,
                     name: (m.authorName && m.authorName.simpleText || '').replace(/^@/, ''), text: ytText(m.message || {}) });
          });
          const c = (lc.continuations || [])[0] || {};
          const d = c.invalidationContinuationData || c.timedContinuationData || c.reloadContinuationData || {};
          cont = d.continuation;
          await wait(Math.min(Math.max(d.timeoutMs || 3000, 1500), 5000));
        }
        say('stream ended — looking again');         // no continuation: the chat closed
      } catch (e) {
        say(String(e.message || e).slice(0, 80) + ' — retrying');
        await wait(15000);
      }
    }
  })();
}

/**
 * @param onChat  every chat message, all platforms: {platform, user, name, text}
 * @param status  (platform, text) — a line for the control page
 */
function startChat(cfg, onChat, status) {
  const tw = channelName(cfg.twitchChannel), kc = channelName(cfg.kickChannel);
  youtube(cfg, onChat, status);
  if (typeof WebSocket === 'undefined') {
    ['twitch', 'kick'].forEach(p => status(p, 'needs Node 22 or newer — this is ' + process.version));
    return;
  }
  if (tw) twitch(tw, onChat, status);
  else status('twitch', 'off — no twitchChannel in server/config.json');
  if (kc || cfg.kickChatroomId) kick(kc, cfg.kickChatroomId, onChat, status);
  else status('kick', 'off — no kickChannel in server/config.json');
}

module.exports = { startChat, matchesKeyword, parseTwitch, parseKick, channelName, youtubeId };
