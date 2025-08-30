'use strict';

const sip = require('./sipstack');
const dgram = require('dgram');
const crypto = require('crypto');
const { readWavPcm16Mono8k, readWavPcm16Mono16k, pcm16ToUlawBuffer, pcm16ToAlawBuffer, pcm16Resample } = require('./wav_utils');
const { encode: pcm16ToG722Buffer } = require('./g722');
const stun = require('./stun_client');

function genBranch() { return 'z9hG4bK-' + crypto.randomBytes(8).toString('hex'); }
function genTag()    { return crypto.randomBytes(8).toString('hex'); }
function genCallId(ip){ return crypto.randomBytes(10).toString('hex') + '@' + ip; }


function parseAuthHeader(h) {
  // Normalize authentication header input. Older code expected a raw
  // string, but the `sip` library already parses it into an object (or
  // array of objects). Support both formats.
  if (!h) return {};

  // If an array of headers is provided, use the first one.
  if (Array.isArray(h)) h = h[0];

  // When `h` is an object, strip quotes from parameter values and return
  // it as a plain key/value object.
  if (typeof h === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(h)) {
      if (k === 'scheme') continue;
      out[k.trim()] = String(v).replace(/^"|"$/g, '');
    }
    return out;
  }

  // Fallback for string headers.
  const out = {};
  String(h).replace(/^Digest\s+/i, '').split(',').forEach(part => {
    const m = part.match(/\s*([^=]+)="?([^"]+)"?/);
    if (m) out[m[1].trim()] = m[2];
  });
  return out;
}

function makeDigestResponse({ username, password, method, uri, realm, nonce, qop, nc, cnonce }) {
  const md5 = s => crypto.createHash('md5').update(s).digest('hex');
  const HA1 = md5(`${username}:${realm}:${password}`);
  const HA2 = md5(`${method}:${uri}`);
  return qop ? md5(`${HA1}:${nonce}:${nc}:${cnonce}:${qop}:${HA2}`)
             : md5(`${HA1}:${nonce}:${HA2}`);
}
function buildAuthHeader(wwwAuth, { method, uri }, username, password, realmOverride) {
  const a = parseAuthHeader(wwwAuth);
  const cnonce = crypto.randomBytes(8).toString('hex');
  const nc = '00000001';
  const realm = realmOverride || a.realm || '';
  const response = makeDigestResponse({ username, password, method, uri, realm, nonce: a.nonce, qop: a.qop, nc, cnonce });
  const params = [
    `username="${username}"`,
    `realm="${realm}"`,
    `nonce="${a.nonce}"`,
    `uri="${uri}"`,
    `response="${response}"`,
    a.qop ? `qop=${a.qop}` : '',
    'algorithm=MD5',
    a.qop ? `cnonce="${cnonce}"` : '',
    a.qop ? `nc=${nc}` : ''
  ].filter(Boolean).join(', ');
  return `Digest ${params}`;
}

function buildSdpOffer(localIp, rtpPort, codec = 'AUTO') {
  let mLineCodecs = '0 101';
  const codecLines = ['a=rtpmap:0 PCMU/8000'];
  if (codec === 'PCMA') {
    mLineCodecs = '8 101';
    codecLines.splice(0,1,'a=rtpmap:8 PCMA/8000');
  } else if (codec === 'G722') {
    mLineCodecs = '9 101';
    codecLines.splice(0,1,'a=rtpmap:9 G722/8000');
  } else if (codec === 'AUTO') {
    mLineCodecs = '9 8 0 101';
    codecLines.unshift('a=rtpmap:9 G722/8000','a=rtpmap:8 PCMA/8000');
  }
  return [
    'v=0',
    `o=- 0 0 IN IP4 ${localIp}`,
    's=-',
    `c=IN IP4 ${localIp}`,
    't=0 0',
    `m=audio ${rtpPort} RTP/AVP ${mLineCodecs}`,
    ...codecLines,
    'a=rtpmap:101 telephone-event/8000',
    'a=ptime:20',
    // Request two-way audio by default. The RTP stream we generate is
    // strictly one-way, but some SIP servers (e.g. 3CX) will refuse to
    // negotiate media when the initial offer is marked as sendonly. Using
    // sendrecv here ensures the server responds with a valid RTP address
    // and port, after which we simply ignore any incoming audio.
    'a=sendrecv'
  // RFC 4566 mandates that SDP lines are separated by CRLF. The previous
  // implementation used the literal string "\\r\\n", which resulted in
  // backslash characters being transmitted instead of actual newlines. This
  // caused SIP peers to reject the offer with messages like
  // "Geen bruikbare SDP/codec". Use real CRLF sequences instead.
  ].join('\r\n');
}
function parseRemoteRtp(sdp, fallbackIp) {
  if (!sdp) return null;
  // Remote SDP may contain either CRLF or LF line endings. Parse both
  // correctly by using a regex that matches real newline characters.
  const lines = sdp.split(/\r?\n/);
  let ip = null, port = null, pts = [];
  for (const ln of lines) {
    if (ln.startsWith('c=IN IP4')) ip = ln.split(' ')[2];
    if (ln.startsWith('m=audio')) {
      const parts = ln.split(' ');
      port = parseInt(parts[1], 10);
      pts = parts.slice(3).map(p => parseInt(p, 10)).filter(n => !isNaN(n));
    }
  }
  if (!ip || ip === '0.0.0.0') ip = fallbackIp || null;
  if (!(ip && port && pts.length)) return null;
  const pt = pts.find(p => p === 0 || p === 8 || p === 9);
  if (!pt) return null;
  return { ip, port, pt };
}
function buildVia(ip, port, protocol = 'UDP') {
  const params = { branch: genBranch() };
  if (protocol === 'UDP') params.rport = null;
  return { version: '2.0', protocol, host: ip, port, params };
}

