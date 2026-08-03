'use strict';
/* Titanrule multiplayer server.
 *
 * Serves the static client and relays game state between two players in a
 * room. The game itself runs in the clients (replicated state, one writer at
 * a time); the server only matches players and forwards messages.
 *
 * Run locally:  npm install && npm start        (http://localhost:3000)
 * On Railway:   deploy this repo — PORT is provided by the platform.
 */
const http = require('http');
const fs = require('fs');
const path = require('path');
const { WebSocketServer } = require('ws');

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;

const MIME = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.md': 'text/plain; charset=utf-8',
};

const server = http.createServer((req, res) => {
  let urlPath = decodeURIComponent((req.url || '/').split('?')[0]);
  if (urlPath === '/') urlPath = '/index.html';
  const filePath = path.join(ROOT, path.normalize(urlPath));
  if (!filePath.startsWith(ROOT)) { res.writeHead(403); res.end(); return; }
  fs.readFile(filePath, (err, data) => {
    if (err) { res.writeHead(404); res.end('Not found'); return; }
    res.writeHead(200, { 'Content-Type': MIME[path.extname(filePath)] || 'application/octet-stream' });
    res.end(data);
  });
});

/* ---------- Rooms ---------- */

/* code -> { clients: [ws|null, ws|null], decks: [spec|null, spec|null] }
 * A deck spec is {name, leader, cards:[[cardId, count], ...]} — custom decks
 * exist only in their owner's browser, so the full spec travels with the
 * lobby messages. */
const rooms = new Map();

function deckSpec(raw) {
  if (!raw || typeof raw !== 'object' || !Array.isArray(raw.cards)) return null;
  return { name: String(raw.name || 'Deck'), leader: String(raw.leader || ''), cards: raw.cards };
}

function makeCode() {
  const chars = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';
  let code;
  do {
    code = '';
    for (let i = 0; i < 4; i++) code += chars[Math.floor(Math.random() * chars.length)];
  } while (rooms.has(code));
  return code;
}

function send(ws, msg) {
  if (ws && ws.readyState === ws.OPEN) ws.send(JSON.stringify(msg));
}

const wss = new WebSocketServer({ server, maxPayload: 2 * 1024 * 1024 });

wss.on('connection', ws => {
  ws.on('message', raw => {
    let msg;
    try { msg = JSON.parse(raw); } catch (e) { return; }
    if (!msg || typeof msg.t !== 'string') return;

    if (msg.t === 'create') {
      const deck = deckSpec(msg.deck);
      if (!deck) { send(ws, { t: 'error', err: 'Bad deck.' }); return; }
      const code = makeCode();
      rooms.set(code, { clients: [ws, null], decks: [deck, null] });
      ws.room = code; ws.seat = 0;
      send(ws, { t: 'created', code, seat: 0 });
      return;
    }
    if (msg.t === 'join') {
      const deck = deckSpec(msg.deck);
      if (!deck) { send(ws, { t: 'error', err: 'Bad deck.' }); return; }
      const code = String(msg.code || '').toUpperCase();
      const room = rooms.get(code);
      if (!room) { send(ws, { t: 'error', err: 'No such room.' }); return; }
      if (room.clients[1]) { send(ws, { t: 'error', err: 'Room is full.' }); return; }
      room.clients[1] = ws;
      room.decks[1] = deck;
      ws.room = code; ws.seat = 1;
      send(ws, { t: 'joined', seat: 1 });
      // The host builds the game and broadcasts the first state.
      send(room.clients[0], { t: 'opponent_joined', guestDeck: room.decks[1] });
      return;
    }
    if (msg.t === 'state') {
      const room = rooms.get(ws.room);
      if (!room) return;
      const other = room.clients[1 - ws.seat];
      send(other, { t: 'state', g: msg.g });
      return;
    }
  });

  ws.on('close', () => {
    const room = rooms.get(ws.room);
    if (!room) return;
    const other = room.clients[1 - ws.seat];
    send(other, { t: 'bye' });
    rooms.delete(ws.room);
  });
});

server.listen(PORT, () => {
  console.log(`Titanrule server listening on port ${PORT}`);
});
