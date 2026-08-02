'use strict';
/* WebSocket client for online play. The server is a dumb relay: whichever
 * client performs an action broadcasts the full game state afterwards. */
(function () {
  const Net = {
    ws: null,
    seat: null,
    code: null,
    connected: false,
    available: location.protocol === 'http:' || location.protocol === 'https:',
    handlers: {},          // t -> fn(msg)

    on(t, fn) { this.handlers[t] = fn; },

    connect() {
      return new Promise((resolve, reject) => {
        if (this.ws && this.connected) { resolve(); return; }
        const proto = location.protocol === 'https:' ? 'wss:' : 'ws:';
        const ws = new WebSocket(`${proto}//${location.host}`);
        ws.onopen = () => { this.ws = ws; this.connected = true; resolve(); };
        ws.onerror = () => { if (!this.connected) reject(new Error('Could not reach the server.')); };
        ws.onclose = () => {
          const wasConnected = this.connected;
          this.connected = false; this.ws = null;
          if (wasConnected && this.handlers.bye) this.handlers.bye({});
        };
        ws.onmessage = ev => {
          let msg;
          try { msg = JSON.parse(ev.data); } catch (e) { return; }
          if (msg.t === 'created') { this.seat = 0; this.code = msg.code; }
          if (msg.t === 'joined') { this.seat = 1; }
          const h = this.handlers[msg.t];
          if (h) h(msg);
        };
      });
    },

    send(msg) { if (this.ws && this.connected) this.ws.send(JSON.stringify(msg)); },
    create(faction) { this.send({ t: 'create', faction }); },
    join(code, faction) { this.send({ t: 'join', code, faction }); },
    sendState(g) { this.send({ t: 'state', g }); },
    close() {
      if (this.ws) { this.handlers = {}; this.ws.close(); }
      this.ws = null; this.connected = false; this.seat = null; this.code = null;
    },
  };

  globalThis.Net = Net;
})();
