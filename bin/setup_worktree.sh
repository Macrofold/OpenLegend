#!/usr/bin/env bash

set -euo pipefail

# Resolve the target from this script, even when invoked outside the checkout.
target_root="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd -P)"
source_root="${OPEN_LEGEND_WORKTREE_SOURCE_PATH:-}"
dry_run=0

usage() {
    echo 'Usage: bash bin/setup_worktree.sh [--source PATH] [--dry-run]'
}

while [[ $# -gt 0 ]]; do
    case "$1" in
        --source)
            if [[ $# -lt 2 ]]; then
                echo '--source requires a path' >&2
                exit 2
            fi
            source_root="$2"
            shift 2
            ;;
        --dry-run)
            dry_run=1
            shift
            ;;
        --help|-h)
            usage
            exit 0
            ;;
        *)
            echo "Unknown argument: $1" >&2
            usage >&2
            exit 2
            ;;
    esac
done

if [[ -z "$source_root" ]]; then
    # Git lists the main checkout first, so child worktrees do not copy each other.
    source_root="$(git -C "$target_root" worktree list --porcelain | sed -n '1s/^worktree //p')"
fi
source_root="$(cd "$source_root" && pwd -P)"

echo "Source checkout: $source_root"
echo "Target checkout: $target_root"

# Copy rather than link: changing this worktree's settings must not edit the source.
# Preserve existing files and links, including broken links requiring manual repair.
if [[ -e "$target_root/.env" || -L "$target_root/.env" ]]; then
    echo 'Preserving existing .env'
elif [[ ! -f "$source_root/.env" ]]; then
    echo 'Source .env is missing. Configure it first or pass --source PATH.' >&2
    exit 1
elif [[ "$dry_run" -eq 1 ]]; then
    echo 'Would copy .env from the source checkout'
else
    cp -p "$source_root/.env" "$target_root/.env"
    echo 'Copied .env from the source checkout'
fi

if [[ "$dry_run" -eq 1 ]]; then
    echo 'Would run: pnpm install --frozen-lockfile'
else
    cd "$target_root"
    # Each checkout needs its own dependency links for its current lockfile.
    pnpm install --frozen-lockfile
fi
