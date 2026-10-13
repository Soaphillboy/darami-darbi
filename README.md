# Darāmie darbi (To-dos) for Claude Code

Sānu panelis Claude Code aplikācijā, kas rāda visu tavu Claude sesiju darbus vienuviet: kas gaida tevi, ko katrā sesijā darīt tālāk, kas nav nopušots.

A side panel for the Claude Code desktop app that shows the work of all your Claude sessions in one place: what waits for you, what to do next in each session, what is not pushed. [English below](#english).

---

## Latviski

### Ko tas dara

Tev ir 10 atvērtas sesijas, un katrā kaut kas palika pusē. Panelis tās savāc vienā sarakstā:

```
● creators.lv mājaslapa  strādā                             + ▾
  Labo hooks/sakums.tsx · 12/~20 soļi             vēl ~3 min
  ━━━━━━━━━━━━━━━━━━━━━━━━━━──────────────────────────────
  ☐ Izlem, kuru domēnu pirkt                          Atvērt
  ☐ Pārskati jauno sākumlapas tekstu
  ▷ ✕ Palaid testus jaunajai sākumlapai
  ▷ ✕ Commito izmaiņas
  14:02 Atskaite: testi iziet 76/76…                       ✕
```

- **Strādājošai sesijai** zem nosaukuma redzams, ko tā dara tagad (fails, komanda), cik soļu jau izdarīts un cik vēl atlicis, un josla. Ja Claude tev jautā, tur ir pats jautājums vai tas, kam vajag tavu atļauju.
- **☐** ir darbi, ko vari izdarīt tikai tu: lēmums, kaut kas jāapskata (fails, melnraksts, artefakts, lapa), nosūtīšana no tava konta, zvans. Kad sesija izveido kaut ko apskatāmu, tur vienmēr ir "Pārskati …" ar Atvērt. Atzīmē, kad izdarīts. Vienā sesijā vaļā ne vairāk par 3, un sesija pati izņem tos, kas pēc sarunas jau izdarīti.
- **▷** ir līdz 2 nākamajiem promptiem, ko sesija pati uzraksta pēc katra sava gājiena, kā [next-steps](https://github.com/anthropics/claude-plugins-community). Uzspied ▷, un prompts aiziet uz to sesiju, Claude sāk strādāt.
- **Aplis** pie sesijas rāda, cik tavu ☐ šajā kārtā izdarīts (piemēram 2/3; Claude prompti neskaitās). Kad visi izdarīti, apļa vietā zaļš ķeksītis, un kartīte sakļaujas pati. Jauns darbs sāk jaunu kārtu.
- **Dienas rezultāts** augšā: cik tavu darbu šodien izdarīts visās sesijās, un aplis līdz nākamajai balvai. Ik pēc 10 darbiem balva ar animāciju: 10 pauze, 20 kafija, 30 pastaiga, tad no jauna.
- **Atskaite** ir tas, ko sesija atsūta atpakaļ pēc ▷. Pienāk ar macOS paziņojumu un skaņu.
- **Nenopušots** rāda git repo ar nenopušotiem commitiem vai mainītiem failiem. Pēc noklusējuma sakļauts (redzams skaits), bultiņa to atver. **pušo** nosūta komandu tai sesijai, kas ar repo strādāja.

Augšā ir sesija, kas pēdējā pabeidza darbu vai sāka tev ko jautāt. Sesija, kas vēl strādā, sarakstā nelēkā. Pie nosaukuma redzams **jautā tev** (Claude gaida tavu atbildi vai atļauju) vai **strādā**. Vaļā ir tikai sesija, kurā esi, un iepriekšējā, kurā biji (rakstīji vai atvēri no paneļa); pārējās sakļautas līdz vienai rindai. ▸ atver jebkuru, ▾ sakļauj; sakļauta šī vai iepriekšējā atveras pati, kolīdz sesija kaut ko pabeidz vai jautā. Punkts pie nosaukuma: mirgo dzeltens, kad Claude tev jautā; mirgo pelēks, kamēr sesija strādā; mirgo zils, kad ir kaut kas jauns, ko neesi redzējis; citādi tukšs aplītis kā sānjoslā.

### Ko vajag

- Claude Code aplikācija (macOS) ar modiem (function hooks), versija 2.1.288 vai jaunāka
- `python3` un `git`
- Neobligāti: [claude-mem](https://github.com/thedotmack/claude-mem). Tā kopsavilkumu kartīte rāda, kamēr sesijai vēl nav savu nākamo soļu

Pārbaudīts tikai uz macOS: panelis lasa aplikācijas sesiju failus `~/Library/Application Support/Claude`, failus atver ar `open`, paziņojumus rāda ar `osascript`.

### Uzstādīšana

1. Noklonē mapi, piemēram, uz `~/mods/valejie-darbi`.
2. Failā `~/.claude/settings.json` pieliec:

   ```json
   {
     "env": {
       "CLAUDE_CODE_PLUGIN_DIRS": "~/mods/valejie-darbi",
       "CLAUDE_CODE_PLUGIN_DIR_WATCH": "1"
     },
     "permissions": {
       "allow": ["mcp__ccd_session_mgmt__archive_session"]
     }
   }
   ```

   `CLAUDE_CODE_PLUGIN_DIR_WATCH` ļauj izmaiņām modā parādīties uzreiz, bez sesijas restarta. Atļauja `archive_session` vajadzīga arhivēšanas pogai: auto režīmā klasifikators citādi to atteic, jo pogas spiediens nav sarunā.
3. Atver jaunu sesiju. Panelis atveras pats. Ja aizver, atver ar `/darbi`.

### Pogas

| Poga | Ko dara |
|---|---|
| + augšā | Atver jaunas sesijas ekrānu (kreiso paneli nevajag) |
| Nosaukuma rinda | Klikšķis jebkurā vietā rindā atver sesiju. Kā sānjoslā fons ir tikai sesijai, kurā esi (ar treknu nosaukumu un krāsainu malu), un uzbraucot ar peli |
| N izdarīti šajā sesijā ▸ | Parāda šajā kārtā izdarītos tavus darbus |
| Balvas poga | Paņem balvu; dienas aplis turpina līdz nākamajai |
| ☐ / ☑ | Atzīmē tavu darbu kā izdarītu. Sesija to uzzina klusi ar tavu nākamo ziņu tur. Atzīmētais uzreiz pazūd no kartītes, un paziņojuma rindā minūti var nospiest **Atsaukt** |
| ➤ (uzbraucot ar peli) | Atver to sesiju un ieraksta tās ievades laukā atbildi, ko sesija pie darba sagatavojusi ("Pārskatīju …. Mans komentārs: "): pieraksti savus vārdus un nosūti, darbs atzīmējas izdarīts. Ja tev vajag palīdzību, tur ir "Palīdzi man …", un darbs pāriet Claude |
| ▷ | Nosūta promptu tajā sesijā (sesijā, kurā esi, iesniedz to kā tavu promptu). Nosūtītais uzreiz pazūd |
| ✕ pie prompta | Atmet promptu, un sesija to vairs neiesaka |
| + | Jauns darbs. Enter vai ✓ saglabā, ➤ uzreiz nosūta Claude. `c:` priekšā = tavs prompts, kas paliek, līdz to nosūti |
| ▾ / ▸ | Sakļauj kartīti līdz nosaukuma rindai vai atver to. Sakļautā atveras pati, kad sesija pabeidz darbu vai jautā |
| arhīva ikona sakļautā kartītē | Arhivē sesiju |
| Atvērt | Atver failu blakus sarunai vai saiti pārlūkā |
| pušo | Nosūta "pušo &lt;repo&gt;" atbildīgajai sesijai. Sesiju var nomainīt izvēlnē → |

Kartītes sakārtotas pēc tā, kad sesija pēdējo reizi pabeidza darbu vai sāka jautāt, ar datumiem (Šodien, Vakar, Pēdējās 7 dienas, Agrāk). Sesija, kurā esi, stāv savā vietā, izcelta kā aplikācijas sānjoslā.

### Komandas

- `/darbi` atver paneli.
- `/darbi padomi` ieslēdz vai izslēdz paskaidrojumus, uzbraucot ar peli.

### Iestatījumi

`~/.claude/settings.json`:

```json
{
  "pluginConfigs": {
    "valejie-darbi": {
      "options": {
        "valoda": "lv",
        "vards": "Edgars",
        "repoMapes": "~/Movies/projekts",
        "atvertAutomatiski": true,
        "radiPadomus": true,
        "zinotParAtskaitem": true,
        "platums": 60
      }
    }
  }
}
```

| Iestatījums | Ko nozīmē |
|---|---|
| `valoda` | `lv` vai `en`: panelis, padomi un nākamie soļi |
| `vards` | Kā sesijām tevi saukt ("Edgars izdarīja…"). Tukšs = "lietotājs" |
| `repoMapes` | Papildu mapes (ar komatiem), kurās meklēt git repo. Sesiju mapes tiek pārbaudītas vienmēr |
| `atvertAutomatiski` | Panelis atveras katrā jaunā sesijā |
| `radiPadomus` | Paskaidrojumi pie pogām |
| `zinotParAtskaitem` | macOS paziņojums ar skaņu, kad pienāk atskaite |
| `atzimetAutomatiski` | Pēc katra gājiena sesija atzīmē savus ☐ darbus, kas pēc sarunas jau izdarīti |
| `platums` | Cik rakstzīmju plats panelis atveras. Ja to pats pavelc, tavs izmērs uzvar |

### Kā tas strādā

- **Nākamie soļi:** pēc katra gājiena sesija pati sev uzdod īsu jautājumu (`$.model.fork`, kā next-steps). Tā redz visu sarunu no kešatmiņas, tāpēc tas maksā apmēram kā viena īsa atbilde tās sesijas modelī. Atbildē ir līdz 2 nākamajiem promptiem, līdz 2 jauniem darbiem tev (kopā vaļā ne vairāk par 3) un tavi ☐, kas jau izdarīti. Ārējas analīzes un citu sesiju sarunu lasīšanas vairs nav.
- **Laiks un josla:** gājiena sākumā ātrs modelis (haiku) no tava prompta novērtē minūtes un soļus. Gājiena beigās patiesais ilgums tiek pierakstīts, un nākamās aplēses koriģē pēc tā, cik reizes patiesība atšķīrās no aplēses pēdējos gājienos. Tāpēc josla kļūst precīzāka, jo vairāk strādā. Soļus un to, ko sesija dara tagad, panelis nolasa no sarunas faila.
- **Izdarītie automātiski:** tie paši, ko sesija pēc gājiena nosauc ("nosūtīju", darbs pabeigts, vairs nav aktuāls). Ja kļūdījās, atķeksē atpakaļ.
- **Dati** nāk no aplikācijas sesiju failiem (statuss, "gaida tevi"), dzīvo Claude procesu failiem `~/.claude/sessions` (strādā, pabeidza, jautā un kopš kura brīža) un claude-mem. Atjaunojas ik 30 sekundes, bet panelis pārzīmējas tikai tad, kad kaut kas mainījies: spiediens uz vecā zīmējuma pogu aplikācijā pazūd.
- **Atvērt:** sesija nosauc failus un saites no savas sarunas. https saiti atver pati aplikācija pārlūkā, mapi atver Finderī, failu atver failu panelī blakus sarunai (ja nevar, parāda to Finderī).
- **Stāvoklis** (atzīmes, nākamie soļi, atskaites) glabājas Claude Code spraudņa krātuvē un ir kopīgs visām sesijām.
- **Privātums:** viss notiek tavā datorā. Sarunas aiziet tikai uz modeli caur tavu Claude kontu, tāpat kā parastā sesijā.

### Darbi no malas

Ieliec moda mapē `.pievienot.json`, un nākamajā atjaunošanā panelis to paņems un izdzēsīs:

```json
[{ "sesija": "local_… vai sesijas nosaukums", "tev": ["Pārskati līgumu"], "claude": [{ "darbs": "Uzraksti testus", "prompts": "Uzraksti testus jaunajai funkcijai." }], "nonemt": ["Vecs darbs"] }]
```

`.komanda.json` ar `{ "tiritClaude": true }` notīra visus nākamos promptus. Sesijas uzrakstīs jaunus pēc sava nākamā gājiena.

### Ierobežojumi

- Nākamie soļi parādās pēc sesijas nākamā gājiena. Sesijai, kas kopš moda uzstādīšanas nav strādājusi, tie vēl nav.
- Ievades lauka platumu nosaka aplikācija, garāku to padarīt nevar. Garu tekstu ierakstīt var, lauks ritinās.
- Pogās der tikai teksts, tāpēc galvenes ikonas (Lucide) ir SVG ar neredzamu pogu virs tām. Terminālī tās ir teksta zīmes.
- Terminālī nav animāciju un peles virzīšanas: punkts nepulsē, ➤ redzams vienmēr.
- Testēts ar vienu lietotāju uz macOS.

### Testi

```bash
claude plugin test .
```

```bash
python3 -m unittest discover -s tests -p 'test_*.py'
```

---

## English

### What it does

You have 10 open sessions, and each one has something half done. The panel collects them into one list:

- **A working session** shows what it is doing now (a file, a command), how many steps it has taken and how long is left, with a bar. When Claude asks you something, you see the question or what it needs your permission for.
- **☐** are tasks only you can do: a decision, something to look at (a file, draft, artifact, page), sending from your own account, a call. When a session makes something for you to look at, there is always a "Review …" with Open. Tick them when done; ticked ones leave the card right away, with **Undo** in the message line for a minute.
- **▷** are up to 2 next prompts each session writes for itself after every turn, like [next-steps](https://github.com/anthropics/claude-plugins-community). Press ▷ and the prompt goes to that session, where Claude starts working. ✕ dismisses a prompt for good.
- **Reports** are what a session sends back after ▷. They arrive with a macOS notification and sound.
- **Not pushed** shows git repos with unpushed commits or changed files. Collapsed by default (the count shows), the chevron opens it. **push** sends the command to the session that worked on the repo.

The session that last finished its work or started asking you something is on top; a session that is still working does not jump around. Next to the title you see **asks you** (Claude waits for your answer or permission) or **working**. Only the session you are in and the previous one you were in stay open; the rest are collapsed to one row. ▸ opens any, ▾ collapses; a collapsed current or previous session opens by itself as soon as it finishes something or asks. A ring next to a session shows how many of your ☐ tasks in this round are done (prompts do not count); when all are done, the ring becomes a green checkmark and the card collapses. On top, today's result counts your tasks done across sessions, with a ring to the next reward: every 10 tasks a break, a coffee, a walk, then again. The dot by the title: blinks yellow when Claude asks you, gray while the session works, blue when there is something new you have not seen; otherwise an empty circle, as in the sidebar.

### Requirements

- Claude Code desktop app (macOS) with mods (function hooks), version 2.1.288 or newer
- `python3` and `git`
- Optional: [claude-mem](https://github.com/thedotmack/claude-mem). Its summary shows on a card until the session has next steps of its own

Tested on macOS only: the panel reads the app's session files in `~/Library/Application Support/Claude`, opens files with `open` and shows notifications with `osascript`.

### Install

1. Clone the folder, for example to `~/mods/valejie-darbi`.
2. Add to `~/.claude/settings.json`:

   ```json
   {
     "env": {
       "CLAUDE_CODE_PLUGIN_DIRS": "~/mods/valejie-darbi",
       "CLAUDE_CODE_PLUGIN_DIR_WATCH": "1"
     },
     "permissions": {
       "allow": ["mcp__ccd_session_mgmt__archive_session"]
     }
   }
   ```

   `CLAUDE_CODE_PLUGIN_DIR_WATCH` reloads the mod as soon as its files change. The `archive_session` permission is needed for the archive button: in auto mode the classifier otherwise refuses it, because a button press is not part of the conversation.
3. Open a new session. The panel opens by itself; if you close it, `/darbi` brings it back.

### Settings

Set `"valoda": "en"` in `pluginConfigs.valejie-darbi.options` (see the Latvian section above for the full list). `vards` is the name sessions call you by ("Anna did and checked…"); `repoMapes` adds folders to search for git repos.

### Commands

- `/darbi` opens the panel.
- `/darbi padomi` turns the hover hints on or off.

### How it works

- **Next steps:** after every turn a session asks itself a short question (`$.model.fork`, as next-steps does). It sees the whole conversation from the prompt cache, so it costs about one short reply in that session's model. The answer holds up to 2 next prompts, up to 2 new tasks for you (at most 3 open), and which of your ☐ tasks are done. There is no outside analysis and no reading of other sessions' transcripts.
- **Time and bar:** at the start of a turn a fast model (haiku) estimates minutes and steps from your prompt. At the end the real duration is recorded, and later estimates are corrected by how far reality was off in recent turns, so the bar gets more accurate the more you work. Steps and what the session is doing now come from its conversation file.
- **Done by itself:** the tasks the session names as done after its turn ("sent it", finished, no longer applies). If it got one wrong, untick it. Turn off with `atzimetAutomatiski: false`.
- **Data** comes from the app's session files (status, "waiting for you"), the live Claude process files in `~/.claude/sessions` (working, finished, asking, and since when) and claude-mem, refreshed every 30 seconds. The panel only redraws when something changed: a press on a button of an old drawing gets lost in the app.
- **Open:** the session names files and links from its own conversation. The app itself opens https links in your browser; folders open in Finder, files open in the file pane beside the conversation (or are revealed in Finder).
- **State** (ticks, next steps, reports) lives in the Claude Code plugin store and is shared by all sessions.
- **Privacy:** everything runs on your machine. Conversations only go to the model through your own Claude account, as in any session.

### Limits

- Next steps appear after a session's next turn. A session that has not worked since you installed the mod has none yet.
- The app sets the width of the input field; text longer than the field still fits, it scrolls.
- Buttons take text only, so the header icons (Lucide) are SVG with an invisible button on top. In the terminal they are text glyphs.
- The terminal has no animation or hover: the dot does not pulse and ➤ is always shown.
- Tested by one user on macOS.

### Tests

```bash
claude plugin test .
```

```bash
python3 -m unittest discover -s tests -p 'test_*.py'
```
