"""Package only the approved social sources/assets; never include application secrets."""
from pathlib import Path
import zipfile

root = Path(__file__).resolve().parent.parent
folders = [
    'marketing/instagram/revisao-2026-11', 'marketing/instagram/15-nova-fase',
    'marketing/templates/broto-social', 'marketing/auditoria/2026-11-13',
    'public/assets/logo', 'public/assets/mascot', 'public/images/landing',
]
files = [
    'marketing/AGENTS.md', 'marketing/README.md', 'marketing/branding/README.md',
    'marketing/instagram/CALENDARIO.md', 'marketing/pacotes/README.md',
    'marketing/instagram/agendamento-2026-11-15-a-21.json',
    'marketing/instagram/automaticos-check-2026-11.json',
    'marketing/instagram/VERIFICACAO-2026-11.md',
    'marketing/branding/2026-11-rebrand/PWA-ATUALIZACAO.md',
    'scripts/build-social-revision.mjs', 'scripts/render-social-revision.mjs',
    'scripts/package-social.py', '.devin/skills/instagram-vynta/SKILL.md',
]
allowed = {'.html', '.json', '.md', '.txt', '.png', '.jpg', '.webp', '.svg', '.mjs', '.py'}
output = root / 'marketing/pacotes/vynta-broto-social-2026-11.zip'
output.parent.mkdir(parents=True, exist_ok=True)
paths = [root / name for name in files]
for name in folders:
    paths.extend(p for p in (root / name).rglob('*') if p.is_file() and p.suffix in allowed)
with zipfile.ZipFile(output, 'w', zipfile.ZIP_DEFLATED, compresslevel=6) as archive:
    for path in sorted(set(paths)):
        archive.write(path, path.relative_to(root))
print(f'{output.relative_to(root)}: {output.stat().st_size / 1024 / 1024:.1f} MiB')
