from pathlib import Path
import re
p=Path('packages/domain/src/types.ts')
s=p.read_text()
s,n=re.subn(r'(schemaVersion:\s*1\s*\|[^;]*\b11)(;)', r'\1 | 12\2', s)
if n != 1: raise RuntimeError(f'Expected current schema union, got {n}')
p.write_text(s)
