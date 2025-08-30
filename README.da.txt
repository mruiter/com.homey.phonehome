VOIP Support til Homey.

Konfigurer dine SIP-kontooplysninger via app-indstillingerne i Homey, så domæne, brugernavn, autentifikations-ID, adgangskode, realm og porte kan tilpasses efter behov.

Valgfrit kan en STUN-server angives for at bestemme den offentlige IP-adresse og porte. Dette kan hjælpe med NAT-problemer ved indgående SIP og RTP.

I indstillingerne kan codec'en indstilles. Som standard forsøger appen automatisk at bruge den bedste kvalitet (G722 > PCMA > PCMU) og falder tilbage til en lavere kvalitet, hvis SIP-serveren kræver det.

Lydfiler i WAV eller MP3 bliver automatisk konverteret til det passende 8kHz mono. Selvfølgelig, jo større lydfilen er, desto længere tid tager det, før SIP-opkaldet starter.

Vigtige meddelelser kan derfor med fordel være klar i det rigtige format på soundboard eller et andet sted.