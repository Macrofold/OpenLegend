"""Build and run this checkout's local Rust world for the Unreal editor (WSL/macOS)."""

import argparse
import fcntl
import json
import os
from pathlib import Path
import shutil
import signal
import socket
import subprocess
import sys
import tempfile
import time
from urllib.error import HTTPError, URLError
from urllib.parse import urlsplit
from urllib.request import ProxyHandler, build_opener


ROOT = Path(__file__).resolve().parents[1]
HOME = Path.home()
CONFIG = Path(os.environ.get("OPENLEGEND_DEV_CONFIG", HOME / ".config/openlegend/unreal-dev.json")).expanduser().resolve()
BUILD = Path(os.environ.get("CARGO_TARGET_DIR", HOME / ".cache/openlegend/rust")).resolve()
BINARY = BUILD / "release/openlegend-game-server"
HTTP = build_opener(ProxyHandler({}))


def require_external(path):
    resolved = path.expanduser().resolve()
    if any((ancestor / ".git").exists() for ancestor in (resolved, *resolved.parents)):
        raise ValueError(f"Choose storage outside Git for {path.name}.")


def write_private(path, value):
    path.parent.mkdir(mode=0o700, parents=True, exist_ok=True)
    temporary = path.with_name(f".{path.name}.{os.getpid()}.tmp")
    try:
        with temporary.open("x") as out:
            json.dump(value, out)
            out.write("\n")
        temporary.replace(path)
    finally:
        temporary.unlink(missing_ok=True)


def endpoint(config):
    return f"http://127.0.0.1:{config['port']}"


def validate(config):
    database = urlsplit(config["databaseUrl"])
    if database.scheme not in ("postgres", "postgresql") or database.hostname not in (
        "127.0.0.1", "::1"
    ) or database.query not in ("", "sslmode=disable", "sslmode=require") or database.fragment:
        raise ValueError("Choose a local PostgreSQL database URL without connection overrides.")
    if not 1 <= config["port"] <= 65535:
        raise ValueError("Choose a TCP port between 1 and 65535.")
    release = Path(config["release"])
    require_external(release)
    require_external(Path(config["dataDir"]))
    for part in ("manifest.json", "opening.json", "language/language.json", "browser/index.html"):
        if not (release / part).is_file():
            raise ValueError(f"The reviewed release is missing {part}.")
    if not Path(config["dataDir"]).is_dir():
        raise ValueError("The local checkpoint directory is missing.")


def signature(pid):
    result = subprocess.run(["ps", "-ww", "-p", str(pid), "-o", "uid=,lstart=,args="],
                            capture_output=True, text=True)
    return result.stdout.strip() if result.returncode == 0 else ""


def serving(config):
    try:
        with HTTP.open(endpoint(config) + "/api/state", timeout=1):
            return False
    except HTTPError as error:
        return error.code == 401
    except (URLError, TimeoutError, OSError):
        return False


def owned(state):
    return bool(state and signature(state["pid"]) == state["signature"])


def stop(state):
    if not owned(state):
        return
    pid = state["pid"]
    if hasattr(os, "pidfd_open") and hasattr(signal, "pidfd_send_signal"):
        descriptor = os.pidfd_open(pid)
        try:
            if owned(state):
                signal.pidfd_send_signal(descriptor, signal.SIGTERM)
        finally:
            os.close(descriptor)
    else:
        os.kill(pid, signal.SIGTERM)
    deadline = time.monotonic() + 30
    while owned(state):
        if time.monotonic() >= deadline:
            raise RuntimeError("The local server is still shutting down.")
        time.sleep(0.2)


def build():
    require_external(BUILD)
    cargo = shutil.which("cargo") or str(HOME / ".cargo/bin/cargo")
    print("Checking the Rust server build…", file=sys.stderr, flush=True)
    with tempfile.TemporaryFile(mode="w+") as output:
        result = subprocess.run([cargo, "build", "--locked", "--release", "-p", "openlegend-game-server"],
                                cwd=ROOT / "native", env={**os.environ, "CARGO_TARGET_DIR": str(BUILD)},
                                stdout=output, stderr=subprocess.STDOUT)
        if result.returncode:
            output.seek(0)
            shutil.copyfileobj(output, sys.stderr)
            raise RuntimeError("The Rust server build failed.")
    stat = BINARY.stat()
    return [str(ROOT), str(BINARY), stat.st_size, stat.st_mtime_ns]


