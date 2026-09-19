"""Rebuild the self-contained reference board and text catalog. No dependencies."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent
data = json.loads((ROOT / 'references.json').read_text())
template = (ROOT / 'board-template.html').read_text()
(ROOT / 'index.html').write_text(template.replace('/*REFERENCE_DATA*/null', json.dumps(data).replace('</', '<\\/')))
lines = ['# Open Legend — reference catalog', '', f"Research date: {data['researched']}. 48 references: 34 games, 6 art studies, 8 asset packs.", '', 'Visual observations are exploratory judgments, not approved design decisions. Images remain hosted at their credited sources. Some game references use historical promotional imagery.', '']
group = None
for e in data['entries']:
    if group != e['group']:
        group = e['group']
        lines += [f'## {group}', '']
    lines += [f"### {e['id']} — {e['title']}", '', f"**Look at:** {e['focus']}", '', e['borrow'], '', f"**Compare:** {e['question']}", '', f"[Image source]({e['source']}) · [View image]({e['image']})"]
    for field, label in [('steam', 'Steam'), ('steamSearch', 'Search Steam'), ('creatorUrl', 'Artist')]:
        if e.get(field): lines += [f"[{label}]({e[field]})"]
    if e.get('extraLink'): lines += [f"[{e['extraLink']['label']}]({e['extraLink']['url']})"]
    for field in ['creator', 'medium', 'availability', 'license', 'note']:
        if e.get(field): lines += ['', f"**{field.title()}:** {e[field]}"]
    lines += ['', e['reuse'], '']
(ROOT / 'references.md').write_text('\n'.join(lines))
first = ['# Open Legend — a first visual pass', '', 'Twelve contrasting references from the [full 48-reference board](index.html). React to individual qualities: lighting, trees, palette, character proportions, texture, mood. These selections are a viewing route, not confirmed design choices. Images require an internet connection.', '']
for e in data['entries']:
    if not e['start']:
        continue
    first += [f"## {e['id']} — {e['title']}", '', f"{e['focus']}. {e['borrow']}", '', f"![{e['title']}]({e['image']})", '', e['question'], '', f"[Image source]({e['source']})", '']
    if e.get('creator'):
        first += [e['creator'] + (f" · {e['medium']}" if e.get('medium') else ''), '']
(ROOT / 'START-HERE.md').write_text('\n'.join(first))
print(f"Built index.html and references.md with {len(data['entries'])} references.")
