#!/bin/sh
set -eu

if [ "$#" -lt 1 ] || [ "$#" -gt 2 ]; then
    printf '%s\n' 'Usage: serve-rust-game.sh REVIEWED_RELEASE_DIRECTORY [RUST_EXECUTABLE]' >&2
    exit 2
fi

game_server=${2:-"$(dirname "$0")/../native/target/release/openlegend-game-server"}
exec "$game_server" serve "$1"
