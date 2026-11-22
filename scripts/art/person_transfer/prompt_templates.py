"""Profile-driven prompt and non-leading blind-critique brief templates for person transfer.

Separates generic transfer orchestration from world-owned appearance/coverage wording:
- Reads baseline coverage descriptions and coordinate briefs from the active foundation profile
  (`foundation-sources.json` by default, pointing to `docs/worlds/base/people-appearance.md#baseline-coverage`)
  so `--generate-tpose-ref` works out of the box without hand-writing external prompt files;
- Emits a strictly non-leading blind visual critique prompt (`blind_critique_prompt.md`) matching
  `docs/production-workflows/art-flows/README.md#independent-critique` (neutral panel roles,
  explicit intentional scope exclusions, neutral anatomical region nouns, and ranked top-5 visible
  discrepancies before `PASS/FAIL`, with zero flattering target adjectives or yes/no checklists).
"""
from __future__ import annotations

from pathlib import Path
import re
import sys

sys.dont_write_bytecode = True


def parse_mf_coordinate(subject_id: str) -> tuple[float, float] | None:
    """Parse `M{000..100}-F{000..100}` into normalized `(muscle, fullness)` floats in `[0, 1]`."""
    m = re.search(r"(?:^|[-_])M(\d{1,3})[-_]F(\d{1,3})(?:$|[-_])", subject_id, flags=re.IGNORECASE)
    if not m:
        return None
    mv = max(0.0, min(1.0, int(m.group(1)) / 100.0))
    fv = max(0.0, min(1.0, int(m.group(2)) / 100.0))
    return (mv, fv)


def synthesize_tpose_physique_brief(subject_id: str, profile: dict, custom_brief: str | None = None) -> str:
    """Resolve or synthesize an explicit horizontal T-pose physique brief for `subject_id`."""
    if custom_brief and custom_brief.strip():
        return custom_brief.strip()

    coords = profile.get("grid9ConceptSheets", {}).get("coordinates", {})
    key = subject_id.upper()
    if key in coords and coords[key].get("tposePhysiqueBrief"):
        return str(coords[key]["tposePhysiqueBrief"]).strip()

    mf = parse_mf_coordinate(subject_id)
    if mf is None:
        return (
            "Preserve the exact physique, muscle volume, soft-tissue distribution, limb proportions, "
            "and surface relief shown in the supplied reference turnaround sheet while extending both "
            "arms horizontally at 90 degrees with natural shoulder/arm gravity settle and taut armpit-to-waist contours."
        )

    m_val, f_val = mf
    m_pct, f_pct = int(round(m_val * 100)), int(round(f_val * 100))
    if m_val <= 0.15:
        m_desc = "minimal skeletal muscle mass with slender neck, narrow un-bulked shoulders, flat chest, and thin sinewy limbs"
    elif m_val >= 0.85:
        m_desc = "maximum heavy musculature with thick neck/trapezius, rounded gravity-settled deltoids, deep pectorals, wide lats, and thick muscular arms and legs"
    else:
        m_desc = f"moderate ({m_pct}%) muscle development across shoulders, chest, back, arms, and legs"

    if f_val <= 0.10:
        f_desc = (
            "very low subcutaneous fat (0% fullness) showing the natural bony or muscular surface relief of this build, "
            "elongated palms-down top bicep contours, settled lower tricep bellies, and a taut armpit-to-waist taper"
        )
    elif f_val >= 0.85:
        f_desc = (
            "maximum whole-body adipose fullness (100% fullness) across cheeks/jowls/submental double chin, thick neck, "
            "soft full chest, downward-draping tricep/underarm soft tissue, prominent rounded abdomen, wide flanks/back folds, "
            "and heavy full thighs with smooth un-striated skin"
        )
    else:
        f_desc = (
            f"moderate ({f_pct}%) everyday subcutaneous fullness softening surface relief across torso, flanks, "
            "outstretched upper arms, and legs without deep muscle striations"
        )
    return f"Coordinate {subject_id} (Muscle Mass {m_pct}%, Fullness {f_pct}%): {m_desc}, combined with {f_desc}."


