Supporto VOIP per Homey.

Configura i dati del tuo account SIP tramite le impostazioni dell'app in Homey in modo che dominio, nome utente, ID di autenticazione, password, realm e porte siano personalizzabili secondo le tue esigenze.

Fai attenzione con i file multimediali di grandi dimensioni. Questo consuma molta memoria e potrebbe portare Homey a chiudere l'app se viene utilizzata troppa memoria per troppo tempo.

Opzionalmente, può essere specificato un server STUN per determinare l'indirizzo IP pubblico e le porte. Ciò può aiutare con i problemi NAT su SIP e RTP in ingresso.

Nelle impostazioni è possibile impostare il codec. Di default l'app tenta automaticamente di utilizzare la qualità migliore (G722 > PCMA > PCMU) e ripiega su una qualità inferiore se richiesto dal server SIP.

I file audio in formato WAV o MP3 vengono automaticamente convertiti nel formato adatto, 8kHz mono o superiore, se la centrale SIP supporta i codec disponibili. Ovviamente, più grande è il file audio, più tempo ci vorrà per l'avvio della chiamata SIP.

Le notifiche importanti quindi sarebbe meglio averle già pronte nel formato giusto su soundboard o altrove.