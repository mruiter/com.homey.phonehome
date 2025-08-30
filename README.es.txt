Soporte VOIP para Homey.

Configura los detalles de tu cuenta SIP a través de la configuración de la aplicación en Homey para que el dominio, nombre de usuario, ID de autenticación, contraseña, realm y puertos sean ajustables a tu gusto.

Opcionalmente, se puede especificar un servidor STUN para determinar la dirección IP pública y los puertos. Esto puede ayudar con problemas de NAT en SIP entrante y RTP.

En la configuración se puede establecer el códec. Por defecto, la aplicación intenta automáticamente usar la mejor calidad (G722 \> PCMA \> PCMU) y baja a una calidad inferior si el servidor SIP lo requiere.

Los archivos de sonido en WAV o MP3 se convierten automáticamente al adecuado 8kHz mono.
Por supuesto, cuanto más grande sea el archivo de sonido, más tiempo tardará en empezar la llamada SIP.

Por eso es mejor tener listas las notificaciones importantes en el formato correcto en el soundboard u otro lugar.