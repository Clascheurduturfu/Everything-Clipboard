#!/usr/bin/env bash
set -euo pipefail

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
BUILD_DIR="${CLIPSYNC_IOS_BUILD_DIR:-$(mktemp -d "${TMPDIR:-/tmp}/clipsync-ios.XXXXXX")}"
OUTPUT_DIR="${CLIPSYNC_IOS_OUTPUT_DIR:-$BUILD_DIR/output}"
mkdir -p "$OUTPUT_DIR/Payload"

# Keep local source/build directory names out of distributed Swift binaries.
SWIFT_FLAGS="-debug-prefix-map $PROJECT_DIR=/usr/src/ClipSync/ios-app -file-prefix-map $PROJECT_DIR=/usr/src/ClipSync/ios-app -debug-prefix-map $BUILD_DIR=/usr/src/ClipSync/build -file-prefix-map $BUILD_DIR=/usr/src/ClipSync/build"
xcodebuild -project "$PROJECT_DIR/ClipSync.xcodeproj" -scheme ClipSync \
  -configuration Release -sdk iphoneos -destination 'generic/platform=iOS' \
  -derivedDataPath "$BUILD_DIR/DerivedData" CODE_SIGNING_ALLOWED=NO \
  SWIFT_SERIALIZE_DEBUGGING_OPTIONS=NO OTHER_SWIFT_FLAGS="$SWIFT_FLAGS" build

APP_BUNDLE="$BUILD_DIR/DerivedData/Build/Products/Release-iphoneos/ClipSync.app"
# A plain build can retain linker debug-map paths even with Swift remapping.
for binary in "$APP_BUNDLE/ClipSync" "$APP_BUNDLE/PlugIns/ShareExtension.appex/ShareExtension"; do
  xcrun strip -S "$binary"
done
ditto "$APP_BUNDLE" "$OUTPUT_DIR/Payload/ClipSync.app"
ditto -c -k --sequesterRsrc --keepParent "$OUTPUT_DIR/Payload" "$OUTPUT_DIR/ClipSync-iOS-unsigned.ipa"
echo "Unsigned package: $OUTPUT_DIR/ClipSync-iOS-unsigned.ipa"
echo 'Sign and provision it with your own Apple developer identity before installing.'
