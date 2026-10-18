# CivicSign Scan — passport chip reader

A small React Native app whose only job is to read the chip in a passport and
hand the result to CivicSign. It makes no judgement about authenticity: the
security object and data page go to the server, which runs passive
authentication (`backend/idv/chip.py`). A tampered app cannot claim a chip
was genuine.

**Status: written, not yet built.** None of this has been compiled or run on a
device. Treat the first build as the real test.

## What is here

| File | Purpose |
|------|---------|
| `src/mrzKey.ts` | Derives the chip access key from the printed page |
| `src/api.ts` | Talks to the CivicSign signing endpoints |
| `src/ScanScreen.tsx` | The screen a signer sees |
| `android/.../PassportModule.kt` | NFC read over IsoDep using JMRTD |
| `android/.../PassportPackage.kt` | Registers the module with React Native |

The chip will not open without the document number, date of birth and expiry
date from the machine readable zone, each with its check digit. That is why
the signer photographs the page first: the photo is not a formality, it is
the key.

## Creating the project

These files are the parts worth writing by hand. Generate the surrounding
project, then copy them in:

```bash
npx @react-native-community/cli init CivicSignScan
# copy src/ and android/app/src/main/java/uk/co/civicsign/scan/ into it
```

### Android dependencies

In `android/app/build.gradle`:

```gradle
dependencies {
    implementation 'org.jmrtd:jmrtd:0.7.42'
    implementation 'net.sf.scuba:scuba-sc-android:0.0.23'
    implementation 'org.bouncycastle:bcprov-jdk15to18:1.78.1'
}

android {
    packagingOptions {
        exclude 'META-INF/BCKEY.DSA'
        exclude 'META-INF/BCKEY.SF'
        exclude 'META-INF/DEPENDENCIES'
    }
}
```

### Manifest

```xml
<uses-permission android:name="android.permission.NFC" />
<uses-feature android:name="android.hardware.nfc" android:required="true" />
```

Add a deep link to the main activity so a signing link opens the app:

```xml
<intent-filter android:autoVerify="true">
    <action android:name="android.intent.action.VIEW" />
    <category android:name="android.intent.category.DEFAULT" />
    <category android:name="android.intent.category.BROWSABLE" />
    <data android:scheme="https" android:host="civicsign.co.uk" android:pathPrefix="/sign" />
</intent-filter>
```

Register the package in `MainApplication.kt`:

```kotlin
packages.add(PassportPackage())
```

## Distributing by link, without the Play Store

Android allows this properly. Build a signed release:

```bash
keytool -genkeypair -v -keystore civicsign-release.keystore \
  -alias civicsign -keyalg RSA -keysize 2048 -validity 10000
cd android && ./gradlew assembleRelease
# android/app/build/outputs/apk/release/app-release.apk
```

Host the APK anywhere you control and send the link. Two things to tell
signers: their phone will ask them to allow installing from your browser or
file manager, and Play Protect may warn them the first time. Keep the same
keystore for every release or upgrades will fail.

## iOS is not the same, and "no App Store" does not mean "no Apple"

Chip reading needs Core NFC, which rules out the mobile web. Safari cannot
read a passport chip at all. The routes are:

- **TestFlight** — the realistic link-based option. Needs a paid Apple
  Developer account, and the build is still reviewed for external testers,
  but there is no public App Store listing. Up to 10,000 testers.
- **Apple Developer Enterprise Program** — distributes by link with no
  review, but Apple restricts it to your own employees. Using it for
  customers breaches the agreement and gets the certificate revoked, which
  kills every installed copy at once.
- **Ad hoc** — capped at 100 devices whose identifiers you register in
  advance. Fine for a pilot, unusable for customers.

You will also need the NFC Tag Reading capability on the App ID, with the
passport application identifier `A0000002471001` listed in
`com.apple.developer.nfc.readersession.iso7816.select-identifiers`.

For iOS the Swift equivalent of the Android module is
[NFCPassportReader](https://github.com/AndyQ/NFCPassportReader) (MIT), which
performs BAC/PACE and returns the same two values this app sends.
