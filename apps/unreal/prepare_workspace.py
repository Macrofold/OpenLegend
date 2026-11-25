#!/usr/bin/env python3
"""Prepare the editable Unreal project outside the Open Legend checkout."""

import argparse
from contextlib import contextmanager
import hashlib
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import tempfile


SOURCE = Path(__file__).resolve().parent
REPO = SOURCE.parent.parent
CONTENT_INDEX = REPO / "assets/locks/unreal-content.json"
MARKER = ".openlegend-workspace.json"
OWNER_KINDS = ("engine", "world", "collection", "creator", "instance")
WINDOWS_DEVICE = re.compile(r"(?:CON|PRN|AUX|NUL|COM[1-9¹²³]|LPT[1-9¹²³])(?:\..*)?", re.IGNORECASE)


def digest(data):
    return hashlib.sha256(data).hexdigest()


def write_atomic(path, data):
    path.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.NamedTemporaryFile(dir=path.parent, delete=False) as stream:
        temporary = Path(stream.name)
        try:
            stream.write(data)
        except OSError:
            stream.close()
            temporary.unlink()
            raise
    try:
        os.replace(temporary, path)
    finally:
        temporary.unlink(missing_ok=True)


def editable_files():
    yield "OpenLegend.uproject", SOURCE / "OpenLegend.uproject.in"
    for path in sorted((SOURCE / "Config").glob("*.ini")):
        yield path.relative_to(SOURCE).as_posix(), path


def raise_walk_error(error):
    raise error


def link_source(workspace):
    """Let the editor and compiler read and edit the actual versioned C++ files."""
    source = SOURCE / "Source"
    target = workspace / "Source"
    if not source.is_dir():
        raise ValueError(f"Missing Unreal source directory: {source}")
    if os.path.lexists(target):
        if target.resolve() != source:
            raise ValueError(f"{target} already belongs to a different source tree. Choose a fresh workspace.")
        return
    if os.name == "nt":
        subprocess.run([
            "powershell.exe", "-NoProfile", "-NonInteractive", "-Command",
            "$ErrorActionPreference='Stop'; New-Item -ItemType Junction "
            "-Path $env:OL_SOURCE_LINK -Target $env:OL_SOURCE_TARGET | Out-Null",
        ], env={**os.environ, "OL_SOURCE_LINK": str(target), "OL_SOURCE_TARGET": str(source)}, check=True)
    else:
        target.symlink_to(source, target_is_directory=True)


def dev_command(arguments):
    if sys.platform == "win32":
        return ["wsl.exe", "-d", "Ubuntu", "--cd", str(REPO), "--exec", "bash", "-lc",
                'exec "$@"', "openlegend", *arguments]
    return arguments


def shell_path(path):
    if sys.platform == "win32":
        return subprocess.check_output(["wsl.exe", "-d", "Ubuntu", "--exec", "wslpath", "-u", str(path)],
                                       text=True).strip()
    return str(path)


def workspace_locations():
    if sys.platform == "win32":
        base = Path(os.environ["LOCALAPPDATA"]) / "OpenLegend"
    elif sys.platform == "darwin":
        base = Path.home() / "Library/Application Support/OpenLegend"
    else:
        base = Path.home() / ".local/share/openlegend"
    checkout = digest(os.fsencode(os.path.normcase(str(REPO))))[:16]
    return base, base / "checkouts" / checkout


def matches_selection(workspace, index_hash):
    marker = workspace / MARKER
    if not marker.is_file() or (workspace / "Source").resolve() != SOURCE / "Source":
        return False
    info = json.loads(marker.read_text(encoding="utf-8"))
    return info.get("project") == "OpenLegend" and info.get("assetIndexSha256") == index_hash


def default_workspace(asset_index):
    if override := os.environ.get("OPENLEGEND_UNREAL_WORKSPACE"):
        return Path(override).expanduser()
    base, local = workspace_locations()
    index_hash = digest(asset_index.read_bytes()) if asset_index else None
    selected = local / "workspace.json"
    if selected.is_file():
        candidate = Path(json.loads(selected.read_text(encoding="utf-8"))["workspace"])
        if matches_selection(candidate, index_hash):
            return candidate
    initial = base / "Unreal"
    if matches_selection(initial, index_hash):
        return initial
    name = "Unreal-" + index_hash[:16] if index_hash else "Unreal"
    candidate = local / name
    sequence = 1
    while candidate.exists() and not matches_selection(candidate, index_hash):
        sequence += 1
        candidate = local / f"{name}-{sequence}"
    return candidate


