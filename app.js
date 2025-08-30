import Homey from 'homey';
import path from 'path';
import fs from 'fs';
import os from 'os';
import http from 'http';
import https from 'https';
import crypto from 'crypto';
import sipCallPlay from './lib/sip_call_play.cjs';
import wavUtils from './lib/wav_utils.cjs';

const { callOnce } = sipCallPlay;
const { ensureWavPcm16Mono16k } = wavUtils;

class HomeyPhoneHomeApp extends Homey.App {
  async onInit() {
    this.log('Homey Phone Home app init');

    this._cacheDir = path.join(os.tmpdir(), 'phonehome_cache');
    await fs.promises.mkdir(this._cacheDir, { recursive: true });
    this._cacheIndex = this.homey.settings.get('cache_index') || {};
    this._purgeCache();
    this.homey.api.get('/cache', async (req,res)=>{ res.json(await this._listCache()); });
    this.homey.api.post('/cache/:id/delete', async (req,res)=>{ await this._deleteCache(req.params.id); res.json({success:true}); });
    this.homey.api.post('/cache/:id/permanent', async (req,res)=>{ await this._setPermanent(req.params.id, !!(req.body&&req.body.permanent)); res.json({success:true}); });

    this._triggerCompleted = this.homey.flow.getTriggerCard('call_completed');

    const actionSb = this.homey.flow.getActionCard('call_and_play_soundboard');
    actionSb.registerArgumentAutocompleteListener('sound', async (query, args) => {
      try {
        const sb = await this.homey.api.getApiApp('com.athom.soundboard');
        const sounds = await sb.get('/sounds');
        const q = (query || '').toLowerCase();
        return (sounds || [])
          .filter(s => !q || (s.name || '').toLowerCase().includes(q))
          .slice(0, 25)
          .map(s => ({ id: s.id, name: s.name || s.id }));
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
        stun_server: this.homey.settings.get('stun_server') || '',
        stun_port: Number(this.homey.settings.get('stun_port') || 3478)
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
        stun_server: this.homey.settings.get('stun_server') || '',
        stun_port: Number(this.homey.settings.get('stun_port') || 3478)
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
  }

  async _resolveSoundboardToWav(soundArg) {
    return this._getCachedOrCreate(`sb:${soundArg.id}`, async (cachePath) => {
      const sb = await this.homey.api.getApiApp('com.athom.soundboard');
      const s = await sb.get(`/sounds/${encodeURIComponent(soundArg.id)}`);
      const tmp = path.join(os.tmpdir(), `voip_${Date.now()}.wav`);
      if (s && s.url) {
        await this._downloadToFile(s.url, tmp);
      } else if (s && s.data) {
        await fs.promises.writeFile(tmp, s.data, { encoding: 'base64' });
      } else { throw new Error('Soundboard gaf geen url/data terug'); }
      const wav = await ensureWavPcm16Mono16k(tmp, (lvl,msg) => (lvl==='error'?this.error(msg):this.log(msg)));
      if (wav !== cachePath) await fs.promises.copyFile(wav, cachePath);
      if (wav !== tmp) { try { await fs.promises.unlink(wav); } catch(e){} }
      try { await fs.promises.unlink(tmp); } catch(e){}
    });
  }
  async _ensureLocalWav(urlOrPath) {
    const isUrl = /^https?:\/\//i.test(urlOrPath);
    const key = isUrl ? `url:${urlOrPath}` : `path:${path.resolve(urlOrPath)}`;
    return this._getCachedOrCreate(key, async (cachePath) => {
      let src = urlOrPath;
      let tmp;
      if (isUrl) {
        tmp = path.join(os.tmpdir(), `voip_${Date.now()}.wav`);
        await this._downloadToFile(urlOrPath, tmp);
        src = tmp;
      } else {
        if (!fs.existsSync(urlOrPath)) throw new Error('Bestand niet gevonden: '+urlOrPath);
      }
      const wav = await ensureWavPcm16Mono16k(src, (lvl,msg) => (lvl==='error'?this.error(msg):this.log(msg)));
      if (wav !== cachePath) await fs.promises.copyFile(wav, cachePath);
      if (wav !== src) { try { await fs.promises.unlink(wav); } catch(e){} }
      if (isUrl && src && fs.existsSync(src)) { try { await fs.promises.unlink(src); } catch(e){} }
    });
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

  _cacheDays() {
    return Number(this.homey.settings.get('cache_days') || 2);
  }

  _saveCacheIndex() {
    this.homey.settings.set('cache_index', this._cacheIndex);
  }

  _purgeCache() {
    const maxAge = this._cacheDays() * 24 * 60 * 60 * 1000;
    const now = Date.now();
    for (const [id, meta] of Object.entries(this._cacheIndex)) {
      if (!meta.permanent && now - (meta.lastUsed || 0) > maxAge) {
        try { fs.unlinkSync(path.join(this._cacheDir, meta.file)); } catch(e){}
        delete this._cacheIndex[id];
      }
    }
    this._saveCacheIndex();
  }

  async _listCache() {
    return Object.entries(this._cacheIndex).map(([id, meta]) => ({
      id,
      key: meta.key,
      permanent: !!meta.permanent,
      lastUsed: meta.lastUsed
    }));
  }

  async _deleteCache(id) {
    const meta = this._cacheIndex[id];
    if (meta) {
      try { await fs.promises.unlink(path.join(this._cacheDir, meta.file)); } catch(e){}
      delete this._cacheIndex[id];
      this._saveCacheIndex();
    }
  }

  async _setPermanent(id, val) {
    if (this._cacheIndex[id]) {
      this._cacheIndex[id].permanent = !!val;
      this._saveCacheIndex();
    }
  }

  async _getCachedOrCreate(key, creator) {
    await fs.promises.mkdir(this._cacheDir, { recursive: true });
    this._purgeCache();
    const id = crypto.createHash('sha1').update(key).digest('hex');
    const file = path.join(this._cacheDir, `${id}.wav`);
    const meta = this._cacheIndex[id];
    if (meta && fs.existsSync(file)) {
      meta.lastUsed = Date.now();
      this._saveCacheIndex();
      return file;
    }
    await creator(file);
    this._cacheIndex[id] = { key, file: path.basename(file), permanent: false, lastUsed: Date.now() };
    this._saveCacheIndex();
    return file;
  }
}
export default HomeyPhoneHomeApp;
