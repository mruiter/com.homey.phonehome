VOIP-ondersteuning voor Homey.

Via een SIP-verbinding kan Homey een telefoongesprek opzetten naar je opgegeven nummer of SIP.

Dit kan met een bestand vanaf SoundBoard, een online geluidsbestand of volledig vanuit tekst of een tag gegenereerde TTS.

Voor de Text2Speech heb je een API-sleutel nodig voor ChatGPT. ChatGPT handelt namelijk de TTS af.

SIP-verbindingen zijn lastig. De codec heeft automatische detectie, maar kan handmatig geselecteerd worden. Er is een STUN-server ingesteld om zoveel mogelijk nat-problemen op de router te voorkomen. De poorten op Homey zelf zijn ook configureerbaar; je zou deze eventueel middels een port-forward op je router kunnen opvangen.

Pas op met grote mediabestanden die geconverteerd moeten worden. Homey sluit zelf applicaties af als deze te lang veel geheugen gebruiken. Een lange conversie zal veel geheugen gebruiken en dus de app laten afsluiten.

Wil je toch een lang geluidsbestand afspelen, zorg dan dat deze in een native SIP-formaat is. Dit is bijvoorbeeld PCM (ongecomprimeerd) 8 bit mono.

Sommige conversies van MP3 mislukken; de oorzaak is waarschijnlijk een probleem met de conversiebibliotheek. Mogelijk wordt dit in een update opgelost, maar een andere bibliotheek gebruiken zorgt voor een groter geheugengebruik en zou de app te vaak laten stoppen door Homey.

Configureer uw SIP-accountgegevens: domein, gebruikersnaam, authenticatie-ID (optioneel), wachtwoord, realm en poorten naar wens. Configureer je ChatGPT API-sleutel, het geslacht (nee ik heb geen hes of wie-en beschikbaar, alleen man of vrouw), de stem en de snelheid van spreken.