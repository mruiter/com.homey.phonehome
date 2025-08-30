Soporte VOIP para Homey.

Configura los detalles de tu cuenta SIP a través de la configuración de la app en Homey para que el dominio, nombre de usuario, ID de autenticación, contraseña, realm y puertos se puedan ajustar a tu gusto.

Ten cuidado con los archivos multimedia grandes. Esto consume mucha memoria y puede hacer que Homey cierre la app si se usa demasiado memoria durante mucho tiempo.

Opcionalmente, se puede especificar un servidor STUN para determinar la dirección IP pública y los puertos. Esto puede ayudar con problemas de NAT en SIP entrantes y RTP.

En la configuración se puede ajustar el códec. Por defecto, la app intenta automáticamente usar la mejor calidad (G722 > PCMA > PCMU) y retrocede a una calidad inferior si el servidor SIP lo requiere.

Los archivos de sonido en WAV o MP3 se convierten automáticamente al formato adecuado de 8kHz mono o superior si la central SIP admite los códecs disponibles. Por supuesto, cuanto mayor sea el archivo de sonido, más tiempo llevará iniciar la llamada SIP.

Por lo tanto, es mejor tener listas las notificaciones importantes ya en el formato correcto en el soundboard o en otro lugar.