def start(config, state, state_path, log):
    version = build()
    if owned(state):
        if state["version"] == version and serving(config):
            print(f"Open Legend is ready at {endpoint(config)}.")
            return state
        stop(state)
    with socket.socket() as probe:
        if probe.connect_ex(("127.0.0.1", config["port"])) == 0:
            raise RuntimeError(f"Another process already uses {endpoint(config)}.")
    # Launch only the local game settings. Provider keys and remote auth settings
    # from an unrelated shell must not change this workstation world.
    env = {key: os.environ[key] for key in ("HOME", "PATH", "LANG", "TMPDIR") if key in os.environ}
    env.update(OPEN_LEGEND_DATABASE_URL=config["databaseUrl"], OPEN_LEGEND_DATA_DIR=config["dataDir"],
               OPEN_LEGEND_AUTH_MODE="local", OPEN_LEGEND_STARTUP_MODE="ordinary",
               OPEN_LEGEND_HOST="127.0.0.1", PORT=str(config["port"]), AI_BUDGET_USD="0")
    with log.open("a") as out:
        proc = subprocess.Popen(["/bin/sh", str(ROOT / "bin/serve-rust-game.sh"),
                                 config["release"], str(BINARY)], cwd=ROOT,
                                stdin=subprocess.DEVNULL, stdout=out, stderr=out,
                                env=env, start_new_session=True)
    try:
        deadline = time.monotonic() + 120
        while proc.poll() is None and time.monotonic() < deadline:
            if serving(config):
                identity = signature(proc.pid)
                if identity and str(BINARY) in identity and config["release"] in identity:
                    state = {"pid": proc.pid, "signature": identity, "version": version}
                    write_private(state_path, state)
                    print(f"Open Legend is ready at {endpoint(config)}.")
                    return state
            time.sleep(0.25)
        raise RuntimeError(f"Rust could not open the configured world. See {log}")
    finally:
        if not (state and state.get("pid") == proc.pid):
            if proc.poll() is None:
                proc.terminate()
                proc.wait(timeout=30)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="action", required=True)
    setup = sub.add_parser("configure", help="Select an already activated local world")
    setup.add_argument("--release", required=True, type=Path)
    setup.add_argument("--data-dir", required=True, type=Path)
    setup.add_argument("--port", type=int, default=3211)
    for action in ("start", "run", "status", "stop", "build", "port"):
        sub.add_parser(action)
    args = parser.parse_args()
    os.umask(0o077)
    require_external(CONFIG)
    if args.action == "build":
        build()
        return
    CONFIG.parent.mkdir(parents=True, mode=0o700, exist_ok=True)
    state_path = CONFIG.with_suffix(".process.json")
    log = CONFIG.with_suffix(".log")
    with CONFIG.with_suffix(".lock").open("a") as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        state = json.loads(state_path.read_text()) if state_path.exists() else None
        if args.action == "stop":
            stop(state)
            state_path.unlink(missing_ok=True)
            print("The managed Rust server is stopped.")
            return
        if args.action == "configure":
            if owned(state):
                raise ValueError("Stop the managed Rust server before changing its world.")
            if not os.environ.get("OPEN_LEGEND_DATABASE_URL"):
                raise ValueError("Set OPEN_LEGEND_DATABASE_URL for the activated local world.")
            config = {"databaseUrl": os.environ["OPEN_LEGEND_DATABASE_URL"],
                      "release": str(args.release.expanduser().resolve()),
                      "dataDir": str(args.data_dir.expanduser().resolve()), "port": args.port}
            validate(config)
            write_private(CONFIG, config)
            print(f"Selected the local world in {CONFIG}.")
            return
        if not CONFIG.is_file():
            raise ValueError("Select a local world first with configure --release DIR --data-dir DIR.")
        config = json.loads(CONFIG.read_text())
        validate(config)
        if args.action == "port":
            print(config["port"])
            return
        if args.action == "status":
            if not (owned(state) and serving(config)):
                raise RuntimeError("The managed Rust server is stopped or unavailable.")
            print(f"Open Legend is ready at {endpoint(config)}.")
            return
        running = start(config, state, state_path, log)
    if args.action == "run":
        print(f"Press Ctrl+C to stop. Server log: {log}", flush=True)
        try:
            while owned(running):
                time.sleep(1)
        except KeyboardInterrupt:
            with CONFIG.with_suffix(".lock").open("a") as lock:
                fcntl.flock(lock, fcntl.LOCK_EX)
                stop(running)


if __name__ == "__main__":
    try:
        main()
    except (KeyError, OSError, RuntimeError, ValueError, subprocess.SubprocessError) as error:
        sys.exit(str(error))
