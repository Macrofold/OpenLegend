"""Review and activate the supplied Solo opening in an empty local PostgreSQL database."""

import argparse
import fcntl
import hashlib
import json
import os
from pathlib import Path
import secrets
import shutil
import socket
import subprocess
import sys
import tempfile
import time
from urllib.error import HTTPError, URLError
from urllib.parse import unquote, urlsplit

sys.dont_write_bytecode = True
from unreal_dev_server import BINARY, CONFIG, HOME, HTTP, ROOT, build, require_external, write_private


WORK = Path(os.environ.get("OPENLEGEND_DEV_WORLD_DIR", HOME / ".local/share/openlegend/unreal-dev")).resolve()
ACCOUNT = "local-player"
ART = "assets/locks/development.json"
CANDIDATE = WORK / "candidate.json"
RELEASE = WORK / "release"
JS = ["node", "--import", "tsx"]


def invoke(args, env=None):
    # The source/destination tools receive credentials only in their environment.
    result = subprocess.run(args, cwd=ROOT, env=env, stdout=subprocess.PIPE, text=True, check=True)
    return json.loads(result.stdout)


def review():
    if not CANDIDATE.exists():
        make = """
import {BASE_OPENING_IDENTITY_KEYS, createBaseOpeningCandidate} from './packages/domain/src/index.ts';
const objects = Object.fromEntries(BASE_OPENING_IDENTITY_KEYS.map(key => [key, 'solo-' + key]));
console.log(JSON.stringify(createBaseOpeningCandidate({
  worldId: 'solo-1086', playerId: 'entity-0001', residentId: 'entity-0002', objects
}, 'solitary', 1086)));
"""
        write_private(CANDIDATE, invoke([*JS, "--input-type=module", "-e", make]))
    result = invoke([*JS, "scripts/rust-game-server-opening.ts", "review", CANDIDATE, ACCOUNT, ART])
    write_private(WORK / "review.json", result)
    print(json.dumps(result, indent=2))


def release_inputs(directory, language):
    if not language:
        language = HOME / ".cache/openlegend/language-icu78.2-node22.23.2"
        if not language.is_dir():
            language.parent.mkdir(mode=0o700, parents=True, exist_ok=True)
            with tempfile.TemporaryDirectory(dir=language.parent) as temp:
                urls = (
                    "https://nodejs.org/dist/v22.23.2/node-v22.23.2.tar.xz",
                    "https://github.com/unicode-org/icu/releases/download/release-78.2/icu4c-78.2-sources.tgz",
                )
                archives = []
                for url in urls:
                    archive = Path(temp) / url.rsplit("/", 1)[1]
                    subprocess.run(["curl", "--fail", "--location", "--output", archive, url], check=True)
                    archives.append(archive)
                # The project's existing recipe verifies both pinned source checksums.
                built = Path(temp) / "language"
                subprocess.run(["bash", ROOT / "scripts/rust-game-server-language.sh", *archives, built],
                               check=True)
                built.rename(language)
    shutil.copytree(language, directory / "language")
    subprocess.run(["pnpm", "exec", "vite", "build", "--config", "apps/client/vite.config.ts",
                    "--outDir", str(directory / "browser")], cwd=ROOT, check=True)


def prepare_release(digest, language):
    if RELEASE.exists():
        current_schema = invoke([*JS, "--input-type=module", "-e",
            "import './packages/domain/src/index.ts';"
            "const {DATABASE_SCHEMA}=await import('./apps/server/src/game-storage-schema.ts');"
            "console.log(JSON.stringify(DATABASE_SCHEMA));"])
        stored_schema = json.loads((RELEASE / "storage.json").read_text())["version"]
        if stored_schema != current_schema:
            raise ValueError("This release uses an older database schema. Review a fresh world in a new directory and database.")
    else:
        with tempfile.TemporaryDirectory(dir=WORK) as temp:
            staged = Path(temp) / "release"
            invoke([*JS, "scripts/rust-game-server-opening.ts", "publish", CANDIDATE,
                    ACCOUNT, ART, staged, digest])
            release_inputs(staged, language)
            staged.rename(RELEASE)
    descriptor = (RELEASE / "opening.json").read_bytes()
    if json.loads(descriptor)["compiledWorldDigest"] != digest:
        raise ValueError("This directory already holds a different reviewed opening. Choose a fresh world directory.")
    return hashlib.sha256(descriptor).hexdigest()


def local_database(variable):
    value = os.environ.get(variable, "")
    u = urlsplit(value)
    queries = ("",) if variable == "OPENLEGEND_BUILD_DATABASE_ADMIN_URL" else ("", "sslmode=disable", "sslmode=require")
    if (u.scheme not in ("postgresql", "postgres") or u.hostname not in ("127.0.0.1", "::1")
            or not u.path.strip("/") or u.query not in queries or u.fragment):
        raise ValueError(f"Set {variable} to a local PostgreSQL URL using 127.0.0.1 or [::1].")
    return value


