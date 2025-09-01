VOIP Support voor Homey.
 
Middels een SIP verbinding kan Homey een telefoon gesprek opzetten naar je opgegeven nummer of SIP
 
Dit kan met een bestand vanaf SoundBoard , een online geluidsbestand of volledige vanuit tekst of een tag gegeneerde TTS
 
Voor de Text2Speech heb je een API-Key nodig voor ChatGPT . ChatGPT handeld namelijk de TTS afsluit
 
SIP connecties zijn lastig. De Codec heeft auto detectie maar kan handmatig geselecteerd worden.
Er is een STUN server voor ingesteld of zoveel mogelijk nat problemen op router te voorkomen.
De poorten om Homey zelf zijn ook configureerdbaar, dan zou je eventueel deze nog op je router middels een port-forward kunnen opvangen.
 
Pas op met grote media bestanden die geconverteerd moeten worden.
Homey sluit zelf applicaties af als deze te lang veel geheugen gebruiken.
Een lange conversie zal veel geheugen gebruiken en dus de app laten afsluiten.
 
Wil je toch een lang geluidsbestand afspelen , zorg dan dat deze in een native SIP formaat is.
Dit is bijvoorbeeld PCM (uncompressed) 8 bit mono
 
Sommige conversies van MP3 mislukken, de oorzaak is waarschijnlijk een issue met de conversie library.
Mogelijk dat deze in een update wordt opgelost, een andere library gebruiken zorgt voor een groter geheugen gebruik en zou de app te vaak laten stoppen door Homey
 
Configureer uw SIP accountgegevens: domein, gebruikersnaam, authenticatie-ID(optioneel), wachtwoord, realm en poorten naar wens.
Configureer je ChatGPT Api key, het geslacht (Nee ik heb geen hes of wie-en beschikbaar, alleen Man of Vrouw, de stem en de snelheid van spreken

