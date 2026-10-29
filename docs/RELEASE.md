# Releasing Checkmate & Chivalry

The business side (name, trademark, company, pricing, store listing copy) lives in the
launch plan doc. This file covers the technical steps to get the builds into the stores.

## What is already done

| Item | Where |
| --- | --- |
| iOS app project (Xcode) | `ios/` |
| Android app project (Android Studio) | `android/` |
| App icons and splash screens, all sizes | generated from `resources/` with `npm run icons` |
| Store screenshots: iPhone 6.9", iPad 13", Android phone | `store/screenshots/` |
| Google Play feature graphic (1024x500) | `store/feature-graphic-1024x500.png` |
| Privacy policy and help pages | `privacy.html`, `support.html` |
| Automatic builds on every push | `.github/workflows/build.yml` (GitHub, Actions tab) |

## Decide before the first upload

- **App ID: `com.checkmateandchivalry.game`.** It can never change after the first store upload.
  If the company has a domain, use it reversed, for example `com.yourcompany.checkmatechivalry`.
  It is set in `capacitor.config.json`, `android/app/build.gradle` (`applicationId`, `namespace`)
  and in Xcode (Bundle Identifier).
- **Contact email:** replace `[CONTACT EMAIL]` in `privacy.html` and `support.html`.
- **Public URLs** for the privacy policy and support page. Both stores require them. The simplest
  free option is GitHub Pages on a public repo, or any web host serving the `www/` folder.

## Everyday commands

```
npm install          # once
npm test             # chess rules and computer checks
npm run build        # builds the app bundle into www/
npm run sync         # build + copy into the iOS and Android projects
npm run android      # opens Android Studio
npm run ios          # opens Xcode (Mac only)
npm run art          # redraw icon, splash, feature graphic from the sprites
npm run icons        # regenerate every native icon/splash size from resources/
node tools/screenshots.js   # retake store screenshots (after npm run build)
```

## Android (Google Play)

1. Create the upload key once and keep it safe (losing it is painful):
   `keytool -genkey -v -keystore upload.jks -alias upload -keyalg RSA -keysize 2048 -validity 10000`
   Never commit it (`.gitignore` already blocks `*.jks`).
2. In Android Studio: Build > Generate Signed App Bundle, choose `upload.jks`.
3. Play Console: create the app, fill in the store listing, Data safety form (no data collected),
   content rating questionnaire, then upload the `.aab` to a closed testing track.
4. New personal developer accounts must run a closed test before going live; see the launch plan.

Every push also builds an installable test APK on GitHub (Actions > latest run > `android-test-apk`).
Install it on an Android phone to try the real app before any store work.

## iOS (App Store)

Needs a Mac with current Xcode and an Apple Developer Program membership.

1. `npm install && npm run sync && npx cap open ios`
2. In Xcode, select the App target > Signing & Capabilities > pick your team.
3. Set the version and build number, then Product > Archive > Distribute App > App Store Connect.
4. In App Store Connect: create the app, add screenshots from `store/screenshots/iphone-6.9` and
   `store/screenshots/ipad-13`, privacy answers (Data Not Collected), age rating, then send the
   build to TestFlight for testing before submitting for review.

No Mac? Cloud services such as Codemagic, Ionic Appflow or a GitHub macOS runner with signing
secrets can archive and upload the iOS build instead.

## Version numbers

Bump `version` in `package.json` and `APP.version` in `js/game.js`, plus
`versionCode`/`versionName` in `android/app/build.gradle` and the version/build in Xcode.
Each store upload needs a higher build number than the last.
