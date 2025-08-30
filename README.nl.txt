VOIP-ondersteuning voor Homey.

Configureer je SIP-accountgegevens via de instellingen van de app in Homey, zodat domein, gebruikersnaam, authenticatie-ID, wachtwoord, realm en poorten naar wens aanpasbaar zijn.

Pas op met grote mediabestanden. Dit verbruikt veel geheugen en kan ervoor zorgen dat Homey de app afsluit als er te lang te veel geheugen wordt gebruikt.

Optioneel kan een STUN-server worden opgegeven om het publieke IP-adres en poorten te bepalen. Dit kan helpen bij NAT-problemen met inkomende SIP en RTP.

In de instellingen kan de codec worden ingesteld. Standaard probeert de app automatisch de beste kwaliteit te gebruiken (G722 > PCMA > PCMU) en valt terug op een lagere kwaliteit als de SIP-server dit vereist.

Geluidsbestanden in WAV of MP3 worden automatisch geconverteerd naar het geschikte 8kHz mono of hoger als de SIP-centrale de aanwezige codecs ondersteunt. Uiteraard, hoe groter het geluidsbestand, hoe langer het duurt voordat de SIP-oproep start.

Belangrijke meldingen kun je dus het beste al in het juiste formaat klaar hebben staan in soundboard of elders.