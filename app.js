import Homey from 'homey';
import path from 'path';
import fs from 'fs';
import os from 'os';
import http from 'http';
import https from 'https';
import OpenAI from 'openai';
import FormData from 'form-data';
import sipCallPlay from './lib/sip_call_play.cjs';
import wavUtils from './lib/wav_utils.cjs';

const { callOnce } = sipCallPlay;
const { ensureWavPcm16Mono16k } = wavUtils;

class HomeyPhoneHomeApp extends Homey.App {
  async onInit() {
    this.log('Homey Phone Home app init');

    this._autoSetLocalIp();

    this._triggerCompleted = this.homey.flow.getTriggerCard('call_completed');

    this.homey.on('clear_cache', async (_data, callback) => {
      try {
        const cacheDir = path.join(os.tmpdir(), 'voip_cache');
        await fs.promises.rm(cacheDir, { recursive: true, force: true });
        callback(null, true);
      } catch (e) {
        callback(e);
      }
    });

    const actionSb = this.homey.flow.getActionCard('call_and_play_soundboard');
    actionSb.registerArgumentAutocompleteListener('sound', async (query, args) => {
      try {
        const sb = this.homey.api.getApiApp('com.athom.soundboard');
        if (!await sb.getInstalled()) throw new Error('Soundboard app niet geïnstalleerd');
        const root = await sb.get('/');
        const sounds = Array.isArray(root) ? root : (root?.sounds || []);
        const q = (query || '').toLowerCase();
        return sounds
          .filter(s => !q || (s.name || '').toLowerCase().includes(q))
          .slice(0, 25)
          .map(s => ({ id: s.id || s.path, name: s.name || s.id || s.path }));
      } catch (e) {
        this.error('Soundboard autocomplete mislukt:', e.message || e);
        return [{ id: 'ERROR', name: '⚠ Soundboard API niet bereikbaar' }];
      }
    });

    actionSb.registerRunListener(async (args) => {
      const number = String(args.number || '').trim();
      if (!number) throw new Error('Geen nummer opgegeven');

      const cfg = {
        sip_domain: this.homey.settings.get('sip_domain'),
        sip_proxy: this.homey.settings.get('sip_proxy') || null,
        username: this.homey.settings.get('username'),
        auth_id: this.homey.settings.get('auth_id') || this.homey.settings.get('username'),
        password: this.homey.settings.get('password'),
        realm: this.homey.settings.get('realm') || '',
        display_name: this.homey.settings.get('display_name') || 'HomeyBot',
        from_user: this.homey.settings.get('from_user') || this.homey.settings.get('username'),
        local_ip: this.homey.settings.get('local_ip'),
        sip_transport: (this.homey.settings.get('sip_transport') || 'UDP').toUpperCase(),
        local_sip_port: Number(this.homey.settings.get('local_sip_port') || 5070),
        local_rtp_port: Number(this.homey.settings.get('local_rtp_port') || 40000),
        codec: (this.homey.settings.get('codec') || 'AUTO').toUpperCase(),
        expires_sec: Number(this.homey.settings.get('expires_sec') || 300),
        invite_timeout: Number(this.homey.settings.get('invite_timeout') || 45),
        stun_server: this.homey.settings.get('stun_server') || 'stun.l.google.com',
        stun_port: Number(this.homey.settings.get('stun_port') || 19302)
      };

      const to = number.includes('@') ? number : `${number}@${cfg.sip_domain}`;

      for (const k of ['sip_domain','username','password','local_ip']) {
        if (!cfg[k]) throw new Error(`Ontbrekende instelling: ${k}`);
      }

      if (!args.sound || !args.sound.id || args.sound.id === 'ERROR') {
        throw new Error('Geen Soundboard geluid opgegeven');
      }
      const wavPath = await this._resolveSoundboardToWav(args.sound);

      const repeat = Math.max(1, Number(args.repeat || 1));
      const delay = Math.max(0, Number(args.delay || 2));

      let result;
      try {
        result = await callOnce({
          ...cfg,
          to,
          wavPath,
          repeat,
          delay,
          logger: (lvl, msg) => (lvl==='error'?this.error(msg):this.log(msg))
        });
      } catch (e) {
        await this._triggerCompleted.trigger({
          status: 'failed', duurMs: 0, callee: number, reason: e.message||'unknown'
        });
        throw e;
      }

      await this._triggerCompleted.trigger({
        status: result.status || 'answered',
        duurMs: Number(result.durationMs||0),
        callee: number,
        reason: result.reason || 'OK'
      });
      return true;
    });

    const actionUrl = this.homey.flow.getActionCard('call_and_play_url');
    actionUrl.registerRunListener(async (args) => {
      const number = String(args.number || '').trim();
      if (!number) throw new Error('Geen nummer opgegeven');

      const cfg = {
        sip_domain: this.homey.settings.get('sip_domain'),
        sip_proxy: this.homey.settings.get('sip_proxy') || null,
        username: this.homey.settings.get('username'),
        auth_id: this.homey.settings.get('auth_id') || this.homey.settings.get('username'),
        password: this.homey.settings.get('password'),
        realm: this.homey.settings.get('realm') || '',
        display_name: this.homey.settings.get('display_name') || 'HomeyBot',
        from_user: this.homey.settings.get('from_user') || this.homey.settings.get('username'),
        local_ip: this.homey.settings.get('local_ip'),
        sip_transport: (this.homey.settings.get('sip_transport') || 'UDP').toUpperCase(),
        local_sip_port: Number(this.homey.settings.get('local_sip_port') || 5070),
        local_rtp_port: Number(this.homey.settings.get('local_rtp_port') || 40000),
        codec: (this.homey.settings.get('codec') || 'AUTO').toUpperCase(),
        expires_sec: Number(this.homey.settings.get('expires_sec') || 300),
        invite_timeout: Number(this.homey.settings.get('invite_timeout') || 45),
        stun_server: this.homey.settings.get('stun_server') || 'stun.l.google.com',
        stun_port: Number(this.homey.settings.get('stun_port') || 19302)
      };

      const to = number.includes('@') ? number : `${number}@${cfg.sip_domain}`;

      for (const k of ['sip_domain','username','password','local_ip']) {
        if (!cfg[k]) throw new Error(`Ontbrekende instelling: ${k}`);
      }

      const fileUrl = String(args.file_url || '').trim();
      if (!fileUrl) throw new Error('Geen geluidsbron opgegeven');
      const wavPath = await this._ensureLocalWav(fileUrl);

      const repeat = Math.max(1, Number(args.repeat || 1));
      const delay = Math.max(0, Number(args.delay || 2));

      let result;
      try {
        result = await callOnce({
          ...cfg,
          to,
          wavPath,
          repeat,
          delay,
          logger: (lvl, msg) => (lvl==='error'?this.error(msg):this.log(msg))
        });
      } catch (e) {
        await this._triggerCompleted.trigger({
          status: 'failed', duurMs: 0, callee: number, reason: e.message||'unknown'
        });
        throw e;
      }

    await this._triggerCompleted.trigger({
      status: result.status || 'answered',
      duurMs: Number(result.durationMs||0),
      callee: number,
      reason: result.reason || 'OK'
    });
    return true;
  });

    const actionTtsCall = this.homey.flow.getActionCard('call_and_play_text');
    actionTtsCall.registerRunListener(async (args) => {
      const number = String(args.number || '').trim();
      if (!number) throw new Error('Geen nummer opgegeven');
      const text = String(args.text || '').trim();
      if (!text) throw new Error('Geen tekst opgegeven');

      const cfg = {
        sip_domain: this.homey.settings.get('sip_domain'),
        sip_proxy: this.homey.settings.get('sip_proxy') || null,
        username: this.homey.settings.get('username'),
        auth_id: this.homey.settings.get('auth_id') || this.homey.settings.get('username'),
        password: this.homey.settings.get('password'),
        realm: this.homey.settings.get('realm') || '',
        display_name: this.homey.settings.get('display_name') || 'HomeyBot',
        from_user: this.homey.settings.get('from_user') || this.homey.settings.get('username'),
        local_ip: this.homey.settings.get('local_ip'),
        sip_transport: (this.homey.settings.get('sip_transport') || 'UDP').toUpperCase(),
        local_sip_port: Number(this.homey.settings.get('local_sip_port') || 5070),
        local_rtp_port: Number(this.homey.settings.get('local_rtp_port') || 40000),
        codec: (this.homey.settings.get('codec') || 'AUTO').toUpperCase(),
        expires_sec: Number(this.homey.settings.get('expires_sec') || 300),
        invite_timeout: Number(this.homey.settings.get('invite_timeout') || 45),
        stun_server: this.homey.settings.get('stun_server') || 'stun.l.google.com',
        stun_port: Number(this.homey.settings.get('stun_port') || 19302)
      };

      const to = number.includes('@') ? number : `${number}@${cfg.sip_domain}`;

      for (const k of ['sip_domain','username','password','local_ip']) {
        if (!cfg[k]) throw new Error(`Ontbrekende instelling: ${k}`);
      }

      const wavPath = await this._openAiTextToWav(text);

      const repeat = Math.max(1, Number(args.repeat || 1));
      const delay = Math.max(0, Number(args.delay || 2));

      let result;
      try {
        result = await callOnce({
          ...cfg,
          to,
          wavPath,
          repeat,
          delay,
          logger: (lvl, msg) => (lvl==='error'?this.error(msg):this.log(msg))
        });
      } catch (e) {
        await this._triggerCompleted.trigger({
          status: 'failed', duurMs: 0, callee: number, reason: e.message||'unknown'
        });
        throw e;
      }

      await this._triggerCompleted.trigger({
        status: result.status || 'answered',
        duurMs: Number(result.durationMs||0),
        callee: number,
        reason: result.reason || 'OK'
      });
      return true;
    });

    const actionTtsSb = this.homey.flow.getActionCard('text_to_soundboard');
    actionTtsSb.registerRunListener(async (args) => {
      const text = String(args.text || '').trim();
      const name = String(args.name || '').trim() || `tts_${Date.now()}`;
      if (!text) throw new Error('Geen tekst opgegeven');
      const wavPath = await this._openAiTextToWav(text);
      await this._saveToSoundboard(wavPath, name);
      return true;
    });
  }

