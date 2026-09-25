"""Prepare a pinned candidate for build/review. Repository writes remain connector-owned."""
from pathlib import Path
import difflib
import hashlib
import io
import json
import re
import shutil
import subprocess
import tarfile
import tempfile
import urllib.request

ROOT = Path.cwd()
REFS = {
    'base': '3c1198bc307bd95f4a1e0ed444aa9d3e1a00d238',
    'main': '03105fed9209c126e4e69e9faeb4687f42d1e74a',
    'action': '614764d77723955cfcf5972cd8f0bff8a70f3c12',
}
EXPECTED = {
    'README.md', 'apps/server/src/decision-context.ts', 'apps/server/src/game-saves.ts',
    'apps/server/src/upgrade-world.ts', 'docs/documentation-changelog.md',
    'packages/domain/src/kernel.ts',
}


def content_files(folder):
    return {str(p.relative_to(folder)): p for p in folder.rglob('*') if p.is_file()}


def conflict(path, action, base, main):
    if path == 'README.md':
        return action.replace('up to 20 manual slots', 'named manual saves without a fixed slot count')
    if path == 'apps/server/src/game-saves.ts':
        return main  # Keep main's envelope label: format is not a feature/version gate.
    if path in {'apps/server/src/upgrade-world.ts', 'docs/documentation-changelog.md'}:
        return action + main
    if path == 'apps/server/src/decision-context.ts':
        return action[:action.index('  const planActions = Object.fromEntries(')]
    if path == 'packages/domain/src/kernel.ts':
        return action  # Replace the complete old proximity section below, using its shared frame.
    raise RuntimeError('Unreviewed conflict: ' + path)


with tempfile.TemporaryDirectory(prefix='action-main-') as temporary:
    roots = {}
    for name, ref in REFS.items():
        data = urllib.request.urlopen(f'https://codeload.github.com/Macrofold/OpenLegend/tar.gz/{ref}', timeout=60).read()
        folder = Path(temporary) / name
        folder.mkdir()
        with tarfile.open(fileobj=io.BytesIO(data), mode='r:gz') as archive:
            archive.extractall(folder, filter='data')
        roots[name] = next(folder.iterdir())
    maps = {name: content_files(folder) for name, folder in roots.items()}
    changed = []
    conflicts = []
    for path in sorted(set().union(*(set(files) for files in maps.values()))):
        raw = {name: files[path].read_bytes() if path in files else None for name, files in maps.items()}
        b, m, a = (raw[name] for name in ['base', 'main', 'action'])
        if m == b or m == a:
            value = a
        elif a == b:
            value = m
        elif None in [b, m, a]:
            raise RuntimeError('Unreviewed add/delete: ' + path)
        else:
            merged = subprocess.run(['diff3', '-m', str(maps['action'][path]), str(maps['base'][path]), str(maps['main'][path])], capture_output=True)
            if merged.returncode not in [0, 1]:
                raise RuntimeError(merged.stderr.decode())
            value = merged.stdout
            if merged.returncode:
                conflicts.append(path)
                pattern = r'^<<<<<<<[^\n]*\n(.*?)^\|\|\|\|\|\|\|[^\n]*\n(.*?)^=======\n(.*?)^>>>>>>>[^\n]*\n?'
                value = re.sub(pattern, lambda match: conflict(path, *match.groups()), value.decode(), flags=re.M | re.S).encode()
        destination = ROOT / path
        if value is None:
            destination.unlink(missing_ok=True)
        else:
            destination.parent.mkdir(parents=True, exist_ok=True)
            destination.write_bytes(value)
        if value != a:
            changed.append(path)
    if set(conflicts) != EXPECTED:
        raise RuntimeError('Conflict set changed: ' + repr(conflicts))

    path = ROOT / 'packages/domain/src/kernel.ts'
    text = path.read_text()
    text = text.replace("import { createPerceptionFrame } from './perception-frame.js';", "import { createPerceptionFrame } from './perception-frame.js';\nimport { updateContactEpisodes } from './contact-acquisition.js';")
    text = text.replace('  SPATIAL_LIMITS,\n', '').replace('  bodiesTouch,\n', '')
    text = text.replace('  let nearbyAll: ReturnType<typeof spatialCandidates<(typeof entities)[number]>> | undefined;\n', '')
    start = text.index('    const touch = sensesFor(world, observer).find(')
    end = text.index('    if (radius === 0) {', start)
    text = text[:start] + text[end:]
    needle = '    // Sleeping does not manufacture conscious acquisitions. Waking reacquires actual evidence.'
    text = text.replace(needle, '    yield* updateContactEpisodes(world, original, observer, events, () =>\n      frame.contactCandidates(actor),\n    );\n' + needle)
    if text.count('spatialCandidates') == 1:
        text = text.replace('  spatialCandidates,\n', '')
    path.write_text(text)

    path = ROOT / 'packages/domain/src/perception-frame.ts'
    text = path.read_text()
    text = "import { SPATIAL_LIMITS } from '@open-legend/spatial';\n" + text
    text = text.replace('  let living: ReturnType<typeof spatialCandidates<Source>> | undefined;', '  let physical: ReturnType<typeof spatialCandidates<Source>> | undefined;\n  let bodyExtent: { radius: number; height: number } | undefined;\n  let living: ReturnType<typeof spatialCandidates<Source>> | undefined;')
    needle = '    source(id: string) {'
    addition = '''    contactCandidates(observer: Source): Source[] {
      physical ??= spatialCandidates(samples);
      bodyExtent ??= samples.reduce(
        (largest, source) => ({
          radius: Math.max(largest.radius, source.bodyRadius),
          height: Math.max(largest.height, source.height),
        }),
        { radius: 0, height: 0 },
      );
      // This point grid is 3D: include vertical body extent as well as horizontal reach.
      // Exact overlap/occlusion remains the contact detector's decision.
      return physical(
        observer.position,
        Math.max(observer.bodyRadius + bodyExtent.radius, observer.height, bodyExtent.height) +
          SPATIAL_LIMITS.epsilon,
      );
    },
'''
    if needle not in text:
        raise RuntimeError('Perception frame shape changed')
    path.write_text(text.replace(needle, addition + needle))
    changed += ['packages/domain/src/perception-frame.ts', 'packages/domain/src/contact-acquisition.ts']
    changed = sorted(set(changed))
    (ROOT / '.github/reconciled-paths.json').write_text(json.dumps(changed))
    print(json.dumps({'base': REFS, 'conflictsResolved': conflicts, 'changedComparedWithAction': changed}, indent=2))
