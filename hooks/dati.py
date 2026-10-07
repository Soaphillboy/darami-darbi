#!/usr/bin/env python3
"""Savāc vaļējos darbus: nearhivētās Claude aplikācijas sesijas un nenopušotos git repo.

Izsauc mods valejie-darbi: python3 dati.py <šīs sesijas cliSessionId>. Izdod JSON uz stdout.
"""
import glob
import hashlib
import json
import os
import re
import sqlite3
import subprocess
import sys

SIS = sys.argv[1] if len(sys.argv) > 1 else ''
BASE = os.path.expanduser('~/Library/Application Support/Claude/claude-code-sessions')
# Papildu mapes no iestatījuma "repoMapes" (komatiem atdalītas); sesiju mapes tiek pārbaudītas vienmēr.
PAPILDU_MAPES = [m.strip() for m in (sys.argv[2] if len(sys.argv) > 2 else '').split(',') if m.strip()]
REPO_DZILUMS = 3
IZLAIST_MAPES = {'.git', '.claude', 'node_modules', '.venv', 'venv', '__pycache__', 'dist', 'build', '.next'}
MEM_DB = os.path.expanduser('~/.claude-mem/claude-mem.db')


def mem_savienojums():
    try:
        return sqlite3.connect(f'file:{MEM_DB}?mode=ro', uri=True, timeout=2)
    except Exception:
        return None


def nakamie_soli(db, cli_id):
    """Pēdējās claude-mem kopsavilkuma 'next_steps' šai sesijai (tukšs, ja nav)."""
    if not db or not cli_id:
        return ''
    try:
        row = db.execute(
            'select s.next_steps from session_summaries s '
            'join sdk_sessions k on k.memory_session_id = s.memory_session_id '
            'where k.content_session_id = ? order by s.created_at_epoch desc limit 1',
            (cli_id,),
        ).fetchone()
    except Exception:
        return ''
    return (row[0] or '').strip() if row else ''


def sesijas():
    out = []
    db = mem_savienojums()
    for f in glob.glob(os.path.join(BASE, '*', '*', 'local_*.json')):
        try:
            with open(f) as fh:
                d = json.load(fh)
        except Exception:
            continue
        if d.get('isArchived'):
            continue
        p = d.get('postTurnSummary') or {}
        sid = d.get('sessionId') or os.path.basename(f)[:-5]
        out.append({
            'id': sid,
            'title': d.get('title') or 'Bez nosaukuma',
            'link': 'claude://claude.ai/epitaxy/' + sid,
            'status': p.get('status_category') or 'nav',
            'detail': p.get('status_detail') or '',
            'needs': p.get('needs_action') or '',
            'last': d.get('lastActivityAt') or 0,
            'cli': d.get('cliSessionId') or '',
            'cwd': d.get('cwd') or '',
            'nakamie': nakamie_soli(db, d.get('cliSessionId')),
            'sis': bool(SIS) and d.get('cliSessionId') == SIS,
        })
    out.sort(key=lambda s: s['last'], reverse=True)
    return out


TRANSKRIPTA_ASTE = 800_000
RAKSTOSIE_RIKI = {'Edit', 'Write', 'MultiEdit', 'NotebookEdit'}
LASOSIE_RIKI = {'Read', 'Grep', 'Glob', 'LS', 'NotebookRead'}
GIT_RAKSTOSI = re.compile(r'\bgit\b[^\n;&|]*\b(commit|add|rm|mv|stash|merge|rebase|cherry-pick|reset|checkout)\b')
GIT_LASOSI = re.compile(r'^\s*(git\s+(-C\s+\S+\s+)?(status|log|diff|show|rev-list|rev-parse|branch|remote|fetch)\b|ls\b|cat\b|find\b|grep\b|rg\b|wc\b|head\b|tail\b)')


def transkripta_cels(cli):
    faili = glob.glob(os.path.expanduser(f'~/.claude/projects/*/{cli}.jsonl'))
    return faili[0] if faili else None


def _aste(cels):
    with open(cels, 'rb') as fh:
        fh.seek(0, os.SEEK_END)
        fh.seek(max(0, fh.tell() - TRANSKRIPTA_ASTE))
        return fh.read()


def _porcelain_cels(rinda):
    """`git status --porcelain` rinda ("M a", "?? b", "R a -> c") → ceļš repo iekšā."""
    dalas = rinda.strip().split(None, 1)
    cels = dalas[1] if len(dalas) == 2 else dalas[0]
    return cels.split(' -> ')[-1].strip('"')


def _ievades(ieraksts):
    """Rīku izsaukumi (nosaukums, ievade) vienā sarunas ierakstā."""
    if ieraksts.get('type') != 'assistant':
        return []
    out = []
    for b in (ieraksts.get('message') or {}).get('content') or []:
        if isinstance(b, dict) and b.get('type') == 'tool_use':
            out.append((b.get('name') or '', b.get('input') or {}))
    return out


