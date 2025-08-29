'use strict';

const sip = require('sip');

class SipStack {
  constructor() {
    this.logger = () => {};
    this.requestHandlers = [];
  }

  async start({ address, port, logger, transport = 'UDP' }) {
    this.logger = logger || (() => {});
    this.requestHandlers = [];
    sip.start({
      address,
      port,
      udp: transport === 'UDP',
      tcp: transport === 'TCP',
      logger: {
        send: (msg, rinfo) => {
          try {
            const dest = rinfo || {};
            this.logger('debug', `SIP send to ${dest.address || dest.host || ''}:${dest.port || ''}\n${sip.stringify(msg)}`);
          } catch (e) {}
        },
        recv: (msg, rinfo) => {
          try {
            const src = rinfo || {};
            this.logger('debug', `SIP recv from ${src.address || src.host || ''}:${src.port || ''}\n${sip.stringify(msg)}`);
          } catch (e) {}
        },
        error: (e) => {
          try {
            const err = e && e.message ? e.message : e;
            this.logger('error', `SIP stack error: ${err}`);
          } catch (_) {}
        }
      }
    }, rq => {
      this.requestHandlers.forEach(fn => fn(rq));
    });
  }

  stop() {
    try { sip.stop(); } catch (e) {}
    this.requestHandlers = [];
  }

  send(msg, cb) {
    sip.send(msg, res => {
      this.logger('debug', `SIP response\n${sip.stringify(res)}`);
      if (cb) cb(res);
    });
  }

  recv(fn) {
    this.requestHandlers.push(fn);
  }

  makeResponse(req, code, reason = 'OK') {
    return sip.makeResponse(req, code, reason);
  }
}

module.exports = new SipStack();