def remember_workspace(workspace):
    _, local = workspace_locations()
    write_atomic(local / "workspace.json", json.dumps({"workspace": str(workspace)}).encode())


def prepare_for_development(workspace, asset_index):
    """Hydrate shared content on first use, preserving earlier editable copies."""
    require_external(workspace)
    if asset_index and not (workspace / MARKER).exists() and not workspace.exists():
        workspace.parent.mkdir(parents=True, exist_ok=True)
        with tempfile.TemporaryDirectory(dir=workspace.parent) as directory:
            stage = Path(directory) / "project"
            subprocess.run(dev_command(["pnpm", "--silent", "assets", "workspace", "--all",
                                        "--index", shell_path(asset_index), "--output", shell_path(stage)]),
                           cwd=REPO, check=True)
            prepare(stage, asset_index)
            stage.rename(workspace)
        return
    prepare(workspace, asset_index)


def content_paths(workspace):
    content = workspace / "Content"
    if content.resolve() != content or not content.is_dir():
        raise ValueError(f"Expected a materialized Content directory: {content}")
    paths = {}
    casefolded = set()
    for directory, subdirectories, names in os.walk(content, onerror=raise_walk_error):
        root = Path(directory)
        file_names = set(names)
        for path in (root / name for name in (*subdirectories, *names)):
            relative = path.relative_to(workspace).as_posix()
            if path.resolve() != path or path.name == ".git":
                raise ValueError(f"Asset path is linked or contains Git metadata: {path}")
            if (path.name.endswith((".", " ")) or WINDOWS_DEVICE.fullmatch(path.name)
                    or re.search(r'[<>:"/\\|?*\x00-\x1f]', path.name)):
                raise ValueError(f"Asset path must also work on Windows: {relative}")
            if relative.casefold() in casefolded:
                raise ValueError(f"Asset names must be distinct even on case-insensitive filesystems: {relative}")
            casefolded.add(relative.casefold())
            if path.name in file_names:
                if not path.is_file():
                    raise ValueError(f"Expected a regular asset file: {path}")
                paths[relative] = path
    return paths


def hash_file(path):
    sha256 = hashlib.sha256()
    with path.open("rb") as stream:
        for block in iter(lambda: stream.read(1024 * 1024), b""):
            sha256.update(block)
    return sha256.hexdigest()


def read_asset_index(index):
    contents = index.read_bytes()
    manifest = json.loads(contents)
    files = manifest.get("files") if isinstance(manifest, dict) else None
    release = manifest.get("release") if isinstance(manifest, dict) else None
    if not isinstance(release, dict) or not isinstance(files, dict) or not files:
        raise ValueError(f"Expected a nonempty, pinned Open Legend asset index: {index}")
    owner = release.get("owner")
    if not isinstance(owner, dict) or owner.get("kind") not in OWNER_KINDS:
        raise ValueError(f"Expected an asset owner in the index: {index}")
    identifiers = (release.get("assetId"), release.get("revisionId"), owner.get("id"))
    if not all(isinstance(identifier, str) and identifier for identifier in identifiers) or not re.fullmatch(
        r"[0-9a-f]{64}", str(release.get("manifestSha256"))
    ):
        raise ValueError(f"Expected a nonempty, pinned Open Legend asset index: {index}")
    return contents, release, files


def verify_staged_assets(workspace, index):
    contents, release, files = read_asset_index(index)
    paths = content_paths(workspace)
    if paths.keys() != files.keys():
        raise ValueError("Use a fresh external Content directory with exactly the indexed files.")
    for name, item in files.items():
        path = paths[name]
        if not isinstance(item, dict) or path.stat().st_size != item.get("bytes"):
            raise ValueError(f"Asset size did not match the index: {name}")
        if (item.get("boundary"), item.get("accessDomain")) != ("art-library", "curated-private"):
            raise ValueError(f"Expected the private editable source revision: {name}")
        if hash_file(path) != item.get("sha256"):
            raise ValueError(f"Asset checksum did not match the index: {name}")
    return digest(contents), release


