Supporto VOIP per Homey.

Tramite una connessione SIP, Homey può avviare una chiamata telefonica al numero o SIP specificato.

Può essere fatto con un file da SoundBoard, un file audio online o completamente da testo o un tag generato TTS.

Per il Text2Speech hai bisogno di una API-Key per ChatGPT. ChatGPT gestisce infatti il TTS.

Le connessioni SIP sono complesse. Il Codec ha il rilevamento automatico ma può essere selezionato manualmente. C'è un server STUN configurato per evitare il più possibile problemi di NAT sul router. Le porte verso Homey sono anche configurabili, quindi potresti eventualmente gestirle sul tuo router tramite un port-forward.

Attenzione ai grandi file multimediali che devono essere convertiti. Homey chiude automaticamente le applicazioni se usano troppo memoria per troppo tempo. Una conversione lunga utilizzerà molta memoria e quindi chiuderà l'app.

Se desideri riprodurre un file audio lungo, assicurati che sia in un formato SIP nativo. Ad esempio, PCM (non compresso) 8 bit mono.

Alcune conversioni da MP3 falliscono, la causa è probabilmente un problema con la libreria di conversione. È possibile che venga risolto in un aggiornamento, usare un'altra libreria richiede più memoria e potrebbe far chiudere l'app troppo spesso da Homey.

Configura i dati del tuo account SIP: dominio, nome utente, ID di autenticazione (opzionale), password, realm e porte a tuo piacimento. Configura la tua Api key di ChatGPT, il genere (No, non ho hess o chi-altro disponibile, solo Maschio o Femmina), la voce e la velocità di eloquio.