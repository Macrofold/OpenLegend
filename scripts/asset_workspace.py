"""Filesystem policy for offline asset recipes; no Blender or cloud dependency.

The external workspace mirrors repository-relative asset names populated by
``pnpm assets workspace``. Code remains in the checkout; art and generated
catalogs remain in the explicitly selected workspace until reviewed/published.
"""
import os
from pathlib import Path

REPOSITORY_ROOT = Path(__file__).resolve().parents[1]


def external_output(path):
    """Refuse output inside any existing Git checkout, including symlink escapes."""
    target = Path(path).expanduser().resolve()
    if target == REPOSITORY_ROOT or REPOSITORY_ROOT in target.parents:
        raise ValueError('Asset outputs must be outside the code checkout; see docs/asset-workflow.md.')
    for parent in [target, *target.parents]:
        if (parent / '.git').exists():
            raise ValueError('Asset outputs must not be written into a Git checkout.')
    return target


def asset_workspace():
    """One explicit directory serves all recipes and their shared catalog paths."""
    value = os.environ.get('OPEN_LEGEND_ASSET_WORKSPACE')
    if not value:
        raise ValueError('Set OPEN_LEGEND_ASSET_WORKSPACE to a fetched external asset workspace; see docs/asset-workflow.md.')
    root = external_output(value)
    if root in REPOSITORY_ROOT.parents:
        raise ValueError('Choose a dedicated external workspace, not an ancestor of the code checkout.')
    root.mkdir(parents=True, exist_ok=True)
    return root


def workspace_path(relative):
    """Resolve an authored catalog path inside the chosen editable workspace."""
    relative = Path(relative)
    if relative.is_absolute() or '..' in relative.parts:
        raise ValueError('An asset catalog path must be relative to the selected workspace.')
    root = asset_workspace()
    target = external_output(root / relative)
    if root != target and root not in target.parents:
        raise ValueError('An asset catalog path escaped its selected workspace.')
    return target
