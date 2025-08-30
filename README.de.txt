VOIP-Unterstützung für Homey.

Konfiguriere deine SIP-Kontodaten über die Einstellungen der App in Homey, sodass Domain, Benutzername, Authentifizierungs-ID, Passwort, Realm und Ports nach Belieben anpassbar sind.

Vorsicht bei großen Mediendateien. Diese verbrauchen viel Speicher und können dazu führen, dass Homey die App beendet, wenn zu lange zu viel Speicher genutzt wird.

Optional kann ein STUN-Server angegeben werden, um die öffentliche IP-Adresse und die Ports zu bestimmen. Dies kann bei NAT-Problemen mit eingehendem SIP und RTP helfen.

In den Einstellungen kann der Codec eingestellt werden. Standardmäßig versucht die App automatisch, die beste Qualität zu verwenden (G722 \> PCMA \> PCMU) und wechselt zu einer niedrigeren Qualität, wenn der SIP-Server dies erfordert.

Audiodateien in WAV oder MP3 werden automatisch in das geeignete 8kHz Mono oder höher konvertiert, wenn die Telefonanlage die vorhandenen Codecs unterstützt.
Natürlich gilt: Je größer die Audiodatei, desto länger dauert es, bis der SIP-Anruf startet.

Wichtige Mitteilungen solltest du am besten bereits im richtigen Format im Soundboard oder anderswo bereit haben.