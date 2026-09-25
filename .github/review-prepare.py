"""Read-only source preparation. Git mutations remain in the GitHub connector."""
import io
import os
import pathlib
import tarfile
import urllib.request

ROOT = pathlib.Path('/tmp/openlegend-reconcile')
REFS = {
    'base': 'fc01e19b30060e6c7213b1c5405be13df209297e',
    'main': '3c1198bc307bd95f4a1e0ed444aa9d3e1a00d238',
    'branch': '94a7682aee9f100ccb54e073969bb4ed4f9fea49',
}
for label, ref in REFS.items():
    request = urllib.request.Request(
        f'https://api.github.com/repos/Macrofold/OpenLegend/tarball/{ref}',
        headers={'Authorization': 'Bearer ' + os.environ['GH_TOKEN'], 'Accept': 'application/vnd.github+json'},
    )
    with urllib.request.urlopen(request, timeout=60) as response:
        payload = response.read()
    with tarfile.open(fileobj=io.BytesIO(payload), mode='r:gz') as archive:
        for entry in archive:
            if not entry.isfile():
                continue
            relative = pathlib.PurePosixPath(*pathlib.PurePosixPath(entry.name).parts[1:])
            if '..' in relative.parts or relative.is_absolute():
                raise RuntimeError('Unsafe archive path')
            target = ROOT / label / relative
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_bytes(archive.extractfile(entry).read())
print('Pinned source snapshots prepared without modifying any Git references.')
