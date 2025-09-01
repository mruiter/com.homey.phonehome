VOIP-Unterstützung für Homey.

Mithilfe einer SIP-Verbindung kann Homey ein Telefongespräch zu deiner angegebenen Nummer oder SIP aufbauen.

Dies kann mit einer Datei von SoundBoard, einer Online-Audiodatei oder vollständig aus Text oder einer taggenerierten TTS erfolgen.

Für Text2Speech benötigst du einen API-Schlüssel für ChatGPT. ChatGPT übernimmt nämlich den TTS-Abschluss.

SIP-Verbindungen sind knifflig. Der Codec hat eine automatische Erkennung, kann aber manuell ausgewählt werden. Es ist ein STUN-Server eingerichtet, um so viele nat-bezogene Probleme wie möglich zu vermeiden. Die Ports für Homey selbst sind ebenfalls konfigurierbar, sodass du diese eventuell noch auf deinem Router per Port-Forwarding einrichten kannst.

Vorsicht bei großen Mediendateien, die konvertiert werden müssen. Homey schließt Anwendungen automatisch, wenn diese zu lange zu viel Speicher nutzen. Eine lange Konvertierung wird viel Speicher benötigen und somit die App zum Schließen bringen.

Falls du dennoch eine lange Audiodatei abspielen möchtest, stelle sicher, dass sie im nativen SIP-Format vorliegt. Dies wäre beispielsweise PCM (unkomprimiert) 8-Bit Mono.

Einige MP3-Konvertierungen schlagen fehl, die Ursache ist wahrscheinlich ein Problem mit der Konvertierungsbibliothek. Möglicherweise wird dies in einem Update behoben, die Verwendung einer anderen Bibliothek führt jedoch zu einem größeren Speicherverbrauch und könnte die App zu häufig von Homey stoppen lassen.

Konfiguriere deine SIP-Kontodaten: Domain, Benutzername, Authentifizierungs-ID (optional), Passwort, Realm und Ports nach Wunsch. Konfiguriere deinen ChatGPT-API-Schlüssel, das Geschlecht (Nein, ich habe keine hes oder wie-en verfügbar, nur Mann oder Frau), die Stimme und die Sprechgeschwindigkeit.