def read_database(database, sql):
    u = urlsplit(database)
    # Pass the password to psql using its environment. Process arguments and
    # failure messages can be shown without exposing the connection string.
    env = {k: os.environ[k] for k in ("PATH", "HOME", "LANG") if k in os.environ}
    env.update(PGHOST=u.hostname, PGPORT=str(u.port or 5432), PGDATABASE=unquote(u.path[1:]),
               PGCONNECT_TIMEOUT="5", PGOPTIONS="-c default_transaction_read_only=on")
    if u.username:
        env["PGUSER"] = unquote(u.username)
    if u.password:
        env["PGPASSWORD"] = unquote(u.password)
    if u.query:
        env["PGSSLMODE"] = u.query.split("=", 1)[1]
    result = subprocess.run(["psql", "-XAt", "-v", "ON_ERROR_STOP=1", "-c", sql], env=env,
                            text=True, stdout=subprocess.PIPE, check=True)
    return result.stdout.strip()


def select_destination(database, digest):
    identity = read_database(database, """SELECT json_build_array(inet_server_addr(), inet_server_port(),
        current_database(), oid, current_user) FROM pg_database WHERE datname=current_database()""")
    marker = WORK / "destination.json"
    # Namespace members include functions and types as well as tables. Internal
    # array types owned by pgvector are safe in a fresh database.
    empty = read_database(database, """
        WITH RECURSIVE ext(classid,objid) AS (
          SELECT 'pg_extension'::regclass,oid FROM pg_extension WHERE extname IN ('vector','plpgsql')
          UNION SELECT d.classid,d.objid FROM pg_depend d JOIN ext e
            ON (d.refclassid,d.refobjid)=(e.classid,e.objid) WHERE d.deptype IN ('i','e','a')
        ) SELECT NOT EXISTS (SELECT 1 FROM pg_extension WHERE extname NOT IN ('vector','plpgsql'))
          AND NOT EXISTS (SELECT 1 FROM pg_namespace WHERE nspname !~ '^pg_'
                          AND nspname NOT IN ('public','information_schema'))
          AND NOT EXISTS (SELECT 1 FROM pg_depend d WHERE d.refclassid='pg_namespace'::regclass
                          AND d.refobjid='public'::regnamespace AND NOT EXISTS
                          (SELECT 1 FROM ext WHERE (classid,objid)=(d.classid,d.objid)))""") == "t"
    if marker.exists():
        saved = json.loads(marker.read_text())
        if saved["database"] != identity or saved["digest"] != digest:
            raise ValueError("This workspace belongs to another database or opening. Use a fresh world directory.")
        if not empty:
            registered = read_database(database, "SELECT to_regclass('open_legend.creation_target_registration') IS NOT NULL")
            if registered != "t" or read_database(database, "SELECT target_id FROM open_legend.creation_target_registration WHERE id=1") != saved["target"]:
                raise ValueError("The nonempty database belongs to another operation. Select a fresh local game database.")
        return saved["target"]
    if not empty:
        raise ValueError("The game database is not empty. Select a newly created local database.")
    target = "unreal-dev-solo-" + secrets.token_hex(8)
    write_private(marker, {"database": identity, "digest": digest, "target": target})
    return target


