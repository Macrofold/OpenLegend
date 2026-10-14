"""Run finite production/native/browser qualification; preserve failures and exact sources."""
import base64
import json
import os
from pathlib import Path
import shutil
import subprocess
import urllib.request

report = Path(os.environ['RUNNER_TEMP']) / 'ui-finish'
report.mkdir(exist_ok=True)
checks = {}


def run(label, args):
    with (report / (label + '.log')).open('w') as output:
        result = subprocess.run(args, stdout=output, stderr=subprocess.STDOUT)
    checks[label] = result.returncode
    print(label + ': ' + str(result.returncode), flush=True)
    lines = (report / (label + '.log')).read_text().splitlines()
    print('\n'.join(lines[-100 if result.returncode else -8:]), flush=True)
    return result.returncode == 0


def git(*args):
    return subprocess.check_output(['git', *args])


def api(path, payload):
    request = urllib.request.Request('https://api.github.com/repos/Macrofold/OpenLegend/git/' + path,
        method='POST', data=json.dumps(payload).encode(), headers={
            'Authorization': 'Bearer ' + os.environ['GH_TOKEN'],
            'Accept': 'application/vnd.github+json', 'Content-Type': 'application/json'})
    with urllib.request.urlopen(request, timeout=120) as response:
        return json.load(response)


native = Path('tests/ui-finish-worlds.test.ts')
browser = Path('tests/browser/ui-finish-recovery.spec.ts')
try:
    shutil.copyfile('.github/scripts/ui-native-worlds.ts', native)
    shutil.copyfile('.github/scripts/ui-recovery-browser.ts', browser)
    if not run('prepare', ['python3', '.github/scripts/ui-finish.py']):
        raise RuntimeError('Preparation failed; candidate not ready for checks.')
    if not run('refine', ['python3', '.github/scripts/ui-refine.py']):
        raise RuntimeError('Refinement failed; candidate not ready for checks.')
    changed = git('diff', '--name-only').decode().splitlines()
    run('format', ['pnpm', 'exec', 'prettier', '--write', *changed, str(native), str(browser)])
    if run('types', ['pnpm', 'typecheck']):
        run('worlds', ['pnpm', 'exec', 'vitest', 'run', str(native), '--reporter=verbose'])
        if run('build', ['pnpm', 'build']):
            run('browser', ['pnpm', 'exec', 'playwright', 'test', str(browser), '--reporter=line'])
finally:
    if browser.exists():
        shutil.copyfile(browser, report / 'recovery-probe.ts')
    native.unlink(missing_ok=True)
    browser.unlink(missing_ok=True)
    patch = git('diff', 'HEAD', '--', 'apps', 'packages', 'docs')
    (report / 'changes.patch').write_bytes(patch)
    print('AFFECTED_DIFF_BEGIN\n' + patch.decode() + 'AFFECTED_DIFF_END', flush=True)
    metadata = {'parent': os.environ['GITHUB_SHA'], 'checks': checks}
    if checks.get('types') == 0 and checks.get('format') == 0:
        paths = git('diff', '--name-only').decode().splitlines()
        assert all(path.startswith(('apps/', 'packages/', 'docs/')) for path in paths), paths
        assert not git('ls-files', '--others', '--exclude-standard').decode().strip()
        git('diff', '--check')
        tree = git('rev-parse', 'HEAD^{tree}').decode().strip()
        for offset in range(0, len(paths), 3):
            entries = [{'path': path, 'mode': '100644', 'type': 'blob', 'content': Path(path).read_text()} for path in paths[offset:offset+3]]
            tree = api('trees', {'base_tree': tree, 'tree': entries})['sha']
        git('add', '--', *paths)
        assert git('write-tree').decode().strip() == tree
        metadata.update(tree=tree, changed_paths=paths)
    evidence = []
    for path in sorted(Path('test-results').rglob('*.png')):
        blob = api('blobs', {'encoding': 'base64', 'content': base64.b64encode(path.read_bytes()).decode()})['sha']
        evidence.append({'path': str(path).replace('/', '--'), 'mode': '100644', 'type': 'blob', 'sha': blob})
    if evidence:
        metadata['image_tree'] = api('trees', {'tree': evidence})['sha']
        metadata['images'] = [entry['path'] for entry in evidence]
    (report / 'metadata.json').write_text(json.dumps(metadata, indent=2) + '\n')
    print('FINAL_METADATA=' + json.dumps(metadata, indent=2), flush=True)
    print('No commits or branch references changed by this runner.', flush=True)
    if Path('test-results').exists():
        shutil.copytree('test-results', report / 'test-results', dirs_exist_ok=True)
    if not checks or any(result != 0 for result in checks.values()):
        raise SystemExit(1)
