VOIP-støtte for Homey.

Konfigurér SIP-kontoopplysningene dine via appens innstillinger i Homey, slik at domenet, brukernavnet, autentiserings-ID-en, passordet, realm og porter kan tilpasses etter eget ønske.

Vær forsiktig med store mediefiler. Dette bruker mye minne og kan føre til at Homey avslutter appen hvis for mye minne brukes for lenge.

En STUN-server kan oppgis valgfritt for å bestemme den offentlige IP-adressen og portene. Dette kan hjelpe med NAT-problemer ved innkommende SIP og RTP.

I innstillingene kan du angi kodeken. Som standard forsøker appen automatisk å bruke best mulig kvalitet (G722 > PCMA > PCMU) og faller tilbake til lavere kvalitet hvis SIP-serveren krever det.

Lydfiler i WAV eller MP3 konverteres automatisk til passende 8kHz mono eller høyere hvis sentralen støtter tilgjengelige kodeker. Jo større lydfilen er, desto lengre tid tar det før samtalen startes.

Viktige meldinger bør derfor helst være klare i riktig format i lydplanken eller et annet sted.