async function callOnce(cfg) {
  const {
    sip_domain, sip_proxy, username, auth_id, password, realm, display_name, from_user,
    local_ip, local_sip_port, local_rtp_port, codec = 'AUTO', expires_sec, invite_timeout,
    stun_server, stun_port,
    sip_transport = 'UDP',
    to, wavPath, repeat: repeatRaw = 1, delay: delaySec = 2, logger = () => {}
  } = cfg;

  const repeat = Math.max(1, parseInt(repeatRaw, 10) || 1);
  const hangupDelay = Math.max(0, Number(delaySec) || 0);

  const transport = (sip_transport || 'UDP').toUpperCase();
  const transportParam = transport.toLowerCase();

  let public_ip = local_ip;
  let public_sip_port = local_sip_port;
  let public_rtp_port = local_rtp_port;
  if (stun_server) {
    try {
      const sipMap = await stun.discover(stun_server, stun_port || 3478, local_ip, local_sip_port);
      if (sipMap && sipMap.address) {
        public_ip = sipMap.address;
        public_sip_port = sipMap.port;
      }
      const rtpMap = await stun.discover(stun_server, stun_port || 3478, local_ip, local_rtp_port);
      if (rtpMap && rtpMap.address) {
        public_ip = rtpMap.address;
        public_rtp_port = rtpMap.port;
      }
      logger('info', `STUN public mapping: SIP ${public_ip}:${public_sip_port}, RTP ${public_rtp_port}`);
    } catch (e) {
      logger('error', `STUN failed: ${e.message || e}`);
    }
  }

  const contactUri = `sip:${from_user}@${public_ip}:${public_sip_port};transport=${transportParam}`;
  const toUri = /^\\d+$/.test(to) ? `sip:${to}@${sip_domain}` : (to.startsWith('sip:') ? to : `sip:${to}`);
  const registerToUri = `sip:${from_user}@${sip_domain}`;
  let reqUri = sip_proxy ? `sip:${sip_proxy.replace(/^sip:/,'')}` : toUri;
  if (!/;transport=/i.test(reqUri)) reqUri += `;transport=${transportParam}`;

  const authUser = auth_id || username;
  logger('info', `REGISTER naar ${sip_domain} als ${authUser}`);
  logger('info', `Start SIP socket op ${local_ip}:${local_sip_port}`);
  try {
    await sip.start({ address: local_ip, port: local_sip_port, logger, transport });
  } catch (err) {
    logger('error', `Kon SIP-poort niet binden op ${local_ip}:${local_sip_port}: ${err.code || err.message || err}`);
    if (err && err.code === 'EADDRINUSE') {
      logger('error', 'Poort al in gebruik? Controleer andere processen of pas de "local_sip_port" instelling aan.');
    }
    throw err;
  }

  try {
    const baseReq = (method, uri, extraHeaders = {}, content = '') => {
      const callId = genCallId(local_ip);
      return {
        method, uri,
        headers: {
          to:   { uri: toUri },
          from: { uri: `sip:${from_user}@${sip_domain}`, params: { tag: genTag() }, name: display_name || 'HomeyBot' },
          'call-id': callId,
          cseq: { method, seq: 1 },
          contact: [{ uri: contactUri }],
          via: [ buildVia(public_ip, public_sip_port, transport) ],
          'max-forwards': 70,
          'user-agent': 'HomeySIP-POC/0.2',
          ...extraHeaders
        },
        content
      };
    };

    // REGISTER
    await new Promise((resolve, reject) => {
      const register = baseReq('REGISTER', `sip:${sip_domain};transport=${transportParam}`, {
        to: { uri: registerToUri },
        contact: [{ uri: contactUri, params: { expires: String(expires_sec) } }],
        expires: expires_sec
      });
      logger('info', 'Send REGISTER');
      sip.send(register, (res) => {
        logger('info', `REGISTER response: ${res.status} ${res.reason || ''}`);
        if (res.status === 200) {
          logger('info', 'REGISTER 200 OK');
          return resolve();
        }
        if (res.status === 401 || res.status === 407) {
          logger('info', `REGISTER challenge: ${res.status}`);
          const hdr = res.headers['www-authenticate'] || res.headers['proxy-authenticate'];
          // Use the request's URI when calculating the digest response.
          // The previous code mistakenly referenced `register.Uri` (capital
          // "U"), which is undefined. Some SIP servers tolerate the
          // resulting `uri="undefined"` value, but others reject the
          // authentication challenge or behave unpredictably.
          const auth = buildAuthHeader(
            hdr,
            { method: 'REGISTER', uri: register.uri },
            authUser,
            password,
            realm
          );
          const hdrName = res.status === 401 ? 'authorization' : 'proxy-authorization';
          const r2 = { ...register };
          r2.headers = {
            ...register.headers,
            [hdrName]: auth,
            cseq: { method: 'REGISTER', seq: 2 },
            via: [ buildVia(local_ip, local_sip_port, transport) ]
          };
          logger('info', 'Send REGISTER with auth');
          sip.send(r2, res2 => {
            logger('info', `REGISTER with auth response: ${res2.status} ${res2.reason || ''}`);
            res2.status === 200 ? resolve() : reject(new Error('REGISTER failed: ' + res2.status));
          });
        } else {
          reject(new Error('REGISTER failed: ' + res.status));
        }
      });
    });

    // INVITE
    const invite = baseReq('INVITE', reqUri, { 'content-type': 'application/sdp' }, buildSdpOffer(public_ip, public_rtp_port, codec));
    let callId = invite.headers['call-id'];
    let cseq = invite.headers.cseq.seq;

    const pcm16 = readWavPcm16Mono16k(wavPath);
    const pcm8 = pcm16Resample(pcm16, 16000, 8000);

    let answerTs = null;
    let endReason = 'OK';

    const result = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        endReason = 'Request Timeout';
        reject(new Error('Invite timeout'));
      }, invite_timeout * 1000);

    const handle2xx = (res) => {
      const fallbackIp = (sip_proxy || sip_domain).replace(/^sip:/, '').split(':')[0];
      const remote = parseRemoteRtp(res.content, fallbackIp);
      if (!remote) {
        endReason = 'Bad SDP';
        clearTimeout(timer);
        return reject(new Error('Geen bruikbare SDP/codec'));
      }
      let encoded;
      if (remote.pt === 9) encoded = pcm16ToG722Buffer(pcm16);
      else if (remote.pt === 0) encoded = pcm16ToUlawBuffer(pcm8);
      else if (remote.pt === 8) encoded = pcm16ToAlawBuffer(pcm8);
      else {
        endReason = 'Unsupported codec';
        clearTimeout(timer);
        return reject(new Error('Geen ondersteunde codec'));
      }
      const contactHeader = Array.isArray(res.headers.contact) ? res.headers.contact[0] : res.headers.contact;
      const remoteTarget = contactHeader && (contactHeader.uri || contactHeader);
      // ACK
      const ack = {
        method: 'ACK',
        uri: remoteTarget || invite.uri,
        headers: {
          to: res.headers.to,
          from: invite.headers.from,
          'call-id': callId,
          cseq: { method: 'ACK', seq: ++cseq },
          via: [ buildVia(public_ip, public_sip_port, transport) ],
          contact: invite.headers.contact
        }
      };
      logger('info', 'Send ACK');
      sip.send(ack);
      answerTs = Date.now();
      logger('info', `Answered. RTP -> ${remote.ip}:${remote.port}`);

      startRtpStream(encoded, local_ip, local_rtp_port, remote, repeat, () => {
        const bye = {
          method: 'BYE',
          uri: remoteTarget || invite.uri,
          headers: {
            to: res.headers.to,
            from: invite.headers.from,
            'call-id': callId,
            cseq: { method: 'BYE', seq: ++cseq },
            via: [ buildVia(public_ip, public_sip_port, transport) ],
            contact: invite.headers.contact
          }
        };
        const sendBye = () => {
          logger('info', 'Send BYE');
          try { sip.send(bye); } catch (_) {}
          // Give the stack a moment to transmit the BYE before closing the socket.
          setTimeout(() => {
            try { sip.stop(); } catch (e) {}
            clearTimeout(timer);
            resolve({
              status: 'answered',
              durationMs: answerTs ? (Date.now() - answerTs) : 0,
              reason: endReason
            });
          }, 100);
        };
        if (hangupDelay > 0) {
          logger('info', `Waiting ${hangupDelay}s before hangup`);
          setTimeout(sendBye, hangupDelay * 1000);
        } else {
          sendBye();
        }
      });

      sip.recv(req => {
        if (req.method === 'BYE') {
          logger('info', 'Received BYE');
          sip.send(sip.makeResponse(req, 200, 'OK'));
          logger('info', 'Send 200 OK for BYE');
          endReason = 'Remote BYE';
        }
      });
    };

    const sendInvite = (msg, isAuth = false) => {
      logger('info', `Send INVITE${isAuth ? ' with auth' : ''}`);
      sip.send(msg, (res) => {
        if ([100,180,183].includes(res.status)) {
          logger('info', `Progress: ${res.status} ${res.reason || ''}`);
          return;
        }
        logger('info', `INVITE response: ${res.status} ${res.reason || ''}`);
        if (res.status === 200) return handle2xx(res);
        if (res.status === 486) {
          clearTimeout(timer);
          endReason = '486 Busy Here';
          return resolve({ status: 'busy', durationMs: 0, reason: endReason });
        }
        if (res.status === 480) {
          clearTimeout(timer);
          endReason = '480 Temporarily Unavailable';
          return resolve({ status: 'no-answer', durationMs: 0, reason: endReason });
        }
        if (res.status === 401 || res.status === 407) {
          logger('info', `INVITE challenge: ${res.status}`);
          const hdr = res.headers['www-authenticate'] || res.headers['proxy-authenticate'];
          const auth = buildAuthHeader(hdr, { method: 'INVITE', uri: msg.uri }, authUser, password, realm);
          const hdrName = res.status === 401 ? 'authorization' : 'proxy-authorization';
          const reinvite = { ...msg };
          reinvite.headers = { ...msg.headers, [hdrName]: auth, cseq: { method: 'INVITE', seq: ++cseq } };
          return sendInvite(reinvite, true);
        }
        clearTimeout(timer);
        endReason = `${res.status} ${res.reason || ''}`;
        reject(new Error(`INVITE failed: ${endReason}`));
      });
    };

    sendInvite(invite);
  });

    return result;
  } finally {
    try {
      logger('info', 'Stop SIP socket');
      sip.stop();
    } catch (e) {}
  }
}

