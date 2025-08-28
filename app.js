'use strict';
const Homey = require('homey');

class VoipPlayerApp extends Homey.App {
  async onInit() {
    this.log('VOIP Player app init');

    this._triggerCompleted = this.homey.flow.getTriggerCard('call_completed');
    const action = this.homey.flow.getActionCard('call_and_play');

    action.registerArgumentAutocompleteListener('sound', async (query, args) => {
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

    action.registerRunListener(async (args, state) => {
      const number = String(args.number || '').trim();
      if (!number) throw new Error('Geen nummer opgegeven');

      const cfg = {
        sip_domain: this.homey.settings.get('sip_domain'),
        sip_proxy: this.homey.settings.get('sip_proxy') || null,
        username: this.homey.settings.get('username'),
        password: this.homey.settings.get('password'),
        display_name: this.homey.settings.get('display_name') || 'HomeyBot',
        from_user: this.homey.settings.get('from_user') || this.homey.settings.get('username'),
        local_ip: this.homey.settings.get('local_ip'),
        local_sip_port: Number(this.homey.settings.get('local_sip_port') || 5070),
        local_rtp_port: Number(this.homey.settings.get('local_rtp_port') || 40000),
        expires_sec: Number(this.homey.settings.get('expires_sec') || 300),
        invite_timeout: Number(this.homey.settings.get('invite_timeout') || 45)
      };

      for (const k of ['sip_domain','username','password','local_ip']) {
        if (!cfg[k]) throw new Error(`Ontbrekende instelling: ${k}`);
      }

      let wavPath = null;
      if (args.sound && args.sound.id && args.sound.id !== 'ERROR') {
        try {
          wavPath = await this._resolveSoundboardToWav(args.sound);
        } catch (e) {
          this.error('Soundboard-resolve faalde:', e.message || e);
          if (!args.file_url) throw new Error('Soundboard mislukt en geen URL/pad opgegeven');
        }
      }
      if (!wavPath) {
        const fileUrl = String(args.file_url || '').trim();
        if (!fileUrl) throw new Error('Geen geluidsbron opgegeven');
        wavPath = await this._ensureLocalWav(fileUrl);
      }

      const { callOnce } = require('./lib/sip_call_play');
      let result;
      try {
        result = await callOnce({
          ...cfg,
          to: number,
          wavPath,
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
    const path = require('path'); const fs = require('fs'); const os = require('os');
    const sb = await this.homey.api.getApiApp('com.athom.soundboard');
    const s = await sb.get(`/sounds/${encodeURIComponent(soundArg.id)}`);
    const dest = path.join(os.tmpdir(), `voip_${Date.now()}.wav`);
    if (s && s.url) {
      await this._downloadToFile(s.url, dest);
    } else if (s && s.data) {
      fs.writeFileSync(dest, Buffer.from(s.data, 'base64'));
    } else { throw new Error('Soundboard gaf geen url/data terug'); }
    require('./lib/wav_utils').readWavPcm16Mono8k(dest);
    return dest;
  }
  async _ensureLocalWav(urlOrPath) {
    const fs = require('fs'); const path = require('path'); const os = require('os');
    let local = urlOrPath;
    if (/^https?:\/\//i.test(urlOrPath)) {
      local = path.join(os.tmpdir(), `voip_${Date.now()}.wav`);
      await this._downloadToFile(urlOrPath, local);
    } else { if (!fs.existsSync(urlOrPath)) throw new Error('Bestand niet gevonden: '+urlOrPath); }
    require('./lib/wav_utils').readWavPcm16Mono8k(local);
    return local;
  }
  async _downloadToFile(url, destPath) {
    const fs = require('fs'); const http = require('http'); const https = require('https');
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
module.exports = VoipPlayerApp;
