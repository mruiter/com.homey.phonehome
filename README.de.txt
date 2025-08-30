VOIP-Unterstützung für Homey.

Konfigurieren Sie Ihre SIP-Kontodaten über die Einstellungen der App in Homey, sodass Domain, Benutzername, Authentifizierungs-ID, Passwort, Realm und Ports nach Bedarf anpassbar sind.

Optional kann ein STUN-Server angegeben werden, um die öffentliche IP-Adresse und Ports zu bestimmen. Dies kann bei NAT-Problemen mit eingehenden SIP- und RTP-Verbindungen hilfreich sein.

In den Einstellungen kann der Codec eingestellt werden. Standardmäßig versucht die App, automatisch die beste Qualität zu verwenden (G722 \> PCMA \> PCMU) und wechselt zu einer niedrigeren Qualität, wenn es der SIP-Server erfordert.

Audiodateien im WAV- oder MP3-Format werden automatisch in das geeignete 8kHz-Mono-Format konvertiert. Natürlich gilt: Je größer die Audiodatei, desto länger dauert der Start des SIP-Anrufs.

Wichtige Benachrichtigungen solltest du am besten bereits im richtigen Format im Soundboard oder an einem anderen Ort bereit haben.