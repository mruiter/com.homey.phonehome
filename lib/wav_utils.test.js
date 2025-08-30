const test = require('node:test');
const assert = require('assert');
const fs = require('fs');
const os = require('os');
const path = require('path');
const { ensureWavPcm16Mono8k, readWavPcm16Mono8k, writeWavPcm16Mono8k } = require('./wav_utils');

const TONE_MP3_BASE64 = 'SUQzBAAAAAAAI1RTU0UAAAAPAAADTGF2ZjYwLjE2LjEwMAAAAAAAAAAAAAAA//tAwAAAAAAAAAAAAAAAAAAAAAAASW5mbwAAAA8AAAAFAAAEygBRUVFRUVFRUVFRUVFRUVFRUVFRfX19fX19fX19fX19fX19fX19fX2oqKioqKioqKioqKioqKioqKioqNTU1NTU1NTU1NTU1NTU1NTU1NTU//////////////////////////8AAAAATGF2YzYwLjMxAAAAAAAAAAAAAAAAJAMGAAAAAAAABMouNstvAAAAAAD/+1DEAAAKZFMyNZeAAWiVZsM5EAAfi5ZcsuWXLLloPrrctQMuI2oJLNeE6bTvtOmM2TwcWTRgLYPQQguB0KBkfv1er1ezv496Uo8iAgcg+D78QbuX6QxwG/SCGoBn9IIcBn9IY5f3dIJBhhEMb3+zFpEMWFHRgNAeYDJ58aQGLyAYfr5ICD5r0MTgkBHA4VcAAh+wZa/DIw5IskVr/kOHOGWJkiv/kBMiLEWMS7/+XTIvF5FEx/g0FQVER7/WCoiPBpWAABx1Vr+/uIAoCkwG//tSxAaAClQtFT3sAAFnCWFVn+kKARTBUBHMDoBMwKAbzDGF5MiQjMyLOrTigR4MVsIMwkgOzA6BTMCQAgCKBZlTRteO0Ua+min9en/q/+/6Pf39C9PblOnpdgAAP1hkh0PIEwRjMXN1w9/jAWAHcwLsEyMLSXmTd4A44wXYC/P3GNcTGgyyUJSmsPc1r//ev7/6t6U8U9DoXaKRm1PeKp9qLPRuQ4n742Z/f3Nd4rG2/09NCv/eioKM0LBpQwSMzKI4bgwHYBXMEFA1DD5kI07/+1LEDgAMMFMIDX4ogS+FonGv6UCO4J4MIMAzAtwCIMApQEAdgL8E0H6kCrs+p0FVmy8/UPZ3zhJv0Mex4ubX3okLdM2OQOb0xRVykU2jdhpLm2xeuzu4z6IgAAASO109/elElZ0CiAGXOAR4Iuk/4whYDINZ0ABxYIkE2YREAxNBOvCC7g5tmilafNcz6r60q+hrrvYkqpC3dCkt7+Zbpe/7df9FcAAACABe6/RVADEQMQAwXDSwAFYiaIPHczZheBswb5oEBmDEAMxw5SZ8P/7UsQVAgsQLQ0t/2oBUAWipr2QALGPiZgYSXAXPGFtzcQn0Ujb5aqYo1RrXp3da6/uum7vp990x0CyVIfUTVV/Qz7wGDtqu8/jdg4BcwBQLzBDAjAICpgWAIGDsJwY0wrRivXMHuYbWYQgsRh2A/GEADoNAoDhxxHFtGoK2vpo1cbXM6948//p1/fXfdqru7v8Uq602L6FDTgKHb8nzHgsFokEAA/yyhgQE4LOfMBOAcSGw18MuiZaVw8ae2I0KlgUaZAAPzC4MniAsVDMMFg2//tSxByAEaTxV7m5ABDehuHPmJAAOCyBKI6hBZ3QYLKAGHImXxziiRUivxcIYDE5haADcBDhzhzjEu/kQGbHPImMwQQmUkkqv5OEHJ83JxBBJEul0yLxFv++tN0EGRRMREFRvy4fBAB3AAKSXNEoShKMnmSSTUMEQOlmAyfEECJ8BQAgS5ZE1waBrZwV5Y8r9T1f/EXKnV4NWf///okqjylMQU1FMy4xMDBVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVVU=';

test('ensureWavPcm16Mono8k converts mp3 to wav', async () => {
  const mp3 = path.join(os.tmpdir(), `tone_${Date.now()}.mp3`);
  fs.writeFileSync(mp3, Buffer.from(TONE_MP3_BASE64, 'base64'));
  const out = await ensureWavPcm16Mono8k(mp3);
  const pcm = readWavPcm16Mono8k(out);
  assert.ok(pcm.length > 0);
  fs.unlinkSync(out);
  fs.unlinkSync(mp3);
});

test('ensureWavPcm16Mono8k handles mp3 with wav extension', async () => {
  const fakeWav = path.join(os.tmpdir(), `tone_${Date.now()}.wav`);
  fs.writeFileSync(fakeWav, Buffer.from(TONE_MP3_BASE64, 'base64'));
  const out = await ensureWavPcm16Mono8k(fakeWav);
  const pcm = readWavPcm16Mono8k(out);
  assert.ok(pcm.length > 0);
  fs.unlinkSync(out);
  fs.unlinkSync(fakeWav);
});

test('ensureWavPcm16Mono8k returns original for valid wav', async () => {
  const wav = path.join(os.tmpdir(), `tone_${Date.now()}.wav`);
  const samples = new Int16Array(800);
  writeWavPcm16Mono8k(wav, samples);
  const out = await ensureWavPcm16Mono8k(wav);
  assert.strictEqual(out, wav);
  fs.unlinkSync(wav);
});

test('ensureWavPcm16Mono8k converts wav with different sample rate', async () => {
  const wav = path.join(os.tmpdir(), `tone_${Date.now()}.wav`);
  const samples = new Int16Array(1600);
  writeWavPcm16Mono8k(wav, samples);
  const fd = fs.openSync(wav, 'r+');
  const buf = Buffer.alloc(4);
  buf.writeUInt32LE(16000, 0);
  fs.writeSync(fd, buf, 0, 4, 24); // sample rate
  buf.writeUInt32LE(16000 * 2, 0);
  fs.writeSync(fd, buf, 0, 4, 28); // byte rate
  fs.closeSync(fd);

  const out = await ensureWavPcm16Mono8k(wav);
  const pcm = readWavPcm16Mono8k(out);
  assert.ok(pcm.length > 0);
  fs.unlinkSync(out);
  fs.unlinkSync(wav);
});
