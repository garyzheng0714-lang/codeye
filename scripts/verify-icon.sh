#!/bin/bash
# Post-build verification: ensure Codeye.app uses our icon, not Electron default
set -e

APP_PATH="release/mac-arm64/Codeye.app"

if [ ! -d "$APP_PATH" ]; then
  APP_PATH="release/mac/Codeye.app"
fi

if [ ! -d "$APP_PATH" ]; then
  echo "⚠️  No Codeye.app found in release/, skipping icon verification"
  exit 0
fi

PLIST="$APP_PATH/Contents/Info.plist"
ICON_REF=$(/usr/libexec/PlistBuddy -c "Print :CFBundleIconFile" "$PLIST" 2>/dev/null || echo "unknown")

if [ "$ICON_REF" = "electron.icns" ] || [ "$ICON_REF" = "unknown" ]; then
  echo "❌ ICON BUG: CFBundleIconFile is '$ICON_REF' (Electron default)"
  echo "   Fixing: copying build/icon.icns -> $APP_PATH/Contents/Resources/icon.icns"
  cp build/icon.icns "$APP_PATH/Contents/Resources/icon.icns"
  /usr/libexec/PlistBuddy -c "Set :CFBundleIconFile icon.icns" "$PLIST"
  echo "   ✅ Fixed: CFBundleIconFile is now 'icon.icns'"
  # Re-sign after modification (ad-hoc)
  codesign --force --deep --sign - "$APP_PATH" 2>/dev/null || true
else
  echo "✅ Icon OK: CFBundleIconFile = '$ICON_REF'"
fi

# Verify the actual .icns file exists
ICNS_FILE="$APP_PATH/Contents/Resources/$ICON_REF"
if [ ! -f "$ICNS_FILE" ]; then
  echo "❌ Icon file missing: $ICNS_FILE"
  echo "   Copying build/icon.icns -> $ICNS_FILE"
  cp build/icon.icns "$ICNS_FILE"
  codesign --force --deep --sign - "$APP_PATH" 2>/dev/null || true
  echo "   ✅ Fixed"
fi

echo "✅ Icon verification complete"
