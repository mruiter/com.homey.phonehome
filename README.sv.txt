VOIP-stöd för Homey.

Med en SIP-anslutning kan Homey sätta upp ett telefonsamtal till ditt angivna nummer eller SIP.

Detta kan göras med en fil från SoundBoard, en online ljudfil eller helt från text eller en tagg-genererad TTS.

För Text2Speech behöver du en API-nyckel för ChatGPT. ChatGPT hanterar nämligen avslutet av TTS.

SIP-anslutningar är knepiga. Codecen har auto-detektering men kan väljas manuellt. Det finns en STUN-server inställd för att undvika så många NAT-problem som möjligt på routern. Portarna för Homey är också konfigurerbara, så du kan fånga dem på din router via en port-forward om så önskas.

Var försiktig med stora mediefiler som behöver konverteras. Homey stänger av applikationer som använder mycket minne under en längre tid. En lång konvertering kan använda mycket minne och därmed stänga av appen.

Om du ändå vill spela upp en lång ljudfil, se till att den är i ett native SIP-format. Detta är exempelvis PCM (okomprimerat) 8 bit mono.

Vissa konverteringar från MP3 misslyckas. Orsaken är förmodligen ett problem med konverteringsbiblioteket. Det kan lösas i en uppdatering; att använda ett annat bibliotek skulle öka minnesanvändningen och göra att appen stoppas för ofta av Homey.

Konfigurera ditt SIP-kontoinformation: domän, användarnamn, autentiserings-ID (valfritt), lösenord, realm och portar efter önskemål. Konfigurera din ChatGPT API-nyckel, kön (Nej, det finns inga "hes" eller "vie" tillgängliga, bara Man eller Kvinna), rösten och talhastigheten.