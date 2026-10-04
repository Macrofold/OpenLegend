from pathlib import Path
import json, re

ROOT = Path.cwd()
D = ROOT / 'docs/repertoires'
SCORES = {1:'1 Core', 2:'2 Complete', 3:'3 Depth', 4:'4 Detail', 5:'5 Specialist'}
ID = re.compile(r'^[A-Z]{2,5}-?\d{2,3}$')
original = {}
for p in ROOT.rglob('*'):
    if p.is_file() and '.git' not in p.parts:
        try: original[p.relative_to(ROOT).as_posix()] = p.read_text()
        except (UnicodeError, OSError): pass

def cells(line):
    return [v.strip() for v in re.split(r'(?<!\\)\|', line.strip())[1:-1]]

def norm(s):
    return re.sub(r'\s+', ' ', s).strip()

def slug(s):
    return re.sub(r'[^\w\- ]', '', s.lower().replace('`','')).replace(' ', '-')

def sections(text):
    parts = re.split(r'(?m)^(## .+)$', text)
    return parts[0], [(parts[i], parts[i+1]) for i in range(1,len(parts)-1,2)]

def row_map(text):
    return {c[0]:c for line in text.splitlines() if line.startswith('|') and (c:=cells(line)) and ID.fullmatch(c[0])}

def rankings(text):
    result = {}; score = None
    for line in text.splitlines():
        m = re.match(r'## ([1-5]) (?:Core|Complete|Depth|Detail|Specialist)',line)
        if m: score=int(m[1])
        if score and line.startswith('|'):
            c=cells(line)
            if c and c[0].isdigit():
                for key in re.findall(r'\b[A-Z]{2,5}-?\d{2,3}\b', c[-1]):
                    assert key not in result, ('duplicate assignment', key)
                    result[key]=(score,int(c[0]))
    return result

patterns={};score=None
for line in (D/'ranked-patterns.md').read_text().splitlines():
    m=re.match(r'## ([1-5]) ',line)
    if m:score=int(m[1])
    if score and line.startswith('|'):
        c=cells(line)
        if c and c[0].isdigit():
            m=re.search(r'\]\(([^)]+)\)',c[1])
            assert m and '#' in m[1]
            assert m[1] not in patterns
            patterns[m[1]]=(score,c[2])
assert len(patterns)==270

def ranked_tables(text, rank):
    lines=text.splitlines();out=[];i=0;changed=0
    while i<len(lines):
        if lines[i].startswith('|') and cells(lines[i]) and cells(lines[i])[0]=='ID':
            header=cells(lines[i]);priority=header.index('Criticality');header[priority]='Priority'
            out.extend(['| '+' | '.join(header)+' |',lines[i+1]])
            i+=2;rows=[]
            while i<len(lines) and lines[i].startswith('|'):
                c=cells(lines[i]);assert c and ID.fullmatch(c[0]),lines[i]
                assert len(c)==len(header),(c[0],len(c),len(header))
                c[priority]=SCORES[rank[c[0]][0]];rows.append(c);i+=1;changed+=1
            for c in sorted(rows,key=lambda c:(*rank[c[0]],c[0])):out.append('| '+' | '.join(c)+' |')
        else:out.append(lines[i]);i+=1
    assert changed==len(rank),(changed,len(rank))
    return '\n'.join(out)+'\n'

def merge_card(body, old):
    new=body.strip()
    for para in re.split(r'\n\s*\n',old.strip()):
        if not para.strip() or para.startswith('**') or para.startswith('|'):continue
        if norm(para) in norm(new):continue
        if para.startswith('Seeds:'):
            urls=re.findall(r'\]\(([^)]+)\)',para)
            if urls and all(u in new for u in urls):continue
        if para in new:continue
        new+='\n\n'+para.strip()
    return '\n\n'+new+'\n\n'

