"""Offline person reference-transfer, pose-calibration, and covered `.glb` verification package.

Owned by `scripts/art/person-transfer.py`; design and acceptance gates live in:
- `docs/production-workflows/art-flows/body-reference-family.md`
- `docs/production-workflows/art-flows/3d-models.md#wrapped-family-members`
- `docs/projects/art-workflow-tech-design.md#4-helper-scripts`
"""
import sys

# No bytecode cache in the checkout: `pnpm assets:check` refuses stray binary files.
sys.dont_write_bytecode = True
