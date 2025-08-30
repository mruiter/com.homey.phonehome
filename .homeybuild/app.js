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
    if (this.homey.settings.get('cache_days') === undefined) this.homey.settings.set('cache_days', 2);
    this._permanentCache = new Set(this.homey.settings.get('permanent_cache') || []);

    try {
      this._triggerCompleted = this.homey.flow.getTriggerCard('call_completed');
    } catch (e) {
      this.error('Flow trigger card call_completed not found:', e.message || e);
    }

    try {
      const actionSb = this.homey.flow.getActionCard('call_and_play_soundboard');
      await actionSb.registerArgumentAutocompleteListener('sound', async (query, args) => {
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

      await actionSb.registerRunListener(async (args) => {
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
    } catch (e) {
      this.error('Failed to register flow card call_and_play_soundboard:', e.message || e);
    }

    try {
      const actionUrl = this.homey.flow.getActionCard('call_and_play_url');
      await actionUrl.registerRunListener(async (args) => {
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
    } catch (e) {
      this.error('Failed to register flow card call_and_play_url:', e.message || e);
    }
    
    this.homey.api.get('/cache', async (req,res) => {
      try {
        const files = await fs.promises.readdir(this._cacheDir);
        const out = [];
        for (const f of files.filter(f => f.endsWith('.wav'))) {
          const st = await fs.promises.stat(path.join(this._cacheDir, f));
          const key = path.basename(f, '.wav');
          out.push({ key, size: st.size, mtime: st.mtimeMs, permanent: this._permanentCache.has(key) });
        }
        res.json(out);
      } catch (e) {
        res.status(500).json({ error: e.message });
      }
    });
    this.homey.api.delete('/cache/:key', async (req,res) => {
      const key = req.params.key;
      await fs.promises.unlink(path.join(this._cacheDir, `${key}.wav`)).catch(()=>{});
      this._permanentCache.delete(key);
      this.homey.settings.set('permanent_cache', [...this._permanentCache]);
      res.json({ ok: true });
    });
    this.homey.api.post('/cache/:key/permanent', async (req,res) => {
      const key = req.params.key;
      const permanent = !!req.body.permanent;
      if (permanent) this._permanentCache.add(key); else this._permanentCache.delete(key);
      this.homey.settings.set('permanent_cache', [...this._permanentCache]);
      res.json({ ok: true });
    });
  }

  async _getCachedWav(key) {
    const file = path.join(this._cacheDir, `${key}.wav`);
    try {
      const st = await fs.promises.stat(file);
      if (this._permanentCache.has(key)) return file;
      const maxAgeMs = this._getCacheMaxAgeMs();
      if (Date.now() - st.mtimeMs < maxAgeMs) return file;
      await fs.promises.unlink(file).catch(()=>{});
    } catch (e) { /* ignore */ }
    return null;
  }

  _getCacheMaxAgeMs() {
    const days = Number(this.homey.settings.get('cache_days') || 2);
    return days * 24 * 60 * 60 * 1000;
  }

  async _storeCachedWav(key, src) {
    const dest = path.join(this._cacheDir, `${key}.wav`);
    await fs.promises.copyFile(src, dest);
    return dest;
  }

  async _resolveSoundboardToWav(soundArg) {
    const key = `sb_${soundArg.id}`;
    const cached = await this._getCachedWav(key);
    if (cached) return cached;

    const sb = await this.homey.api.getApiApp('com.athom.soundboard');
    const s = await sb.get(`/sounds/${encodeURIComponent(soundArg.id)}`);
    const dest = path.join(os.tmpdir(), `voip_${Date.now()}.wav`);
    if (s && s.url) {
      await this._downloadToFile(s.url, dest);
    } else if (s && s.data) {
      // Writing large base64 blobs via Buffer.from() temporarily allocates
      // an additional copy of the decoded data in memory. By writing the
      // base64 string directly to disk we avoid this duplication and reduce
      // peak memory usage when handling bigger sound files.
      await fs.promises.writeFile(dest, s.data, { encoding: 'base64' });
    } else { throw new Error('Soundboard gaf geen url/data terug'); }
    const converted = await ensureWavPcm16Mono16k(dest, (lvl,msg) => (lvl==='error'?this.error(msg):this.log(msg)));
    const finalPath = await this._storeCachedWav(key, converted);
    if (converted !== finalPath) await fs.promises.unlink(converted).catch(()=>{});
    if (dest !== converted && dest !== finalPath) await fs.promises.unlink(dest).catch(()=>{});
    return finalPath;
  }
  async _ensureLocalWav(urlOrPath) {
    if (/^https?:\/\//i.test(urlOrPath)) {
      const key = `url_${crypto.createHash('sha1').update(urlOrPath).digest('hex')}`;
      const cached = await this._getCachedWav(key);
      if (cached) return cached;
      const temp = path.join(os.tmpdir(), `voip_${Date.now()}.wav`);
      await this._downloadToFile(urlOrPath, temp);
      const converted = await ensureWavPcm16Mono16k(temp, (lvl,msg) => (lvl==='error'?this.error(msg):this.log(msg)));
      const finalPath = await this._storeCachedWav(key, converted);
      if (converted !== finalPath) await fs.promises.unlink(converted).catch(()=>{});
      if (temp !== converted && temp !== finalPath) await fs.promises.unlink(temp).catch(()=>{});
      return finalPath;
    } else {
      if (!fs.existsSync(urlOrPath)) throw new Error('Bestand niet gevonden: '+urlOrPath);
      return await ensureWavPcm16Mono16k(urlOrPath, (lvl,msg) => (lvl==='error'?this.error(msg):this.log(msg)));
    }
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
