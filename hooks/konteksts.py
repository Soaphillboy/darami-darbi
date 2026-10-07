#!/usr/bin/env python3
"""Sesijas konteksts nākamā darba analīzei: claude-mem kopsavilkums un pēdējās sarunas ziņas.

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


def pedejas_zinas():
    faili = glob.glob(os.path.expanduser(f'~/.claude/projects/*/{CLI}.jsonl'))
    if not faili:
        return []
    with open(faili[0], 'rb') as fh:
        fh.seek(0, os.SEEK_END)
        fh.seek(max(0, fh.tell() - ASTE_BAITI))
        rindas = fh.read().decode('utf-8', 'replace').splitlines()[1:]
    zinas = []
    for rinda in rindas:
        try:
            ier = json.loads(rinda)
        except Exception:
            continue
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


dalas = []
mem = claude_mem()
if mem:
    dalas.append('## claude-mem summary\n' + mem)
zinas = pedejas_zinas()
if zinas:
    dalas.append('## Latest messages\n' + '\n\n'.join(zinas))
print('\n\n'.join(dalas)[-KOPA:])
