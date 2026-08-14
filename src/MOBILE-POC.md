# Navigator Mobile POC

## Architecture

One Navigator codebase. Capacitor provides two native doors: iOS and Android.

The existing Next.js application remains the application and backend. The native shells load the same reachable Navigator server, so there is no second implementation to maintain.

## First install

```bash
npm install
```

## Point the native app at Navigator

The phone cannot use `localhost` on the development PC. Set `CAPACITOR_SERVER_URL` to a URL the phone can reach.

Examples:

Windows PowerShell, local network:

```powershell
$env:CAPACITOR_SERVER_URL="http://192.168.1.25:3000"
npm run mobile:sync
```

Production/staging:

```powershell
$env:CAPACITOR_SERVER_URL="https://navigator.example.com"
npm run mobile:sync
```

For local-network testing, run Next.js so it accepts LAN connections:

```bash
npm run dev -- -H 0.0.0.0
```

## Add the native doors once

```bash
npx cap add android
npx cap add ios
```

After either native project exists, sync shared Navigator changes with:

```bash
npm run mobile:sync
```

## Android

Android can be built/tested from Windows with Android Studio installed.

```bash
npm run mobile:open:android
```

Run the `app` target on a connected Android phone or emulator.

## iOS

The iOS project is generated from the same codebase. Apple requires macOS/Xcode to compile/sign an iPhone build.

```bash
npm run mobile:open:ios
```

The same Navigator source is used. There is no separate iOS application implementation.

## POC rule

Do not fork UI or business logic by platform. Platform-specific code is limited to OS-required integrations such as Contacts permission, notifications, signing, and store packaging.
