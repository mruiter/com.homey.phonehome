const test = require('node:test');
const assert = require('assert');

const { parseAuthHeader } = require('./sip_call_play.js');

test('parseAuthHeader handles string input', () => {
  const header = 'Digest realm="sip.voipbuster.com", nonce="4000209703", algorithm=MD5';
  assert.deepStrictEqual(
    parseAuthHeader(header),
    { realm: 'sip.voipbuster.com', nonce: '4000209703', algorithm: 'MD5' }
  );
});

test('parseAuthHeader handles object input', () => {
  const header = {
    scheme: 'Digest',
    realm: '"sip.voipbuster.com"',
    nonce: '"4000209703"',
    algorithm: 'MD5'
  };
  assert.deepStrictEqual(
    parseAuthHeader(header),
    { realm: 'sip.voipbuster.com', nonce: '4000209703', algorithm: 'MD5' }
  );
});

test('parseAuthHeader handles array input', () => {
  const header = [{
    scheme: 'Digest',
    realm: '"sip.voipbuster.com"',
    nonce: '"4000209703"',
    algorithm: 'MD5'
  }];
  assert.deepStrictEqual(
    parseAuthHeader(header),
    { realm: 'sip.voipbuster.com', nonce: '4000209703', algorithm: 'MD5' }
  );
});

test('parseAuthHeader handles null', () => {
  assert.deepStrictEqual(parseAuthHeader(null), {});
});

