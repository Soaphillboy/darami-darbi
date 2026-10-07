# Darāmie darbi (To-dos) for Claude Code

Sānu panelis Claude Code aplikācijā, kas rāda visu tavu Claude sesiju iesāktos darbus vienuviet: kas gaida tevi, ko Claude var turpināt pats, kas nav nopušots.

A side panel for the Claude Code desktop app that shows the open work of all your Claude sessions in one place: what waits for you, what Claude can continue on its own, what is not pushed. [English below](#english).

---

## Latviski

### Ko tas dara

Tev ir 10 atvērtas sesijas, un katrā kaut kas palika pusē. Panelis tās savāc vienā sarakstā:

```
● creators.lv mājaslapa  +                              ↑  ↓  ✓
  Tev     ☐ Izlem, kuru domēnu pirkt                  Atvērt
          ☐ Pārskati jauno sākumlapas tekstu
  Claude  ▷ ✕  Izdzēs testa lapas
  14:02   Atskaite: testi iziet 76/76…                    ✕
```

- **Tev ☐** ir darbi, kas jādara tev pašam: lēmums, parole, melnraksta pārskatīšana. Atzīmē, kad izdarīts.
- **Claude ▷** ir darbi, ko Claude var izdarīt pats. Uzspied ▷, un darbs aiziet uz to sesiju, Claude sāk strādāt.
- **Atskaite** ir tas, ko sesija atsūta atpakaļ pēc ▷. Pienāk ar macOS paziņojumu un skaņu.
- **Nenopušots** rāda git repo ar nenopušotiem commitiem vai mainītiem failiem. **pušo** nosūta komandu tai sesijai, kas ar repo strādāja.

Darbus latviski uzraksta Sonnet no sesijas sarunas, [claude-mem](https://github.com/thedotmack/claude-mem) kopsavilkuma un aplikācijas statusa. Tavi neatzīmētie darbi paliek, līdz tu tos atzīmē. Jauna analīze tikai pieliek jaunus.

### Ko vajag

- Claude Code aplikācija (macOS) ar modiem (function hooks), versija 2.1.288 vai jaunāka
- `python3` un `git`
- Neobligāti: claude-mem, lai tālākie soļi būtu precīzāki

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

   `CLAUDE_CODE_PLUGIN_DIR_WATCH` ļauj izmaiņām modā parādīties uzreiz, bez sesijas restarta. Atļauja `archive_session` vajadzīga pogai 🗄: auto režīmā klasifikators citādi atteic arhivēšanu, jo pogas spiediens nav sarunā.
3. Atver jaunu sesiju. Panelis atveras pats. Ja aizver, atver ar `/darbi`.

### Pogas

| Poga | Ko dara |
|---|---|
| ☐ / ☑ | Atzīmē tavu darbu kā izdarītu. Sesija to uzzina klusi ar tavu nākamo ziņu tur |
| ➤ (uzbraucot ar peli) | Nodod tavu darbu Claude tajā sesijā |
| ▷ | Palaiž Claude darbu tajā sesijā |
| ✕ pie Claude darba | Atmet darbu, analīze to vairs nepiedāvā |
| ▷ Paziņot un turpināt | Parādās, kad visi tavi ☐ atzīmēti. Pasaka sesijai, kas izdarīts, un liek turpināt |
| + | Jauns darbs. Enter vai ✓ saglabā, ➤ uzreiz nosūta Claude. `c:` priekšā = Claude darbs |
| ↑ ↓ | Maina secību |
| ✓ | Gatavs, kartīte pāriet uz pabeigtajām |
| ↑ pabeigtajās | Atgriež kartīti sarakstā |
| 🗄 | Arhivē sesiju |
| Atvērt | Atver failu blakus sarunai vai saiti pārlūkā |
| pušo | Nosūta "pušo &lt;repo&gt;" atbildīgajai sesijai. Sesiju var nomainīt izvēlnē → |

Krāsainais punkts pulsē, kad kartītē ir kaut kas jauns.

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
        "zinotParAtskaitem": true
      }
    }
  }
}
```

| Iestatījums | Ko nozīmē |
|---|---|
| `valoda` | `lv` vai `en`: panelis, padomi un analīze |
| `vards` | Kā sesijām tevi saukt ("Edgars izdarīja…"). Tukšs = "lietotājs" |
| `repoMapes` | Papildu mapes (ar komatiem), kurās meklēt git repo. Sesiju mapes tiek pārbaudītas vienmēr |
| `atvertAutomatiski` | Panelis atveras katrā jaunā sesijā |
| `radiPadomus` | Paskaidrojumi pie pogām |
| `zinotParAtskaitem` | macOS paziņojums ar skaņu, kad pienāk atskaite |

### Kā tas strādā

- **Dati** nāk no aplikācijas sesiju failiem (statuss, "gaida tevi"), claude-mem datubāzes un sarunas pēdējās daļas. Atjaunojas ik 30 sekundes.
- **Analīze** iet caur tavu paša Claude sesiju ar Sonnet: ne vairāk kā 3 sesijas reizē, un no jauna tikai tad, ja sesijā kaut kas mainījies un tā 2 minūtes ir klusa. Tas tērē tokenus no tava Claude plāna.
- **Stāvoklis** (atzīmes, secība, atskaites) glabājas Claude Code spraudņa krātuvē un ir kopīgs visām sesijām.
- **Privātums:** viss notiek tavā datorā. Sarunu fragmenti aiziet tikai uz modeli caur tavu Claude kontu, tāpat kā parastā sesijā.

### Darbi no malas

Ieliec moda mapē `.pievienot.json`, un nākamajā atjaunošanā panelis to paņems un izdzēsīs:

```json
[{ "sesija": "local_… vai sesijas nosaukums", "tev": ["Pārskati līgumu"], "claude": [{ "darbs": "Uzraksti testus", "prompts": "Uzraksti testus jaunajai funkcijai." }], "nonemt": ["Vecs darbs"] }]
```

### Ierobežojumi

- Ievades lauka platumu nosaka aplikācija, garāku to padarīt nevar. Garu tekstu ierakstīt var, lauks ritinās.
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

- **You ☐** are tasks only you can do: a decision, a password, reviewing a draft. Tick them when done.
- **Claude ▷** are tasks Claude can do on its own. Press ▷ and the task goes to that session, where Claude starts working.
- **Reports** are what a session sends back after ▷. They arrive with a macOS notification and sound.
- **Not pushed** shows git repos with unpushed commits or changed files. **push** sends the command to the session that worked on the repo.

Sonnet writes the tasks from the session's conversation, the [claude-mem](https://github.com/thedotmack/claude-mem) summary and the app's own status. Your unticked tasks stay until you tick them; a new analysis only adds new ones.

### Requirements

- Claude Code desktop app (macOS) with mods (function hooks), version 2.1.288 or newer
- `python3` and `git`
- Optional: claude-mem for sharper next steps

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

   `CLAUDE_CODE_PLUGIN_DIR_WATCH` reloads the mod as soon as its files change. The `archive_session` permission is needed for the 🗄 button: in auto mode the classifier otherwise refuses archiving, because a button press is not part of the conversation.
3. Open a new session. The panel opens by itself; if you close it, `/darbi` brings it back.

### Settings

Set `"valoda": "en"` in `pluginConfigs.valejie-darbi.options` (see the Latvian section above for the full list). `vards` is the name sessions call you by ("Anna did and checked…"); `repoMapes` adds folders to search for git repos.

### Commands

- `/darbi` opens the panel.
- `/darbi padomi` turns the hover hints on or off.

### How it works

- **Data** comes from the app's session files (status, "waiting for you"), the claude-mem database and the tail of each conversation, refreshed every 30 seconds.
- **Analysis** runs through your own Claude session with Sonnet: at most 3 sessions at a time, and again only after a session changed and has been quiet for 2 minutes. It uses tokens from your Claude plan.
- **State** (ticks, order, reports) lives in the Claude Code plugin store and is shared by all sessions.
- **Privacy:** everything runs on your machine. Conversation excerpts only go to the model through your own Claude account, as in any session.

### Limits

- The app sets the width of the input field; text longer than the field still fits, it scrolls.
- The terminal has no animation or hover: the dot does not pulse and ➤ is always shown.
- Tested by one user on macOS.

### Tests

```bash
claude plugin test .
```

```bash
python3 -m unittest discover -s tests -p 'test_*.py'
```
