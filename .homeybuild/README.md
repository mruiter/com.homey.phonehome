# com.homey.phonehome

VOIP Support voor Homey.

Configureer uw SIP accountgegevens via de instellingen van de app in Homey zodat domein, gebruikersnaam, authenticatie-ID, wachtwoord, realm en poorten naar wens aanpasbaar zijn.

Optioneel kan een STUN-server opgegeven worden om het publieke IP-adres en poorten te bepalen. Dit kan helpen bij NAT-problemen bij inkomende SIP en RTP.

In de instellingen kan tevens de gewenste codec (PCMU of PCMA) worden gekozen.

Deze app gebruikt [`ffmpeg`](https://ffmpeg.org/) om geluidsbestanden naar het juiste formaat te converteren. Wanneer `ffmpeg` niet op het systeem aanwezig is, probeert de app automatisch het pad van de npm-module [`ffmpeg-static`](https://www.npmjs.com/package/ffmpeg-static) te gebruiken.