def build_tpose_prompt(subject_id: str, profile: dict, custom_brief: str | None = None) -> str:
    """Build a complete two-panel horizontal T-pose reference prompt from the active foundation profile."""
    cov_summary = (
        profile.get("baselineCoverage", {}).get("promptSummary")
        or "minimal, close-fitting, high-cut plain opaque undyed linen baseline coverage with minimal fabric bulk and zero folds"
    )
    physique_brief = synthesize_tpose_physique_brief(subject_id, profile, custom_brief=custom_brief)
    return (
        f"Asset: technical two-view horizontal T-pose character anatomy reference sheet for ONE adult game body ({subject_id}), not final clothing.\n"
        f"Reference image: use the supplied {subject_id} character turnaround sheet for the exact same person's identity, bald clean-shaven neutral head, "
        "skin tone, physique, crown-to-sole figure height and floor line, skeletal bone lengths, baseline pelvic coverage, and neutral medium-gray studio background. "
        "Change ONLY the three-panel low A-pose layout into a two-panel orthographic horizontal T-pose sheet (left panel: straight front view, right panel: straight back view, "
        "side by side with clear studio space between outstretched fingertips and inside all four image borders so nothing touches or is cropped).\n\n"
        "Pose standardization — Horizontal T-pose (arms raised 90 degrees straight out to the sides):\n"
        "Both front and back views stand upright at identical crown-to-sole height on one shared floor line, legs slightly apart, bare feet flat on the floor, "
        "head straight, neutral expression, and BOTH ARMS EXTENDED STRAIGHT OUT HORIZONTALLY AT 90 DEGREES TO THE SIDES (parallel to the floor, elbows straight, "
        "palms facing down, relaxed open hands), showing natural downward gravity settle of the shoulder caps and upper arms.\n\n"
        f"Target physique — {physique_brief}\n\n"
        f"Coverage (exact match to reference): {cov_summary}. "
        "Even soft studio light, near-orthographic camera, plain medium-gray background, full head, both outstretched hands, and bare feet completely in frame, no text or labels.\n"
    )


def build_blind_critique_brief(
    subject_id: str,
    revision_tag: str,
    boards: list[str],
    concept_sheet: Path | None,
    tpose_ref: Path | None,
    sex: str,
    adipose_gate: float | None,
    coverage_part_id: str = "linenBriefs",
) -> str:
    """Build a strictly non-leading blind visual critique prompt (`art-flows/README.md#independent-critique`)."""
    f_is_zero = adipose_gate is not None and adipose_gate <= 0.05
    ref_lines = []
    if concept_sheet is not None and concept_sheet.is_file():
        ref_lines.append(f"- 2D A-pose turnaround reference: `{concept_sheet}`")
    if tpose_ref is not None and tpose_ref.is_file():
        ref_lines.append(f"- 2D horizontal T-pose reference: `{tpose_ref}`")
    board_lines = "\n".join(f"- `{b}`" for b in boards)

    f0_scope_line = (
        "- At `F = 0` (`adiposeFullness ≈ 0`), local brow, nose, eye-socket, and lip feature contours intentionally retain canonical base identity so `muscleMass` stays orthogonal to face presets, while overall cranial/temple/jaw breadth scales coherently with neck breadth."
        if f_is_zero
        else "- At `F > 0`, adipose fullness intentionally pads whole-head/cheek/jowl/submental, torso, limb, hand, and digit soft tissue around carried canonical eye/oral submeshes."
    )

    return (
        f"# Blind Independent Visual Critique Brief — `{revision_tag}` (`{subject_id}`)\n\n"
        "You are a fresh read-only visual reviewer with no editing authority. Inspect **every** image listed below before writing conclusions. "
        "Do **not** read `receipt.json`, `gate_summary.json`, or Python solver code.\n\n"
        "## 1. Files to inspect (neutral panel roles)\n"
        + ("\n".join(ref_lines) + "\n" if ref_lines else "")
        + f"{board_lines}\n\n"
        "## 2. Intentional scope boundaries (do not misclassify as defects unless visually broken)\n"
        f"{f0_scope_line}\n"
        "- Clay panels disable normal maps intentionally to evaluate runtime `LOD1` polygon geometry (`~15k` body tris), whereas PBR `.glb` panels add the `1024x1024` tangent-space normal map for shallow sub-triangle detail. Primary silhouette-shaping forms and relief wider than `LOD1` triangle spacing must still read clearly in `LOD1` clay.\n"
        "- Where a 2D horizontal T-pose reference is shown, it governs qualitative shoulder/arm/flank contour shape and gravity settle, while the registered A-pose donor and canonical skeleton remain authoritative for bone lengths and stance.\n"
        f"- Covered views show separate `{coverage_part_id}` woven-linen baseline coverage fitted directly to the registered donor garment (`sex={sex}`, tension-bridged across the rear intergluteal cleft so cloth never rides into a wedgie); never exclude `Briefs/bare-pelvis/glutes` against the 2D turnaround reference. Unmasked bare-pelvis views verify a smooth `2-3 mm` inset non-explicit anatomical contour and full top-to-bottom rounded glutes (`0` poke-through or pinched creases).\n\n"
        "## 3. Required neutral evaluation procedure\n"
        "1. Across each anatomical region (`Head/neck/ears/eyes`, `Chest/abs/flanks`, `Back/scapulae`, `Shoulders/arms/wrists/hands`, `Briefs/bare-pelvis/glutes`, `Thighs/knees/calves/feet`, `Raised-arm T-pose & +68 deg`, `10-pose dynamic articulation`), trace outer silhouette segments and interior surface forms side-by-side (Reference/Donor vs. Candidate).\n"
        "2. **First**, rank the **top 5 visible contour, proportion, surface, seam, or garment discrepancies** from largest to smallest with exact board filenames, row/column labels, and plain descriptions.\n"
        "3. **Second**, grade each region and the overall candidate `PASS` or `FAIL` based strictly on what is visible in the renders.\n"
    )