count=0;matched=set();all_ids=set()
for inv in sorted(D.glob('inventory-*.md')):
    cat=inv.name.removeprefix('inventory-');target=D/cat
    source=inv.read_text();old=target.read_text();register=(D/f'ranked-{cat}').read_text()
    before=row_map(source);rank=rankings(register)
    assert set(before)==set(rank),(cat,set(before)^set(rank))
    assert not (all_ids & set(before));all_ids.update(before)
    text=ranked_tables(source,rank);intro,parts=sections(text);_,oldparts=sections(old);oldsections=dict(oldparts)
    rebuilt=[]
    for heading,body in parts:
        key=cat+'#'+slug(heading[3:])
        if key in patterns:
            body=merge_card(body,oldsections.get(heading,''))
            pscore,reason=patterns[key];matched.add(key)
            body=re.sub(r'(?m)^(\*\*[^\n]*? · (?:Play|Blend|Lab) · )(?:High|Try|Niche|[1-5](?: (?:Basics|Expected|Enriching|Advanced|Frontier))?)(?= · |\.)',lambda m:m[1]+SCORES[pscore],body)
            if not re.search(r'\*\*[^\n]*'+re.escape(SCORES[pscore]),body):
                body='\n\n**Priority: '+SCORES[pscore]+'.**\n'+body
            body=body.rstrip()+'\n\nSelection: '+reason+'\n\n'
        rebuilt.append((heading,body))
    existing={h for h,b in rebuilt}
    for h,b in oldparts:
        if h not in existing:rebuilt.append((h,b))
    text=intro+''.join(h+b for h,b in rebuilt)
    note=re.search(r'## Selection decisions\n(.*?)(?=\n## |\Z)',register,re.S)
    if note:text+='\n## Selection guidance\n\n'+note[1].strip()+'\n'
    text=text.replace('Criticality 1–5, then Level F → U → C → D, then stable ID','Priority, then whole-game workstream, then stable ID')
    notice='**Canonical catalogue.** Descriptions and current priorities live together here. Each domain table is ordered by priority, then the selection policy’s workstream and stable ID; implementation Level and build effort are not priority tie-breakers. These are proposals, not delivered features.\n\n'
    pos=text.find('\n\n');text=text[:pos+2]+notice+text[pos+2:]
    after=row_map(text);assert set(before)==set(after)
    for key,values in before.items():
        assert values[:4]+values[5:]==after[key][:4]+after[key][5:],('lost entry content',key)
    target.write_text(text);inv.unlink();(D/f'ranked-{cat}').unlink();count+=len(before)
assert count==7871 and len(matched)==270,(count,len(matched))
action=(D/'actions.md').read_text();rank=rankings((D/'ranked-actions.md').read_text())
assert len(rank)==384 and set(rank)==set(row_map(action))
action=ranked_tables(action,rank)
action=action.replace('**Criticality 1–5, then Level F → U → C → D, then stable ID**','**Priority, then whole-game workstream, then stable ID**')
action=action.replace('Criticality estimates the priority of the described role in an intended world','Priority follows the whole current game rather than importance inside a single domain')
reg=(D/'ranked-actions.md').read_text();note=re.search(r'## Selection boundaries\n(.*?)(?=\n## )',reg,re.S)
if note:action+='\n## Selection guidance\n\n'+note[1].strip()+'\n'
(D/'actions.md').write_text(action)
(D/'ranked-actions.md').unlink();(D/'ranked-patterns.md').unlink()
(D/'ranked-coverage.md').rename(D/'coverage.md')
replace={}
for name in original:
    if name.startswith('docs/repertoires/inventory-'):
        f=Path(name).name;replace[f]=f.removeprefix('inventory-')
    if name.startswith('docs/repertoires/ranked-'):
        f=Path(name).name;replace[f]=f.removeprefix('ranked-')
replace['ranked-patterns.md']='README.md#catalogue-map'
for p in ROOT.rglob('*'):
    if not p.is_file() or '.git' in p.parts or '.repertoire-task' in p.parts:continue
    try:text=p.read_text()
    except (UnicodeError,OSError):continue
    before=text
    for old,new in replace.items():
        if old not in text:continue
        text=re.sub(re.escape(old)+r'#[A-Za-z0-9_-]+',new.split('#')[0]+'#selection-guidance' if old not in ('ranked-patterns.md','ranked-coverage.md') and old.startswith('ranked-') else new,text)
        text=text.replace(old,new)
    if before!=text:p.write_text(text)
changed=[name for name,s in original.items() if not (ROOT/name).exists() or (ROOT/name).read_text(errors='replace')!=s]
changed+=sorted(p.relative_to(ROOT).as_posix() for p in ROOT.rglob('*.md') if p.relative_to(ROOT).as_posix() not in original)
Path('/tmp/repertoire-changed.json').write_text(json.dumps(sorted(set(changed))))
print(json.dumps({'catalogues':27,'entries':count,'actions':len(rank),'patterns':len(matched),'changed_paths':len(set(changed))},indent=2))
