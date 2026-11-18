#!/usr/bin/env bash
set -euo pipefail

# Build the pinned ICU C library with the exact data from the comparison Node
# release. Node sources are build inputs and are absent from the game process.
if [[ $# -ne 3 ]]; then
  printf '%s\n' 'Usage: rust-game-server-language.sh NODE_SOURCE_TAR_XZ ICU_SOURCE_TGZ NEW_RELEASE_DIRECTORY' >&2
  exit 2
fi
node_archive="$(cd "$(dirname "$1")" && pwd -P)/$(basename "$1")"
icu_archive="$(cd "$(dirname "$2")" && pwd -P)/$(basename "$2")"
release="$(cd "$(dirname "$3")" && pwd -P)/$(basename "$3")"
if [[ -e "$release" || -L "$release" ]]; then
  printf '%s\n' 'The language release directory already exists.' >&2
  exit 2
fi

sha() {
  if command -v sha256sum > /dev/null; then
    sha256sum "$1" | cut -d ' ' -f 1
  else
    shasum -a 256 "$1" | cut -d ' ' -f 1
  fi
}
node_data_sha=2cac4f3277df9fa37f8ebd5d3459d4151e99f7d84d99fca5b7392fcd3c880ea9
[[ $(sha "$node_archive") == bbe768df8d5815d7fa76124052985332452e0a4742d39f32027550d1aab8f6fb ]]
[[ $(sha "$icu_archive") == 3e99687b5c435d4b209630e2d2ebb79906c984685e78635078b672e03c89df35 ]]

scratch=$(mktemp -d)
trap 'rm -rf "$scratch"' EXIT
tar -xf "$icu_archive" -C "$scratch"
node_data='node-v22.23.2/deps/icu-small/source/data/in/icudt78l.dat.bz2'
bundled_data="$scratch/icu/source/data/in/icudt78l.dat"
tar -xOf "$node_archive" "$node_data" | bzip2 -dc > "$bundled_data"
[[ $(sha "$bundled_data") == "$node_data_sha" ]]

case "$(uname -s)" in
  Darwin) platform=MacOSX; library=libopenlegend_icu.dylib ;;
  Linux) platform=Linux; library=libopenlegend_icu.so ;;
  *) printf '%s\n' 'The ICU release recipe supports macOS and Linux.' >&2; exit 2 ;;
esac
mkdir "$scratch/build"
cd "$scratch/build"
CFLAGS='-O2 -fPIC' CXXFLAGS='-O2 -fPIC' ../icu/source/runConfigureICU "$platform" \
  --disable-tests --disable-samples --disable-extras --disable-icuio \
  --enable-static --disable-shared --with-data-packaging=static --prefix="$scratch/install"
make -j "${OPEN_LEGEND_BUILD_JOBS:-4}"
make install
lib="$scratch/install/lib"

if [[ $platform == MacOSX ]]; then
  "${CXX:-c++}" -dynamiclib -Wl,-all_load -o "$scratch/$library" \
    "$lib/libicui18n.a" "$lib/libicuuc.a" "$lib/libicudata.a"
else
  "${CXX:-c++}" -shared -o "$scratch/$library" -Wl,--whole-archive \
    "$lib/libicui18n.a" "$lib/libicuuc.a" "$lib/libicudata.a" \
    -Wl,--no-whole-archive -ldl -pthread
fi
mkdir "$release"
cp "$scratch/$library" "$release/$library"
cp "$scratch/icu/LICENSE" "$release/ICU-LICENSE"
printf '{"librarySha256":"%s","nodeDataSha256":"%s"}\n' \
  "$(sha "$release/$library")" "$node_data_sha" > "$release/language.json"