  _autoSetLocalIp() {
    const net = os.networkInterfaces();
    const ip = Object.values(net)
      .flat()
      .find(i => i && i.family === 'IPv4' && !i.internal)?.address;
    if (ip && this.homey.settings.get('local_ip') !== ip) {
      this.log('Detected local IP:', ip);
      this.homey.settings.set('local_ip', ip);
    }
  }

  async _resolveSoundboardToWav(soundArg) {
    const sb = this.homey.api.getApiApp('com.athom.soundboard');
    if (!await sb.getInstalled()) throw new Error('Soundboard app niet geïnstalleerd');
    const root = await sb.get('/');
    const sounds = Array.isArray(root) ? root : (root?.sounds || []);
    const s = sounds.find(x => x.id === soundArg.id || x.path === soundArg.id || x.name === soundArg.id);
    if (!s || !s.path) throw new Error('Soundboard geluid niet gevonden');
    const localAddress = await this.homey.cloud.getLocalAddress();
    const url = `http://${localAddress}/app/com.athom.soundboard/${s.path}`.replace(/\.\//g, '');
    const dest = path.join(os.tmpdir(), `voip_${Date.now()}.wav`);
    await this._downloadToFile(url, dest);
    const cacheDays = Number(this.homey.settings.get('cache_days') || 3);
    return await ensureWavPcm16Mono16k(dest, (lvl,msg) => (lvl==='error'?this.error(msg):this.log(msg)), cacheDays);
  }
  async _ensureLocalWav(urlOrPath) {
    let local = urlOrPath;
    if (/^https?:\/\//i.test(urlOrPath)) {
      local = path.join(os.tmpdir(), `voip_${Date.now()}.wav`);
      await this._downloadToFile(urlOrPath, local);
    } else { if (!fs.existsSync(urlOrPath)) throw new Error('Bestand niet gevonden: '+urlOrPath); }
    const cacheDays = Number(this.homey.settings.get('cache_days') || 3);
    return await ensureWavPcm16Mono16k(local, (lvl,msg) => (lvl==='error'?this.error(msg):this.log(msg)), cacheDays);
  }

  async _openAiTextToWav(text) {
    const apiKey = this.homey.settings.get('openai_api_key') || process.env.OPENAI_API_KEY;
    if (!apiKey) throw new Error('Ontbrekende OpenAI API key');
    const client = new OpenAI({ apiKey });
    const speech = await client.audio.speech.create({
      model: 'gpt-4o-mini-tts',
      voice: 'alloy',
      input: text,
      format: 'wav'
    });
    const buffer = Buffer.from(await speech.arrayBuffer());
    const tmp = path.join(os.tmpdir(), `tts_${Date.now()}.wav`);
    await fs.promises.writeFile(tmp, buffer);
    const cacheDays = Number(this.homey.settings.get('cache_days') || 3);
    return await ensureWavPcm16Mono16k(tmp, (lvl,msg) => (lvl==='error'?this.error(msg):this.log(msg)), cacheDays);
  }

  async _saveToSoundboard(wavPath, name) {
    const sb = this.homey.api.getApiApp('com.athom.soundboard');
    if (!await sb.getInstalled()) throw new Error('Soundboard app niet geïnstalleerd');
    const form = new FormData();
    form.append('file', fs.createReadStream(wavPath), { filename: `${name}.wav` });
    form.append('name', name);
    const headers = form.getHeaders();
    try {
      const len = await new Promise((resolve, reject) => {
        form.getLength((err, length) => err ? reject(err) : resolve(length));
      });
      headers['Content-Length'] = len;
    } catch (e) {
      this.error('Soundboard form length failed:', e.message || e);
    }
    await sb.post('/sounds', form, headers);
  }
  async _downloadToFile(url, destPath) {
    const client = url.startsWith('https')?https:http;
    await new Promise((resolve,reject)=>{
      const file = fs.createWriteStream(destPath);
      const req = client.get(url, res=>{
        if (res.statusCode!==200) return reject(new Error('HTTP '+res.statusCode));
        res.pipe(file); file.on('finish', ()=>file.close(resolve));
      }); req.on('error', reject);
    });
  }
}
export default HomeyPhoneHomeApp;
