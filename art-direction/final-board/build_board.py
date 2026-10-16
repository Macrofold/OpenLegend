"""Build this curated board only. Earlier boards and feedback are never written."""
import json,html,re
from pathlib import Path
ROOT=Path(__file__).resolve().parent
data=json.loads((ROOT/'references.json').read_text())
esc=lambda s:html.escape(str(s),quote=True)
cards=[]
for n,e in enumerate(data['entries'],1):
    figures=[]
    for i,img in enumerate(e['images']):
        figures.append(f'''<figure><button class="image-button" data-entry="{esc(e['id'])}" data-image="{i}" aria-label="Enlarge {esc(e['title'])}: {esc(img['label'])}"><img src="{esc(img['url'])}" alt="{esc(img['label'])}" loading="lazy" referrerpolicy="no-referrer"><span class="enlarge">↗ View full image</span></button><figcaption>{esc(img['label'])}</figcaption></figure>''')
    source=f'<a href="{esc(e["source"])}" target="_blank" rel="noopener noreferrer">Game / source ↗</a>' if e['source'] else '<span>Supplied illustration · original artist unverified</span>'
    cards.append(f'''<article id="{esc(e['id'])}" data-category="{esc(e['category'])}" class="reference"><header class="reference-title"><span class="number">{n:02}</span><div><p class="eyebrow">{esc(e['role'])}</p><h2>{esc(e['title'])}</h2><p class="medium">{esc(e['medium'])}</p></div></header><div class="reference-layout"><div class="gallery">{''.join(figures)}</div><div class="notes"><section class="preference"><h3>What you like</h3><p>{esc(e['liked'])}</p></section><section><h3>What makes it work</h3><p>{esc(e['good'])}</p></section><section><h3>Bring into Open Legend</h3><p>{esc(e['apply'])}</p></section><details><summary>Boundaries & context</summary><p>{esc(e['limit'])}</p></details><div class="source">{source}</div></div></div></article>''')
template=(ROOT/'board-template.html').read_text()
assert len(cards)==11
safe=json.dumps(data['entries'],ensure_ascii=False).replace('</','<\\/')
template=template.replace('<!--CARDS-->','\n'.join(cards))
template=re.sub(r'/\*DATA\*/\s*\[\]',lambda _:safe,template)
assert '/*DATA*/' not in template
(ROOT/'index.html').write_text(template)
# The maintained creative brief contains later owner decisions absent from the card catalog.
# Rebuilding the board must not replace that independent document.
print('Built final inspiration board: 11 favorites.')
