const test = require('node:test');
const assert = require('assert');

const { buildSdpOffer } = require('./sip_call_play');

test('buildSdpOffer AUTO advertises both PCMA and PCMU', () => {
  const sdp = buildSdpOffer('1.2.3.4', 5555, 'AUTO');
  assert.ok(sdp.includes('m=audio 5555 RTP/AVP 8 0 101'));
  assert.ok(sdp.includes('a=rtpmap:8 PCMA/8000'));
  assert.ok(sdp.includes('a=rtpmap:0 PCMU/8000'));
});
