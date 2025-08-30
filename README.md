# com.homey.phonehome

VOIP Support voor Homey.

Configureer uw SIP accountgegevens via de instellingen van de app in Homey zodat domein, gebruikersnaam, authenticatie-ID, wachtwoord, realm en poorten naar wens aanpasbaar zijn.

Optioneel kan een STUN-server opgegeven worden om het publieke IP-adres en poorten te bepalen. Dit kan helpen bij NAT-problemen bij inkomende SIP en RTP.

In de instellingen kan de codec worden ingesteld. Standaard probeert de app
automatisch de beste kwaliteit (PCMA) te gebruiken en valt terug op PCMU als
de SIP-server dit vereist.

Deze app gebruikt [`mpg123-decoder`](https://www.npmjs.com/package/mpg123-decoder) om MP3-bestanden naar het juiste WAV-formaat te converteren. WAV-bestanden met een ander sample rate of aantal kanalen worden automatisch omgezet naar 16-bit 8kHz mono voor gebruik in de SIP-gesprekken.
