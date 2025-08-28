'use strict';
const dgram = require('dgram');
const crypto = require('crypto');

/**
 * Minimal SIP over UDP client for POC purposes.
 * Supports:
 *  - start({address, port})
 *  - send(reqObj, cb) -> cb(resObj) on first matching response
 *  - recv(listener) for incoming requests (e.g., BYE)
 *  - stop()
 *  - makeResponse(req, code, reason)
 *
 * Message object shape (req):
 * { method, uri, headers: { to, from, 'call-id', cseq:{method,seq}, via:[...], contact:[], ... }, content }
 * Destination derived from req.uri (host[:port]) with default port 5060.
 */
class MiniSip {
  constructor() {
    this.sock = null;
    this.address = null;
    this.port = null;
    this._respWaiters = []; // {callId, cseqMethod, cb}
    this._reqListeners = [];
  }

  start({ address, port }) {
    this.address = address;
    this.port = port;
    this.sock = dgram.createSocket('udp4');
    this.sock.on('message', (msg, rinfo) => this._onMessage(msg, rinfo));
    this.sock.bind(port, address);
  }

  stop() {
    try { this.sock && this.sock.close(); } catch(e) {}
    this.sock = null;
    this._respWaiters = [];
    this._reqListeners = [];
  }

  recv(listener) {
    this._reqListeners.push(listener);
  }

  makeResponse(req, code, reason='OK') {
    const h = req.headers || {};
    return {
      status: code,
      reason,
      headers: {
        to: h.to,
        from: h.from,
        'call-id': h['call-id'],
        cseq: { method: req.method, seq: h.cseq ? h.cseq.seq : 1 },
        via: h.via
      },
      content: ''
    };
  }

  send(req, cb) {
    const dest = parseUriToHostPort(req.uri);
    const raw = buildRawRequest(req, this.address, this.port);
    const waiter = { callId: req.headers['call-id'], cseqMethod: req.method, cb };
    if (cb) this._respWaiters.push(waiter);
    this.sock.send(Buffer.from(raw, 'utf8'), dest.port, dest.host);
  }

  _onMessage(buf, rinfo) {
    const text = buf.toString('utf8');
    if (text.startsWith('SIP/2.0')) {
      const res = parseResponse(text);
      // match by call-id and cseq method
      const idx = this._respWaiters.findIndex(w => w.callId === (res.headers['call-id']) && w.cseqMethod === (res.headers.cseq && res.headers.cseq.method));
      if (idx >= 0) {
        const w = this._respWaiters.splice(idx,1)[0];
        w.cb && w.cb(res);
      }
    } else {
      const req = parseRequest(text);
      if (req) {
        // respond via listeners
        this._reqListeners.forEach(fn => fn(req, rinfo));
      }
    }
  }
}

function parseUriToHostPort(uri) {
  // crude: sip:user@host:port OR sip:host:port
  const u = uri.replace(/^sip:/i,'').split('@').pop();
  const [host, port] = u.split(':');
  return { host, port: port ? parseInt(port,10) : 5060 };
}

function buildRawRequest(req, localIp, localPort) {
  const h = req.headers || {};
  const via = (h.via || []).map(v => `Via: SIP/${v.version || '2.0'}/${v.protocol || 'UDP'} ${v.host}${v.port?':'+v.port:''};branch=${v.params && v.params.branch || genBranch()};rport`).join('\r\n');
  const to = hdrTo(h.to, 'To');
  const from = hdrTo(h.from, 'From');
  const callId = `Call-ID: ${h['call-id']}`;
  const cseq = `CSeq: ${h.cseq ? h.cseq.seq : 1} ${h.cseq ? h.cseq.method : req.method}`;
  const maxf = `Max-Forwards: ${h['max-forwards'] || 70}`;
  const ua = `User-Agent: ${h['user-agent'] || 'MiniSIP/0.1'}`;
  const contact = (h.contact||[]).map(c => `Contact: <${c.uri}>`).join('\r\n');
  const auth = headerIf(h['authorization'],'Authorization') + headerIf(h['proxy-authorization'],'Proxy-Authorization');
  const ct = headerIf(h['content-type'],'Content-Type');
  const route = headerIf(h['route'],'Route');
  const extra = Object.keys(h).filter(k => !['to','from','call-id','cseq','via','max-forwards','user-agent','contact','authorization','proxy-authorization','content-type','route'].includes(k))
    .map(k => `${k.replace(/(^|-)./g, s=>s.toUpperCase())}: ${h[k]}`)
    .join('\r\n');
  const startLine = `${req.method} ${req.uri} SIP/2.0`;
  const body = req.content || '';
  const cl = `Content-Length: ${Buffer.byteLength(body,'utf8')}`;
  const raw = [startLine, via, to, from, callId, cseq, maxf, ua, contact, auth, route, ct, extra, cl, '', body].filter(Boolean).join('\r\n');
  return raw;
}

function headerIf(val, name) { return val ? `${name}: ${val}` : ''; }

function hdrTo(obj, name) {
  if (!obj) return `${name}:`;
  const disp = obj.name ? `"${obj.name}" ` : '';
  const tag = obj.params && obj.params.tag ? `;tag=${obj.params.tag}` : '';
  return `${name}: ${disp}<${obj.uri}>${tag}`;
}

function parseHeaders(lines) {
  const headers = {};
  for (const line of lines) {
    const idx = line.indexOf(':');
    if (idx<0) continue;
    const key = line.slice(0,idx).trim().toLowerCase();
    const val = line.slice(idx+1).trim();
    if (key === 'via') {
      headers.via = headers.via || [];
      headers.via.push(val);
    } else if (key === 'call-id') {
      headers['call-id'] = val;
    } else if (key === 'cseq') {
      const m = val.match(/(\d+)\s+([A-Z]+)/i);
      headers.cseq = { seq: m?parseInt(m[1],10):1, method: m?m[2].toUpperCase():'' };
    } else if (key === 'to' || key === 'from') {
      headers[key] = parseNameAddr(val);
    } else {
      headers[key] = val;
    }
  }
  return headers;
}

function parseResponse(text) {
  const [head, ...rest] = text.split('\r\n\r\n');
  const lines = head.split('\r\n');
  const statusLine = lines.shift();
  const m = statusLine.match(/^SIP\/2\.0\s+(\d{3})\s+(.*)$/);
  const status = m ? parseInt(m[1],10) : 0;
  const reason = m ? m[2] : '';
  const headers = parseHeaders(lines);
  const content = rest.join('\r\n\r\n');
  return { status, reason, headers, content };
}

function parseRequest(text) {
  const [head, ...rest] = text.split('\r\n\r\n');
  const lines = head.split('\r\n');
  const reqLine = lines.shift();
  const m = reqLine.match(/^([A-Z]+)\s+sip:[^ ]+\s+SIP\/2\.0$/i);
  if (!m) return null;
  const method = m[1].toUpperCase();
  const headers = parseHeaders(lines);
  const content = rest.join('\r\n\r\n');
  return { method, headers, content };
}

function genBranch() { return 'z9hG4bK-' + crypto.randomBytes(8).toString('hex'); }

module.exports = new MiniSip();
