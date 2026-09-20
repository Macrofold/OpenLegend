"""Build only round three's HTML and readable catalog; never write feedback."""
import json,re
from pathlib import Path
ROOT=Path(__file__).resolve().parent
data=json.loads((ROOT/'references.json').read_text())
entries=data['entries']
assert len(entries)==12 and len({e['id'] for e in entries})==12
assert sum(e['start'] for e in entries)==7
template=(ROOT/'board-template.html').read_text()
template=template.replace('/*FEEDBACK_STORAGE*/',(ROOT/'feedback-storage.js').read_text().replace('</','<\\/'))
template=re.sub(r'/\*REFERENCE_DATA\*/\s*null',lambda _:json.dumps(data,ensure_ascii=False).replace('</','<\\/'),template)
assert '/*REFERENCE_DATA*/' not in template
(ROOT/'index.html').write_text(template)
lines=['# Round three reference catalog','','[Interactive board](index.html) · [Feedback synthesis](../round-02-analysis.md)','']
for e in entries:
 lines += [f"## {e['id']} — {e['title']}",'',e['medium'],'',e['borrow'],'',e['caution'],'',f"**Question:** {e['question']}",'',e['note'],'']
 for i in e['images']: lines += [f"![{i['label']}]({i['url']})",f"[Image source]({i['source']})",'']
 lines += [f"[Game/source]({e['source']})",'']
(ROOT/'references.md').write_text('\n'.join(lines))
print('Built round three: 12 references, 7 opening comparisons.')