def atbildiga_sesija(cels, sesijas_saraksts, faili=(), transkripts=transkripta_cels):
    """Sesija, kas pēdējā tiešām strādāja ar šo repo (tai aiziet "pušo"), vai None.

    Pierādījumi pēc stipruma, katrā līmenī uzvar jaunākais pēc sarunas laika (ne pēc sesijas pēdējās aktivitātes):
      3 = labots kāds no mainītajiem failiem, vai git commit/add utt. šajā repo;
      2 = labots kāds cits fails šajā repo;
      1 = repo ceļš rakstošā rīka izsaukumā (lasīšana, git status/log un tml. neskaitās).
    Relatīvos ceļus (git -C klienti/projekts ...) atrisina pret ieraksta cwd.
    """
    cels = cels.rstrip('/')
    mainitie = {os.path.join(cels, _porcelain_cels(f)) for f in faili}
    labakais = None  # (stiprums, laiks, sesija)
    for s in sesijas_saraksts:
        cli = s.get('cli')
        tcels = transkripts(cli) if cli else None
        if not tcels:
            continue
        try:
            aste = _aste(tcels)
        except OSError:
            continue
        relativs = os.path.relpath(cels, s['cwd']) if s.get('cwd') else None
        adatas = [cels.encode()] + ([relativs.encode()] if relativs and not relativs.startswith('..') else [])
        for rinda in aste.splitlines():
            if not any(a in rinda for a in adatas):
                continue
            try:
                ier = json.loads(rinda)
            except ValueError:
                continue
            laiks = ier.get('timestamp') or ''
            ier_cwd = ier.get('cwd') or s.get('cwd') or ''
            for nosaukums, ievade in _ievades(ier):
                if nosaukums in LASOSIE_RIKI:
                    continue
                stiprums = 0
                if nosaukums in RAKSTOSIE_RIKI:
                    fails = ievade.get('file_path') or ievade.get('notebook_path') or ''
                    fails = fails if os.path.isabs(fails) else os.path.join(ier_cwd, fails)
                    if fails == cels or fails.startswith(cels + '/'):
                        stiprums = 3 if fails in mainitie else 2
                elif nosaukums == 'Bash':
                    komanda = ievade.get('command') or ''
                    rel = os.path.relpath(cels, ier_cwd) if ier_cwd else cels
                    if cels in komanda or (not rel.startswith('..') and rel in komanda) or ier_cwd.startswith(cels):
                        if GIT_RAKSTOSI.search(komanda):
                            stiprums = 3
                        elif not GIT_LASOSI.search(komanda):
                            stiprums = 1
                else:
                    stiprums = 1 if cels in json.dumps(ievade, ensure_ascii=False) else 0
                if stiprums and (labakais is None or (stiprums, laiks) > labakais[:2]):
                    labakais = (stiprums, laiks, s)
    return labakais[2] if labakais else None


def git(cels, *args):
    r = subprocess.run(['git', '-C', cels, *args], capture_output=True, text=True, timeout=10)
    return r.stdout.strip() if r.returncode == 0 else None


def repo_mapes(saknes):
    """Visi git repo līdz REPO_DZILUMS līmeņiem zem saknēm (arī repo citā repo iekšā), katrs vienreiz."""
    atrasti = []
    for sakne in saknes:
        sakne = os.path.realpath(os.path.expanduser(sakne))
        if not os.path.isdir(sakne):
            continue
        for dirpath, dirnames, _ in os.walk(sakne):
            dzilums = dirpath[len(sakne):].count(os.sep)
            dirnames[:] = [] if dzilums >= REPO_DZILUMS else [d for d in dirnames if d not in IZLAIST_MAPES]
            if os.path.exists(os.path.join(dirpath, '.git')) and dirpath not in atrasti:
                atrasti.append(dirpath)
    return atrasti


def repo(sesijas_saraksts):
    out = []
    saknes = [s['cwd'] for s in sesijas_saraksts if s.get('cwd')] + PAPILDU_MAPES
    for dirpath in repo_mapes(dict.fromkeys(saknes)):
        if not git(dirpath, 'remote'):
            continue
        ahead = git(dirpath, 'rev-list', '--count', '@{u}..HEAD')
        status = git(dirpath, 'status', '--porcelain') or ''
        n_ahead = int(ahead) if ahead and ahead.isdigit() else 0
        n_dirty = len([l for l in status.splitlines() if l.strip()])
        if n_ahead or n_dirty:
            commiti = (git(dirpath, 'log', '--format=%h %s', '@{u}..HEAD') or '').splitlines() if n_ahead else []
            faili = [l.strip() for l in status.splitlines() if l.strip()]
            head = git(dirpath, 'rev-parse', '--short', 'HEAD') or ''
            # Paraksts: ja lietotājs rindu paslēpj (✕), tā atgriežas tikai, kad repo stāvoklis mainās.
            sig = f"{head}:{n_ahead}:{n_dirty}:{hashlib.md5(status.encode()).hexdigest()[:8]}"
            kam = atbildiga_sesija(dirpath, sesijas_saraksts, faili=faili)
            out.append({
                'nosaukums': os.path.basename(dirpath), 'cels': dirpath, 'ahead': n_ahead, 'dirty': n_dirty,
                'commiti': commiti[:10], 'faili': faili[:15], 'sig': sig,
                'sesija': kam['id'] if kam else '', 'sesijasNosaukums': kam['title'] if kam else '',
            })
    return out


if __name__ == '__main__':
    visas_sesijas = sesijas()
    print(json.dumps({'sesijas': visas_sesijas, 'repo': repo(visas_sesijas)}, ensure_ascii=False))
