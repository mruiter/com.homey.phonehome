Obsługa VOIP dla Homey.

Skonfiguruj dane swojego konta SIP w ustawieniach aplikacji Homey, aby dostosować domenę, nazwę użytkownika, ID uwierzytelniania, hasło, obszar i porty zgodnie z potrzebami.

Uważaj na duże pliki multimedialne. Zużywają one dużo pamięci i mogą spowodować, że Homey wyłączy aplikację, jeśli pamięć będzie używana zbyt długo.

Opcjonalnie można podać serwer STUN, aby określić publiczny adres IP i porty. Może to pomóc w problemach z NAT przy przychodzących połączeniach SIP i RTP.

W ustawieniach można ustawić kodek. Domyślnie aplikacja próbuje automatycznie użyć najlepszej jakości (G722 > PCMA > PCMU) i obniży jakość, jeśli wymaga tego serwer SIP.

Pliki dźwiękowe w formatach WAV lub MP3 są automatycznie konwertowane do odpowiedniego 8kHz mono lub wyższej jakości, jeśli centrala SIP obsługuje dostępne kodeki. Oczywiście, im większy plik dźwiękowy, tym dłużej trwa rozpoczęcie połączenia SIP.

Ważne komunikaty najlepiej mieć gotowe w odpowiednim formacie na soundboardzie lub w innym miejscu.