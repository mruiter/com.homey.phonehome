VOIP-støtte for Homey.

Via en SIP-forbindelse kan Homey sette opp en telefonsamtale til ditt oppgitte nummer eller SIP.

Dette kan gjøres med en fil fra SoundBoard, en online lydfil eller fullstendig fra tekst eller en tag-generert TTS.

For Text2Speech trenger du en API-nøkkel for ChatGPT. ChatGPT håndterer nemlig TTS-avslutningen.

SIP-tilkoblinger kan være vanskelige. Codecen har automatisk deteksjon, men kan velges manuelt. Det er satt opp en STUN-server for å unngå så mange nat-problemer som mulig på ruteren. Portene til Homey kan også konfigureres, så du kan eventuelt håndtere dem på ruteren din ved hjelp av port-forwarding.

Vær forsiktig med store mediefiler som må konverteres. Homey lukker automatisk apper hvis de bruker mye minne for lenge. En lang konvertering vil bruke mye minne og kan få appen til å avslutte.

Hvis du likevel vil spille av en lang lydfil, sørg for at den er i et native SIP-format. Dette er for eksempel PCM (ukomprimert) 8-bit mono.

Noen konverteringer fra MP3 mislykkes, årsaken er sannsynligvis et problem med konverteringsbiblioteket. Kanskje dette blir løst i en oppdatering, men å bruke et annet bibliotek vil bruke mer minne og kan få appen til å avsluttes for ofte av Homey.

Konfigurer dine SIP-kontodetaljer: domene, brukernavn, autentiserings-ID (valgfritt), passord, realm og porter etter ønske. Konfigurer ChatGPT API-nøkkel, kjønn (nei, jeg har ikke 'hes' eller 'vie' tilgjengelig, bare Mann eller Kvinne), stemmen og talefarten din.