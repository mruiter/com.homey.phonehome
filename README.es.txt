Soporte VOIP para Homey.

A través de una conexión SIP, Homey puede iniciar una llamada telefónica a tu número especificado o SIP.

Esto se puede hacer desde un archivo de SoundBoard, un archivo de sonido en línea o completamente desde texto o un TTS generado por una etiqueta.

Para el Text2Speech necesitas una API-Key para ChatGPT. ChatGPT maneja el cierre del TTS.

Las conexiones SIP son complicadas. El códec tiene detección automática pero se puede seleccionar manualmente. Hay un servidor STUN configurado para evitar tantos problemas de NAT en el router como sea posible. Los puertos para Homey también son configurables, por lo que podrías capturarlos en tu router mediante un reenvío de puertos.

Ten cuidado con grandes archivos multimedia que necesiten conversión. Homey cierra las aplicaciones si usan mucha memoria durante mucho tiempo. Una conversión larga utilizará mucha memoria y cerrará la app.

Si deseas reproducir un archivo de sonido largo, asegúrate de que esté en un formato SIP nativo. Un ejemplo es PCM (sin comprimir) de 8 bits mono.

Algunas conversiones de MP3 fallan, la causa probablemente sea un problema con la librería de conversión. Es posible que esto se resuelva en una actualización, pero usar otra librería aumenta el uso de memoria y podría causar que Homey cierre la app con más frecuencia.

Configura los detalles de tu cuenta SIP: dominio, nombre de usuario, ID de autenticación (opcional), contraseña, reino y puertos a tu gusto. Configura tu clave API de ChatGPT, el género (No tengo opciones de hes o quiénes disponibles, solo Hombre o Mujer), la voz y la velocidad de habla.