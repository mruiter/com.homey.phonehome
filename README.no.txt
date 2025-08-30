VOIP-støtte for Homey.

Konfigurer SIP-kontoinformasjonen din via appinnstillingene i Homey, slik at domene, brukernavn, autentiserings-ID, passord, område og porter kan tilpasses etter ønske.

Valgfritt kan du spesifisere en STUN-server for å bestemme den offentlige IP-adressen og portene. Dette kan hjelpe med NAT-problemer ved innkommende SIP og RTP.

I innstillingene kan du angi kodeken. Som standard prøver appen
automatisk å bruke den beste kvaliteten (G722 \> PCMA \> PCMU) og faller tilbake
til lavere kvalitet hvis SIP-serveren krever det.

Lydfiler i WAV eller MP3 blir automatisk konvertert til den passende 8kHz mono
Jo større lydfilen er, desto lengre tid tar det før starten av SIP-samtalen.

Viktige meldinger kan du derfor ha klar i riktig format i lydbrettet eller andre steder.