def require_external(path):
    for ancestor in (path, *path.parents):
        if (ancestor / ".git").exists():
            raise ValueError(f"Choose a workspace outside this Git checkout: {ancestor}")


@contextmanager
def workspace_lock(lock):
    if lock.resolve() != lock:
        raise ValueError(f"The workspace lock points outside its expected path: {lock}")
    with lock.open("a+b") as stream:
        if stream.tell() == 0:
            stream.write(b"0")
            stream.flush()
        stream.seek(0)
        try:
            if os.name == "nt":
                import msvcrt

                msvcrt.locking(stream.fileno(), msvcrt.LK_NBLCK, 1)
            else:
                import fcntl

                fcntl.flock(stream, fcntl.LOCK_EX | fcntl.LOCK_NB)
        except OSError as error:
            raise ValueError(f"Could not lock {lock.parent} for project preparation.") from error
        yield


def prepare(workspace, asset_index):
    require_external(workspace)
    workspace.mkdir(parents=True, exist_ok=True)
    marker = workspace / MARKER
    lock = workspace / ".openlegend-prepare.lock"
    with workspace_lock(lock):
        if marker.resolve() != marker:
            raise ValueError(f"The workspace marker points outside its expected path: {marker}")
        previous = json.loads(marker.read_text(encoding="utf-8")) if marker.exists() else {}
        if marker.exists() and (not isinstance(previous, dict) or previous.get("project") != "OpenLegend"):
            raise ValueError(f"Unexpected project marker: {marker}")
        asset_pin = previous.get("assetIndexSha256")
        asset_release = previous.get("assetRelease")
        if not marker.exists():
            occupants = {item.name for item in workspace.iterdir() if item != lock}
            if asset_index:
                if occupants != {"Content"}:
                    raise ValueError("Use a newly materialized asset workspace containing only Content.")
                asset_pin, asset_release = verify_staged_assets(workspace, asset_index)
            elif occupants:
                raise ValueError(f"Choose an empty directory for a new Unreal workspace: {workspace}")
        elif (digest(asset_index.read_bytes()) if asset_index else None) != asset_pin:
            raise ValueError("Materialize a changed asset index in a new workspace.")
        old_hashes = previous.get("sourceFiles", {})
        if not isinstance(old_hashes, dict):
            raise ValueError(f"Unexpected source file hashes in {marker}")
        new_hashes = {}
        changes = []
        for name, source in editable_files():
            target = workspace / name
            if target.resolve() != target:
                raise ValueError(f"Project file points outside its expected path: {target}")
            data = source.read_bytes()
            new_hash = digest(data)
            new_hashes[name] = new_hash
            old_hash = None
            if target.exists():
                old_hash = digest(target.read_bytes())
                if old_hash == new_hash:
                    continue
                if old_hash != old_hashes.get(name):
                    raise ValueError(
                        f"Local editor changes in {target}. Review them against {source} before refreshing."
                    )
            changes.append((target, old_hash, data))

        for name in sorted(old_hashes.keys() - new_hashes.keys()):
            retired = workspace / name
            if not retired.resolve().is_relative_to(workspace) or retired.exists():
                raise ValueError(f"A project setting was removed from source. Review {retired} or prepare a fresh workspace.")

        marker_data = {"project": "OpenLegend", "assetIndexSha256": asset_pin, "assetRelease": asset_release}
        if not marker.exists():
            write_atomic(marker, json.dumps(marker_data).encode())
        link_source(workspace)
        (workspace / "Content").mkdir(exist_ok=True)
        for target, old_hash, data in changes:
            current = digest(target.read_bytes()) if target.exists() else None
            if target.resolve() != target or current != old_hash:
                raise ValueError(f"A project file changed during preparation. Close Unreal and review {target}.")
            write_atomic(target, data)
        marker_data["sourceFiles"] = new_hashes
        write_atomic(marker, (json.dumps(marker_data, indent=2) + "\n").encode())


