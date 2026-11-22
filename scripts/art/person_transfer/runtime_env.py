"""Portable repository, environment, Blender, and S3 foundation resolution for person transfer.

Eliminates hardcoded developer home paths, temporary worktree paths, and external runtime caches.
All asset outputs and foundation staging directories are guarded by `scripts/asset_workspace.py`
(`docs/asset-workflow.md#where-files-belong`).
"""
from __future__ import annotations

import hashlib
import json
import os
from pathlib import Path
import shutil
import subprocess
import sys
import tarfile
import tempfile
import zipfile

sys.dont_write_bytecode = True

PACKAGE_DIR = Path(__file__).resolve().parent
ART_SCRIPTS_DIR = PACKAGE_DIR.parent
SCRIPTS_DIR = ART_SCRIPTS_DIR.parent
REPO_ROOT = SCRIPTS_DIR.parent

if str(SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(SCRIPTS_DIR))
if str(ART_SCRIPTS_DIR) not in sys.path:
    sys.path.insert(0, str(ART_SCRIPTS_DIR))

from asset_workspace import external_output  # noqa: E402

FOUNDATION_MANIFEST_PATH = PACKAGE_DIR / "foundation-sources.json"


def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as stream:
        for chunk in iter(lambda: stream.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def subprocess_env(extra: dict[str, str] | None = None) -> dict[str, str]:
    """Build subprocess environment with bytecode suppression and standard macOS binary paths."""
    env = dict(os.environ)
    env["PYTHONDONTWRITEBYTECODE"] = "1"
    std_bins = ["/opt/homebrew/bin", "/usr/local/bin"]
    cur_path = env.get("PATH", "")
    missing = [p for p in std_bins if p not in cur_path.split(":")]
    if missing:
        env["PATH"] = ":".join(missing + ([cur_path] if cur_path else []))
    if extra:
        env.update(extra)
    return env


def resolve_repo_root(explicit: Path | None = None) -> Path:
    return explicit.resolve() if explicit is not None else REPO_ROOT


def _git_common_checkout_root(repo: Path) -> Path | None:
    """Resolve the shared main checkout root when running inside a linked Git worktree."""
    try:
        res = subprocess.run(
            ["git", "-C", str(repo), "rev-parse", "--git-common-dir"],
            capture_output=True,
            text=True,
            check=True,
            env=subprocess_env(),
        )
        common_git = Path(res.stdout.strip())
        if not common_git.is_absolute():
            common_git = (repo / common_git).resolve()
        if common_git.name == ".git":
            return common_git.parent
    except Exception:
        pass
    return None


def load_env_key(key_name: str, repo: Path | None = None) -> str:
    """Load an API key from process environment or repository/main-worktree `.env`."""
    direct = os.environ.get(key_name, "").strip()
    if direct:
        return direct
    root = resolve_repo_root(repo)
    candidates = [root / ".env"]
    common_root = _git_common_checkout_root(root)
    if common_root is not None and (common_root / ".env") not in candidates:
        candidates.append(common_root / ".env")
    for env_path in candidates:
        if env_path.is_file():
            for line in env_path.read_text().splitlines():
                stripped = line.strip()
                if stripped.startswith(f"{key_name}="):
                    val = stripped.split("=", 1)[1].strip().strip('"').strip("'")
                    if val:
                        return val
    raise RuntimeError(
        f"{key_name} not found in environment or .env (checked {', '.join(str(c) for c in candidates)})"
    )


def resolve_blender_bin(explicit: Path | str | None = None) -> Path:
    """Resolve the local Blender executable via CLI flag, env var, PATH, or standard macOS bundle."""
    raw = str(explicit).strip() if explicit else os.environ.get("OPEN_LEGEND_BLENDER_BIN", "").strip()
    if raw:
        cand = Path(raw).expanduser().resolve()
        if cand.is_file():
            return cand
        raise FileNotFoundError(f"Configured Blender binary not found: {cand}")
    for name in ("Blender", "blender"):
        found = shutil.which(name, path=subprocess_env().get("PATH"))
        if found:
            return Path(found).resolve()
    mac_default = Path("/Applications/Blender.app/Contents/MacOS/Blender")
    if mac_default.is_file():
        return mac_default
    raise FileNotFoundError(
        "Blender executable not found; pass --blender or set OPEN_LEGEND_BLENDER_BIN."
    )


def resolve_blender_python(blender_bin: Path | None = None) -> Path:
    """Locate Blender's bundled Python interpreter (which provides `numpy` on any Blender install)."""
    b_bin = resolve_blender_bin(blender_bin)
    if b_bin.parent.name == "MacOS":
        res_dir = b_bin.parent.parent / "Resources"
        if res_dir.is_dir():
            matches = sorted(res_dir.glob("*/python/bin/python3*"))
            for m in matches:
                if m.is_file() and os.access(m, os.X_OK) and not m.name.endswith("-config"):
                    return m.resolve()
    return Path(sys.executable).resolve()


def resolve_pnpm_cmd() -> list[str]:
    env = subprocess_env()
    pnpm_bin = shutil.which("pnpm", path=env.get("PATH"))
    if pnpm_bin:
        return [pnpm_bin]
    corepack_bin = shutil.which("corepack", path=env.get("PATH"))
    if corepack_bin:
        return [corepack_bin, "pnpm"]
    raise FileNotFoundError("Neither `pnpm` nor `corepack` found in PATH.")


def resolve_workspace_root(explicit: Path | str | None = None) -> Path:
    """Resolve the external art workspace root (never inside any Git checkout)."""
    raw = str(explicit).strip() if explicit else os.environ.get("OPEN_LEGEND_ASSET_WORKSPACE", "").strip()
    if not raw:
        default_ws = Path.home() / "Documents/ChatGPT/OpenLegend-art"
        if default_ws.is_dir():
            return external_output(default_ws)
        raise ValueError(
            "Pass --workspace /absolute/outside/repo or set OPEN_LEGEND_ASSET_WORKSPACE; "
            "see docs/asset-workflow.md."
        )
    ws = external_output(raw)
    ws.mkdir(parents=True, exist_ok=True)
    return ws


def get_transfer_cache_dir(explicit: Path | None = None) -> Path:
    """Return an external disk cache directory for raw CG solves, donor grids, and garment bindings."""
    if explicit is not None:
        c_dir = external_output(explicit)
        c_dir.mkdir(parents=True, exist_ok=True)
        return c_dir
    env_val = os.environ.get("OPEN_LEGEND_PERSON_TRANSFER_CACHE_DIR", "").strip()
    if env_val:
        c_dir = external_output(env_val)
        c_dir.mkdir(parents=True, exist_ok=True)
        return c_dir
    ws = resolve_workspace_root(None)
    study_cache = ws / "2026-11-12-body-reference-family/study/family-20261113/fits/_raw_fit_cache"
    if study_cache.parent.is_dir():
        c_dir = external_output(study_cache)
    else:
        c_dir = external_output(ws / "person-transfer-foundation/v1/_cache")
    c_dir.mkdir(parents=True, exist_ok=True)
    return c_dir


def resolve_foundation_manifest_path(explicit: Path | str | None = None) -> Path:
    raw = str(explicit).strip() if explicit else os.environ.get("OPEN_LEGEND_PERSON_TRANSFER_PROFILE", "").strip()
    if raw:
        cand = Path(raw).expanduser().resolve()
        if not cand.is_file():
            raise FileNotFoundError(f"Foundation profile JSON not found: {cand}")
        return cand
    return FOUNDATION_MANIFEST_PATH


def load_foundation_manifest(profile_path: Path | str | None = None) -> dict:
    return json.loads(resolve_foundation_manifest_path(profile_path).read_text())


def _matches_role_hash(path: Path, spec: dict) -> bool:
    if not path.is_file():
        return False
    accepted = {spec["sha256"], *spec.get("acceptedAlternateSha256s", [])}
    return sha256_file(path) in accepted


def _find_existing_role_file(workspace: Path, spec: dict) -> Path | None:
    candidates = [workspace / spec["workspaceRel"]]
    for rel in spec.get("legacyStudyCandidates", []):
        candidates.append(workspace / rel)
    for cand in candidates:
        if _matches_role_hash(cand, spec):
            return cand.resolve()
    return None


def _pull_index_to_staging(repo: Path, index_rel: str, staging_dir: Path, member: str | None = None) -> None:
    env = subprocess_env()
    tsx_cli = repo / "node_modules/tsx/dist/cli.mjs"
    node_bin = shutil.which("node", path=env.get("PATH"))
    if tsx_cli.is_file() and node_bin:
        cmd = [
            node_bin,
            f"--env-file-if-exists={repo / '.env'}",
            str(tsx_cli),
            str(repo / "scripts/assets.ts"),
            "workspace",
            "--index",
            str(repo / index_rel),
            "--output",
            str(staging_dir),
        ]
    else:
        pnpm_cmd = resolve_pnpm_cmd()
        cmd = [
            *pnpm_cmd,
            "--dir",
            str(repo),
            "assets",
            "workspace",
            "--index",
            str(repo / index_rel),
            "--output",
            str(staging_dir),
        ]
    if member:
        cmd.extend(["--file", member])
    else:
        cmd.append("--all")
    res = subprocess.run(cmd, capture_output=True, text=True, env=subprocess_env())
    if res.returncode != 0:
        stderr = (res.stderr or res.stdout or "").strip()
        hint = (
            "\nHint: authenticate AWS first via `aws login --profile openlegend --region us-east-2`."
            if ("expired" in stderr.lower() or "sso" in stderr.lower() or "credentials" in stderr.lower())
            else ""
        )
        raise RuntimeError(
            f"Failed to restore S3 index {index_rel} ({member or '--all'}):\n{stderr[-1600:]}{hint}"
        )


def bootstrap_foundation(
    workspace: Path | None = None,
    repo: Path | None = None,
    verify_only: bool = False,
    include_grid9: bool = False,
    profile_path: Path | str | None = None,
) -> dict[str, Path]:
    """Verify or materialize all S3-archived foundation inputs inside `workspace`."""
    ws = resolve_workspace_root(workspace)
    root = resolve_repo_root(repo)
    manifest = load_foundation_manifest(profile_path)
    roles: dict[str, dict] = manifest["roles"]

    resolved: dict[str, Path] = {}
    missing_roles: list[str] = []
    for role_name, spec in roles.items():
        found = _find_existing_role_file(ws, spec)
        if found is not None:
            resolved[role_name] = found
        else:
            missing_roles.append(role_name)

    if missing_roles and verify_only:
        raise FileNotFoundError(
            "Missing person-transfer foundation roles in workspace "
            f"{ws}: {', '.join(missing_roles)}. Run `scripts/art/person-transfer.py bootstrap --workspace {ws}`."
        )

    if missing_roles:
        with tempfile.TemporaryDirectory(prefix="ol-foundation-pull-", dir=ws) as tmp_s:
            tmp_root = Path(tmp_s)
            pulled_archives: dict[tuple[str, str], Path] = {}
            for role_name in missing_roles:
                spec = roles[role_name]
                dst = external_output(ws / spec["workspaceRel"])
                dst.parent.mkdir(parents=True, exist_ok=True)
                idx_rel = spec["index"]

                if "memberPath" in spec:
                    stage_sub = tmp_root / hashlib.sha256(idx_rel.encode()).hexdigest()[:10]
                    _pull_index_to_staging(root, idx_rel, stage_sub, member=spec["memberPath"])
                    shutil.copy2(stage_sub / spec["memberPath"], dst)
                elif "archiveMember" in spec:
                    arch_key = (idx_rel, spec["archiveMember"])
                    if arch_key not in pulled_archives:
                        # Also check if archive already exists locally in workspace before S3 pull
                        local_arch = list(ws.rglob(Path(spec["archiveMember"]).name))
                        idx_doc = json.loads((root / idx_rel).read_text())
                        expected_arch_sha = idx_doc["files"][spec["archiveMember"]]["sha256"]
                        matched_arch = next(
                            (p for p in local_arch if p.is_file() and sha256_file(p) == expected_arch_sha),
                            None,
                        )
                        if matched_arch is not None:
                            pulled_archives[arch_key] = matched_arch
                        else:
                            stage_sub = tmp_root / hashlib.sha256(":".join(arch_key).encode()).hexdigest()[:10]
                            _pull_index_to_staging(root, idx_rel, stage_sub, member=spec["archiveMember"])
                            pulled_archives[arch_key] = stage_sub / spec["archiveMember"]

                    arch_path = pulled_archives[arch_key]
                    if arch_path.name.endswith(".tar.gz"):
                        with tarfile.open(arch_path, "r:gz") as tf:
                            raw = tf.extractfile(spec["innerPath"])
                            if raw is None:
                                raise FileNotFoundError(f"{spec['innerPath']} missing in {arch_path}")
                            dst.write_bytes(raw.read())
                    elif arch_path.name.endswith(".zip"):
                        pkg_root = dst.parent
                        prefix = spec["innerDirPrefix"]
                        with zipfile.ZipFile(arch_path) as zf:
                            for member in zf.namelist():
                                if member.startswith(prefix) and not member.endswith("/"):
                                    rel_inner = member[len(prefix) :]
                                    target_f = external_output(pkg_root / rel_inner)
                                    target_f.parent.mkdir(parents=True, exist_ok=True)
                                    target_f.write_bytes(zf.read(member))
                    else:
                        raise ValueError(f"Unsupported archive format: {arch_path}")

                if not _matches_role_hash(dst, spec):
                    raise ValueError(f"SHA-256 verification failed after restoring foundation role {role_name}: {dst}")
                resolved[role_name] = dst.resolve()

    if include_grid9 and manifest.get("grid9ConceptSheets"):
        grid_cfg = manifest["grid9ConceptSheets"]
        grid_dir = external_output(ws / grid_cfg["studySubdir"])
        need_pull = any(
            not (grid_dir / meta["memberPath"]).is_file()
            or sha256_file(grid_dir / meta["memberPath"]) != meta["sha256"]
            for meta in grid_cfg["coordinates"].values()
        )
        if need_pull and not verify_only:
            _pull_index_to_staging(root, grid_cfg["index"], grid_dir, member=None)

    return resolved


def resolve_grid9_concept_sheet(
    subject_id: str,
    workspace: Path | None = None,
    study_dir: Path | None = None,
    repo: Path | None = None,
    auto_pull: bool = True,
    profile_path: Path | str | None = None,
) -> Path | None:
    """Resolve an approved `grid-9` turnaround PNG (`c14`..`c22`) for `M{000|050|100}-F{000|050|100}`."""
    manifest = load_foundation_manifest(profile_path)
    grid_cfg = manifest.get("grid9ConceptSheets")
    if not grid_cfg:
        return None
    coords = grid_cfg.get("coordinates", {})
    key = subject_id.upper()
    if key not in coords:
        return None
    meta = coords[key]
    search_roots: list[Path] = []
    if study_dir is not None:
        search_roots.append(study_dir / "grid-9-20261112")
    if workspace is not None:
        search_roots.append(workspace / grid_cfg["studySubdir"])
    else:
        try:
            search_roots.append(resolve_workspace_root(None) / grid_cfg["studySubdir"])
        except Exception:
            pass

    for s_root in search_roots:
        cand = s_root / meta["memberPath"]
        if cand.is_file() and sha256_file(cand) == meta["sha256"]:
            return cand.resolve()

    if auto_pull and search_roots:
        dst_root = external_output(search_roots[0])
        dst_root.mkdir(parents=True, exist_ok=True)
        _pull_index_to_staging(resolve_repo_root(repo), grid_cfg["index"], dst_root, member=meta["memberPath"])
        cand = dst_root / meta["memberPath"]
        if cand.is_file() and sha256_file(cand) == meta["sha256"]:
            return cand.resolve()
    return None
