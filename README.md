# AGYASHtv

Cross-platform IPTV player for Android mobile, Android TV, and PC browser. It uses Xtream Codes-compatible provider credentials and is intended for authorized subscriptions.

## Login experience

The user enters only their IPTV username and password. No server URL field is shown. The app operator configures the provider base address once through deployment configuration.

## Configure the provider (required)

1. Set GitHub repository secret **Settings → Secrets and variables → Actions → New repository secret**:
   - Name: `XTREAM_BASE_URL`
   - Value: base address of your authorized provider, e.g. `https://provider.example:8080` (format example only; do not include `player_api.php`, credentials, or a playlist path).
2. In Vercel, set project Environment Variable `XTREAM_BASE_URL` to the same provider base address for Production and Preview, then redeploy.
3. Run GitHub Actions → **Build AGYASHtv Android APK and PC web app**. Builds are intentionally blocked until the hidden native provider endpoint is configured, to avoid publishing an APK that cannot connect.

Do not put a real provider URL or credentials in source code. The web API proxy reads `XTREAM_BASE_URL` server-side. The Android APK requires it at build time as `EXPO_PUBLIC_XTREAM_BASE_URL`; because native clients must make provider requests, a technical user could inspect this endpoint in the APK. Never embed an IPTV customer's username or password into a build.

## Build locally

```bash
npm install
npm run start
npm run build:web
```

For an Android release APK, configure `EXPO_PUBLIC_XTREAM_BASE_URL` in your local environment, then run:

```bash
npx expo prebuild --platform android --no-install
cd android
./gradlew assembleRelease
```

The Android TV config plugin adds the Leanback launcher category and marks touchscreen hardware optional. TV compatibility must still be checked on real hardware or an emulator. PC browser playback depends on provider stream formats and the browser's supported codecs.

## Notes

- Use only content and provider accounts you are authorized to access.
- Some providers restrict browser access or use unsupported stream codecs.
- User credentials are stored on-device only when “Remember me” is enabled (SecureStore on native, AsyncStorage on web).
