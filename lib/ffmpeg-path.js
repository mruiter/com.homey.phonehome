'use strict';
let ffmpegPath;
try {
  ffmpegPath = require('ffmpeg-static');
} catch (e) {
  ffmpegPath = 'ffmpeg';
}
module.exports = ffmpegPath;
