import json
import pathlib

root = pathlib.Path.cwd()
config = json.loads((root / '.github/rebase-resolutions.json').read_text())
for path in sorted((root / '.github').glob('rebase-hunks-*.json')):
    additional = json.loads(path.read_text())
    for key, value in additional.items():
        assert key not in config['hunks'], key
        config['hunks'][key] = value

identity = 'docs/identity-and-references.md:'
for left, right in [
    ('6b687d59983353cf4dc9bbab2e7719fd6ab138591f928675808f8b8c87f66f3f', '4a0bfeb2b111ba6268b6dcf514cdb3c99521c6630fc563806e3eef9e88b5ddbb'),
    ('f810bc90f25f5c9eadc66b27ca015cb1ccf1c76cd6dd2ca0ff8e8c4e5ac59dbd', 'd8b5fd5e352bde02443ce5698cfd8a5a25fbf5efe93aa60bfd76aa4ee77b6367'),
    ('0deaf23b456484abe44d752e9f6ea007911c104e3629ccbbbe15fa1de4386470', '58a09218b9c79a06f60359b3c3ed85432ccc83daef24f510db73fa96e7f62503'),
    ('d4378123883387fb10051728d48f34a9598c65a4b1f99af17a79bb338b910c61', '155651ce644b649326105321ec978f26bc2b982b2feaa4769a27a72b44405a9d'),
    ('0abd9954cd57e52faec581532d0324b44f160b88291129587e9026df4cf6958d', 'ca1e960c238ec418cf3be0da2880580e0e3cb315cd8288a26ad8a10cf9161ea4'),
]:
    config['hunks'][identity + left + ':' + right] = {
        'take': 'right',
        'reason': 'Preserve the reviewed complete account/audience/control privacy boundary and current-format identity explanation. Main still calls initializeIdentity from fresh creation and migrateCognition, so the residual DF04 cleanup warning remains true. Stable permitted literal IDs and no automatic paid replay are retained; the new compound-key contract outside these hunks remains untouched.',
    }
source = (root / '.github/rebase-helper.py').read_text()
needle = "CONFIG = json.loads((ROOT / '.github/rebase-resolutions.json').read_text())"
assert source.count(needle) == 1
source = source.replace(needle, 'CONFIG = ' + repr(config), 1)
exec(compile(source, str(root / '.github/rebase-helper.py'), 'exec'))