def find_editor(engine_root):
    if sys.platform == "win32":
        engine_root = engine_root or Path(os.environ.get("ProgramFiles", "C:/Program Files")) / "Epic Games/UE_5.9"
        executable = engine_root / "Engine/Binaries/Win64/UnrealEditor.exe"
    elif sys.platform == "darwin":
        engine_root = engine_root or Path("/Users/Shared/Epic Games/UE_5.9")
        executable = engine_root / "Engine/Binaries/Mac/UnrealEditor.app/Contents/MacOS/UnrealEditor"
    else:
        raise ValueError("Open the Unreal workspace from native Windows or macOS.")
    build = engine_root / "Engine/Build/Build.version"
    if not executable.is_file() or not build.is_file():
        raise ValueError(f"Unreal installation is incomplete or missing at {engine_root}")
    pinned = json.loads((SOURCE / "engine.json").read_text(encoding="utf-8"))
    installed = json.loads(build.read_text(encoding="utf-8-sig"))
    if any(installed.get(key) != value for key, value in pinned.items()):
        expected = ".".join(str(pinned[key]) for key in ("MajorVersion", "MinorVersion", "PatchVersion"))
        raise ValueError(f"Expected Unreal {expected}, changelist {pinned['Changelist']}, at {engine_root}")
    return executable


def build_editor(workspace, engine_root):
    editor = find_editor(engine_root)
    if sys.platform == "win32":
        build = editor.parents[2] / "Build/BatchFiles/Build.bat"
        platform = "Win64"
    else:
        build = editor.parents[5] / "Build/BatchFiles/Mac/Build.sh"
        platform = "Mac"
    subprocess.run([str(build), "OpenLegendEditor", platform, "Development",
                    f"-Project={workspace / 'OpenLegend.uproject'}", "-WaitMutex", "-NoHotReloadFromIDE"],
                   cwd=workspace, check=True)


def editor_has_project(workspace):
    project = str(workspace / "OpenLegend.uproject")
    if sys.platform == "win32":
        result = subprocess.check_output([
            "powershell.exe", "-NoProfile", "-NonInteractive", "-Command",
            "$ErrorActionPreference='Stop'; $p=$env:OL_EDITOR_PROJECT; "
            "Get-CimInstance Win32_Process -Filter \"Name='UnrealEditor.exe'\" | Where-Object { "
            "$_.CommandLine -and $_.CommandLine.IndexOf($p, [StringComparison]::OrdinalIgnoreCase) -ge 0 "
            "} | Select-Object -First 1 -ExpandProperty ProcessId",
        ], env={**os.environ, "OL_EDITOR_PROJECT": project})
        return bool(result.strip())
    if sys.platform == "darwin":
        processes = subprocess.check_output(["ps", "-axo", "args="], text=True)
        return any("UnrealEditor.app/Contents/MacOS/UnrealEditor " in line and project in line
                   for line in processes.splitlines())
    return False


def describe(workspace, options):
    require_external(workspace)
    marker = workspace / MARKER
    if not marker.is_file() or marker.resolve() != marker:
        raise ValueError(f"Prepare the Open Legend workspace first: {workspace}")
    previous = json.loads(marker.read_text(encoding="utf-8"))
    if not isinstance(previous, dict) or previous.get("project") != "OpenLegend":
        raise ValueError(f"Unexpected project marker: {marker}")
    output = options.output.expanduser().resolve()
    require_external(output.parent)
    if output.is_relative_to(workspace):
        raise ValueError("Save the manifest to a separate directory outside the Unreal workspace.")
    files = {}
    for name, path in sorted(content_paths(workspace).items()):
        before = path.stat()
        sha256 = hash_file(path)
        after = path.stat()
        if not os.path.samestat(before, after) or (before.st_size, before.st_mtime_ns) != (after.st_size, after.st_mtime_ns):
            raise ValueError(f"An asset changed while it was being read. Save and close Unreal first: {path}")
        files[name] = {
            "sha256": sha256,
            "bytes": after.st_size,
            "mediaType": "application/octet-stream",
            "boundary": "art-library",
            "accessDomain": "curated-private",
        }
    if not files:
        raise ValueError("Save project-owned assets in Content before preparing an asset revision.")
    metadata = {"engine": json.loads((SOURCE / "engine.json").read_text(encoding="utf-8"))}
    if previous.get("assetRelease"):
        metadata["derivedFrom"] = previous["assetRelease"]
    manifest = {
        "kind": "source-bundle",
        "identity": {"owner": {"kind": options.owner_kind, "id": options.owner_id},
                     "assetId": options.asset_id, "revisionId": options.revision_id},
        "files": files,
        "dependencies": [read_asset_index(index.expanduser())[1] for index in options.dependency_index],
        "rightsEvidence": options.rights_evidence,
        "metadata": metadata,
    }
    with output.open("x", encoding="utf-8") as stream:
        json.dump(manifest, stream, indent=2)
        stream.write("\n")


