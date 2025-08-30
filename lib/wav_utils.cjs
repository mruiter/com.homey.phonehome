'use strict';
const fs = require('fs');
const path = require('path');
const os = require('os');
const crypto = require('crypto');

// `mpg123-decoder` is an ES module. In a CommonJS environment we
// need to use a dynamic import to load it. This avoids `require()`
// errors when decoding MP3 files.
let MPEGDecoder;
let OggVorbisDecoder;
let FlacDecoder;

function readWavPcm16Mono(path, expectedRate) {
  const buf = fs.readFileSync(path);
  if (buf.slice(0,4).toString() !== 'RIFF' || buf.slice(8,12).toString() !== 'WAVE') {
    throw new Error('Geen geldige WAV (RIFF/WAVE)');
  }
  let offset = 12;
  let fmt, data;
  while (offset < buf.length) {
    const id = buf.slice(offset, offset + 4).toString();
    const size = buf.readUInt32LE(offset + 4);
    if (id === 'fmt ') fmt = { offset: offset + 8, size };
    if (id === 'data') data = { offset: offset + 8, size };
    offset += 8 + size + (size % 2); // chunks are padded to even length
  }
  if (!fmt || !data) throw new Error('fmt of data chunk ontbreekt');
  const audioFormat   = buf.readUInt16LE(fmt.offset + 0);
  const numChannels   = buf.readUInt16LE(fmt.offset + 2);
  const sampleRate    = buf.readUInt32LE(fmt.offset + 4);
  const bitsPerSample = buf.readUInt16LE(fmt.offset + 14);
  if (audioFormat !== 1) throw new Error('Alleen PCM ondersteund');
  if (numChannels !== 1) throw new Error('Mono vereist');
  if (sampleRate !== expectedRate) throw new Error(`${expectedRate} Hz vereist`);
  if (bitsPerSample !== 16) throw new Error('16-bit PCM vereist');

  const available = Math.max(0, Math.min(data.size, buf.length - data.offset));
  const samples = Math.floor(available / 2);
  const pcm = new Int16Array(samples);
  for (let i = 0; i < samples; i++) {
    pcm[i] = buf.readInt16LE(data.offset + i * 2);
  }
  return pcm;
}

function readWavPcm16Mono8k(path) {
  return readWavPcm16Mono(path, 8000);
}

function readWavPcm16Mono16k(path) {
  return readWavPcm16Mono(path, 16000);
}

function linearToUlaw(sample) {
  let s = sample;
  if (s > 32767) s = 32767;
  if (s < -32768) s = -32768;
  const BIAS = 0x84; const CLIP = 32635;
  const sign = (s < 0) ? 0x80 : 0x00;
  if (s < 0) s = -s;
  if (s > CLIP) s = CLIP;
  s = s + BIAS;
  let exponent = 7;
  for (let exp = 7; exp > 0; exp--) {
    if (s & (1 << (exp + 6))) { exponent = exp; break; }
  }
  const mantissa = (s >> (exponent + 3)) & 0x0F;
  return ~(sign | (exponent << 4) | mantissa) & 0xFF;
}

function linearToAlaw(sample) {
  let s = sample;
  if (s > 32767) s = 32767;
  if (s < -32768) s = -32768;
  const sign = (s < 0) ? 0x80 : 0x00;
  if (s < 0) s = -s;
  let exponent = 7;
  for (let exp = 7; exp > 0; exp--) {
    if (s & (1 << (exp + 4))) { exponent = exp; break; }
  }
  let mantissa;
  if (s < 16) {
    mantissa = s << 4;
    exponent = -1;
  } else {
    mantissa = (s >> (exponent + 3)) & 0x0F;
  }
  const alaw = (exponent << 4) | mantissa;
  return (alaw ^ 0x55) | sign;
}

function pcm16ToUlawBuffer(pcm) {
  const out = Buffer.allocUnsafe(pcm.length);
  for (let i = 0; i < pcm.length; i++) out[i] = linearToUlaw(pcm[i]);
  return out;
}

function pcm16ToAlawBuffer(pcm) {
  const out = Buffer.allocUnsafe(pcm.length);
  for (let i = 0; i < pcm.length; i++) out[i] = linearToAlaw(pcm[i]);
  return out;
}

