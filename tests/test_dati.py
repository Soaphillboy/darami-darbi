"""dati.atbildiga_sesija robežgadījumi: kurai sesijai aiziet "pušo", ja repo minēts vairākās.

Palaist: python3 -m unittest discover -s tests -p 'test_*.py'  (no moda mapes)
"""
import json
import os
import sys
import tempfile
import unittest

sys.path.insert(0, os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', 'hooks'))
import dati  # noqa: E402

REPO = '/u/darbs/klienti/projekts'
CWD = '/u/darbs'


def rinda(laiks, nosaukums, ievade, cwd=CWD):
    return json.dumps({
        'type': 'assistant', 'timestamp': laiks, 'cwd': cwd,
        'message': {'content': [{'type': 'tool_use', 'name': nosaukums, 'input': ievade}]},
    })


class AtbildigaSesija(unittest.TestCase):
    def setUp(self):
        self.dir = tempfile.TemporaryDirectory()
        self.celi = {}

    def tearDown(self):
        self.dir.cleanup()

    def sesija(self, sid, rindas, last=0, cwd=CWD):
        cels = os.path.join(self.dir.name, f'{sid}.jsonl')
        with open(cels, 'w') as fh:
            fh.write('\n'.join(rindas) + '\n')
        self.celi[sid] = cels
        return {'id': sid, 'title': sid, 'cli': sid, 'cwd': cwd, 'last': last}

    def izvele(self, sesijas, faili=()):
        r = dati.atbildiga_sesija(REPO, sesijas, faili=faili, transkripts=self.celi.get)
        return r['id'] if r else None

    def test_svaigaka_sesija_ar_lasisanu_nezaudē_pret_to_kas_laboja(self):
        laboja = self.sesija('laboja', [rinda('2026-10-07T10:00:00Z', 'Edit', {'file_path': f'{REPO}/bots/worker.js'})], last=1)
        skatijas = self.sesija('skatijas', [
            rinda('2026-10-07T12:00:00Z', 'Bash', {'command': f'git -C {REPO} status --porcelain'}),
            rinda('2026-10-07T12:01:00Z', 'Read', {'file_path': f'{REPO}/README.md'}),
        ], last=9)
        self.assertEqual(self.izvele([skatijas, laboja]), 'laboja')

    def test_mainita_faila_labotajs_uzvar_citu_labojumu_repo(self):
        mainito = self.sesija('mainito', [rinda('2026-10-07T09:00:00Z', 'Edit', {'file_path': f'{REPO}/a.csv'})])
        citu = self.sesija('citu', [rinda('2026-10-07T11:00:00Z', 'Write', {'file_path': f'{REPO}/b.md'})])
        self.assertEqual(self.izvele([citu, mainito], faili=[' M a.csv']), 'mainito')

    def test_jaunakais_commits_uzvar_vecaku_mainita_faila_labojumu(self):
        laboja = self.sesija('laboja', [rinda('2026-10-07T09:00:00Z', 'Edit', {'file_path': f'{REPO}/a.csv'})])
        commitoja = self.sesija('commitoja', [rinda('2026-10-07T14:48:00Z', 'Bash', {'command': f'cd {REPO} && git add -A && git commit -m x'})])
        self.assertEqual(self.izvele([laboja, commitoja], faili=['M a.csv']), 'commitoja')

    def test_relativs_cels_pret_cwd(self):
        rel = self.sesija('rel', [rinda('2026-10-07T13:00:00Z', 'Bash', {'command': 'git -C klienti/projekts commit -m y'})])
        tikai_piemin = self.sesija('piemin', [rinda('2026-10-07T15:00:00Z', 'Bash', {'command': f'ls {REPO}'})])
        self.assertEqual(self.izvele([tikai_piemin, rel]), 'rel')

    def test_tikai_lasisana_visur_nav_neviena(self):
        a = self.sesija('a', [rinda('2026-10-07T10:00:00Z', 'Grep', {'path': REPO, 'pattern': 'x'})])
        b = self.sesija('b', [rinda('2026-10-07T11:00:00Z', 'Bash', {'command': f'git -C {REPO} log -3'})])
        self.assertIsNone(self.izvele([a, b]))

    def test_lidzigs_cels_cita_repo_neskaitas(self):
        cits = self.sesija('cits', [rinda('2026-10-07T12:00:00Z', 'Edit', {'file_path': f'{REPO}-vecais/x.md'})])
        self.assertIsNone(self.izvele([cits]))

    def test_vienads_stiprums_uzvar_jaunakais_pec_sarunas_laika(self):
        agra = self.sesija('agra', [rinda('2026-10-07T08:00:00Z', 'Edit', {'file_path': f'{REPO}/c.md'})], last=99)
        velu = self.sesija('velu', [rinda('2026-10-07T16:00:00Z', 'Edit', {'file_path': f'{REPO}/d.md'})], last=1)
        self.assertEqual(self.izvele([agra, velu]), 'velu')

    def test_porcelain_celi(self):
        self.assertEqual(dati._porcelain_cels(' M a/b.csv'), 'a/b.csv')
        self.assertEqual(dati._porcelain_cels('?? jauns.md'), 'jauns.md')
        self.assertEqual(dati._porcelain_cels('R  vecs.md -> jauns.md'), 'jauns.md')


if __name__ == '__main__':
    unittest.main()
