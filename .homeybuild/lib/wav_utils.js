'use strict';
const fs = require('fs');
function readWavPcm16Mono8k(path) {
  const buf = fs.readFileSync(path);
  if (buf.slice(0,4).toString()!=='RIFF') throw new Error('Geen geldige WAV');
  return new Int16Array(0);
}
module.exports={readWavPcm16Mono8k, pcm16ToUlawBuffer:()=>Buffer.alloc(0)};
