VOIP-ondersteuning voor Homey.

Configureer je SIP accountgegevens via de instellingen van de app in Homey zodat domein, gebruikersnaam, authenticatie-ID, wachtwoord, realm en poorten aanpasbaar zijn naar wens.

Optioneel kan je een STUN-server opgeven om het publieke IP-adres en poorten te bepalen. Dit kan helpen bij NAT-problemen bij inkomende SIP en RTP.

In de instellingen kun je de codec instellen. Standaard probeert de app automatisch de beste kwaliteit te gebruiken (G722 > PCMA > PCMU) en valt terug op een lagere kwaliteit als de SIP-server dit vereist.

Geluidsbestanden in WAV of MP3 worden automatisch geconverteerd naar het geschikte 8kHz mono. Uiteraard, hoe groter de geluidsfile, hoe langer het duurt voor de start van de sip call.

Belangrijke meldingen kun je dus het beste al in het juiste formaat op soundboard of elders klaar hebben staan.