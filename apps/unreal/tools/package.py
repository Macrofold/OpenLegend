#!/usr/bin/env python3
"""Cook the committed Open Legend entry project on a native build host.

The output is an unsigned internal build candidate. Release access, asset
promotion, and platform signing are separate operations.
"""

import argparse
import hashlib
import json
import os
from pathlib import Path, PurePosixPath
import platform
import plistlib
import re
import shutil
import subprocess
import sys
import tarfile
import tempfile
from urllib.parse import urlsplit

PROJECT = Path(__file__).resolve().parents[1]
REPO = PROJECT.parents[1]
MAP = "/Engine/Maps/Entry"
ENGINE_VERSION = (5, 8, 4)
PLUGINS = (
    "EnhancedInput/EnhancedInput.uplugin",
    "Runtime/ProceduralMeshComponent/ProceduralMeshComponent.uplugin",
)
ART_PLUGINS = (
    "Experimental/PythonScriptPlugin/PythonScriptPlugin.uplugin",
    "Interchange/Runtime/Interchange.uplugin",
    "Interchange/Editor/InterchangeEditor.uplugin",
    "Interchange/Assets/InterchangeAssets.uplugin",
)
ART_RECIPE = "tools/current-art.json"
ART_IMPORT = "tools/import_current_art.py"
SOURCE_ROOTS = ("OpenLegend.uproject", "Config", "Source", "LICENSE", ART_RECIPE, ART_IMPORT)


def capture(*command, env=None):
    return subprocess.check_output(command, stderr=subprocess.STDOUT, text=True, env=env).strip()


def digest(path):
    with path.open("rb") as data:
        return hashlib.file_digest(data, "sha256").hexdigest()


def files(root):
    entries = []
    for path in sorted(root.rglob("*")):
        relative = path.relative_to(root).as_posix()
        if path.is_symlink():
            if not path.resolve(strict=True).is_relative_to(root):
                raise ValueError(f"The build contains an external link: {relative}")
            entries.append({"path": relative, "link": os.readlink(path)})
        elif path.is_file():
            entries.append({"path": relative, "bytes": path.stat().st_size, "sha256": digest(path)})
        elif not path.is_dir():
            raise ValueError(f"Unexpected build output: {relative}")
    return entries


def write_receipt(output, receipt):
    temporary = output / ".receipt.json.tmp"
    temporary.write_text(json.dumps(receipt, indent=2) + "\n", encoding="utf-8")
    temporary.replace(output / "receipt.json")


def checkout_project(work, revision):
    source = capture("git", "-C", REPO, "rev-parse", "--verify", "--end-of-options", f"{revision}^{{commit}}")
    archive = work / "source.tar"
    with archive.open("wb") as output:
        subprocess.run(
            ["git", "-C", REPO, "archive", f"{source}:apps/unreal", *SOURCE_ROOTS],
            stdout=output, check=True,
        )
    project = work / "project"
    with tarfile.open(archive) as tree:
        for entry in tree:
            path = PurePosixPath(entry.name)
            if path.is_absolute() or ".." in path.parts or "\\" in entry.name or ":" in entry.name:
                raise ValueError("The input archive contains an invalid project path.")
            destination = project.joinpath(*path.parts)
            if entry.isdir():
                destination.mkdir(parents=True, exist_ok=True)
            elif entry.isfile():
                destination.parent.mkdir(parents=True, exist_ok=True)
                with tree.extractfile(entry) as data, destination.open("xb") as output:
                    shutil.copyfileobj(data, output)
            else:
                raise ValueError(f"The project contains an unsupported link or file: {path}")
    archive.unlink()
    return source, project


def native_target():
    machine = platform.machine().lower()
    if sys.platform == "darwin" and machine == "arm64":
        return "Mac", "arm64", "RunUAT.sh", "UnrealEditor.app/Contents/MacOS/UnrealEditor"
    if sys.platform == "win32" and machine in {"amd64", "x86_64"}:
        return "Win64", "x64", "RunUAT.bat", "UnrealEditor.exe"
    raise ValueError("Use native Python on an Apple Silicon Mac or x64 Windows build host.")


