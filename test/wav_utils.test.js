const test = require('node:test');
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { spawnSync } = require('child_process');

let ffmpeg = 'ffmpeg';
try { ffmpeg = require('ffmpeg-static') || 'ffmpeg'; } catch {}

const { ensureWavPcm16Mono8k, readWavPcm16Mono8k } = require('../lib/wav_utils');

test('ensureWavPcm16Mono8k converts mp3 to wav', async () => {
  const mp3 = path.join(os.tmpdir(), `tone_${Date.now()}.mp3`);
  spawnSync(ffmpeg, ['-f', 'lavfi', '-i', 'sine=frequency=1000:duration=0.1', mp3]);
  const out = await ensureWavPcm16Mono8k(mp3);
  const pcm = readWavPcm16Mono8k(out);
  assert.ok(pcm.length > 0);
  fs.unlinkSync(mp3);
  fs.unlinkSync(out);
});

test('ensureWavPcm16Mono8k returns original for valid wav', async () => {
  const wav = path.join(os.tmpdir(), `tone_${Date.now()}.wav`);
  spawnSync(ffmpeg, ['-f','lavfi','-i','sine=frequency=1000:duration=0.1','-ac','1','-ar','8000','-sample_fmt','s16', wav]);
  const out = await ensureWavPcm16Mono8k(wav);
  assert.strictEqual(out, wav);
  fs.unlinkSync(wav);
});