def share_content(workspace, options):
    """Publish one editable revision then record the verified reference for Git."""
    require_external(workspace)
    marker = json.loads((workspace / MARKER).read_text(encoding="utf-8"))
    original_index = CONTENT_INDEX.read_bytes() if CONTENT_INDEX.exists() else None
    index_hash = digest(original_index) if original_index else None
    if marker.get("assetIndexSha256") != index_hash:
        raise ValueError("The checkout selects another content revision. Reconcile your edits before publishing.")
    with tempfile.TemporaryDirectory(dir=workspace.parent) as scratch:
        scratch = Path(scratch)
        manifest = scratch / "manifest.json"
        options.output = manifest
        describe(workspace, options)
        arguments = ["--manifest", shell_path(manifest), "--boundary", "art-library", "--domain", "curated-private"]
        cli = ["pnpm", "--silent", "assets"]
        subprocess.run(dev_command([*cli, "prepare", *arguments]), cwd=REPO, check=True)
        if options.dry_run:
            print("Private manifest prepared locally.")
            return
        if options.approve_rights:
            subprocess.run(dev_command([*cli, "approve", *arguments, "--use", "source,offline,recovery",
                                        "--evidence", options.rights_evidence[0]]), cwd=REPO, check=True)
        operation = "unreal-" + digest(manifest.read_bytes())
        receipt = scratch / "receipt.json"
        with receipt.open("wb") as stream:
            subprocess.run(dev_command([*cli, "publish", *arguments, "--operation", operation,
                                        "--source-root", shell_path(workspace)]), cwd=REPO, stdout=stream, check=True)
        index = scratch / "index.json"
        subprocess.run(dev_command(["node", "apps/unreal/pin_content.mjs", shell_path(manifest),
                                    shell_path(receipt), shell_path(index)]), cwd=REPO, check=True)
        # A second author might have pulled or selected a different revision during publication.
        git_dir = Path(subprocess.check_output(["git", "rev-parse", "--absolute-git-dir"],
                                               cwd=REPO, text=True).strip())
        with workspace_lock(git_dir / "openlegend-content.lock"), workspace_lock(workspace / ".openlegend-prepare.lock"):
            if (CONTENT_INDEX.read_bytes() if CONTENT_INDEX.exists() else None) != original_index:
                raise ValueError("Content was published, but Git's selection changed. Reconcile before updating it.")
            new_index, release, _ = read_asset_index(index)
            current = json.loads((workspace / MARKER).read_text(encoding="utf-8"))
            if current.get("assetIndexSha256") != index_hash:
                raise ValueError("The publishing workspace selection changed. Reconcile before updating it.")
            write_atomic(CONTENT_INDEX, new_index)
            current.update(assetIndexSha256=digest(new_index), assetRelease=release)
            write_atomic(workspace / MARKER, (json.dumps(current, indent=2) + "\n").encode())
            remember_workspace(workspace)
        print(f"Published. Review and commit {CONTENT_INDEX} with the matching source changes.")


