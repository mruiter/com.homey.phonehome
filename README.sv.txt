VOIP-stöd för Homey.

Konfigurera dina SIP-kontouppgifter via appens inställningar i Homey så att domän, användarnamn, autentiserings-ID, lösenord, realm och portar kan anpassas efter önskemål.

En STUN-server kan valfritt anges för att bestämma den publika IP-adressen och portarna.
Detta kan hjälpa vid NAT-problem med inkommande SIP och RTP.

I inställningarna kan du ställa in codec. Som standard försöker appen
automatiskt använda bästa möjliga kvalitet (G722 \> PCMA \> PCMU) och faller tillbaka
till en lägre kvalitet om SIP-servern kräver det.

Ljudfiler i WAV eller MP3 konverteras automatiskt till lämpligt 8 kHz mono.
Naturligtvis, ju större ljudfilen är desto längre tid tar det innan sip-samtalet startar.

Viktiga meddelanden bör du därför helst ha redo i rätt format i soundboard eller någon annanstans.