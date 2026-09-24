from pathlib import Path
program=Path('.github/burst-edit.py').read_text()
old="s.index('      const result = {\\n        people: people.filter(')"
new="s.index('      const result = {', s.index('next.stats.candidates'))"
if old not in program:raise RuntimeError('Expected checked exposure marker')
exec(compile(program.replace(old,new), '.github/burst-edit.py', 'exec'))
