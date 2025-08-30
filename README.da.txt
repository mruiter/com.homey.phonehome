VOIP Support til Homey.

Konfigurer dine SIP-kontooplysninger via appens indstillinger i Homey, så domæne, brugernavn, autentificerings-ID, adgangskode, realm og porte kan tilpasses efter behov.

Pas på med store mediefiler. Det bruger meget hukommelse og kan få Homey til at lukke appen, hvis der bruges for meget hukommelse i for lang tid.

Valgfrit kan en STUN-server angives for at bestemme den offentlige IP-adresse og porte. Dette kan hjælpe med NAT-problemer med indgående SIP og RTP.

I indstillingerne kan codec'en indstilles. Som standard forsøger appen automatisk at bruge den bedste kvalitet (G722 \> PCMA \> PCMU) og falder tilbage til en lavere kvalitet, hvis SIP-serveren kræver det.

Lydfiler i WAV eller MP3 konverteres automatisk til den passende 8kHz mono eller højere, hvis den tilgængelige codec understøttes af sip-centralen. Naturligvis, jo større lydfilen er, desto længere tid tager det før starten af sip-opkaldet.

Vigtige meddelelser kan du derfor med fordel have klar i det rigtige format i soundboard eller andre steder.