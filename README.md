# Decoder Dump NFC/POS

Decoder e generatore di valori per dump NFC/POS, progettato per funzionare **offline** sia da browser sia come APK Android.

## Funzioni

- Decodifica dump Seriale POS e NFC Mifare supportati dalla logica attuale.
- Incolla/copia rapidi.
- Importi predefiniti: €10, €20, €31,50 e €50.
- Importo manuale fino a €655,35 per valori a 2 byte unsigned.
- Calcolo centesimi e byte little-endian.
- Generazione dump NFC di esempio con il valore selezionato.
- Interfaccia responsive ottimizzata per smartphone.
- Nessuna dipendenza web esterna durante l'uso: funziona offline.
- PWA con service worker.
- APK Android generato automaticamente da GitHub Actions, senza Android Studio.

## Creare l'APK senza Android Studio

Ogni push su `main` che modifica l'app avvia **Build Android APK**.

1. Apri la scheda **Actions** del repository.
2. Apri l'ultima esecuzione `Build Android APK`.
3. In fondo alla pagina scarica l'artifact `Decoder-NFC-POS-APK`.
4. Estrai lo ZIP e installa `Decoder-NFC-POS.apk` sul telefono Android.

È un APK `debug`, quindi è installabile direttamente per uso personale. Android potrebbe chiedere di consentire l'installazione da sorgenti sconosciute per il browser/file manager usato.

## Versione web

I file web sono nella cartella `docs/`. Puoi anche pubblicarli con GitHub Pages impostando la sorgente su `main /docs`.

## Note tecniche

- App ID Android: `it.wincklers.decoderposnfc`
- Framework wrapper: Capacitor
- Tutti i calcoli sono eseguiti localmente sul dispositivo.
