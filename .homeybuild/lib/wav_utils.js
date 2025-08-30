'use strict';
const fs = require('fs');
const { spawn } = require('child_process');
const path = require('path');
const os = require('os');
const ffmpegPath = require('./ffmpeg-path');
const { MPEGDecoder } = require('mpg123-decoder');

function readWavPcm16Mono8k(path) {
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
  if (sampleRate !== 8000) throw new Error('8000 Hz vereist');
  if (bitsPerSample !== 16) throw new Error('16-bit PCM vereist');

  const available = Math.max(0, Math.min(data.size, buf.length - data.offset));
  const samples = Math.floor(available / 2);
  const pcm = new Int16Array(samples);
  for (let i = 0; i < samples; i++) {
    pcm[i] = buf.readInt16LE(data.offset + i * 2);
  }
  return pcm;
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

async function ensureWavPcm16Mono8k(srcPath) {
  try {
    readWavPcm16Mono8k(srcPath);
    return srcPath;
  } catch (e) {
    const ext = path.extname(srcPath).toLowerCase();
    if (ext === '.mp3') {
      const pcm = await decodeMp3ToPcm16Mono8k(srcPath);
      const dest = path.join(os.tmpdir(), `voip_${Date.now()}.wav`);
      writeWavPcm16Mono8k(dest, pcm);
      readWavPcm16Mono8k(dest);
      return dest;
    }
    const dest = path.join(os.tmpdir(), `voip_${Date.now()}.wav`);
    await new Promise((resolve, reject) => {
      const proc = spawn(ffmpegPath, ['-y', '-i', srcPath, '-ac', '1', '-ar', '8000', '-sample_fmt', 's16', dest]);
      proc.on('error', reject);
      proc.on('close', code => code === 0 ? resolve() : reject(new Error('ffmpeg exit ' + code)));
    });
    readWavPcm16Mono8k(dest);
    return dest;
  }
}

async function decodeMp3ToPcm16Mono8k(mp3Path) {
  const decoder = new MPEGDecoder();
  await decoder.ready;
  const mp3 = fs.readFileSync(mp3Path);
  const { channelData, sampleRate } = decoder.decode(mp3);
  const mono = mergeChannels(channelData);
  const resampled = resampleFloat32(mono, sampleRate, 8000);
  return floatToInt16(resampled);
}

function mergeChannels(channels) {
  if (channels.length === 1) return channels[0];
  const length = channels[0].length;
  const out = new Float32Array(length);
  for (let i = 0; i < length; i++) {
    let sum = 0;
    for (const ch of channels) sum += ch[i];
    out[i] = sum / channels.length;
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
  const out = new Int16Array(data.length);
  for (let i = 0; i < data.length; i++) {
    let s = data[i];
    if (s > 1) s = 1;
    if (s < -1) s = -1;
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

module.exports = { readWavPcm16Mono8k, pcm16ToUlawBuffer, pcm16ToAlawBuffer, ensureWavPcm16Mono8k };
