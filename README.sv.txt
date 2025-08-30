VOIP-stöd för Homey.

Konfigurera dina SIP-kontouppgifter via appens inställningar i Homey så att domän, användarnamn, autentiserings-ID, lösenord, område och portar kan anpassas efter önskemål.

Var försiktig med stora mediefiler. De förbrukar mycket minne och kan få Homey att stänga av appen om det används för mycket minne under för lång tid.

Valfritt kan en STUN-server anges för att bestämma den offentliga IP-adressen och portarna.
Detta kan hjälpa till med NAT-problem vid inkommande SIP och RTP.

I inställningarna kan codec ställas in. Som standard försöker appen automatiskt använda den bästa kvaliteten (G722 \> PCMA \> PCMU) och faller tillbaka till lägre kvalitet om SIP-servern kräver det.

Ljudfiler i WAV eller MP3 konverteras automatiskt till lämplig 8kHz mono eller högre om telefonväxeln stödjer de tillgängliga codecs.
Självklart, ju större ljudfilen är, desto längre tid tar det innan SIP-samtalet startar.

Viktiga meddelanden bör därför helst vara redo i rätt format på soundboard eller någon annanstans.