async function ensureWavPcm16Mono(srcPath, targetRate, logger = () => {}, cacheDays = 0) {
  const cacheMs = cacheDays > 0 ? cacheDays * 24 * 60 * 60 * 1000 : 0;
  let cacheFile = null;
  if (cacheMs) {
    try {
      const buf = fs.readFileSync(srcPath);
      const hash = crypto.createHash('md5').update(buf).digest('hex');
      const cacheDir = path.join(os.tmpdir(), 'voip_cache');
      fs.mkdirSync(cacheDir, { recursive: true });
      cacheFile = path.join(cacheDir, `${hash}_${targetRate}.wav`);
      try {
        const st = fs.statSync(cacheFile);
        if (Date.now() - st.mtimeMs < cacheMs) {
          logger('info', '100%: gebruik cache');
          return cacheFile;
        }
        fs.unlinkSync(cacheFile);
      } catch {}
    } catch {}
  }

  logger('info', `0%: controleer ${srcPath}`);
  try {
    readWavPcm16Mono(srcPath, targetRate);
    logger('info', '100%: geen conversie nodig');
    if (cacheFile) fs.copyFileSync(srcPath, cacheFile);
    return cacheFile || srcPath;
  } catch (e) {
    logger('info', 'Conversie vereist');
    if (e.message && (
      e.message.includes('Mono vereist') ||
      e.message.includes('8000 Hz vereist') ||
      e.message.includes('16000 Hz vereist') ||
      e.message.includes('16-bit PCM vereist') ||
      e.message.includes('Alleen PCM ondersteund')
    )) {
      try {
        logger('info', '10%: WAV converteren');
        const pcm = targetRate === 8000 ? decodeWavToPcm16Mono8k(srcPath) : decodeWavToPcm16Mono16k(srcPath);
        logger('info', '60%: WAV gedecodeerd');
        const dest = cacheFile || path.join(os.tmpdir(), `voip_${Date.now()}.wav`);
        (targetRate===8000?writeWavPcm16Mono8k:writeWavPcm16Mono16k)(dest, pcm);
        readWavPcm16Mono(dest, targetRate);
        logger('info', '100%: conversie gereed');
        return dest;
      } catch (err) {
        logger('error', `WAV conversie mislukt: ${err.message || err}`);
      }
    }
    const decoders = [
      { name: 'MP3', fn: targetRate===8000?decodeMp3ToPcm16Mono8k:decodeMp3ToPcm16Mono16k },
      { name: 'OGG', fn: targetRate===8000?decodeOggToPcm16Mono8k:decodeOggToPcm16Mono16k },
      { name: 'FLAC', fn: targetRate===8000?decodeFlacToPcm16Mono8k:decodeFlacToPcm16Mono16k }
    ];
    for (const d of decoders) {
      try {
        logger('info', `10%: probeer ${d.name}`);
        const pcm = await d.fn(srcPath);
        logger('info', `60%: ${d.name} gedecodeerd`);
        const dest = cacheFile || path.join(os.tmpdir(), `voip_${Date.now()}.wav`);
        (targetRate===8000?writeWavPcm16Mono8k:writeWavPcm16Mono16k)(dest, pcm);
        readWavPcm16Mono(dest, targetRate);
        logger('info', '100%: conversie gereed');
        return dest;
      } catch (err) {
        logger('error', `${d.name} conversie mislukt: ${err.message || err}`);
      }
    }
    logger('error', `Conversie mislukt: ${e.message || e}`);
    throw e;
  }
}

function ensureWavPcm16Mono8k(srcPath, logger, cacheDays) { return ensureWavPcm16Mono(srcPath, 8000, logger, cacheDays); }
function ensureWavPcm16Mono16k(srcPath, logger, cacheDays) { return ensureWavPcm16Mono(srcPath, 16000, logger, cacheDays); }

async function decodeMp3ToPcm16Mono8k(mp3Path) {
  if (!MPEGDecoder) {
    ({ MPEGDecoder } = await import('mpg123-decoder'));
  }
  const decoder = new MPEGDecoder();
  await decoder.ready;
  const mp3 = fs.readFileSync(mp3Path);
  const { channelData, sampleRate } = decoder.decode(mp3);
  const mono = mergeChannels(channelData);
  const resampled = resampleFloat32(mono, sampleRate, 8000);
  return floatToInt16(resampled);
}

async function decodeMp3ToPcm16Mono16k(mp3Path) {
  if (!MPEGDecoder) ({ MPEGDecoder } = await import('mpg123-decoder'));
  const decoder = new MPEGDecoder();
  await decoder.ready;
  const mp3 = fs.readFileSync(mp3Path);
  const { channelData, sampleRate } = decoder.decode(mp3);
  const mono = mergeChannels(channelData);
  const resampled = resampleFloat32(mono, sampleRate, 16000);
  return floatToInt16(resampled);
}

