#!/usr/bin/env python3
"""Sesijas konteksts nākamā darba analīzei: claude-mem kopsavilkums, pēdējās sarunas ziņas un faili / saites,
ko sesija rakstīja vai minēja (no tiem modelis ņem pogu "Atvērt").

Izsauc mods valejie-darbi: python3 konteksts.py <cliSessionId>. Izdod tekstu uz stdout.
"""
import glob
import json
import os
import re
import sqlite3
import sys

CLI = sys.argv[1] if len(sys.argv) > 1 else ''
MEM_DB = os.path.expanduser('~/.claude-mem/claude-mem.db')
ASTE_BAITI = 3_000_000
ZINAS = 14
ZINAS_GARUMS = 900
KOPA = 10_000
REMINDER = re.compile(r'<system-reminder>.*?</system-reminder>', re.S)
SAITE = re.compile(r'https://[^\s)\]>"\'`]+')
FAILU_RIKI = ('Write', 'Edit', 'MultiEdit', 'NotebookEdit')
# Atmiņa, pagaidu faili un iestatījumi nav darbs, ko lietotājam atvērt.
NE_FAILI = ('/.claude/', '/private/tmp/', '/tmp/', '/node_modules/')
MAX_FAILI = 10
MAX_SAITES = 8


def claude_mem():
    try:
        db = sqlite3.connect(f'file:{MEM_DB}?mode=ro', uri=True, timeout=2)
        row = db.execute(
            'select s.request, s.completed, s.next_steps from session_summaries s '
            'join sdk_sessions k on k.memory_session_id = s.memory_session_id '
            'where k.content_session_id = ? order by s.created_at_epoch desc limit 1',
            (CLI,),
        ).fetchone()
    except Exception:
        return ''
    if not row:
        return ''
    request, completed, next_steps = (x or '' for x in row)
    return f'Request: {request}\nCompleted: {completed}\nNext steps: {next_steps}'


def teksts_no(content):
    if isinstance(content, str):
        return content
    dalas = []
    for b in content or []:
        if not isinstance(b, dict):
            continue
        if b.get('type') == 'tool_result':
            return ''
        if b.get('type') == 'text':
            dalas.append(b.get('text', ''))
    return '\n'.join(dalas)


def rindas_no_transkripta():
    faili = glob.glob(os.path.expanduser(f'~/.claude/projects/*/{CLI}.jsonl'))
    if not faili:
        return []
    with open(faili[0], 'rb') as fh:
        fh.seek(0, os.SEEK_END)
        fh.seek(max(0, fh.tell() - ASTE_BAITI))
        rindas = fh.read().decode('utf-8', 'replace').splitlines()[1:]
    out = []
    for rinda in rindas:
        try:
            out.append(json.loads(rinda))
        except Exception:
            continue
    return out


def pedejas_zinas(ieraksti):
    zinas = []
    for ier in ieraksti:
        if ier.get('type') not in ('user', 'assistant') or ier.get('isMeta'):
            continue
        t = REMINDER.sub('', teksts_no((ier.get('message') or {}).get('content'))).strip()
        if not t or t.startswith('<local-command') or t.startswith('<command-'):
            continue
        # Citu sesiju atskaites pieder tām sesijām, ne šai: analīzē tās neiekļauj.
        if t.startswith('<cross-session-message'):
            continue
        kas = 'User' if ier['type'] == 'user' else 'Claude'
        zinas.append(f'{kas}: {t[:ZINAS_GARUMS]}')
    return zinas[-ZINAS:]


def pievienot(saraksts, x):
    if x in saraksts:
        saraksts.remove(x)
    saraksts.append(x)


def faili_un_saites(ieraksti):
    """Faili, ko sesija rakstīja vai laboja (tikai esošie), un https saites no sarunas teksta; jaunākie beigās."""
    faili, saites = [], []
    for ier in ieraksti:
        if ier.get('type') not in ('user', 'assistant') or ier.get('isMeta'):
            continue
        content = (ier.get('message') or {}).get('content')
        if isinstance(content, str):
            content = [{'type': 'text', 'text': content}]
        for b in content or []:
            if not isinstance(b, dict):
                continue
            if b.get('type') == 'tool_use' and b.get('name') in FAILU_RIKI:
                cels = (b.get('input') or {}).get('file_path') or (b.get('input') or {}).get('notebook_path') or ''
                if cels.startswith('/') and not any(x in cels for x in NE_FAILI):
                    pievienot(faili, cels)
            elif b.get('type') == 'text':
                teksts = REMINDER.sub('', b.get('text', ''))
                if teksts.startswith('<cross-session-message'):
                    continue
                for saite in SAITE.findall(teksts):
                    pievienot(saites, saite.rstrip('.,;:!?'))
    faili = [f for f in faili if os.path.isfile(f)][-MAX_FAILI:]
    return faili, saites[-MAX_SAITES:]


dalas = []
mem = claude_mem()
if mem:
    dalas.append('## claude-mem summary\n' + mem)
ieraksti = rindas_no_transkripta()
zinas = pedejas_zinas(ieraksti)
if zinas:
    dalas.append('## Latest messages\n' + '\n\n'.join(zinas))
faili, saites = faili_un_saites(ieraksti)
beigas = ''
if faili or saites:
    beigas = '\n\n## Faili un saites (Files and links)\n' + '\n'.join(f'- {x}' for x in faili + saites)
print('\n\n'.join(dalas)[-(KOPA - len(beigas)):] + beigas)