def tool_environment():
    # Pass environment variables the native tools need. Provider credentials,
    # application sessions, and signing credentials stay in the caller.
    allowed = {
        "PATH", "PATHEXT", "HOME", "TMP", "TEMP", "TMPDIR", "LANG", "LC_ALL", "USER",
        "USERNAME", "USERPROFILE", "LOCALAPPDATA", "APPDATA", "PROGRAMDATA",
        "PROGRAMFILES", "PROGRAMFILES(X86)", "PROGRAMW6432", "SYSTEMDRIVE",
        "SYSTEMROOT", "WINDIR", "COMSPEC", "PATHEXT", "NUMBER_OF_PROCESSORS",
        "DEVELOPER_DIR", "VISUALSTUDIOVERSION", "VCTOOLSVERSION", "WINDOWSSDKVERSION", "INCLUDE",
        "LIB", "LIBPATH", "ONECORESDKDIR", "WINDOWSSDKDIR",
    }
    return {key: value for key, value in os.environ.items() if key.upper() in allowed}


def toolchain(target, env):
    if target == "Mac":
        # The 5.8.4 installed Mac accelerator can crash in directory interception.
        return {
            "xcode": capture("xcodebuild", "-version", env=env),
            "sdk": capture("xcrun", "--sdk", "macosx", "--show-sdk-version", env=env),
            "compiler": capture("xcrun", "--sdk", "macosx", "clang", "--version", env=env),
        }, ["-ubtargs=-NoUBA"]

    versions = {key.upper(): value for key, value in env.items()}
    compiler = versions.get("VCTOOLSVERSION", "")
    sdk = versions.get("WINDOWSSDKVERSION", "").rstrip("\\/")
    version = versions.get("VISUALSTUDIOVERSION", "").split(".", 1)[0]
    family = {"17": "VisualStudio2022", "18": "VisualStudio2026"}.get(version)
    if family is None:
        raise ValueError("Use the x64 Developer Command Prompt from Visual Studio 2022 or 2026.")
    if not all(re.fullmatch(r"\d+(?:\.\d+){2,3}", value) for value in (compiler, sdk)):
        raise ValueError("Open an x64 Visual Studio Developer Command Prompt with the selected Windows SDK.")
    return {
        "compiler": compiler,
        "sdk": sdk,
        "visualStudio": family,
    }, [f"-ubtargs=-Compiler={family} -CompilerVersion={compiler} -WindowsSdkVersion={sdk}"]


def deployment_config(project, origin, world, development):
    url = urlsplit(origin)
    # Match the client session's authority characters and length before cooking.
    if (
        url.scheme not in {"http", "https"}
        or len(url.netloc) > 255
        or not re.fullmatch(r"[A-Za-z0-9.-]+(?::[0-9]+)?", url.netloc)
        or url.port == 0
        or origin != f"{url.scheme}://{url.netloc}"
        or (
            url.scheme == "http"
            and (not development or url.hostname != "127.0.0.1" or url.port is None)
        )
    ):
        raise ValueError("Use HTTPS, or pass --development for an explicit http://127.0.0.1 loopback origin.")
    if not world or any(not char.isprintable() for char in world) or any(char in world for char in '[]";'):
        raise ValueError("Supply the configured world identifier.")
    config = project / "Config" / "DefaultGame.ini"
    lines = config.read_text(encoding="utf-8").splitlines()
    # Change the existing deployment section in the isolated project only.
    if lines.count("[OpenLegend.Connection]") != 1:
        raise ValueError("The project must declare one OpenLegend.Connection section.")
    section = lines.index("[OpenLegend.Connection]") + 1
    end = next((index for index in range(section, len(lines)) if lines[index].startswith("[")), len(lines))
    for key, value in (("Origin", origin), ("World", world)):
        (index,) = tuple(
            number for number in range(section, end) if lines[number].startswith(f"{key}=")
        )
        # Unreal treats unquoted // as a comment when importing values.
        lines[index] = f"{key}={json.dumps(value, ensure_ascii=False)}"
    config.write_text("\n".join(lines) + "\n", encoding="utf-8")


