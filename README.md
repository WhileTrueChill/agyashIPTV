# AGYASHtv

Cross-platform IPTV player for Android mobile, Android TV, and PC browser. It uses Xtream Codes-compatible provider credentials and is intended for authorized subscriptions.

## Login experience

Users enter only their IPTV username and password. There is no provider URL field in the app. Android mobile and TV fetch the operator-configured provider address from the AGYASHtv API at runtime; customer credentials are not embedded in the APK.

## One-time provider setup

1. Open your Vercel project for AGYASHtv and go to **Settings → Environment Variables**.
2. Add `XTREAM_BASE_URL` with the base address supplied by your authorized IPTV provider. Example format only: `https://provider.example:8080`. Do not include `player_api.php`, customer credentials, or a playlist path.
3. Make the variable available to Production (and Preview if needed), then redeploy Vercel.
4. Confirm the Vercel domain used by native apps is `https://agyas-htv.vercel.app`. If your production domain is different, set the GitHub Actions repository variable `AGYASHTV_API_ORIGIN` to that domain under **Settings → Secrets and variables → Actions → Variables**.
5. If your provider redirects media to a separate CDN hostname, add those hostnames as a comma-separated `XTREAM_ALLOWED_STREAM_HOSTS` Vercel environment variable, then redeploy. Leave it unset when streams stay on the provider host.
6. Run GitHub Actions → **Build AGYASHtv Android APK and PC web app**.

The Vercel config endpoint returns the provider base address to native clients at runtime. The base address is not a password and can be inspected by a technically capable user; this architecture avoids duplicating the configuration in GitHub secrets and APK builds. Do not embed an IPTV customer's username/password in source code, environment variables, or releases.

## Builds

A successful release workflow creates:
- `AGYASHtv-Mobile.apk` — release APK for Android mobile.
- `AGYASHtv-AndroidTV.apk` — TV-targeted release APK with TV launcher support.
- `AGYASHtv-PC-Web.zip` — exported web app.

A separate GitHub Actions smoke-test workflow compiles both Android variants using a nonfunctional test endpoint. Those test artifacts are not customer releases.

## Build locally

```bash
npm install
npm run start
npm run build:web
```

For native builds, set `EXPO_PUBLIC_API_ORIGIN` in your local environment to the deployed AGYASHtv API domain, then run:

```bash
npx expo prebuild --platform android --no-install --clean
cd android
./gradlew assembleRelease
```

The project uses the React Native TV runtime matched to Expo SDK 57 / React Native 0.86 and the Expo TV config plugin. The CI builds separate mobile and TV variants. Verify both on real hardware or an Android emulator before distributing broadly.

## Playback and deployment notes

- The PC web app uses `api/xtream.js` to proxy provider API calls and browser playback, which avoids browser CORS restrictions for many providers.
- Vercel functions have a maximum duration of 300 seconds on the Hobby plan. HLS segments and HTTP range requests usually complete as separate short requests, but providers returning one unbounded stream or not supporting range requests can hit the timeout; a persistent proxy is safer for those cases.
- Some providers restrict browser access, use cross-host HLS segments, or deliver codecs browsers do not support.
- Use only content and provider accounts you are authorized to access.
- Credentials are saved on-device only when “Remember me” is enabled (SecureStore on native, AsyncStorage on web).
