from pathlib import Path
source=Path('.github/review-core.py').read_text()
a=source.index('# Inspect later,')
b=source.index('s=s.replace(',a)
source=source[:a]+'''s=s.replace('let attemptBindings = prepared.attemptBindings;', 'let attemptBindings: AttemptBinding[] = [];')
s=s.replace('\\n          attemptBindings,\\n', '\\n          prepared.attemptBindings,\\n')
'''+source[b:]
exec(compile(source,'.github/review-core.py','exec'))
