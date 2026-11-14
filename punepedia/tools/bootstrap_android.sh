#!/usr/bin/env bash
# Generates the standard Flutter Android project files (Gradle wrapper,
# build scripts, MainActivity, launcher icons) around the PunePedia source.
# `flutter create` only adds files that are missing, so lib/, test/, the
# custom AndroidManifest.xml and pubspec.yaml are kept as they are.
set -euo pipefail
cd "$(dirname "$0")/.."

flutter --version
flutter create --platforms=android --org com.overtimelabs --project-name punepedia .
python3 tools/content.py build
flutter pub get

echo
echo "Android project ready. Next:"
echo "  flutter test"
echo "  flutter run                      # on a device or emulator"
echo "  flutter build apk --debug        # installable debug build"
