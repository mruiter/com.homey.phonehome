Support VOIP pour Homey.

Grâce à une connexion SIP, Homey peut établir un appel téléphonique vers votre numéro spécifié ou SIP.

Cela peut se faire avec un fichier à partir de SoundBoard, un fichier audio en ligne ou entièrement à partir de texte ou d'un tag généré en TTS.

Pour le Text2Speech, vous avez besoin d'une clé API pour ChatGPT. ChatGPT gère en effet la clôture du TTS.

Les connexions SIP sont compliquées. Le codec dispose de la détection automatique mais peut être sélectionné manuellement. Un serveur STUN est configuré pour éviter autant que possible les problèmes nat sur le routeur. Les ports vers Homey sont également configurables, vous pourriez donc éventuellement les gérer sur votre routeur via un transfert de port.

Attention aux gros fichiers média qui doivent être convertis. Homey ferme lui-même les applications si elles utilisent trop de mémoire pendant trop longtemps. Une conversion longue utilisera beaucoup de mémoire et entraînera donc la fermeture de l'application.

Si vous souhaitez tout de même jouer un long fichier audio, assurez-vous qu'il soit dans un format SIP natif. Il s'agit par exemple de PCM (non compressé) 8 bits mono.

Certaines conversions de MP3 échouent, la cause est probablement un problème avec la bibliothèque de conversion. Cela pourrait être résolu dans une mise à jour, mais utiliser une autre bibliothèque entraîne une utilisation plus importante de la mémoire et ferait arrêter l'application trop souvent par Homey.

Configurez vos coordonnées de compte SIP : domaine, nom d'utilisateur, identifiant d'authentification (facultatif), mot de passe, domaine et ports selon vos souhaits. Configurez votre clé API ChatGPT, le sexe (Non je n'ai pas de hes ou wie-en disponibles, seulement Homme ou Femme), la voix et la vitesse de parole.