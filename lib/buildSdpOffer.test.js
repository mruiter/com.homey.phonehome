const test = require('node:test');
const assert = require('assert');

const { buildSdpOffer } = require('./sip_call_play.js');

test('buildSdpOffer AUTO advertises G722, PCMA and PCMU', () => {
  const sdp = buildSdpOffer('1.2.3.4', 5555, 'AUTO');
  assert.ok(sdp.includes('m=audio 5555 RTP/AVP 9 8 0 101'));
  assert.ok(sdp.includes('a=rtpmap:9 G722/8000'));
  assert.ok(sdp.includes('a=rtpmap:8 PCMA/8000'));
  assert.ok(sdp.includes('a=rtpmap:0 PCMU/8000'));
});

test('buildSdpOffer G722 advertises only G722', () => {
  const sdp = buildSdpOffer('1.2.3.4', 5555, 'G722');
  assert.ok(sdp.includes('m=audio 5555 RTP/AVP 9 101'));
  assert.ok(sdp.includes('a=rtpmap:9 G722/8000'));
});
