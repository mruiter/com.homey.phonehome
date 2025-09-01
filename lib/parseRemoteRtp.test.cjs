const test = require('node:test');
const assert = require('assert');

const { parseRemoteRtp, buildSdpOffer } = require('./sip_call_play.cjs');

test('parseRemoteRtp extracts ip, port and pt', () => {
  const sdp = buildSdpOffer('1.2.3.4', 5555, 'AUTO');
  const info = parseRemoteRtp(sdp, '1.2.3.4');
  assert.deepStrictEqual(info, { ip: '1.2.3.4', port: 5555, pt: 9 });
});

test('parseRemoteRtp returns null for invalid sdp', () => {
  assert.strictEqual(parseRemoteRtp('invalid', '1.2.3.4'), null);
});
