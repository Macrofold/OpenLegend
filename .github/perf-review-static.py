from pathlib import Path
from urllib.parse import unquote
import subprocess,re,json,html,os
root=Path.cwd();main='fc01e19b30060e6c7213b1c5405be13df209297e'
changed=subprocess.check_output(['git','diff','--name-only','--diff-filter=ACMR',main],text=True).splitlines()
cache={}
def text(path,baseline=False):
 key=(path,baseline)
 if key in cache:return cache[key]
 try:
  if baseline:
   p=subprocess.run(['git','show',main+':'+path],text=True,capture_output=True)
   value=p.stdout if p.returncode==0 else None
  else:value=(root/path).read_text()
 except (OSError,UnicodeDecodeError):value=None
 cache[key]=value;return value

def anchors(value):
 out=set(re.findall(r'<a\s+(?:name|id)=[\"\']([^\"\']+)',value));seen={}
 for title in re.findall(r'^#{1,6}\s+(.+?)\s*#*$',value,re.M):
  title=re.sub(r'<[^>]*>','',title)
  slug=re.sub(r'[^\w\- ]','',html.unescape(title).lower()).strip().replace(' ','-')
  count=seen.get(slug,0);seen[slug]=count+1
  out.add(slug+('-'+str(count) if count else ''))
 return out

def broken(path,baseline):
 value=text(path,baseline)
 if value is None:return []
 value=re.sub(r'^```.*?^```\s*$','',value,flags=re.M|re.S)
 errors=[]
 for link in re.findall(r'!?\[[^\]\n]*\]\(([^\s)]+)(?:\s+[^)]*)?\)',value):
  if re.match(r'^(?:[a-z]+:|//)',link,re.I):continue
  target,_,anchor=unquote(link).partition('#');full=(root/path).parent/target if target else root/path
  try:p=str(full.resolve().relative_to(root))
  except ValueError:continue
  body=text(p,baseline)
  if body is None:
   exists=subprocess.run(['git','cat-file','-e',main+':'+p],capture_output=True).returncode==0 if baseline else full.exists()
   if not exists:errors.append(link+' (missing path)')
  elif anchor and p.endswith('.md') and anchor not in anchors(body):errors.append(link+' (missing anchor)')
 return errors
newBroken={};priorBroken={};duplicates={};staleCode=[]
for path in changed:
 if path.endswith('.md') and not path.startswith('.github/'):
  before=set(broken(path,True));after=broken(path,False)
  if after:priorBroken[path]=[x for x in after if x in before]
  new=[x for x in after if x not in before]
  if new:newBroken[path]=new
  heads=re.findall(r'^## (.+)$',text(path) or '',re.M);dupes=sorted({h for h in heads if heads.count(h)>1})
  if dupes:duplicates[path]=dupes
 if path.endswith(('.ts','.tsx','.mjs')) and path.startswith(('apps/','packages/','scripts/')):
  for i,line in enumerate((text(path) or '').splitlines(),1):
   if re.search(r'actor\.rest|nextThoughtAt|thoughtIntervalMs|\.cooldownSeconds',line):staleCode.append({'path':path,'line':i,'text':line[:500]})
report={'scope':'Static changed-file/link audit, not an automated gameplay suite. Existing main link defects are separated from newly introduced ones.','main':main,'run':os.environ.get('GITHUB_RUN_ID'),'newBrokenLinks':newBroken,'inheritedBrokenLinks':{p:x for p,x in priorBroken.items() if x},'duplicateLevelTwoHeadings':duplicates,'retiredRuntimeReferenceCandidates':staleCode}
(root/'docs/verification/action-perf-static-review.json').write_text(json.dumps(report,indent=2)+'\n');print(json.dumps(report,indent=2))