function startRtpStream(encoded, localIp, localPort, remote, repeats, onDone) {
  const sock = dgram.createSocket('udp4');
  const SSRC = crypto.randomBytes(4).readUInt32BE(0);
  let seq = Math.floor(Math.random() * 65535);
  let ts  = Math.floor(Math.random() * 0xffffffff);

  const frameSize = 160; // 20ms @8kHz
  const fullBuffer = Buffer.concat(Array(Math.max(1, repeats)).fill(encoded));
  const totalFrames = Math.ceil(fullBuffer.length / frameSize);

  sock.bind(localPort, localIp, () => {
    const t0 = process.hrtime.bigint();

    function buildPkt(payload) {
      const h = Buffer.alloc(12);
      h[0] = 0x80;
      h[1] = remote.pt & 0x7f;
      h.writeUInt16BE(seq++ & 0xffff, 2);
      h.writeUInt32BE(ts >>> 0, 4);
      h.writeUInt32BE(SSRC >>> 0, 8);
      ts += frameSize;
      return Buffer.concat([h, payload]);
    }

    
     

    function sendFrame(i) {
      if (i >= totalFrames) {
        const silence = Buffer.alloc(frameSize, 0xFF);
        for (let k = 0; k < 10; k++) sock.send(buildPkt(silence), remote.port, remote.ip);
        sock.close(); onDone && onDone(); return;
      }
      const startIdx = i * frameSize;
      const chunk = fullBuffer.slice(startIdx, Math.min(startIdx + frameSize, fullBuffer.length));
      const payload = (chunk.length === frameSize) ? chunk : Buffer.concat([chunk, Buffer.alloc(frameSize - chunk.length, 0xFF)]);
      sock.send(buildPkt(payload), remote.port, remote.ip);

      const elapsedNs = Number(process.hrtime.bigint() - t0);
      const targetNs = (i + 1) * 20_000_000;
      const delayMs = Math.max(0, (targetNs - elapsedNs) / 1e6);
      setTimeout(() => sendFrame(i + 1), delayMs);
    }
    sendFrame(0);
  });
}

module.exports = { callOnce, parseAuthHeader, buildSdpOffer };
