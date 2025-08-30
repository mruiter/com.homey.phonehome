Prise en charge de VOIP pour Homey.

Configurez vos informations de compte SIP via les paramètres de l'application Homey afin de rendre le domaine, le nom d'utilisateur, l'ID d'authentification, le mot de passe, le domaine et les ports personnalisables selon vos préférences.

Faites attention aux fichiers médias volumineux. Cela consomme beaucoup de mémoire et peut entraîner la fermeture de l'application par Homey si elle utilise trop de mémoire pendant trop longtemps.

Optionnellement, un serveur STUN peut être spécifié pour déterminer l'adresse IP publique et les ports. Cela peut aider à résoudre les problèmes NAT avec les SIP et RTP entrants.

Dans les paramètres, le codec peut être configuré. Par défaut, l'application essaie automatiquement d'utiliser la meilleure qualité (G722 > PCMA > PCMU) et revient à une qualité inférieure si le serveur SIP l'exige.

Les fichiers audio au format WAV ou MP3 sont automatiquement convertis en mono 8kHz ou plus si la centrale SIP prend en charge les codecs disponibles. Bien sûr, plus le fichier audio est grand, plus il met de temps à démarrer l'appel SIP.

Il est donc préférable d'avoir les messages importants dans le bon format déjà enregistrés sur une table sonore ou ailleurs.