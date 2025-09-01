Wsparcie VOIP dla Homey.

Za pomocą połączenia SIP Homey może nawiązać rozmowę telefoniczną na podany numer lub SIP.

Można to zrobić za pomocą pliku z SoundBoard, internetowego pliku dźwiękowego, w pełni z tekstu lub znacznika generowanego przez TTS.

Do usługi Text2Speech potrzebujesz klucza API dla ChatGPT. ChatGPT odpowiada za zamknięcie TTS.

Połączenia SIP są trudne. Codec ma automatyczne wykrywanie, ale można go również wybrać ręcznie. Jest skonfigurowany serwer STUN, aby uniknąć możliwie najwięcej problemów NAT na routerze. Porty do samego Homey są również konfigurowalne, więc możesz skonfigurować przekierowanie portów na swoim routerze.

Uważaj na duże pliki multimedialne, które muszą zostać przekonwertowane. Homey sam zamknie aplikacje, jeśli będą zbyt długo używać dużo pamięci. Długa konwersja będzie wymagać dużo pamięci, co spowoduje zamknięcie aplikacji.

Jeśli chcesz odtworzyć długi plik dźwiękowy, upewnij się, że jest w natywnym formacie SIP. Przykładowo, PCM (nieskompresowane) 8-bitowe mono.

Niektóre konwersje z MP3 nie udają się, a przyczyna prawdopodobnie leży w bibliotece konwersji. Możliwe, że zostanie to naprawione w aktualizacji, ale użycie innej biblioteki zwiększy zużycie pamięci, co może prowadzić do częstszego zamykania aplikacji przez Homey.

Skonfiguruj swoje dane konta SIP: domenę, nazwę użytkownika, ID uwierzytelniania (opcjonalnie), hasło, realm i porty według uznania. Skonfiguruj klucz API ChatGPT, płeć (Nie mam dostępnych hes ani wie-en, tylko Mężczyzna lub Kobieta), głos i prędkość mówienia.