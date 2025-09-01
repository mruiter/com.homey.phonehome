VOIP Support for Homey

Through a SIP connection, Homey can initiate a phone call to your specified number or SIP address.

This can be done with a file from SoundBoard, an online audio file, or fully generated from text or a tag using TTS.

For Text-to-Speech, you need an API key for ChatGPT, since ChatGPT handles the TTS output.

SIP connections can be tricky. The codec has auto-detection but can also be selected manually.
A STUN server is configured to prevent as many NAT issues on your router as possible.
The ports on Homey itself are also configurable, so you can set up port forwarding on your router if needed.

Be careful with large media files that need conversion.
Homey automatically shuts down apps if they use too much memory for too long.
A long conversion will consume a lot of memory and cause the app to close.

If you still want to play a long audio file, make sure it is in a native SIP format.
For example: PCM (uncompressed) 8-bit mono.

Some MP3 conversions may fail, likely due to issues with the conversion library.
This might be fixed in a future update. Using another library would increase memory usage and cause the app to stop more often on Homey.

Configure your SIP account details: domain, username, authentication ID (optional), password, realm, and ports as needed.
Configure your ChatGPT API key, the gender (only Male or Female are available, no “hes” or “who-en”), the voice, and the speaking speed.