VOIP Support voor Homey.

Configureer uw SIP accountgegevens via de instellingen van de app in Homey zodat domein, gebruikersnaam, authenticatie-ID, wachtwoord, realm en poorten naar wens aanpasbaar zijn.

Pas op met grote media bestanden. Dit verbruikt veel geheugen en kan zorgen dat Homey de app afsluit als er te lang te veel geheugen gebruikt wordt.

Optioneel kan een STUN-server opgegeven worden om het publieke IP-adres en poorten te bepalen.
Dit kan helpen bij NAT-problemen bij inkomende SIP en RTP.

In de instellingen kan de codec worden ingesteld. Standaard probeert de app
automatisch de beste kwaliteit te gebruiken (G722 \> PCMA \> PCMU) en valt terug
op een lagere kwaliteit als de SIP-server dit vereist.

Geluidsbestanden in WAV of MP3 worden automatisch geconverteerd naar het geschikte 8kHz mono of hoger als de sip centrale de aanwezige codecs ondersteund.
Uiteraard des te groter de geluidsfile des te langer het duurt voor de start van de sip call

Belangrijke meldingen kan je dus het beste al in het juiste formaat in soundboard of elders klaar hebben staan.