async function decodeOggToPcm16Mono8k(oggPath) {
  if (!OggVorbisDecoder) ({ OggVorbisDecoder } = await import('@wasm-audio-decoders/ogg-vorbis'));
  const decoder = new OggVorbisDecoder();
  await decoder.ready;
  const ogg = fs.readFileSync(oggPath);
  const { channelData, sampleRate } = decoder.decode(ogg);
  const mono = mergeChannels(channelData);
  const resampled = resampleFloat32(mono, sampleRate, 8000);
  return floatToInt16(resampled);
}

async function decodeOggToPcm16Mono16k(oggPath) {
  if (!OggVorbisDecoder) ({ OggVorbisDecoder } = await import('@wasm-audio-decoders/ogg-vorbis'));
  const decoder = new OggVorbisDecoder();
  await decoder.ready;
  const ogg = fs.readFileSync(oggPath);
  const { channelData, sampleRate } = decoder.decode(ogg);
  const mono = mergeChannels(channelData);
  const resampled = resampleFloat32(mono, sampleRate, 16000);
  return floatToInt16(resampled);
}

async function decodeFlacToPcm16Mono8k(flacPath) {
  if (!FlacDecoder) ({ FlacDecoder } = await import('@wasm-audio-decoders/flac'));
  const decoder = new FlacDecoder();
  await decoder.ready;
  const flac = fs.readFileSync(flacPath);
  const { channelData, sampleRate } = decoder.decode(flac);
  const mono = mergeChannels(channelData);
  const resampled = resampleFloat32(mono, sampleRate, 8000);
  return floatToInt16(resampled);
}

async function decodeFlacToPcm16Mono16k(flacPath) {
  if (!FlacDecoder) ({ FlacDecoder } = await import('@wasm-audio-decoders/flac'));
  const decoder = new FlacDecoder();
  await decoder.ready;
  const flac = fs.readFileSync(flacPath);
  const { channelData, sampleRate } = decoder.decode(flac);
  const mono = mergeChannels(channelData);
  const resampled = resampleFloat32(mono, sampleRate, 16000);
  return floatToInt16(resampled);
}

function decodeWavToPcm16Mono8k(wavPath) {
  const buf = fs.readFileSync(wavPath);
  if (buf.slice(0,4).toString() !== 'RIFF' || buf.slice(8,12).toString() !== 'WAVE') {
    throw new Error('Geen geldige WAV (RIFF/WAVE)');
  }
  let offset = 12;
  let fmt, data;
  while (offset < buf.length) {
    const id = buf.slice(offset, offset + 4).toString();
    const size = buf.readUInt32LE(offset + 4);
    if (id === 'fmt ') fmt = { offset: offset + 8, size };
    if (id === 'data') data = { offset: offset + 8, size };
    offset += 8 + size + (size % 2);
  }
  if (!fmt || !data) throw new Error('fmt of data chunk ontbreekt');
  const audioFormat   = buf.readUInt16LE(fmt.offset + 0);
  const numChannels   = buf.readUInt16LE(fmt.offset + 2);
  const sampleRate    = buf.readUInt32LE(fmt.offset + 4);
  const bitsPerSample = buf.readUInt16LE(fmt.offset + 14);
  if (audioFormat !== 1) throw new Error('Alleen PCM ondersteund');
  if (bitsPerSample !== 16) throw new Error('16-bit PCM vereist');

  const available = Math.max(0, Math.min(data.size, buf.length - data.offset));
  const frames = Math.floor(available / (numChannels * 2));
  const mono = new Float32Array(frames);
  for (let i = 0; i < frames; i++) {
    let sum = 0;
    for (let ch = 0; ch < numChannels; ch++) {
      const sample = buf.readInt16LE(data.offset + (i * numChannels + ch) * 2);
      sum += sample / 0x8000;
    }
    mono[i] = sum / numChannels;
  }
  const resampled = resampleFloat32(mono, sampleRate, 8000);
  return floatToInt16(resampled);
}

function decodeWavToPcm16Mono16k(wavPath) {
  const buf = fs.readFileSync(wavPath);
  if (buf.slice(0,4).toString() !== 'RIFF' || buf.slice(8,12).toString() !== 'WAVE') {
    throw new Error('Geen geldige WAV (RIFF/WAVE)');
  }
  let offset = 12; let fmt, data;
  while (offset < buf.length) {
    const id = buf.slice(offset, offset + 4).toString();
    const size = buf.readUInt32LE(offset + 4);
    if (id === 'fmt ') fmt = { offset: offset + 8, size };
    if (id === 'data') data = { offset: offset + 8, size };
    offset += 8 + size + (size % 2);
  }
  if (!fmt || !data) throw new Error('fmt of data chunk ontbreekt');
  const audioFormat = buf.readUInt16LE(fmt.offset + 0);
  const numChannels = buf.readUInt16LE(fmt.offset + 2);
  const sampleRate = buf.readUInt32LE(fmt.offset + 4);
  const bitsPerSample = buf.readUInt16LE(fmt.offset + 14);
  if (audioFormat !== 1) throw new Error('Alleen PCM ondersteund');
  if (bitsPerSample !== 16) throw new Error('16-bit PCM vereist');

  const available = Math.max(0, Math.min(data.size, buf.length - data.offset));
  const frames = Math.floor(available / (numChannels * 2));
  const mono = new Float32Array(frames);
  for (let i = 0; i < frames; i++) {
    let sum = 0;
    for (let ch = 0; ch < numChannels; ch++) {
      const sample = buf.readInt16LE(data.offset + (i * numChannels + ch) * 2);
      sum += sample / 0x8000;
    }
    mono[i] = sum / numChannels;
  }
  const resampled = resampleFloat32(mono, sampleRate, 16000);
  return floatToInt16(resampled);
}