def activate(digest, port, language):
    if not 1 <= port <= 65535:
        raise ValueError("Choose a local TCP port between 1 and 65535.")
    database = local_database("OPEN_LEGEND_DATABASE_URL")
    admin = local_database("OPENLEGEND_BUILD_DATABASE_ADMIN_URL")
    if urlsplit(database).path == urlsplit(admin).path:
        raise ValueError("Select a separate, empty local game database.")
    summary = json.loads((WORK / "review.json").read_text())
    if summary["compiledWorldDigest"] != digest:
        raise ValueError("Review the current candidate and supply its exact compiledWorldDigest.")
    target = select_destination(database, digest)
    build()
    pin = prepare_release(digest, language)
    checkpoints = WORK / "checkpoints"
    checkpoints.mkdir(mode=0o700, exist_ok=True)
    source = "unreal-dev-operator"
    # Keep the same request and credential across retries after a lost response.
    keyfile = WORK / "intake.json"
    if not keyfile.exists():
        write_private(keyfile, {"key": secrets.token_hex(32)})
    key = json.loads(keyfile.read_text())["key"]
    url = f"http://127.0.0.1:{port}/"
    profile = {"id": "unreal-local-development", "revision": 1, "description": "Local development world"}
    common = {"id": target, "label": "Local Solo testing ground", "entryUrl": url, "profile": profile}
    src = {**common, "intakeKey": key, "intakeUrl": url, "allowedCreatorAccountIds": [ACCOUNT]}
    dst = {**common, "sources": [{"installationId": source, "intakeKey": key}],
           "creators": [{"sourceInstallationId": source, "creatorAccountId": ACCOUNT,
                         "account": {"issuer": "https://local.openlegend.invalid", "subject": ACCOUNT,
                                     "accountId": ACCOUNT, "capabilities": ["play", "save"]}}]}
    env = {k: os.environ[k] for k in ("HOME", "PATH", "LANG", "TMPDIR") if k in os.environ}
    env.update(OPEN_LEGEND_DATABASE_URL=database, OPEN_LEGEND_DATA_DIR=str(checkpoints),
               OPEN_LEGEND_AUTH_MODE="local", OPEN_LEGEND_STARTUP_MODE="awaiting-creation",
               OPEN_LEGEND_HOST="127.0.0.1", PORT=str(port), AI_BUDGET_USD="0",
               OPEN_LEGEND_CREATION_DESTINATION_JSON=json.dumps(dst),
               OPEN_LEGEND_CREATION_OPENING_SHA256=pin)
    operator = {**env, "OPEN_LEGEND_INSTALLATION_ID": source, "OPEN_LEGEND_CREATION_TARGETS_JSON": json.dumps([src])}
    tools = [*JS, "scripts/rust-game-server-creation.ts"]
    with socket.socket() as check:
        if check.connect_ex(("127.0.0.1", port)) == 0:
            raise ValueError(f"Port {port} is already in use.")
    log = WORK / "activation.log"
    with log.open("a") as output:
        proc = subprocess.Popen([BINARY, "serve", RELEASE], cwd=ROOT, env=env, stdin=subprocess.DEVNULL,
                                stdout=output, stderr=output)
    try:
        deadline = time.monotonic() + 90
        while proc.poll() is None and time.monotonic() < deadline:
            try:
                with HTTP.open(url + "api/creation-host", timeout=1) as response:
                    if json.load(response).get("data", {}).get("status") == "ready":
                        break
            except HTTPError as error:
                if error.code == 503 and json.load(error).get("data", {}).get("status") == "awaiting-creation":
                    break
            except (OSError, URLError):
                time.sleep(0.25)
        else:
            raise RuntimeError(f"The local creation host could not open. See {log}")
        approval = WORK / "activation-request.json"
        result = invoke([*tools, "receipt", approval], operator) if approval.exists() else None
        if not result or not result.get("receipt"):
            if approval.exists():
                prior = json.loads(approval.read_text())
                if prior["expiresAt"] <= time.time() * 1000:
                    # An expired request can no longer be admitted; a negative
                    # receipt above also rules out a prior committed Start.
                    approval.replace(WORK / ("expired-" + prior["operationId"] + ".json"))
        if not approval.exists():
            check = invoke([*tools, "check", target, ACCOUNT, CANDIDATE], operator)
            if check["status"] != "ready" or check["compiledWorldDigest"] != digest:
                raise RuntimeError("The destination did not accept this exact reviewed opening.")
            request = invoke([*tools, "approve", target, ACCOUNT, CANDIDATE, digest,
                              str(int((time.time() + 86400) * 1000))], operator)
            write_private(approval, request)
        if not result or not result.get("receipt"):
            result = invoke([*tools, "start", approval], operator)
        if not result.get("receipt") or result["host"]["status"] != "ready":
            raise RuntimeError("The creation host has not confirmed the new world. Retry with the same workspace.")
        write_private(WORK / "receipt.json", result)
    finally:
        if proc.poll() is None:
            proc.terminate()
            proc.wait(timeout=30)
    subprocess.run([sys.executable, ROOT / "bin/unreal_dev_server.py", "configure", "--release", RELEASE,
                    "--data-dir", checkpoints, "--port", str(port)], cwd=ROOT, check=True)
    print("The local world is ready. Run python3 bin/unreal_dev_server.py start.")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    sub = parser.add_subparsers(dest="action", required=True)
    sub.add_parser("review", help="Build and inspect the supplied Solo opening")
    opening = sub.add_parser("activate", help="Activate the reviewed opening and select it for the editor")
    opening.add_argument("digest")
    opening.add_argument("--language", type=Path, help="Existing current platform's prepared ICU language directory")
    opening.add_argument("--port", type=int, default=3211)
    args = parser.parse_args()
    os.umask(0o077)
    require_external(CONFIG)
    require_external(WORK)
    WORK.mkdir(mode=0o700, parents=True, exist_ok=True)
    with (WORK / "setup.lock").open("a") as lock:
        fcntl.flock(lock, fcntl.LOCK_EX)
        if args.action == "review":
            review()
        else:
            activate(args.digest, args.port, args.language)


if __name__ == "__main__":
    try:
        main()
    except (KeyError, OSError, ValueError, RuntimeError, subprocess.SubprocessError) as error:
        sys.exit(str(error))