def build_command(tool, arguments, env):
    command = [str(tool), *arguments]
    if sys.platform == "win32" and Path(tool).suffix.lower() in {".bat", ".cmd"}:
        # cmd.exe expands %VAR% even inside a quoted argument.
        if any(any(char in value for char in '\r\n"%!^&|<>') for value in command):
            raise ValueError("Use ordinary paths for the engine and Windows build output.")
        shell = str(Path(env["SYSTEMROOT"]) / "System32" / "cmd.exe")
        quoted = " ".join(f'"{part}"' for part in command)
        command = f'"{shell}" /d /v:off /s /c "{quoted}"'
    return command


def run_uat(uat, arguments, env, log):
    with log.open("wb") as output:
        return subprocess.run(
            build_command(uat, arguments, env), env=env, stdout=output,
            stderr=subprocess.STDOUT, check=False,
        ).returncode


def prepare_current_art(work, project, editor, revision, env, log):
    recipe = json.loads((project / ART_RECIPE).read_text(encoding="utf-8"))
    index = json.loads(capture("git", "-C", REPO, "show", f"{revision}:assets/locks/development.json"))
    inputs = {}
    def add_input(source, media_type):
        entry = index["files"][source]
        if (entry["boundary"], entry["accessDomain"], entry["mediaType"]) != (
            "runtime", "public", media_type,
        ):
            raise ValueError(f"Expected public runtime {media_type} for {source}.")
        inputs[source] = entry

    for source in recipe["models"].values():
        add_input(source, "model/gltf-binary")
    map_source = recipe["map"]
    add_input(map_source, "image/jpeg")
    selected = work / "selected-art.json"
    selected.write_text(json.dumps({"release": index["release"], "files": inputs}), encoding="utf-8")
    workspace = work / "art-source"
    pnpm = shutil.which("pnpm", path=env.get("PATH"))
    if not pnpm:
        raise ValueError("Install the repository's developer dependencies to prepare the current public art.")
    args = ["exec", "tsx", "scripts/assets.ts", "workspace", "--public", "--index",
            str(selected), "--all", "--output", str(workspace)]
    with log.open("wb") as output:
        subprocess.run(
            build_command(pnpm, args, env),
            cwd=REPO, env=env, stdout=output, stderr=subprocess.STDOUT, check=True,
        )

    # A module-free editor project imports content before the game module is
    # compiled. Both projects use the same logical /Game/CurrentArt root.
    importer = work / "importer"
    importer.mkdir()
    import_project = importer / "CurrentArt.uproject"
    import_project.write_text(json.dumps({
        "FileVersion": 3,
        "Plugins": [{"Name": name, "Enabled": True} for name in (
            "PythonScriptPlugin", "Interchange", "InterchangeEditor",
        )],
    }), encoding="utf-8")
    driver = importer / Path(ART_IMPORT).name
    shutil.copyfile(project / ART_IMPORT, driver)
    request = importer / "art-request.json"
    request.write_text(json.dumps({
        "models": {
            appearance: str(workspace / source) for appearance, source in recipe["models"].items()
        },
        "map": str(workspace / map_source),
    }), encoding="utf-8")
    with log.open("ab") as output:
        subprocess.run(
            [str(editor), str(import_project), "-run=pythonscript",
             f"-Script={driver}",
             "-unattended", "-nullrhi", "-nosplash", "-nop4", "-nosound", "-stdout",
             "-FullStdOutLogOutput"],
            env=env, stdout=output, stderr=subprocess.STDOUT, check=True,
        )
    imported = json.loads(request.with_name("art-bindings.json").read_text(encoding="utf-8"))
    bindings, map_texture = imported["models"], imported["map"]
    if not re.fullmatch(r"/Game/CurrentArt/Map/[\w.-]+", map_texture):
        raise ValueError("The Unreal importer did not return the released map texture.")
    if bindings.keys() != recipe["models"].keys() or not all(
        paths and all(re.fullmatch(r"/Game/CurrentArt/Model[0-9]+/[\w./·-]+", path)
                      for path in paths)
        for paths in bindings.values()
    ):
        raise ValueError("The Unreal importer did not return one binding per released model.")
    shutil.copytree(importer / "Content" / "CurrentArt", project / "Content" / "CurrentArt")
    release = index["release"]
    config = project / "Config" / "DefaultGame.ini"
    contents = config.read_text(encoding="utf-8")
    cook = '[/Script/UnrealEd.ProjectPackagingSettings]\n'
    contents = contents.replace(cook, cook + '+DirectoriesToAlwaysCook=(Path="/Game/CurrentArt")\n', 1)
    fields = {
        "OwnerKind": release["owner"]["kind"], "OwnerId": release["owner"]["id"],
        "AssetId": release["assetId"], "RevisionId": release["revisionId"],
        "ManifestSha256": release["manifestSha256"],
        "MapFile": map_source, "MapTexture": map_texture,
    }
    settings = [contents.rstrip(), "", "[OpenLegend.Art]"]
    settings.extend(f"{key}={json.dumps(value)}" for key, value in fields.items())
    settings.extend(
        f"+Model={json.dumps('|'.join((key, *paths)), ensure_ascii=False)}"
        for key, paths in bindings.items()
    )
    config.write_text("\n".join(settings) + "\n", encoding="utf-8")
    notices = work / "notices"
    notices.mkdir()
    for name in recipe["notices"]:
        path = Path(name)
        out = notices / path.parent.name / path.name
        out.parent.mkdir(exist_ok=True)
        out.write_text(capture("git", "-C", REPO, "show", f"{revision}:{name}") + "\n", encoding="utf-8")
    return {
        "release": release, "models": {source: inputs[source] for source in recipe["models"].values()},
        "map": {"path": map_source, **inputs[map_source]},
    }, notices