def open_workspace(workspace, engine_root, port=None):
    require_external(workspace)
    project = workspace / "OpenLegend.uproject"
    marker = workspace / MARKER
    if not marker.is_file() or marker.resolve() != marker or not project.is_file() or project.resolve() != project:
        raise ValueError(f"Prepare the Open Legend workspace first: {workspace}")
    previous = json.loads(marker.read_text(encoding="utf-8"))
    if not isinstance(previous, dict) or previous.get("project") != "OpenLegend":
        raise ValueError(f"Unexpected project marker: {marker}")
    print(project)
    command = [str(find_editor(engine_root)), str(project)]
    if port is not None:
        command.append(f"-OpenLegendPort={port}")
    subprocess.Popen(command, cwd=workspace)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    subcommands = parser.add_subparsers(dest="operation", required=True)
    prepare_command = subcommands.add_parser("prepare", help="Prepare the editable project outside Git")
    open_command = subcommands.add_parser("open", help="Open the existing workspace without refreshing it")
    build_command = subcommands.add_parser("build", help="Prepare the workspace and build the native editor module")
    play_command = subcommands.add_parser("play", help="Build the client, start the Rust server and open Unreal Editor")
    describe_command = subcommands.add_parser("describe-content", help="Draft a private source manifest locally")
    share_command = subcommands.add_parser("share-content", help="Publish saved private content and record its Git index")
    for command in (prepare_command, open_command, describe_command, share_command, build_command, play_command):
        command.add_argument("--workspace", type=Path, help="Unreal project folder outside Git")
    prepare_command.add_argument("--asset-index", type=Path, help="Exact index used to materialize Content")
    for command in (prepare_command, open_command, build_command, play_command):
        command.add_argument("--engine-root", type=Path, help="Unreal installation directory")
    prepare_command.add_argument("--open", action="store_true", help="Open the project in the pinned Unreal Editor")
    describe_command.add_argument("--output", type=Path, required=True)
    for command in (describe_command, share_command):
        command.add_argument("--owner-kind", choices=OWNER_KINDS, default="collection")
        command.add_argument("--owner-id", required=True)
        command.add_argument("--asset-id", default="openlegend-unreal-content")
        command.add_argument("--revision-id", required=True)
        command.add_argument("--rights-evidence", action="append", required=True)
        command.add_argument("--dependency-index", action="append", type=Path, default=[])
    share_command.add_argument("--dry-run", action="store_true", help="Prepare locally without publishing or writing Git")
    share_command.add_argument("--approve-rights", action="store_true",
                               help="Record source/offline/recovery approval when authorized by the rights owner")
    options = parser.parse_args()
    try:
        asset_index = getattr(options, "asset_index", None) or (CONTENT_INDEX if CONTENT_INDEX.is_file() else None)
        asset_index = asset_index.expanduser().resolve() if asset_index else None
        workspace = (options.workspace or default_workspace(asset_index)).expanduser().resolve()
        if options.operation == "describe-content":
            describe(workspace, options)
            print(options.output)
            return
        if options.operation == "share-content":
            share_content(workspace, options)
            return
        engine_root = options.engine_root or os.environ.get("OPENLEGEND_UNREAL_ENGINE")
        engine_root = Path(engine_root).expanduser().resolve() if engine_root else None
        if options.operation in ("play", "build", "open") and editor_has_project(workspace):
            if options.operation == "build":
                raise ValueError("Close this project's Unreal Editor to rebuild its C++ module.")
            if options.operation == "play":
                subprocess.run(dev_command(["python3", "bin/unreal_dev_server.py", "start"]), cwd=REPO, check=True)
            print(f"Already open in Unreal Editor: {workspace / 'OpenLegend.uproject'}. "
                  "Press Play there. Close that editor before rebuilding C++ changes.")
            return
        if options.operation == "open":
            open_workspace(workspace, engine_root)
            return
        prepare_for_development(workspace, asset_index)
        if options.operation in ("play", "build"):
            build_editor(workspace, engine_root)
        port = None
        if options.operation == "play":
            subprocess.run(dev_command(["python3", "bin/unreal_dev_server.py", "start"]), cwd=REPO, check=True)
            port = int(subprocess.check_output(dev_command(["python3", "bin/unreal_dev_server.py", "port"]),
                                               cwd=REPO, text=True).strip())
        if options.operation == "play" or getattr(options, "open", False):
            open_workspace(workspace, engine_root, port)
        else:
            print(workspace / "OpenLegend.uproject")
        if options.operation in ("build", "play"):
            remember_workspace(workspace)
    except (OSError, ValueError, subprocess.CalledProcessError) as error:
        sys.exit(str(error))


if __name__ == "__main__":
    main()
