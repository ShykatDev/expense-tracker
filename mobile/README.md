# Expense Tracker — Flutter app

Flutter port of the Next.js expense tracker, built module by module. See the
main conversation with Claude for the full roadmap and explanations — this
file only covers local setup.

## One-time setup (Flutter isn't installed on this machine yet)

1. Install the Flutter SDK: https://docs.flutter.dev/get-started/install/windows
   - Grab the Windows zip, extract it somewhere like `C:\src\flutter`
     (avoid `Program Files` — it needs write access, and avoid paths with
     spaces).
   - Add `C:\src\flutter\bin` to your user `PATH`.
   - Open a **new** terminal and run `flutter doctor`. Follow its
     suggestions (it'll ask you to install Android Studio, and/or accept
     Android licenses with `flutter doctor --android-licenses`).
2. From this `mobile/` folder, run:

   ```
   flutter create .
   ```

   This fills in the platform folders (`android/`, `ios/`, `windows/`, etc.)
   that can't be hand-written and aren't checked in. It detects the
   existing `pubspec.yaml` and `lib/` and will not touch them.
3. Install dependencies:

   ```
   flutter pub get
   ```
4. Check what you can run on:

   ```
   flutter devices
   ```

   Easiest first target is Chrome (`flutter run -d chrome`) since it needs
   no emulator/device setup. For a real Android emulator, open Android
   Studio's Device Manager and start one, then `flutter run`.

## Project layout

```
lib/
  main.dart          # app entry point
  theme/             # colors + ThemeData, ported from globals.css
  models/            # data classes (added in the next module)
  services/          # local storage / persistence
  providers/         # app state (transactions, filters, etc.)
  screens/           # full-page views
  widgets/           # reusable pieces (cards, drawers, list items)
```
