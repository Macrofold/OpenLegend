"""Build round two only. Round-one files and all feedback files are never written."""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent
data = json.loads((ROOT / 'references.json').read_text())
entries = data['entries']
assert len(entries) == 20 and len({e['id'] for e in entries}) == 20
assert sum(e['start'] for e in entries) == 8
template = (ROOT / 'board-template.html').read_text()
template = template.replace('/*FEEDBACK_STORAGE*/', (ROOT / 'feedback-storage.js').read_text().replace('</', '<\\/'))
template = re.sub(r'/\*REFERENCE_DATA\*/\s*null', lambda _: json.dumps(data, ensure_ascii=False).replace('</', '<\\/'), template)
(ROOT / 'index.html').write_text(template)

intro = ['# Open Legend — round two', '', 'September 19, 2026. **16 new games, one artist study, and three round-one benchmarks.** Eight opening comparisons focus on your feedback. Inclusion is a question to evaluate, not a decision to adopt a style.', '', '[Interactive board](index.html) · [Round-one analysis](../round-01-analysis.md) · [Original board](../index.html)', '', 'Images remain hosted at credited sources. The sources include gameplay, promotional screenshots, and artist studies; large portraits are distinguished from world sprites. No assets have been acquired.', '']
catalog = list(intro)
first = list(intro)
for e in entries:
    section = [f"## {e['id']} — {e['title']}", '', f"**{e['type']} · {e['group']}**", '', f"**Look at:** {e['focus']}", '', e['borrow'], '', f"**Watch for:** {e['caution']}", '', f"**Feedback question:** {e['question']}", '']
    links = [f"[{frame['label']}]({frame['url']}) · [Image source]({frame['source']})" for frame in e['images']]
    if e.get('steam'): links.append(f"[Steam]({e['steam']})")
    if e.get('creatorUrl'): links.append(f"[Artist]({e['creatorUrl']})")
    if e.get('originalId'): links.append(f"[Original reference {e['originalId']}](../index.html#{e['originalId']})")
    catalog += section + links + ['', e['reuse'], '']
    if e['start']:
        first += section + [f"![{e['title']} — {e['images'][0]['label']}]({e['image']})", ''] + links + ['']
(ROOT / 'references.md').write_text('\n'.join(catalog))
(ROOT / 'START-HERE.md').write_text('\n'.join(first))
print(f'Built round two: {len(entries)} references, {sum(len(e["images"]) for e in entries)} images, 8 opening comparisons.')
