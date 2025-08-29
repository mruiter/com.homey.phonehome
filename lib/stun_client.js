'use strict';

const dgram = require('dgram');
const crypto = require('crypto');

async function discover(server, port = 3478, localIp, localPort, timeout = 2000) {
  return new Promise((resolve, reject) => {
    const socket = dgram.createSocket('udp4');
    const tid = crypto.randomBytes(12);
    const buf = Buffer.alloc(20);
    buf.writeUInt16BE(0x0001, 0); // Binding request
    buf.writeUInt16BE(0, 2); // length
    buf.writeUInt32BE(0x2112A442, 4); // magic cookie
    tid.copy(buf, 8);

    let timer;
    socket.on('message', msg => {
      clearTimeout(timer);
      try {
        let offset = 20;
        while (offset + 4 <= msg.length) {
          const type = msg.readUInt16BE(offset); offset += 2;
          const len = msg.readUInt16BE(offset); offset += 2;
          if (type === 0x0020 || type === 0x0001) { // XOR-MAPPED-ADDRESS or legacy MAPPED-ADDRESS
            const family = msg.readUInt8(offset + 1);
            if (family !== 0x01) break; // only IPv4
            let port;
            let ip;
            if (type === 0x0020) {
              port = msg.readUInt16BE(offset + 2) ^ 0x2112;
              const xaddr = msg.readUInt32BE(offset + 4) ^ 0x2112A442;
              ip = [xaddr >>> 24 & 0xff, xaddr >>> 16 & 0xff, xaddr >>> 8 & 0xff, xaddr & 0xff].join('.');
            } else {
              port = msg.readUInt16BE(offset + 2);
              ip = `${msg[offset + 4]}.${msg[offset + 5]}.${msg[offset + 6]}.${msg[offset + 7]}`;
            }
            socket.close();
            return resolve({ address: ip, port });
          }
          offset += len + (len % 4 ? 4 - (len % 4) : 0);
        }
        socket.close();
        reject(new Error('No MAPPED-ADDRESS in STUN response'));
      } catch (e) {
        socket.close();
        reject(e);
      }
    });
    socket.on('error', err => {
      clearTimeout(timer);
      socket.close();
      reject(err);
    });
    socket.bind(localPort, localIp, () => {
      socket.send(buf, port, server);
    });
    timer = setTimeout(() => {
      socket.close();
      reject(new Error('STUN timeout'));
    }, timeout);
  });
}

module.exports = { discover };
