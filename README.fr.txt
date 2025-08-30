Support VOIP pour Homey.

Configurez les détails de votre compte SIP via les paramètres de l'application dans Homey afin que le domaine, le nom d'utilisateur, l'ID d'authentification, le mot de passe, le domaine et les ports soient ajustables selon vos besoins.

Une serveur STUN peut éventuellement être spécifié pour déterminer l'adresse IP publique et les ports. Cela peut aider à résoudre les problèmes NAT pour les SIP et RTP entrants.

Dans les paramètres, vous pouvez définir le codec. Par défaut, l'application essaie automatiquement d'utiliser la meilleure qualité (G722 > PCMA > PCMU) et passe à une qualité inférieure si le serveur SIP l'exige.

Les fichiers audio en WAV ou MP3 sont automatiquement convertis au format 8kHz mono approprié. Bien entendu, plus le fichier audio est grand, plus il faut de temps pour démarrer l'appel SIP.

Il est donc préférable d'avoir les notifications importantes déjà prêtes dans le bon format sur le tableau sonore ou ailleurs.