function mergeChannels(channels) {
  const numChannels = channels.length;
  if (numChannels === 1) return channels[0];
  const length = channels[0].length;
  const out = new Float32Array(length);
  const inv = 1 / numChannels;
  for (let i = 0; i < length; i++) {
    let sum = 0;
    for (let c = 0; c < numChannels; c++) {
      sum += channels[c][i];
    }
    out[i] = sum * inv;
  }
  return out;
}

function resampleFloat32(data, inRate, outRate) {
  if (inRate === outRate) return data;
  const ratio = inRate / outRate;
  const newLen = Math.floor(data.length / ratio);
  const out = new Float32Array(newLen);
  for (let i = 0; i < newLen; i++) {
    const pos = i * ratio;
    const i0 = Math.floor(pos);
    const i1 = Math.min(i0 + 1, data.length - 1);
    const frac = pos - i0;
    out[i] = data[i0] * (1 - frac) + data[i1] * frac;
  }
  return out;
}

function floatToInt16(data) {
  const len = data.length;
  const out = new Int16Array(len);
  for (let i = 0; i < len; i++) {
    let s = data[i];
    if (s > 1) s = 1;
    else if (s < -1) s = -1;
    out[i] = s < 0 ? s * 0x8000 : s * 0x7FFF;
  }
  return out;
}

function writeWavPcm16Mono8k(dest, pcm) {
  const header = Buffer.alloc(44);
  const dataSize = pcm.length * 2;
  header.write('RIFF', 0);
  header.writeUInt32LE(36 + dataSize, 4);
  header.write('WAVE', 8);
  header.write('fmt ', 12);
  header.writeUInt32LE(16, 16);
  header.writeUInt16LE(1, 20);
  header.writeUInt16LE(1, 22);
  header.writeUInt32LE(8000, 24);
  header.writeUInt32LE(8000 * 2, 28);
  header.writeUInt16LE(2, 32);
  header.writeUInt16LE(16, 34);
  header.write('data', 36);
  header.writeUInt32LE(dataSize, 40);
  const pcmBuf = Buffer.alloc(dataSize);
  for (let i = 0; i < pcm.length; i++) pcmBuf.writeInt16LE(pcm[i], i * 2);
  fs.writeFileSync(dest, Buffer.concat([header, pcmBuf]));
}

function writeWavPcm16Mono16k(dest, pcm) {
  const header = Buffer.alloc(44);
  const dataSize = pcm.length * 2;
  header.write('RIFF',0); header.writeUInt32LE(36 + dataSize,4);
  header.write('WAVE',8); header.write('fmt ',12);
  header.writeUInt32LE(16,16); header.writeUInt16LE(1,20);
  header.writeUInt16LE(1,22); header.writeUInt32LE(16000,24);
  header.writeUInt32LE(16000 * 2,28);
  header.writeUInt16LE(2,32); header.writeUInt16LE(16,34);
  header.write('data',36); header.writeUInt32LE(dataSize,40);
  const pcmBuf = Buffer.alloc(dataSize);
  for (let i=0;i<pcm.length;i++) pcmBuf.writeInt16LE(pcm[i], i*2);
  fs.writeFileSync(dest, Buffer.concat([header, pcmBuf]));
}

function pcm16Resample(pcm, inRate, outRate) {
  const f = new Float32Array(pcm.length);
  for (let i=0;i<pcm.length;i++) f[i]=pcm[i]/0x8000;
  const resampled = resampleFloat32(f, inRate, outRate);
  return floatToInt16(resampled);
}

module.exports = { readWavPcm16Mono8k, readWavPcm16Mono16k, pcm16ToUlawBuffer, pcm16ToAlawBuffer, ensureWavPcm16Mono8k, ensureWavPcm16Mono16k, writeWavPcm16Mono8k, writeWavPcm16Mono16k, pcm16Resample };
