'use strict';
const fs = require('fs');
const { spawn } = require('child_process');
const path = require('path');
const os = require('os');

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
    let ffmpegPath = 'ffmpeg';
    try { ffmpegPath = require('ffmpeg-static') || 'ffmpeg'; } catch {}
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

module.exports = { readWavPcm16Mono8k, pcm16ToUlawBuffer, pcm16ToAlawBuffer, ensureWavPcm16Mono8k };