def game_executable(package, target, config, env):
    # Unreal decorates non-Development build products with platform and
    # configuration, including the Mac app bundle copied into the archive.
    name = "OpenLegend" if config == "Development" else f"OpenLegend-{target}-{config}"
    product = f"{name}.app" if target == "Mac" else f"Binaries/Win64/{name}.exe"
    matches = list(package.rglob(product))
    if len(matches) != 1:
        raise ValueError(f"Expected one archived game at {product}, found {len(matches)}.")
    artifact = matches[0]
    if target == "Mac":
        with (artifact / "Contents" / "Info.plist").open("rb") as data:
            binary = plistlib.load(data)["CFBundleExecutable"]
        if Path(binary).name != binary:
            raise ValueError("Invalid packaged executable name.")
        game = artifact / "Contents" / "MacOS" / binary
        if capture("xcrun", "lipo", "-archs", game, env=env) != "arm64":
            raise ValueError("The packaged app must contain native arm64 code.")
        return game

    game = artifact
    with game.open("rb") as data:
        header = data.read(64)
        if len(header) != 64 or header[:2] != b"MZ":
            raise ValueError("Invalid Windows game executable.")
        data.seek(int.from_bytes(header[60:64], "little"))
        if data.read(6) != b"PE\x00\x00\x64\x86":
            raise ValueError("The packaged executable must contain native x64 code.")
    return game


