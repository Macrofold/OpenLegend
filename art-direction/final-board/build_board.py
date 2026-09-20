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
lines=['# Open Legend — final creative inspiration board','','[Open the visual board](index.html)','','Confirmed favorites, with creative interpretation kept distinct from your stated preferences. This is the final curated reference set for this discussion, not a finalized renderer, asset budget or production specification.','','## Shared direction','','Richly detailed, dimensional worlds; expressive and recognizable people; purposeful light; and an inviting sense of life. Pixel art and illustrated approaches are both valid references. Readable silhouettes and quiet areas matter as much as fine texture. The latest endorsements of Dave the Diver and Hades make clear that stylization can be a positive rather than an automatic rejection.','','## The practical brief','','- Give the wilderness layered terrain, vegetation and atmospheric depth, without making permanent gloom the default.','- Make body shape, clothing, hair, skin tone and carried equipment readable at gameplay distance. Use profiles and close views for richer face and material detail.','- Let campfires, water and shadows connect people to their surroundings. Compose light around an identifiable source and preserve readable values.','- Add meaningful lived-in objects, not uniform visual noise. Use fine detail where it describes identity, material or use.','- Keep human scale, environment scale and close-up scale explicit when evaluating artwork. A large portrait or promotional illustration is not a runtime feasibility result.','','## Favorites and their contributions','']
for e in data['entries']:
    lines += [f"### {e['title']} — {e['role']}",'',f"**Your preference:** {e['liked']}",'',f"**Visual reading:** {e['good']}",'',f"**Creative translation:** {e['apply']}",'',f"**Context:** {e['limit']}",'']
    for img in e['images']:lines += [f"![{img['label']}]({img['url']})",f"Source: {img['source']}",'']
lines += ['## Provenance and rights','','Six screenshots were supplied by the user and copied unchanged into images/ so temporary clipboard files are not dependencies. Other images remain at the credited remote hosts. Artwork belongs to its respective owners; no production reuse rights or AGPL license are asserted for these third-party images. Steam Autumn Sale is identified by the supplied image, with artist/year unverified. Earlier boards, ratings and feedback are preserved.']
(ROOT/'creative-brief.md').write_text('\n'.join(lines)+'\n')
print('Built final inspiration board: 11 favorites.')
