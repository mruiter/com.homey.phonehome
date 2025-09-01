VOIP Support til Homey.

Via en SIP-forbindelse kan Homey opsætte et telefonopkald til dit angivne nummer eller SIP.

Dette kan gøres med en fil fra SoundBoard, en online lydfil eller fuldstændig genereret fra tekst eller en tag-genereret TTS.

Til Text2Speech har du brug for en API-nøgle til ChatGPT. ChatGPT håndterer nemlig TTS-afslutningen.

SIP-forbindelser er komplicerede. Codec'en har automatisk detektion, men kan vælges manuelt. Der er en STUN-server indstillet for at undgå så mange nat-problemer på routeren som muligt. Portene til Homey er også konfigurerbare, så du evt. kan fange dem med en port-forwarding på din router.

Vær forsigtig med store mediefiler, der skal konverteres. Homey afslutter selv applikationer, hvis de bruger meget hukommelse for længe. En lang konvertering vil bruge meget hukommelse og dermed få appen til at lukke ned.

Hvis du alligevel vil afspille en lang lydfil, skal den være i et native SIP-format. Dette er for eksempel PCM (ukomprimeret) 8 bit mono.

Nogle konverteringer af MP3 mislykkes, årsagen er sandsynligvis et problem med konverteringsbiblioteket. Muligvis vil det blive løst i en opdatering, men at bruge et andet bibliotek vil betyde et større hukommelsesforbrug og kan få appen til at blive stoppet for ofte af Homey.

Konfigurér dine SIP-kontooplysninger: domæne, brugernavn, autentificerings-ID (valgfrit), adgangskode, realm og porte som ønsket. Konfigurér din ChatGPT API-nøgle, køn (Nej, jeg har ikke hes eller hvem-der-tilgængelig, kun Mand eller Kvinde), stemmen og hastigheden af tale.