def build(options):
    target, arch, launcher, editor_path = native_target()
    config = "Development" if options.development else "Shipping"
    engine = options.engine.expanduser().resolve(strict=True) / "Engine"
    version_file = engine / "Build" / "Build.version"
    version = json.loads(version_file.read_text(encoding="utf-8-sig"))
    if tuple(version[key] for key in ("MajorVersion", "MinorVersion", "PatchVersion")) != ENGINE_VERSION:
        raise ValueError("Use the pinned Unreal Engine 5.8.4 build.")
    platform_directory = engine / "Binaries" / target
    uat = engine / "Build" / "BatchFiles" / launcher
    uat_assembly = engine / "Binaries" / "DotNET" / "AutomationTool" / "AutomationTool.dll"
    for path in (uat, uat_assembly, platform_directory / editor_path):
        if not path.is_file():
            raise ValueError(f"Install or build the native Unreal editor and AutomationTool first. Missing {path}")

    if options.output.expanduser().is_symlink():
        raise ValueError("Choose a new build output directory instead of a link.")
    output = options.output.expanduser().resolve()
    if output.is_relative_to(engine.parent) or any((ancestor / ".git").exists() for ancestor in (output, *output.parents)):
        raise ValueError("Choose a build output outside Unreal Engine and all Git checkouts.")
    receipt = {
        "outcome": "failed",
        "configuration": config,
        "target": target,
        "architecture": arch,
        "map": MAP,
        "engineVersion": version,
        "engineBuildSha256": digest(version_file),
        "automationToolSha256": digest(uat_assembly),
        "editorSha256": digest(platform_directory / editor_path),
        "recipeSha256": digest(Path(__file__)),
        "plugins": {
            plugin: digest(engine / "Plugins" / plugin)
            for plugin in (*PLUGINS, *(() if options.without_art else ART_PLUGINS))
        },
    }
    output.mkdir(mode=0o700)
    try:
        env = tool_environment()
        receipt["toolchain"], sdk_arguments = toolchain(target, env)
        with tempfile.TemporaryDirectory(prefix=".work-", dir=output) as temporary:
            work = Path(temporary)
            receipt["sourceCommit"], project = checkout_project(work, options.revision)
            deployment_config(project, options.origin, options.world, options.development)
            notices = None
            if not options.without_art:
                receipt["art"], notices = prepare_current_art(
                    work, project, platform_directory / editor_path, receipt["sourceCommit"],
                    env, output / "art-import.log",
                )
            receipt["projectFiles"] = files(project)
            package = work / "archive"
            status = run_uat(
                uat,
                [
                    "BuildCookRun", "-nocompileuat", "-unattended", "-nop4", "-utf8output", "-nosign",
                    f"-project={project / 'OpenLegend.uproject'}", "-target=OpenLegend",
                    f"-targetplatform={target}", f"-clientarchitecture={arch}",
                    f"-clientconfig={config}", f"-map={MAP}", "-build", "-cook", "-stage",
                    "-pak", "-iostore", "-nodebuginfo", "-package", "-archive", f"-archivedirectory={package}",
                    *sdk_arguments,
                ],
                env, output / "build.log",
            )
            receipt["exitCode"] = status
            if status:
                raise ValueError(f"BuildCookRun exited with {status}. See the external build.log.")
            receipt["executable"] = game_executable(package, target, config, env).relative_to(package).as_posix()
            shutil.copyfile(project / "LICENSE", package / "OpenLegend-LICENSE.txt")
            if notices is not None:
                shutil.copytree(notices, package / "OpenLegend-Art-Notices")
            receipt["outputFiles"] = files(package)
            package.rename(output / "package")
        receipt["outcome"] = "built"
    except (OSError, ValueError, KeyError, subprocess.CalledProcessError) as error:
        receipt["failure"] = str(error)
        raise
    except KeyboardInterrupt:
        receipt["failure"] = "Build interrupted."
        raise
    finally:
        write_receipt(output, receipt)

    print(f"Build candidate and receipt saved to {output}")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--engine", required=True, type=Path, help="Native Unreal Engine 5.8.4 directory")
    parser.add_argument("--output", required=True, type=Path, help="New directory outside every Git checkout")
    parser.add_argument("--origin", required=True, help="Trusted Rust server origin")
    parser.add_argument("--world", required=True, help="Expected world served by that origin")
    parser.add_argument("--without-art", action="store_true", help="Build with geometry placeholders for local debugging.")
    parser.add_argument("--development", action="store_true", help="Cook a Development build that can reach explicit local play")
    parser.add_argument("--revision", default="HEAD", help="Commit containing the Unreal project")
    try:
        build(parser.parse_args())
    except (OSError, ValueError, KeyError, subprocess.CalledProcessError) as error:
        parser.exit(1, f"{error}\n")
    except KeyboardInterrupt:
        parser.exit(130, "Build interrupted.\n")


if __name__ == "__main__":
    main()
