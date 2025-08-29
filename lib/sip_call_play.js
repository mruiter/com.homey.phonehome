'use strict';

const sip = require('./minisip');
const dgram = require('dgram');
const crypto = require('crypto');
const { readWavPcm16Mono8k, pcm16ToUlawBuffer } = require('./wav_utils');

function genBranch() { return 'z9hG4bK-' + crypto.randomBytes(8).toString('hex'); }
function genTag()    { return crypto.randomBytes(8).toString('hex'); }
function genCallId(ip){ return crypto.randomBytes(10).toString('hex') + '@' + ip; }

function parseAuthHeader(h) {
  const out = {};
  (h || '').replace(/^Digest\s+/i, '').split(',').forEach(part => {
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
  const realm = realmOverride || a.realm;
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

function buildSdpOffer(localIp, rtpPort) {
  return [
    'v=0',
    `o=- 0 0 IN IP4 ${localIp}`,
    's=-',
    `c=IN IP4 ${localIp}`,
    't=0 0',
    `m=audio ${rtpPort} RTP/AVP 0`,
    'a=rtpmap:0 PCMU/8000',
    'a=ptime:20',
    'a=sendonly'
  ].join('\\r\\n');
}
function parseRemoteRtp(sdp) {
  if (!sdp) return null;
  const lines = sdp.split(/\\r?\\n/);
  let ip = null, port = null, hasPcmu = false;
  for (const ln of lines) {
    if (ln.startsWith('c=IN IP4')) ip = ln.split(' ')[2];
    if (ln.startsWith('m=audio')) {
      const parts = ln.split(' ');
      port = parseInt(parts[1], 10);
      if (parts.slice(3).includes('0')) hasPcmu = true;
    }
  }
  if (ip && port && hasPcmu) return { ip, port };
  return null;
}
function buildVia(ip, port) {
  return { version: '2.0', protocol: 'UDP', host: ip, port, params: { branch: genBranch(), rport: null } };
}

async function callOnce(cfg) {
  const {
    sip_domain, sip_proxy, username, password, realm, display_name, from_user,
    local_ip, local_sip_port, local_rtp_port, expires_sec, invite_timeout,
    to, wavPath, logger = () => {}
  } = cfg;

  const contactUri = `sip:${from_user}@${local_ip}:${local_sip_port}`;
  const toUri = /^\\d+$/.test(to) ? `sip:${to}@${sip_domain}` : (to.startsWith('sip:') ? to : `sip:${to}`);
  const registerToUri = `sip:${from_user}@${sip_domain}`;
  const reqUri = sip_proxy ? `sip:${sip_proxy.replace(/^sip:/,'')}` : toUri;

  logger('info', `REGISTER naar ${sip_domain} als ${username}`);
  logger('info', `Start SIP socket op ${local_ip}:${local_sip_port}`);
  try {
    await sip.start({ address: local_ip, port: local_sip_port, logger });
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
          via: [ buildVia(local_ip, local_sip_port) ],
          'max-forwards': 70,
          'user-agent': 'HomeySIP-POC/0.2',
          ...extraHeaders
        },
        content
      };
    };

    // REGISTER
    await new Promise((resolve, reject) => {
      const register = baseReq('REGISTER', `sip:${sip_domain}`, {
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
          const auth = buildAuthHeader(
            hdr,
            { method: 'REGISTER', uri: registerToUri },
            username,
            password,
            realm
          );
          const hdrName = res.status === 401 ? 'authorization' : 'proxy-authorization';
          const r2 = { ...register };
          r2.headers = {
            ...register.headers,
            [hdrName]: auth,
            cseq: { method: 'REGISTER', seq: 2 },
            via: [ buildVia(local_ip, local_sip_port) ]
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
    const invite = baseReq('INVITE', reqUri, { 'content-type': 'application/sdp' }, buildSdpOffer(local_ip, local_rtp_port));
    let callId = invite.headers['call-id'];
    let cseq = invite.headers.cseq.seq;

    const pcm = readWavPcm16Mono8k(wavPath);
    const ulaw = pcm16ToUlawBuffer(pcm);

    let answerTs = null;
    let endReason = 'OK';

    const result = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        endReason = 'Request Timeout';
        reject(new Error('Invite timeout'));
      }, invite_timeout * 1000);

    const handle2xx = (res) => {
      const remote = parseRemoteRtp(res.content);
      if (!remote) {
        endReason = 'Bad SDP';
        clearTimeout(timer);
        return reject(new Error('Geen bruikbare SDP/rtpmap:0'));
      }
      // ACK
      const ack = {
        method: 'ACK',
        uri: invite.uri,
        headers: {
          to: res.headers.to,
          from: invite.headers.from,
          'call-id': callId,
          cseq: { method: 'ACK', seq: ++cseq },
          via: [ buildVia(local_ip, local_sip_port) ],
          contact: invite.headers.contact
        }
      };
      logger('info', 'Send ACK');
      sip.send(ack);
      answerTs = Date.now();
      logger('info', `Answered. RTP -> ${remote.ip}:${remote.port}`);

      startRtpStream(ulaw, local_ip, local_rtp_port, remote, () => {
        const bye = {
          method: 'BYE',
          uri: invite.uri,
          headers: {
            to: res.headers.to,
            from: invite.headers.from,
            'call-id': callId,
            cseq: { method: 'BYE', seq: ++cseq },
            via: [ buildVia(local_ip, local_sip_port) ],
            contact: invite.headers.contact
          }
        };
        logger('info', 'Send BYE');
        sip.send(bye);
        clearTimeout(timer);
        resolve({
          status: 'answered',
          durationMs: answerTs ? (Date.now() - answerTs) : 0,
          reason: endReason
        });
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
          const auth = buildAuthHeader(hdr, { method: 'INVITE', uri: msg.uri }, username, password, realm);
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

function startRtpStream(ulaw, localIp, localPort, remote, onDone) {
  const sock = dgram.createSocket('udp4');
  const SSRC = crypto.randomBytes(4).readUInt32BE(0);
  let seq = Math.floor(Math.random() * 65535);
  let ts  = Math.floor(Math.random() * 0xffffffff);

  const frameSize = 160; // 20ms @8kHz
  const totalFrames = Math.ceil(ulaw.length / frameSize);

  sock.bind(localPort, localIp, () => {
    const t0 = process.hrtime.bigint();

    function buildPkt(payload) {
      const h = Buffer.alloc(12);
      h[0] = 0x80;
      h[1] = 0x00; // PT=0 (PCMU)
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
      const chunk = ulaw.slice(startIdx, Math.min(startIdx + frameSize, ulaw.length));
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

module.exports = { callOnce };
