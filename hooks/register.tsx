import { atom, read, update } from 'claude-code'
import type { EngineInterface, Register, RenderElement } from 'claude-code'

import type {
  Analize,
  Atskaite,
  Atskaites,
  Analizes,
  Atzime,
  Atzimes,
  ClaudeDarbs,
  Izdariti,
  Repo,
  Sesija,
  TevDarbs,
  ValejieDati,
} from '../types'
import { ikonasSvg, KRASA, pulsaSvg, punktaSvg } from './ikonas'
import { TEKSTI } from './teksti'
import type { Teksti } from './teksti'
import type { Veids } from './ikonas'

const PANE = 'valejie-darbi'
const TUKSS: ValejieDati = { sesijas: [], repo: [], laiks: 0, kluda: '' }
const ATJAUNOT_MS = 30 * 1000
const STORE_ATZIMES = 'atzimes'
const STORE_ANALIZES = 'analizes3'
const STORE_IZDARITI = 'izdariti'
const STORE_SECIBA = 'seciba'
const STORE_ATSKAITES = 'atskaites'
// Sesijas, kurām nosūtīts ▷ un no kurām gaidām atskaiti: { sesijasId: kad nosūtīts }.
const STORE_GAIDA_ATSKAITI = 'gaidaAtskaiti'
// Repo, ko lietotājs paslēpa ar ✕: { ceļš: paraksts }; atgriežas, kad paraksts mainās.
const STORE_PASLEPTI_REPO = 'pasleptiRepo'
// Claude darbi, ko lietotājs atmeta ar ✕: { sesijasId: [darbs] }; analīze tos vairs nepiedāvā.
const STORE_ATMESTI = 'atmesti'
// Izdarītie ☐, ko vēl nepateicām tai sesijai: { sesijasId: [darbs] }; nāk līdzi lietotāja nākamajam promptam tur.
const STORE_PAZINOJUMI = 'pazinojumi'
// Visi lietotāja atzīmētie darbi pa sesijām (pēdējie 30): analīze tos vairs nepiedāvā.
const STORE_VESTURE = 'izdaritiVesture'
// Ko lietotājs kartītē jau redzēja: { sesijasId: paraksts }; ja paraksts mainās, punkts pulsē.
const STORE_REDZETI = 'redzeti'
// "▷ Paziņot un turpināt": { sesijasId: kuri ☐ darbi tika paziņoti }; tas pats saraksts otrreiz netiek piedāvāts.
const STORE_PAZINOTS = 'pazinots'
// lietotāja izvēlētā sesija repo "pušo" komandai, ja automātiskā ir nepareiza: { repoCeļš: sesijasId }.
const STORE_REPO_SESIJAS = 'repoSesijas'
// /darbi padomi: vai rādīt padomus (pārspēj iestatījumu "radiPadomus").
const STORE_PADOMI = 'padomi'
// ✓ paslēpj sesiju; tā atgriežas tikai tad, ja tajā kaut kas notiek vēlāk par šo laiku pēc atzīmes.
const GATAVS_PECAK_MS = 10 * 60 * 1000
// Cik sesijas analizēt automātiski vienā atjaunošanā; cik ilgi citas sesijas neaiztiek analīzi, ko kāda jau veido;
// cik ilgi sesijai jābūt klusai, pirms to analizē no jauna (lai aktīvu sesiju nepārbauda ik 30 s).
const AUTO_ANALIZES = 3
const SLEDZENE_MS = 3 * 60 * 1000
const KLUSUMS_MS = 2 * 60 * 1000

// Valoda un lietotāja vārds no iestatījumiem; register() tos ieliek pirms visa cita.
let t: Teksti = TEKSTI.lv
let vards = ''
let radiPadomusNoklusejums = true
// Papildu mapes nenopušotu repo meklēšanai (komatiem atdalītas); tukšs = tikai sesiju mapes.
let repoMapes = ''

const dati = atom({ plugin: 'valejie-darbi', key: 'dati' } as const, TUKSS)
const atzimes = atom({ plugin: 'valejie-darbi', key: 'atzimes' } as const, {} as Atzimes)
const analizes = atom({ plugin: 'valejie-darbi', key: 'analizes' } as const, {} as Analizes)
const izdariti = atom({ plugin: 'valejie-darbi', key: 'izdariti' } as const, {} as Izdariti)
const atskaites = atom({ plugin: 'valejie-darbi', key: 'atskaites' } as const, {} as Atskaites)
const pasleptiRepo = atom({ plugin: 'valejie-darbi', key: 'pasleptiRepo' } as const, {} as Record<string, string>)
// Palielinās pēc katra ievadītā darba: ievades lauki uzzīmējas no jauna un tukši.
const ievadesSkaits = atom({ plugin: 'valejie-darbi', key: 'ievadesSkaits' } as const, 0)
// Ko lietotājs pašlaik raksta katras kartītes ievades laukā (lai ✓ un ➤ zina tekstu); tikai šai sesijai.
const redzeti = atom({ plugin: 'valejie-darbi', key: 'redzeti' } as const, {} as Record<string, string>)
const pazinots = atom({ plugin: 'valejie-darbi', key: 'pazinots' } as const, {} as Record<string, string>)
const radiPadomus = atom({ plugin: 'valejie-darbi', key: 'radiPadomus' } as const, true)
const repoSesijas = atom({ plugin: 'valejie-darbi', key: 'repoSesijas' } as const, {} as Record<string, string>)
const ievadesTeksts = atom({ plugin: 'valejie-darbi', key: 'ievadesTeksts' } as const, {} as Record<string, string>)
const parbauda = atom({ plugin: 'valejie-darbi', key: 'parbauda' } as const, [] as string[])
// Izvērsto darbu atslēgas (pilnais teksts vairākās rindās); tikai šai sesijai, netiek glabāts.
const izversti = atom({ plugin: 'valejie-darbi', key: 'izversti' } as const, [] as string[])
// lietotāja noteiktā kartīšu secība (↑ ↓), sesiju ID; kopīga visām sesijām caur krātuvi.
const seciba = atom({ plugin: 'valejie-darbi', key: 'seciba' } as const, [] as string[])
const radiPabeigtas = atom({ plugin: 'valejie-darbi', key: 'radiPabeigtas' } as const, false)
const zinja = atom({ plugin: 'valejie-darbi', key: 'zinja' } as const, '')

// Kartītes galvenes pogas: viena zīme katrai.
const IKONA = { augsa: '↑', leja: '↓', gatavs: '✓', atgriezt: '↑', arhivet: '🗄', pievienot: '+', sutit: '➤' }
// "Tev" / "Claude" kolonnas platums rūtiņās, lai visi ķeksīši stāv vienā līnijā.
const ETIKETES_PLATUMS = 7

// Aplikācijas sesiju rīki, ko mods izsauc tikai no lietotāja pogas spiediena panelī.
const POGU_RIKI = new Set([
  'mcp__ccd_session_mgmt__archive_session',
  'mcp__ccd_session_mgmt__send_message',
  'mcp__ccd_view__show_pane',
])

// Aplikācijas statusi, kas nozīmē "nekas negaida"; viss pārējais (blocked, review_ready, ...) gaida lietotāju.
const MIERIGI = new Set(['completed', 'nav'])

type Grupa = 'gaida' | 'turpinat' | 'bez' | 'pabeigtas'
type Grupas = Record<Grupa, Sesija[]>

// Izdarīto atslēgas krātuvē (ne pogu atslēgas: aplikācija pogu atslēgās pieļauj tikai ASCII, tāpēc tur ir numurs).
const tevAtslega = (s: Sesija, d: TevDarbs) => `${s.id}|t|${d.darbs}`
const claudeAtslega = (s: Sesija, d: ClaudeDarbs) => `${s.id}|c|${d.darbs}`

/** Kuri ☐ darbi kartītē atzīmēti (paraksts "▷ Paziņot un turpināt" pogai). */
function tevParaksts(r: Analize): string {
  return JSON.stringify(r.tev.map(d => d.darbs).sort())
}

function grupa(s: Sesija, a: Atzimes, an: Analizes, iz: Izdariti, at: Atskaites, paz: Record<string, string>): Grupa {
  const atz = a[s.id]
  if (atz?.veids === 'gatavs' && s.last <= (atz.kad ?? atz.last) + GATAVS_PECAK_MS) return 'pabeigtas'
  const r = an[s.id]?.isGatava ? an[s.id] : undefined
  const atvertiTev = r ? r.tev.filter(d => iz[tevAtslega(s, d)] === undefined).length : 0
  const atvertiClaude = r ? r.claude.filter(d => iz[claudeAtslega(s, d)] === undefined).length : 0
  // Atsūtīta atskaite gaida, lai to izlasi: kartīte paliek redzama, līdz to aizver (✕ vai ✓).
  if (at[s.id]) return atvertiTev === 0 && atvertiClaude > 0 ? 'turpinat' : 'gaida'
  // ↑ no pabeigtajām: kartīte atpakaļ sarakstā, līdz ✓.
  if (atz?.veids === 'turpinat') return atvertiTev > 0 ? 'gaida' : 'turpinat'
  // Kartīte paliek savā grupā, kamēr kāds darbs vēl nav izdarīts (atsevišķs ķeksis to nepārbīda); kad visi ☐
  // atzīmēti, tā gaida "▷ Paziņot un turpināt" (vai ✓); kad viss izdarīts un paziņots, pāriet uz pabeigtajām.
  if (r) {
    const isNepazinots = r.tev.length > 0 && atvertiTev === 0 && paz[s.id] !== tevParaksts(r)
    if (isNepazinots) return 'gaida'
    if (r.tev.length + r.claude.length > 0 && atvertiTev + atvertiClaude === 0) return 'pabeigtas'
    if (r.tev.length > 0) return 'gaida'
    if (r.claude.length > 0) return 'turpinat'
    return 'pabeigtas'
  }
  if (!MIERIGI.has(s.status) || s.needs.trim() !== '') return 'gaida'
  if (s.nakamie !== '') return 'turpinat'
  return s.status === 'nav' ? 'bez' : 'pabeigtas'
}

/** Kartītes satura paraksts (darbi, atskaite, statuss), lai pamanītu izmaiņas, ko lietotājs vēl nav redzējis. */
function paraksts(s: Sesija, an: Analizes, at: Atskaites): string {
  const r = an[s.id]?.isGatava ? an[s.id] : undefined
  return JSON.stringify([s.status, r?.tev.map(d => d.darbs) ?? [], r?.claude.map(d => d.darbs) ?? [], at[s.id]?.laiks ?? 0])
}

/** Vai divi darbi ir viens un tas pats (modelis to pašu mēdz uzrakstīt nedaudz citādi). */
function lidzigs(x: string, y: string): boolean {
  const n = (t: string) => t.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
  const a = n(x)
  const b = n(y)
  return a === b || a.startsWith(b.slice(0, 24)) || b.startsWith(a.slice(0, 24))
}

function grupet(
  sesijas: Sesija[],
  a: Atzimes,
  an: Analizes,
  iz: Izdariti,
  at: Atskaites,
  paz: Record<string, string>,
  sec: readonly string[],
): Grupas {
  const g: Grupas = { gaida: [], turpinat: [], bez: [], pabeigtas: [] }
  for (const s of sesijas) g[grupa(s, a, an, iz, at, paz)].push(s)
  // lietotāja secība (↑ ↓) pirmā; jaunās sesijas aiz tām, svaigākās augšā (dati.py jau tā sakārto).
  const vieta = new Map(sec.map((id, i) => [id, i]))
  for (const saraksts of Object.values(g)) {
    saraksts.sort((x, y) => (vieta.get(x.id) ?? Infinity) - (vieta.get(y.id) ?? Infinity))
  }
  return g
}

function isis(text: string, max: number): string {
  const vienaRinda = text.replace(/\s+/g, ' ').trim()
  return vienaRinda.length > max ? `${vienaRinda.slice(0, max - 1)}…` : vienaRinda
}

function laiks(ms: number): string {
  if (!ms) return ''
  const d = new Date(ms)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}

function repoTeksts(r: Repo): string {
  const dalas = []
  if (r.ahead) dalas.push(t.repoCommiti(r.ahead))
  if (r.dirty) dalas.push(t.repoFaili(r.dirty))
  return `${r.nosaukums}: ${dalas.join(', ')}`
}

/** Modeļa JSON atbilde → tīri, īsi darbi; nesaprotama atbilde = null. */
function parsetAnalizi(text: string): Pick<Analize, 'tev' | 'claude' | 'isPabeigts'> | null {
  const sakums = text.indexOf('{')
  const beigas = text.lastIndexOf('}')
  if (sakums < 0 || beigas <= sakums) return null
  try {
    const j = JSON.parse(text.slice(sakums, beigas + 1)) as {
      tev?: { darbs?: unknown; sikak?: unknown; atvert?: unknown }[]
      claude?: { darbs?: unknown; prompts?: unknown }[]
      pabeigts?: unknown
    }
    const tev = (Array.isArray(j.tev) ? j.tev : [])
      .filter(d => typeof d?.darbs === 'string' && d.darbs.trim() !== '')
      .slice(0, 2)
      .map(d => ({
        darbs: isis(String(d.darbs), 100),
        sikak: typeof d.sikak === 'string' ? d.sikak.trim().slice(0, 500) : '',
        atvert: typeof d.atvert === 'string' ? d.atvert.trim() : '',
      }))
    const claude = (Array.isArray(j.claude) ? j.claude : [])
      .filter(d => typeof d?.darbs === 'string' && typeof d?.prompts === 'string' && d.prompts.trim() !== '')
      .slice(0, 1)
      .map(d => ({ darbs: isis(String(d.darbs), 100), prompts: String(d.prompts).trim().slice(0, 400) }))
    return { tev, claude, isPabeigts: j.pabeigts === true }
  } catch {
    return null
  }
}

/** Atstāj tikai https saites un failus, kas tiešām eksistē (relatīvos ceļus sasien ar sesijas mapi). */
async function parbauditAtvert($: EngineInterface, s: Sesija, atvert: string): Promise<string> {
  if (atvert === '') return ''
  if (/^https:\/\//.test(atvert)) return atvert
  const cels = atvert.startsWith('/') ? atvert : s.cwd ? `${s.cwd}/${atvert.replace(/^\.\//, '')}` : ''
  if (cels === '') return ''
  try {
    return (await $.fs.exists(cels)) ? cels : ''
  } catch {
    return ''
  }
}

async function lasitStore<T>($: EngineInterface, key: string): Promise<T | undefined> {
  return (await $.store.get(key)) as T | undefined
}

type RiksAtbilde = { isOk: boolean; teksts: string; ieraksts: unknown }

/**
 * Izsauc aplikācijas rīku (arhivēt, nosūtīt ziņu citai sesijai, atvērt failu panelī). Vispirms tieši caur MCP
 * serveri, jo tad rīkam nav jābūt ielādētam šajā sesijā; ja tas neiet, caur parasto rīka izsaukumu.
 */
async function ccdRiks(
  $: EngineInterface,
  serveris: 'ccd_session_mgmt' | 'ccd_view',
  riks: string,
  args: Record<string, unknown>,
): Promise<RiksAtbilde> {
  let mcpKluda = ''
  try {
    const r = await $.mcp.call(serveris, riks, args)
    const teksts = r.content.map(b => ('text' in b && typeof b.text === 'string' ? b.text : '')).join('\n')
    return { isOk: !r.isError, teksts, ieraksts: { cels: 'mcp', ...r } }
  } catch (err) {
    mcpKluda = String(err)
  }
  try {
    const r = (await $.tool.call({ tool: `mcp__${serveris}__${riks}`, ...args } as never)) as {
      deny?: string
      isError?: boolean
      text?: string
    }
    if (r.deny !== undefined) return { isOk: false, teksts: r.deny, ieraksts: { cels: 'tool', mcpKluda, ...r } }
    return { isOk: !r.isError, teksts: r.text ?? '', ieraksts: { cels: 'tool', mcpKluda, ...r } }
  } catch (err) {
    return { isOk: false, teksts: `${mcpKluda}; ${String(err)}`, ieraksts: { mcpKluda, toolKluda: String(err) } }
  }
}

async function atjaunot($: EngineInterface): Promise<void> {
  const sis = await $.session.id()
  const r = await $.process.run(['python3', `${$.plugin.root}/hooks/dati.py`, sis, repoMapes])
  const now = await $.clock.now()
  if (r.exitCode !== 0) {
    await update($, dati, d => ({ ...d, kluda: isis(r.stderr, 300), laiks: now }))
    return
  }
  const j = JSON.parse(r.stdout) as Pick<ValejieDati, 'sesijas' | 'repo'>
  await update($, dati, () => ({ sesijas: j.sesijas, repo: j.repo, laiks: now, kluda: '' }))

  // Analīzes, atzīmes un ķeksīši var būt mainīti citā sesijā: paņem kopīgo stāvokli no krātuves.
  await pievienotNoFaila($, j.sesijas)
  const an = (await lasitStore<Analizes>($, STORE_ANALIZES)) ?? {}
  const a = (await lasitStore<Atzimes>($, STORE_ATZIMES)) ?? {}
  const iz = (await lasitStore<Izdariti>($, STORE_IZDARITI)) ?? {}
  const sec = (await lasitStore<string[]>($, STORE_SECIBA)) ?? []
  const at = await iztiritAtskaites($, (await lasitStore<Atskaites>($, STORE_ATSKAITES)) ?? {}, an)
  const paslepti = (await lasitStore<Record<string, string>>($, STORE_PASLEPTI_REPO)) ?? {}
  await update($, seciba, () => sec)
  await update($, atskaites, () => at)
  await update($, pasleptiRepo, () => paslepti)
  await update($, analizes, () => an)
  await update($, atzimes, () => a)
  await update($, izdariti, () => iz)

  // Sesijas, kuras redzam pirmo reizi, skaitās jau redzētas: pulsē tikai tas, kas mainās pēc tam.
  const red = (await lasitStore<Record<string, string>>($, STORE_REDZETI)) ?? {}
  const jaunas = j.sesijas.filter(s => red[s.id] === undefined)
  if (jaunas.length > 0) {
    for (const s of jaunas) red[s.id] = paraksts(s, an, at)
    await $.store.set(STORE_REDZETI, red)
  }
  await update($, redzeti, () => red)

  const paz = (await lasitStore<Record<string, string>>($, STORE_PAZINOTS)) ?? {}
  await update($, pazinots, () => paz)
  const repoIzvele = (await lasitStore<Record<string, string>>($, STORE_REPO_SESIJAS)) ?? {}
  await update($, repoSesijas, () => repoIzvele)
  const padomi = (await lasitStore<boolean>($, STORE_PADOMI)) ?? radiPadomusNoklusejums
  await update($, radiPadomus, () => padomi)
  const g = grupet(j.sesijas, a, an, iz, at, paz, sec)
  void autoAnalize($, [...g.gaida, ...g.turpinat], now)

  const dalas = []
  if (g.gaida.length) dalas.push(t.statussGaida(g.gaida.length))
  if (g.turpinat.length) dalas.push(t.statussTurpinat(g.turpinat.length))
  const redzamieRepo = j.repo.filter(r => paslepti[r.cels] !== r.sig)
  if (redzamieRepo.length) dalas.push(t.statussNenopusoti(redzamieRepo.length))
  $.ui.status(dalas.length ? `${t.statuss}: ${dalas.join(' · ')} (/darbi)` : undefined)
}

/** Nolasa sesijas kontekstu, pajautā modelim nākamos darbus un saglabā kopīgajā krātuvē visām sesijām. */
async function analizet($: EngineInterface, s: Sesija, isPiespiedu: boolean): Promise<void> {
  if (!s.cli) return
  const now = await $.clock.now()
  const esosa = ((await lasitStore<Analizes>($, STORE_ANALIZES)) ?? {})[s.id]
  const kadSakta = esosa?.veido ?? (esosa && !esosa.isGatava ? esosa.sakts : undefined)
  if (kadSakta !== undefined && now - kadSakta < SLEDZENE_MS) return
  if (!isPiespiedu && esosa?.isGatava && esosa.last >= s.last) return

  // Kamēr top jaunā analīze, vecie darbi paliek redzami (slēdzene ir tikai `veido`).
  const sledzene: Analize = esosa?.isGatava
    ? { ...esosa, veido: now }
    : { last: 0, sakts: now, isGatava: false, tev: [], claude: [], isPabeigts: false, veido: now }
  await $.store.set(STORE_ANALIZES, { ...((await lasitStore<Analizes>($, STORE_ANALIZES)) ?? {}), [s.id]: sledzene })
  const iz = (await lasitStore<Izdariti>($, STORE_IZDARITI)) ?? {}
  const vecie = esosa?.isGatava ? esosa.tev : []
  const atvertie = vecie.filter(d => iz[tevAtslega(s, d)] === undefined)
  const vesture = ((await lasitStore<Record<string, string[]>>($, STORE_VESTURE)) ?? {})[s.id] ?? []
  const vecieClaude = esosa?.isGatava ? esosa.claude : []
  const atvertieClaude = vecieClaude.filter(d => iz[claudeAtslega(s, d)] === undefined)
  await update($, parbauda, ids => [...ids.filter(id => id !== s.id), s.id])
  try {
    const ctx = await $.process.run(['python3', `${$.plugin.root}/hooks/konteksts.py`, s.cli])
    const prompt = [
      t.promptsSesija(s.title),
      t.promptsMape(s.cwd),
      t.promptsStatuss(s.status, s.detail),
      s.needs ? t.promptsGaida(s.needs) : '',
      atvertie.length > 0 ? `${t.promptsTevEsosie}\n${atvertie.map(d => `- ${d.darbs}`).join('\n')}` : '',
      atvertieClaude.length > 0 ? `${t.promptsClaudeEsosie}\n${atvertieClaude.map(d => `- ${d.darbs}`).join('\n')}` : '',
      vesture.length > 0 ? `${t.promptsVesture}\n${vesture.map(d => `- ${d}`).join('\n')}` : '',
      '',
      ctx.stdout,
    ].join('\n')
    const r = await $.model.complete({ model: 'sonnet', system: t.sistema(vards), prompt, maxTokens: 600, timeoutMs: 90_000 })
    const parsets = r.isAnswered ? parsetAnalizi(r.text) : null
    const visas = (await lasitStore<Analizes>($, STORE_ANALIZES)) ?? {}
    if (parsets) {
      const jauni = parsets.tev.filter(
        n => !vecie.some(v => lidzigs(v.darbs, n.darbs)) && !vesture.some(v => lidzigs(v, n.darbs)),
      )
      const parbauditi = await Promise.all(jauni.map(async d => ({ ...d, atvert: await parbauditAtvert($, s, d.atvert) })))
      // Neatzīmētie ☐ un nepalaistie ▷ paliek, līdz lietotājs tos atzīmē vai palaiž; jaunie nāk klāt.
      const tev = [...atvertie, ...parbauditi].slice(0, 6)
      const atmesti = ((await lasitStore<Record<string, string[]>>($, STORE_ATMESTI)) ?? {})[s.id] ?? []
      // Sesija vēl strādā pie ▷ uzdevuma (atskaite nav atnākusi): jaunus Claude darbus tai nepiedāvā.
      const isStrada = ((await lasitStore<Record<string, number>>($, STORE_GAIDA_ATSKAITI)) ?? {})[s.id] !== undefined
      const claude = [
        ...atvertieClaude,
        ...(isStrada
          ? []
          : parsets.claude.filter(
              n => !vecieClaude.some(v => lidzigs(v.darbs, n.darbs)) && !atmesti.some(x => lidzigs(x, n.darbs)),
            )),
      ].slice(0, 4)
      visas[s.id] = {
        last: s.last,
        sakts: now,
        isGatava: true,
        tev,
        claude,
        isPabeigts: parsets.isPabeigts && tev.length + claude.length === 0,
      }
    } else {
      if (esosa?.isGatava) visas[s.id] = { ...esosa, veido: undefined }
      else delete visas[s.id]
      const iemesls = r.isAnswered ? t.nesaprotamaAtbilde : r.reason
      await update($, zinja, () => t.neizdevasParbaudit(isis(s.title, 40), iemesls))
    }
    await $.store.set(STORE_ANALIZES, visas)
    await update($, analizes, () => visas)
  } finally {
    await update($, parbauda, ids => ids.filter(id => id !== s.id))
  }
}

let isAutoSkrien = false

async function autoAnalize($: EngineInterface, sesijas: Sesija[], now: number): Promise<void> {
  if (isAutoSkrien) return
  isAutoSkrien = true
  try {
    const visas = (await lasitStore<Analizes>($, STORE_ANALIZES)) ?? {}
    const vajag = sesijas.filter(s => {
      if (s.sis || !s.cli) return false
      const r = visas[s.id]
      if (r?.isGatava && r.last >= s.last) return false
      // Jau analizētu sesiju pārbauda no jauna tikai tad, kad tajā kādu brīdi nekas nenotiek.
      return !r || now - s.last >= KLUSUMS_MS
    })
    for (const s of vajag.slice(0, AUTO_ANALIZES)) await analizet($, s, false)
  } finally {
    isAutoSkrien = false
  }
}

// Panelis var būt atvērts vairākās sesijās, katrā sava līdz 30 s veca kopija. Tāpēc katra izmaiņa nolasa svaigo
// krātuvi un pieliek tikai savu ierakstu, citādi viena sesija ar veco kopiju pārrakstītu citas sesijas atzīmes.
async function atzimet($: EngineInterface, s: Sesija, atz: Atzime | undefined): Promise<void> {
  const { [s.id]: _vecais, ...citas } = (await lasitStore<Atzimes>($, STORE_ATZIMES)) ?? {}
  const nakamas = atz ? { ...citas, [s.id]: atz } : citas
  await $.store.set(STORE_ATZIMES, nakamas)
  await update($, atzimes, () => nakamas)
}

async function parslegtIzdaritu($: EngineInterface, atslega: string, isIzdarits: boolean): Promise<void> {
  const now = await $.clock.now()
  const { [atslega]: _vecais, ...citi } = (await lasitStore<Izdariti>($, STORE_IZDARITI)) ?? {}
  const nakamie = isIzdarits ? { ...citi, [atslega]: now } : citi
  await $.store.set(STORE_IZDARITI, nakamie)
  await update($, izdariti, () => nakamie)
  // Tavs ☐ (ne Claude ▷): sesijai klusa piezīme ar nākamo promptu un ieraksts atmiņā.
  const dalas = atslega.split('|t|')
  if (dalas.length !== 2) return
  const [sesijasId, darbs] = dalas as [string, string]
  const mainit = async (key: string, cik: number) => {
    const visi = (await lasitStore<Record<string, string[]>>($, key)) ?? {}
    const bez = (visi[sesijasId] ?? []).filter(x => x !== darbs)
    await $.store.set(key, { ...visi, [sesijasId]: isIzdarits ? [...bez, darbs].slice(-cik) : bez })
  }
  await mainit(STORE_PAZINOJUMI, 20)
  await mainit(STORE_VESTURE, 30)
}

/**
 * Agrākā versija par "atskaiti" saglabāja arī pašu ▷ uzdevumu, kas pienāca mērķa sesijā. Tos atpazīst pēc tā, ka
 * teksts sakrīt ar kāda Claude darba promptu, un izmet.
 */
async function iztiritAtskaites($: EngineInterface, at: Atskaites, an: Analizes): Promise<Atskaites> {
  const prompti = Object.values(an).flatMap(r => r.claude.map(c => c.prompts.trim()))
  const liekas = Object.keys(at).filter(id => prompti.includes((at[id]?.teksts ?? '').trim()))
  if (liekas.length === 0) return at
  const tiras = Object.fromEntries(Object.entries(at).filter(([id]) => !liekas.includes(id)))
  await $.store.set(STORE_ATSKAITES, tiras)
  return tiras
}

/**
 * `.pievienot.json` mapē: darbi, ko Claude (vai lietotājs) pieliek kartītei no ārpuses, piemēram, atjaunojot pazudušu
 * čeklistu. Formāts: [{ "sesija": "local_… vai nosaukums", "tev": ["…"], "claude": [{ "darbs": "…", "prompts": "…" }],
 * "nonemt": ["…"], "nonemtAtskaiti": true }] (`nonemt` izņem darbus ar šādu tekstu, `nonemtAtskaiti` izmet atskaiti).
 * Pēc ielādes fails tiek izdzēsts.
 */
type Pievienojamie = { tev?: string[]; claude?: { darbs?: string; prompts?: string }[]; nonemt?: string[] }

/**
 * Pieliek (vai noņem) darbus sesijas kartītē: lietotājs no ievades lauka vai `.pievienot.json`. Pieliktie ir parasti
 * neatzīmēti darbi, tāpēc paliek arī pēc nākamās analīzes.
 */
async function pievienotDarbus($: EngineInterface, s: Sesija, p: Pievienojamie): Promise<void> {
  const visas = (await lasitStore<Analizes>($, STORE_ANALIZES)) ?? {}
  const veca = visas[s.id]?.isGatava ? (visas[s.id] as Analize) : undefined
  // Tikai noņemt, bet nav no kā: neveido tukšu analīzi, kas aizstātu īsto.
  if (!veca && !p.tev?.length && !p.claude?.length) return
  const tev = [...(veca?.tev ?? [])]
  for (const darbs of p.tev ?? []) {
    if (typeof darbs === 'string' && darbs.trim() && !tev.some(x => lidzigs(x.darbs, darbs))) {
      // lietotāja paša teksts paliek pilns (pogā rāda saīsinātu, izvēršot visu).
      tev.push({ darbs: darbs.trim().slice(0, 2000), sikak: '', atvert: '' })
    }
  }
  const claude = [...(veca?.claude ?? [])]
  for (const c of p.claude ?? []) {
    if (typeof c?.darbs === 'string' && typeof c.prompts === 'string' && !claude.some(x => lidzigs(x.darbs, c.darbs as string))) {
      claude.push({ darbs: c.darbs.trim().slice(0, 2000), prompts: c.prompts.slice(0, 2000) })
    }
  }
  const nonemt = (p.nonemt ?? []).filter((x): x is string => typeof x === 'string')
  const paliek = (darbs: string) => !nonemt.some(n => lidzigs(n, darbs))
  visas[s.id] = {
    // Bez iepriekšējas analīzes: last 0, lai sesiju tik un tā izanalizē (pieliktie darbi paliek).
    last: veca?.last ?? 0,
    sakts: await $.clock.now(),
    isGatava: true,
    tev: tev.filter(x => paliek(x.darbs)),
    claude: claude.filter(c => paliek(c.darbs)),
    isPabeigts: false,
  }
  await $.store.set(STORE_ANALIZES, visas)
  await update($, analizes, () => visas)
}

/**
 * `.pievienot.json` mapē: darbi, ko Claude pieliek kartītei no ārpuses, piemēram, atjaunojot pazudušu čeklistu.
 * Formāts: [{ "sesija": "local_… vai nosaukums", "tev": ["…"], "claude": [{ "darbs": "…", "prompts": "…" }],
 * "nonemt": ["…"], "nonemtAtskaiti": true }]. Pēc ielādes fails tiek izdzēsts.
 */
async function pievienotNoFaila($: EngineInterface, sesijas: readonly Sesija[]): Promise<void> {
  const cels = `${$.plugin.root}/.pievienot.json`
  if (!(await $.fs.exists(cels))) return
  let ieraksti: (Pievienojamie & { sesija?: string; nonemtAtskaiti?: boolean; raditPaslepto?: boolean })[] = []
  try {
    ieraksti = JSON.parse(await $.fs.read(cels)) as typeof ieraksti
  } catch {
    ieraksti = []
  }
  for (const ier of Array.isArray(ieraksti) ? ieraksti : []) {
    if (ier.raditPaslepto) await $.store.set(STORE_PASLEPTI_REPO, {})
    const s = sesijas.find(x => x.id === ier.sesija) ?? sesijas.find(x => x.title === ier.sesija)
    if (!s) continue
    if (ier.nonemtAtskaiti) await saglabatAtskaiti($, s.id, undefined)
    await pievienotDarbus($, s, ier)
  }
  await $.process.run(['/bin/rm', '-f', cels])
}

/**
 * Atskaite pienāca: macOS paziņojums ar skaņu (redzams, lai kura sesija vai programma ir priekšā; atskaiti
 * saņem tikai viena sesija, tāpēc tas atskan vienreiz) un aplikācijas paziņojums. Teksts iet kā argv, ne skripta
 * iekšā, lai pēdiņas tekstā neko nesalauztu.
 */
async function zinotParAtskaiti($: EngineInterface, nosaukums: string, teksts: string): Promise<void> {
  const pirma = isis(teksts.split('\n').find(x => x.trim() !== '') ?? teksts, 160)
  $.ui.toast(isis(t.atskaiteNo(nosaukums, pirma), 160), { timeoutMs: 8000 })
  await $.process.run([
    'osascript',
    '-e',
    'on run argv',
    '-e',
    'display notification (item 1 of argv) with title (item 3 of argv) subtitle (item 2 of argv) sound name "Glass"',
    '-e',
    'end run',
    pirma,
    t.atskaitesApaksvirsraksts(nosaukums),
    t.panelis,
  ])
}

/** ✕ pie Claude darba: izņem to no kartītes un atceras, lai nākamā analīze to nepiedāvā vēlreiz. */
async function atmestClaude($: EngineInterface, s: Sesija, c: ClaudeDarbs): Promise<void> {
  const visas = (await lasitStore<Analizes>($, STORE_ANALIZES)) ?? {}
  const r = visas[s.id]
  if (r) visas[s.id] = { ...r, claude: r.claude.filter(x => x.darbs !== c.darbs) }
  await $.store.set(STORE_ANALIZES, visas)
  await update($, analizes, () => visas)
  const atmesti = (await lasitStore<Record<string, string[]>>($, STORE_ATMESTI)) ?? {}
  await $.store.set(STORE_ATMESTI, { ...atmesti, [s.id]: [...(atmesti[s.id] ?? []), c.darbs].slice(-20) })
}

async function saglabatAtskaiti($: EngineInterface, sesijasId: string, atskaite: Atskaite | undefined): Promise<void> {
  const { [sesijasId]: _veca, ...citas } = (await lasitStore<Atskaites>($, STORE_ATSKAITES)) ?? {}
  const nakamas = atskaite ? { ...citas, [sesijasId]: atskaite } : citas
  await $.store.set(STORE_ATSKAITES, nakamas)
  await update($, atskaites, () => nakamas)
}

/** Ziņa no citas sesijas → sūtītājas ID un tīrs teksts; null, ja sūtītāju nevar noteikt. */
function parsetAtskaiti(text: string, sesijas: readonly Sesija[]): { id: string; teksts: string } | null {
  const iekšā = /<cross-session-message\b([^>]*)>([\s\S]*?)<\/cross-session-message>/.exec(text)
  const atribūti = iekšā?.[1] ?? ''
  const teksts = (iekšā?.[2] ?? text).trim()
  const no = /from="(local_[^"]+)"/.exec(atribūti)?.[1]
  if (no) return { id: no, teksts }
  const vards = /name="([^"]+)"/.exec(atribūti)?.[1]
  const pec = vards ? sesijas.find(s => s.title === vards) : undefined
  return pec ? { id: pec.id, teksts } : null
}

/** Pārvieto kartīti grupā par vienu vietu augšup vai lejup; saglabā kopējo secību. */
async function parvietot($: EngineInterface, grupa: readonly string[], id: string, virziens: -1 | 1): Promise<void> {
  const i = grupa.indexOf(id)
  const j = i + virziens
  if (i < 0 || j < 0 || j >= grupa.length) return
  const jauna = [...grupa]
  ;[jauna[i], jauna[j]] = [jauna[j] as string, jauna[i] as string]
  const visa = (await lasitStore<string[]>($, STORE_SECIBA)) ?? []
  const nakama = [...jauna, ...visa.filter(x => !jauna.includes(x))]
  await $.store.set(STORE_SECIBA, nakama)
  await update($, seciba, () => nakama)
}

export const register: Register = (on, options) => {
  t = TEKSTI[options.valoda === 'en' ? 'en' : 'lv']
  vards = typeof options.vards === 'string' ? options.vards.trim() : ''
  repoMapes = typeof options.repoMapes === 'string' ? options.repoMapes : ''
  radiPadomusNoklusejums = options.radiPadomus !== false
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'darbi',
      description: t.komandasApraksts,
      argumentHint: '[padomi]',
    })
    void atjaunot($)
    $.clock.every(ATJAUNOT_MS, () => atjaunot($))
    if (options.atvertAutomatiski !== false) void $.ui.open({ id: PANE, title: t.panelis })
    return next(e)
  })

  on('command.run', { command: 'darbi' }, async ($, e) => {
    if (e.args.trim() === 'padomi') {
      // Pārslēdz krātuvē (uzreiz visos paneļos); iestatījums "radiPadomus" ir tikai noklusējums.
      const ieslegt = !(await read($, radiPadomus))
      await $.store.set(STORE_PADOMI, ieslegt)
      await update($, radiPadomus, () => ieslegt)
      return { text: ieslegt ? t.padomiIeslegti : t.padomiIzslegti }
    }
    await $.ui.open({ id: PANE, title: t.panelis })
    await atjaunot($)
    return { text: t.panelisAtverts }
  })

  // Auto režīma klasifikators spriež pēc sarunas, bet pogas spiediens panelī sarunā neparādās, tāpēc tas atteic.
  // Atļauj tikai šī moda paša izsaukumus (pogas); tie paši rīki no Claude iet caur parasto pārbaudi.
  on('tool.check', async ($, e, next) => {
    if (next.origin.plugin === 'valejie-darbi' && POGU_RIKI.has(String(e.tool))) {
      return { decision: 'allow', reason: t.pogasAtlauja }
    }
    return next(e)
  })

  // Kad cita sesija (parasti pēc ▷) atsūta atskaiti, to saglabā arī pie tās kartītes panelī.
  // Ziņa tik un tā nonāk šajā sesijā kā parasti: neko neaizturam.
  on('session.receive', async ($, e, next) => {
    const r = await next(e)
    if (e.origin.kind === 'peer' || e.origin.kind === 'peer-send-message') {
      // Atskaite ir tikai atbilde no sesijas, kurai nosūtījām ▷; pats ▷ uzdevums, kas pienāk mērķa sesijā, nav.
      const atskaite = parsetAtskaiti(e.text, (await read($, dati)).sesijas)
      const gaida = (await lasitStore<Record<string, number>>($, STORE_GAIDA_ATSKAITI)) ?? {}
      if (atskaite && gaida[atskaite.id] !== undefined) {
        await saglabatAtskaiti($, atskaite.id, { laiks: await $.clock.now(), teksts: atskaite.teksts })
        const { [atskaite.id]: _sanemta, ...citas } = gaida
        await $.store.set(STORE_GAIDA_ATSKAITI, citas)
        if (options.zinotParAtskaitem !== false) {
          const nosaukums = (await read($, dati)).sesijas.find(x => x.id === atskaite.id)?.title ?? 'Sesija'
          await zinotParAtskaiti($, nosaukums, atskaite.teksts)
        }
      }
    }
    return r
  })

  // Kad lietotājs šajā sesijā raksta, līdzi nāk klusa piezīme par panelī atzīmētajiem darbiem (modelis to redz,
  // lietotājs sarunā ne), lai sesija par tiem vairs nejautā. Bez atsevišķa gājiena un bez tokeniem par velti.
  on('prompt.submit', async ($, e, next) => {
    const sis = (await read($, dati)).sesijas.find(x => x.sis)
    if (!sis) return next(e)
    const visi = (await lasitStore<Record<string, string[]>>($, STORE_PAZINOJUMI)) ?? {}
    const darbi = visi[sis.id] ?? []
    if (darbi.length === 0) return next(e)
    const { [sis.id]: _nodoti, ...citi } = visi
    await $.store.set(STORE_PAZINOJUMI, citi)
    const piezime = t.piezime(vards, darbi)
    return next({ ...e, context: [...(e.context ?? []), piezime] })
  })

  on('turn.complete', async ($, e, next) => {
    const result = await next(e)
    void atjaunot($)
    return result
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const el = $.ui.resolve(e)
    const { Box, Text, Button } = el
    const d = await read($, dati)
    const a = await read($, atzimes)
    const an = await read($, analizes)
    const iz = await read($, izdariti)
    const parbaudamas = await read($, parbauda)
    const izverstie = await read($, izversti)
    const sec = await read($, seciba)
    const at = await read($, atskaites)
    const paslepti = await read($, pasleptiRepo)
    const ievadesNr = await read($, ievadesSkaits)
    const red = await read($, redzeti)
    const radaPabeigtas = await read($, radiPabeigtas)
    const msg = await read($, zinja)
    const paz = await read($, pazinots)
    const repoIzvele = await read($, repoSesijas)
    const isPadomi = await read($, radiPadomus)
    // Sesija, kurā esi, ir pati augšā savā sadaļā (ar visiem darbiem), lai pēc pārslēgšanās tās darāmais ir uzreiz redzams.
    const sisSesija = d.sesijas.find(s => s.sis)
    const g = grupet(
      d.sesijas.filter(s => !s.sis),
      a,
      an,
      iz,
      at,
      paz,
      sec,
    )
    const sisGrupa = sisSesija ? grupa(sisSesija, a, an, iz, at, paz) : undefined

    const pazinot = async (teksts: string) => {
      await update($, zinja, () => isis(teksts, 240))
      $.ui.toast(isis(teksts, 160), { timeoutMs: 6000 })
    }
    const isJauns = (s: Sesija) => red[s.id] !== undefined && red[s.id] !== paraksts(s, an, at)
    // lietotājs kaut ko darīja ar kartīti: tās pašreizējais saturs skaitās redzēts, punkts vairs nepulsē.
    const apskatits = async (s: Sesija) => {
      if (!isJauns(s)) return
      const visi = (await lasitStore<Record<string, string>>($, STORE_REDZETI)) ?? {}
      const nakamie = { ...visi, [s.id]: paraksts(s, an, at) }
      await $.store.set(STORE_REDZETI, nakamie)
      await update($, redzeti, () => nakamie)
    }
    const atvertSesiju = (s: Sesija) => async () => {
      await apskatits(s)
      const r = await $.process.run(['open', s.link])
      if (r.exitCode !== 0) await pazinot(t.neizdevasAtvertSesiju(r.stderr))
    }
    // Saite → pārlūks. Fails → Claude aplikācijas failu panelis blakus sarunai; ja tur nevar (nav šīs sesijas
    // mapē, sesija nav ekrānā), tad VS Code, jo .md pēc noklusējuma atver lēnais Xcode.
    const atvertSaiti = (merkis: string) => async () => {
      if (/^https?:\/\//.test(merkis)) {
        const r = await $.process.run(['open', merkis])
        if (r.exitCode !== 0) await pazinot(t.neizdevasAtvertSaiti(r.stderr))
        return
      }
      const panelis = await ccdRiks($, 'ccd_view', 'show_pane', { pane: 'file', path: merkis })
      if (panelis.isOk && !/nothing|not open|isn't open|outside|not inside/i.test(panelis.teksts)) return
      const r = await $.process.run(['open', '-a', 'Visual Studio Code', merkis])
      if (r.exitCode !== 0) await pazinot(t.neizdevasAtvertFailu(r.stderr))
    }
    const arhivet = (s: Sesija) => async () => {
      const r = await ccdRiks($, 'ccd_session_mgmt', 'archive_session', { session_id: s.id, reason: t.arhivesanasIemesls })
      await pazinot(r.isOk ? t.arhivets(s.title) : t.neizdevasArhivet(isis(s.title, 40), r.teksts))
      // Pēdējā sesiju rīka atbilde diskā, lai to var nolasīt, ja kaut kas neiet.
      await $.fs.write(`${$.plugin.root}/.pedeja-riks.json`, JSON.stringify({ riks: 'archive_session', sesija: s.id, ...r }, null, 2))
      await atjaunot($)
    }
    /** Nosūta tekstu Claude tajā sesijā; true, ja aizgāja (vai nostājās rindā). */
    const sutitSesijai = async (s: Sesija, teksts: string): Promise<boolean> => {
      // Sev pašai aplikācija ziņu nesūta: šajā sesijā iesniedz kā tavu promptu; ja Claude strādā, tas nostājas rindā.
      if (s.sis) {
        void $.prompt
          .submit({ text: teksts, asUser: true })
          .catch((err: unknown) => pazinot(t.neizdevasIesniegt(String(err))))
        await pazinot(t.iesniegtsSeit)
        return true
      }
      const r = await ccdRiks($, 'ccd_session_mgmt', 'send_message', { session_id: s.id, message: teksts })
      await $.fs.write(`${$.plugin.root}/.pedeja-riks.json`, JSON.stringify({ riks: 'send_message', sesija: s.id, ...r }, null, 2))
      if (!r.isOk) {
        await pazinot(t.neizdevasNosutit(isis(s.title, 40), r.teksts))
        return false
      }
      const gaida = (await lasitStore<Record<string, number>>($, STORE_GAIDA_ATSKAITI)) ?? {}
      await $.store.set(STORE_GAIDA_ATSKAITI, { ...gaida, [s.id]: await $.clock.now() })
      await pazinot(
        /queued/.test(r.teksts)
          ? t.ieliktsRinda(isis(s.title, 40))
          : t.nosutits(isis(s.title, 40)),
      )
      return true
    }
    // ➤ pie tava ☐ darba: nosūta to Claude tajā sesijā un pārvērš par Claude ✓ ("nodots").
    const nodotClaude = (s: Sesija, td: TevDarbs) => async () => {
      const prompts = t.izdari(td.darbs, td.sikak)
      if (!(await sutitSesijai(s, prompts))) return
      const visas = (await lasitStore<Analizes>($, STORE_ANALIZES)) ?? {}
      const r = visas[s.id]
      if (r) {
        visas[s.id] = {
          ...r,
          tev: r.tev.filter(x => x.darbs !== td.darbs),
          claude: [...r.claude.filter(x => x.darbs !== td.darbs), { darbs: td.darbs, prompts }],
        }
        await $.store.set(STORE_ANALIZES, visas)
        await update($, analizes, () => visas)
      }
      await parslegtIzdaritu($, claudeAtslega(s, { darbs: td.darbs, prompts }), true)
      await apskatits(s)
    }
    const turpiniClaude = (s: Sesija, c: ClaudeDarbs) => async () => {
      if (await sutitSesijai(s, c.prompts)) await parslegtIzdaritu($, claudeAtslega(s, c), true)
    }
    const gatavs = (s: Sesija) => async () => {
      await atzimet($, s, { veids: 'gatavs', last: s.last, kad: await $.clock.now() })
      if (at[s.id]) await saglabatAtskaiti($, s.id, undefined)
    }
    // ↑ pabeigtajās: kartīte atpakaļ sarakstā ar visiem neizdarītajiem darbiem; pārbauda, vai nav jaunu.
    const atgriezt = (s: Sesija) => async () => {
      await atzimet($, s, { veids: 'turpinat', last: s.last })
      await analizet($, s, true)
    }

    const ikona = (v: Veids) =>
      'Svg' in el ? (
        <el.Svg source={ikonasSvg(v)} alt={t.ikonuNosaukumi[v]} width={16} height={16} />
      ) : (
        <Text color={KRASA[v]}>●</Text>
      )
    // Pulsējošs punkts: aplikācijā animēts SVG; terminālī ◉, jo tur SVG un animācijas nav.
    const pulss = (v: Veids) =>
      'Svg' in el ? (
        <el.Svg source={pulsaSvg(v)} alt={t.jaunasIzmainas} width={14} height={14} isInteractive />
      ) : (
        <Text bold color={KRASA[v]}>
          ◉
        </Text>
      )
    const punkts = (v: Veids) =>
      'Svg' in el ? (
        <el.Svg source={punktaSvg(v)} alt={t.ikonuNosaukumi[v]} width={10} height={10} />
      ) : (
        <Text color={KRASA[v]}>●</Text>
      )
    const virsraksts = (v: Veids, teksts: string, skaits: number) => (
      <Box flexDirection="row" gap={1} alignItems="center">
        {ikona(v)}
        <Text bold color={KRASA[v]}>
          {teksts}
        </Text>
        <Text dimColor>{skaits}</Text>
      </Box>
    )

    const nosaukums = (s: Sesija) => s.title
    const punktaVeids = (gr: Grupa, s: Sesija): Veids => {
      if (gr === 'gaida') return s.status === 'review_ready' ? 'parskatit' : 'gaida'
      if (gr === 'turpinat') return 'turpinat'
      if (gr === 'bez') return 'bez'
      return 'gatavs'
    }

    // Pogām nav sava uzraksta, uzbraucot ar peli, tāpēc padoms ir paslēpta kastīte, ko parāda hover (inverse,
    // lai būtu lasāms abās tēmās). `puse` = uz kuru pusi no pogas tā atveras.
    // Platums pēc teksta garuma, citādi kastīte saraujas līdz pogas platumam un teksts lūst pa vārdiem.
    const arPadomu = (key: string, padoms: string, poga: RenderElement, puse: 'labi' | 'kreisi' = 'labi') =>
      !isPadomi ? (
        poga
      ) : (
        <Box key={`p:${key}`} position="relative">
          {poga}
          <Box
            position="absolute"
            top={1}
            {...(puse === 'labi' ? { right: 0 } : { left: 0 })}
            width={padoms.length + 2}
            flexShrink={0}
            display="none"
            hover={{ display: 'flex' }}
          >
            <Text inverse wrap="truncate-end">{` ${padoms} `}</Text>
          </Box>
        </Box>
      )

    type Poga = { key: string; label: string; padoms: string; onPress: () => unknown }
    const galvasPogas = (gr: Grupa, s: Sesija): Poga[] => {
      const p = (veids: string, label: string, padoms: string, onPress: () => unknown): Poga => ({
        key: `${veids}:${s.id}`,
        label,
        padoms,
        onPress,
      })
      const arhivs = s.sis ? [] : [p('arhivet', IKONA.arhivet, t.padoms.arhivet, arhivet(s))]
      const atpakal = p('atgriezt', IKONA.atgriezt, t.padoms.atgriezt, atgriezt(s))
      if (gr === 'bez') return [atpakal, p('gatavs', IKONA.gatavs, t.padoms.gatavs, gatavs(s)), ...arhivs]
      if (gr === 'pabeigtas') return [atpakal, ...arhivs]
      const ids = g[gr].map(x => x.id)
      return [
        p('augsa', IKONA.augsa, t.padoms.augsa, () => parvietot($, ids, s.id, -1)),
        p('leja', IKONA.leja, t.padoms.leja, () => parvietot($, ids, s.id, 1)),
        p('gatavs', IKONA.gatavs, t.padoms.gatavs, gatavs(s)),
      ]
    }

    type DarbaRinda = {
      s: Sesija
      i: number
      veids: 't' | 'c'
      darbs: string
      sikak: string
      atvert: string
      isAtzimets: boolean
      onKeksis: () => unknown
      onAtmest?: () => unknown
      onNodot?: () => unknown
    }
    // Ķeksītis ir atsevišķa poga. Darba teksts arī ir poga: uzspiežot to, zem tā atveras pilnais teksts un
    // detaļas vairākās rindās (pogas teksts pats nepāriet jaunā rindā, parasts teksts pāriet).
    const darbaRinda = (d: DarbaRinda) => {
      const id = `${d.s.id}:${d.veids}${d.i}`
      const isIzverts = izverstie.includes(id)
      const pilnais = [d.darbs.length > 45 ? d.darbs : '', d.sikak].filter(Boolean)
      const isTev = d.veids === 't'
      return (
        <Box key={`darbs:${id}`} flexDirection="row" gap={1} alignItems="flex-start">
          {/* Tev: ☐ ķeksītis. Claude: ▷, kas uzspiežot palaiž darbu tajā sesijā un kļūst par ✓; blakus ✕ to atmet. */}
          {arPadomu(
            isTev ? `keksis:${d.s.id}:${d.i}` : `turpini:${d.s.id}:${d.i}`,
            isTev
              ? d.isAtzimets
                ? t.padoms.atcelt
                : t.padoms.izdarits
              : d.isAtzimets
                ? t.padoms.nosutits
                : t.padoms.palaist,
            <Button
              key={isTev ? `keksis:${d.s.id}:${d.i}` : `turpini:${d.s.id}:${d.i}`}
              plain
              dimColor={d.isAtzimets}
              label={isTev ? (d.isAtzimets ? '☑' : '☐') : d.isAtzimets ? '✓' : '▷'}
              onPress={async () => {
                await d.onKeksis()
                await apskatits(d.s)
                // Atzīmēts darbs sakļaujas, ja bija izvērsts.
                if (!d.isAtzimets) await update($, izversti, x => x.filter(y => y !== id))
              }}
            />,
            'kreisi',
          )}
          {/* ➤ vienmēr blāvs un iedegas, kad pele ir virs rindas. Paslēpts (display: none) ar parādīšanu uz hover
              to aplikācijā nevar nospiest: spiediens uz sākotnēji paslēptu pogu modam netiek nodots. */}
          {d.onNodot &&
            !d.isAtzimets &&
            arPadomu(
              `nodot:${d.s.id}:${d.i}`,
              t.padoms.nodotClaude,
              <Button
                key={`nodot:${d.s.id}:${d.i}`}
                plain
                dimColor
                hover={{ dimColor: false, color: KRASA.turpinat }}
                label={IKONA.sutit}
                onPress={d.onNodot}
              />,
              'kreisi',
            )}
          {d.onAtmest &&
            !d.isAtzimets &&
            arPadomu(
              `atmest:${d.s.id}:${d.i}`,
              t.padoms.atmest,
              <Button key={`atmest:${d.s.id}:${d.i}`} plain dimColor label="✕" onPress={d.onAtmest} />,
              'kreisi',
            )}
          <Box flexDirection="column" flexGrow={1} flexShrink={1} minWidth={0}>
            <Button
              key={`teksts:${id}`}
              plain
              dimColor={d.isAtzimets}
              label={isis(d.darbs, 110)}
              onPress={async () => {
                await apskatits(d.s)
                await update($, izversti, ids => (ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id]))
              }}
            />
            {isIzverts &&
              pilnais.map((rinda, k) => (
                <Text key={`pilnais:${id}:${k}`} wrap="wrap" dimColor>
                  {rinda}
                </Text>
              ))}
          </Box>
          {isTev &&
            d.atvert !== '' &&
            !d.isAtzimets &&
            arPadomu(
              `atvert-darbu:${d.s.id}:${d.i}`,
              t.padoms.atvert,
              <Button key={`atvert-darbu:${d.s.id}:${d.i}`} label={t.atvertPoga} dimColor onPress={atvertSaiti(d.atvert)} />,
            )}
        </Box>
      )
    }

    const darbuRindas = (s: Sesija) => {
      const r = an[s.id]
      const isParbauda = parbaudamas.includes(s.id)
      if (!r?.isGatava) {
        const rezerve = s.needs || s.nakamie || s.detail
        return (
          <Text dimColor>
            {isParbauda ? t.parbauda : rezerve ? isis(rezerve, 200) : t.gaidaParbaudi}
          </Text>
        )
      }
      if (r.tev.length + r.claude.length === 0) return <Text dimColor>{t.nekasVairs}</Text>
      return (
        <Box flexDirection="column">
          {isParbauda && <Text dimColor>{t.parbaudaNoJauna}</Text>}
          {r.tev.length > 0 && (
            <Box flexDirection="row">
              <Box width={ETIKETES_PLATUMS} flexShrink={0}>
                <Text color={KRASA.gaida}>{t.tev}</Text>
              </Box>
              <Box flexDirection="column" flexGrow={1} flexShrink={1} minWidth={0}>
                {r.tev.map((td, i) =>
                  darbaRinda({
                    s,
                    i,
                    veids: 't',
                    darbs: td.darbs,
                    sikak: td.sikak,
                    atvert: td.atvert,
                    isAtzimets: iz[tevAtslega(s, td)] !== undefined,
                    onKeksis: () => parslegtIzdaritu($, tevAtslega(s, td), iz[tevAtslega(s, td)] === undefined),
                    onNodot: nodotClaude(s, td),
                  }),
                )}
              </Box>
            </Box>
          )}
          {r.claude.length > 0 && (
            <Box flexDirection="row" marginTop={r.tev.length > 0 ? 1 : 0}>
              <Box width={ETIKETES_PLATUMS} flexShrink={0}>
                <Text color={KRASA.turpinat}>{t.claude}</Text>
              </Box>
              <Box flexDirection="column" flexGrow={1} flexShrink={1} minWidth={0}>
                {r.claude.map((c, i) => {
                  const isNosutits = iz[claudeAtslega(s, c)] !== undefined
                  return darbaRinda({
                    s,
                    i,
                    veids: 'c',
                    darbs: c.darbs,
                    sikak: t.nosutis(c.prompts),
                    atvert: '',
                    isAtzimets: isNosutits,
                    onKeksis: isNosutits ? () => undefined : turpiniClaude(s, c),
                    onAtmest: () => atmestClaude($, s, c),
                  })
                })}
              </Box>
            </Box>
          )}
        </Box>
      )
    }

    // Sesijas atsūtītā atskaite: pirmā rinda kā poga (uzspiežot atveras viss teksts), ✕ to aizver.
    // Visi ☐ atzīmēti: vienā klikšķī pasaka sesijai, kas izdarīts, un liek turpināt (citādi tā gaidītu tavu ziņu).
    const pazinotUnTurpinat = (s: Sesija, r: Analize) => async () => {
      const teksts = [
        t.izdarijaUnParbaudija(vards),
        ...r.tev.map(d => `- ${d.darbs}`),
        t.turpiniDarbu,
      ].join('\n')
      if (!(await sutitSesijai(s, teksts))) return
      // Sesija jau zina: klusā piezīme par šiem darbiem vairs nav vajadzīga.
      const piezimes = (await lasitStore<Record<string, string[]>>($, STORE_PAZINOJUMI)) ?? {}
      const { [s.id]: _nodotas, ...citas } = piezimes
      await $.store.set(STORE_PAZINOJUMI, citas)
      const visi = (await lasitStore<Record<string, string>>($, STORE_PAZINOTS)) ?? {}
      const nakamie = { ...visi, [s.id]: tevParaksts(r) }
      await $.store.set(STORE_PAZINOTS, nakamie)
      await update($, pazinots, () => nakamie)
      await apskatits(s)
    }
    const pazinosanasRinda = (s: Sesija) => {
      const r = an[s.id]
      if (!r?.isGatava || r.tev.length === 0) return null
      const isVisiAtzimeti = r.tev.every(d => iz[tevAtslega(s, d)] !== undefined)
      if (!isVisiAtzimeti || paz[s.id] === tevParaksts(r)) return null
      return (
        <Box flexDirection="row" marginTop={1}>
          <Box width={ETIKETES_PLATUMS} flexShrink={0} />
          {arPadomu(
            `pazinot:${s.id}`,
            t.padoms.izdaritsTurpini,
            <Button key={`pazinot:${s.id}`} label={t.pazinotUnTurpinat} onPress={pazinotUnTurpinat(s, r)} />,
            'kreisi',
          )}
        </Box>
      )
    }

    const atskaitesBloks = (s: Sesija) => {
      const r = at[s.id]
      if (!r) return null
      const id = `${s.id}:atskaite`
      const isIzverts = izverstie.includes(id)
      const pirma = r.teksts.split('\n').find(x => x.trim() !== '') ?? ''
      return (
        <Box flexDirection="row" marginTop={1} alignItems="flex-start">
          <Box width={ETIKETES_PLATUMS} flexShrink={0}>
            <Text color={KRASA.gatavs}>{laiks(r.laiks)}</Text>
          </Box>
          <Box flexDirection="column" flexGrow={1} flexShrink={1} minWidth={0}>
            <Button
              key={`atskaite:${s.id}`}
              plain
              label={isis(pirma, 70)}
              onPress={() => update($, izversti, ids => (ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id]))}
            />
            {isIzverts && (
              <Text wrap="wrap" dimColor>
                {r.teksts}
              </Text>
            )}
          </Box>
          {arPadomu(
            `atskaite-aizvert:${s.id}`,
            t.padoms.aizvert,
            <Button key={`atskaite-aizvert:${s.id}`} plain dimColor label="✕" onPress={() => saglabatAtskaiti($, s.id, undefined)} />,
          )}
        </Box>
      )
    }

    const redzamieRepo = d.repo.filter(r => paslepti[r.cels] !== r.sig)
    const paslept = (r: Repo) => async () => {
      const visi = (await lasitStore<Record<string, string>>($, STORE_PASLEPTI_REPO)) ?? {}
      const nakamie = { ...visi, [r.cels]: r.sig }
      await $.store.set(STORE_PASLEPTI_REPO, nakamie)
      await update($, pasleptiRepo, () => nakamie)
    }
    // "pušo" kā lietotāja komanda tai sesijai, kas ar repo strādāja (tā zina procedūru); ja tādas nav, teksts ievades laukā.
    // lietotāja izvēlētā sesija (ja tā vēl ir starp aktīvajām), citādi automātiski atrastā.
    const repoMerkis = (r: Repo): Sesija | undefined =>
      d.sesijas.find(x => x.id === repoIzvele[r.cels]) ?? d.sesijas.find(x => x.id === r.sesija)
    const izveletiesRepoSesiju = (r: Repo) => async (id: string) => {
      const visi = (await lasitStore<Record<string, string>>($, STORE_REPO_SESIJAS)) ?? {}
      const { [r.cels]: _veca, ...citi } = visi
      const nakamie = id === '' ? citi : { ...citi, [r.cels]: id }
      await $.store.set(STORE_REPO_SESIJAS, nakamie)
      await update($, repoSesijas, () => nakamie)
    }
    const pusot = (r: Repo) => async () => {
      const s = repoMerkis(r)
      if (s) await sutitSesijai(s, t.pusoKomanda(r.nosaukums))
      else await $.prompt.fill({ text: t.pusoKomanda(r.nosaukums), mode: 'replace' })
    }
    // Uzspiežot uz repo teksta, zem tā atveras nenopušotie commiti un mainītie faili. Kad viss nopušots, sadaļas nav.
    const pasleptoSkaits = d.repo.length - redzamieRepo.length
    const raditPaslepto = async () => {
      await $.store.set(STORE_PASLEPTI_REPO, {})
      await update($, pasleptiRepo, () => ({}))
    }
    const repoSadala = d.repo.length === 0 ? null : (
      <Box flexDirection="column">
        {virsraksts('repo', t.nenopusots, redzamieRepo.length)}
        {pasleptoSkaits > 0 && (
          <Box flexDirection="row" gap={1} alignItems="center">
            <Text dimColor>{t.paslepti(pasleptoSkaits)}</Text>
            <Button key="radit-paslepto" plain dimColor label={t.radit} onPress={raditPaslepto} />
          </Box>
        )}
        {redzamieRepo.map((r, i) => {
          const id = `repo:${r.cels}`
          const isIzverts = izverstie.includes(id)
          return (
            <Box key={`repo:${i}`} flexDirection="row" gap={1} alignItems="flex-start">
              {punkts('repo')}
              <Box flexDirection="column" flexGrow={1} flexShrink={1} minWidth={0}>
                <Button
                  key={`repo-teksts:${i}`}
                  plain
                  label={repoTeksts(r)}
                  onPress={() => update($, izversti, ids => (ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id]))}
                />
                {'Select' in el ? (
                  <el.Select
                    key={`repo-sesija:${i}`}
                    label="→"
                    value={d.sesijas.some(x => x.id === repoIzvele[r.cels]) ? repoIzvele[r.cels] : ''}
                    options={[
                      { value: '', label: t.automatiski(r.sesijasNosaukums) },
                      ...d.sesijas.map(x => ({ value: x.id, label: x.title })),
                    ]}
                    onSelect={izveletiesRepoSesiju(r)}
                  />
                ) : (
                  repoMerkis(r) && <Text dimColor>{`→ ${repoMerkis(r)?.title ?? ''}`}</Text>
                )}
                {isIzverts && r.commiti.length > 0 && <Text dimColor>{t.commitiKasAizies}</Text>}
                {isIzverts &&
                  r.commiti.map((c, k) => (
                    <Text key={`repo-commits:${i}:${k}`} wrap="wrap">
                      {`  ${c}`}
                    </Text>
                  ))}
                {isIzverts && r.faili.length > 0 && <Text dimColor>{t.mainitiFaili}</Text>}
                {isIzverts &&
                  r.faili.map((f, k) => (
                    <Text key={`repo-fails:${i}:${k}`} wrap="wrap">
                      {`  ${f}`}
                    </Text>
                  ))}
              </Box>
              {arPadomu(
                `pusot:${i}`,
                repoMerkis(r) ? t.padoms.nosutitPuso(repoMerkis(r)?.title ?? '') : t.padoms.ieliktPuso,
                <Button key={`pusot:${i}`} label={t.pusoPoga} onPress={pusot(r)} />,
              )}
              {arPadomu(
                `repo-x:${i}`,
                t.padoms.paslept,
                <Button key={`repo-x:${i}`} plain dimColor label="✕" onPress={paslept(r)} />,
              )}
            </Box>
          )
        })}
      </Box>
    )

    // + kartītes galvenē atver ievades lauku. ✓ vai Enter saglabā tekstu kā tavu ☐ darbu ("c:" priekšā: Claude ▷
    // darbs), ➤ to uzreiz nosūta Claude tajā sesijā. Pēc tam lauks aizveras un ir tukšs.
    const aizvertIevadi = async (s: Sesija) => {
      await update($, izversti, x => x.filter(y => y !== `${s.id}:ievade`))
      await update($, ievadesTeksts, x => {
        const { [s.id]: _teksts, ...citi } = x
        return citi
      })
      await update($, ievadesSkaits, n => n + 1)
    }
    const saglabatIevadi = (s: Sesija) => async (ievade?: string) => {
      const teksts = (ievade ?? (await read($, ievadesTeksts))[s.id] ?? '').trim()
      // Enter tukšā laukā = atcelt: lauks aizveras.
      if (teksts === '') {
        if (ievade !== undefined) await aizvertIevadi(s)
        return
      }
      const claudeam = /^(c|claude)\s*:\s*/i
      if (claudeam.test(teksts)) {
        const darbs = teksts.replace(claudeam, '')
        await pievienotDarbus($, s, { claude: [{ darbs, prompts: darbs }] })
      } else {
        await pievienotDarbus($, s, { tev: [teksts] })
      }
      await aizvertIevadi(s)
    }
    const sutitIevadi = (s: Sesija) => async () => {
      const teksts = ((await read($, ievadesTeksts))[s.id] ?? '').trim()
      if (teksts === '') return
      if (await sutitSesijai(s, teksts)) await aizvertIevadi(s)
    }
    // Lauks sākas tur, kur ķeksīši (aiz "Tev"/"Claude" kolonnas); ✓ un ➤ uzreiz aiz tā. Lauka platumu nosaka
    // aplikācija (Input nav platuma iestatījuma), tāpēc to neietin platā kastē, kas pogas aizbīdītu pie malas.
    const ievadesRinda = (s: Sesija) =>
      'Input' in el && izverstie.includes(`${s.id}:ievade`) ? (
        <Box flexDirection="row" marginBottom={1} gap={1} alignItems="center">
          <Box width={ETIKETES_PLATUMS - 1} flexShrink={0} />
          <Box flexShrink={0}>
            <el.Input
              key={`jauns:${s.id}:${ievadesNr}`}
              placeholder={t.jaunsDarbsVieta}
              autoFocus
              onInput={(teksts: string) => update($, ievadesTeksts, x => ({ ...x, [s.id]: teksts }))}
              onSubmit={(teksts: string) => saglabatIevadi(s)(teksts)}
            />
          </Box>
          {arPadomu(
            `saglabat:${s.id}`,
            t.padoms.saglabat,
            <Button key={`saglabat:${s.id}`} plain label="✓" onPress={() => saglabatIevadi(s)()} />,
          )}
          {arPadomu(
            `sutit:${s.id}`,
            t.padoms.nosutitClaude,
            <Button key={`sutit:${s.id}`} plain label={IKONA.sutit} onPress={sutitIevadi(s)} />,
          )}
        </Box>
      ) : null

    const kartite = (gr: Grupa, s: Sesija, isPilna: boolean) => {
      const pogas = galvasPogas(gr, s)
      return (
        <Box key={`kartite:${s.id}`} flexDirection="column" marginBottom={isPilna ? 1 : 0}>
          <Box flexDirection="row" justifyContent="space-between" alignItems="center">
            <Box flexDirection="row" gap={1} alignItems="center" flexShrink={1}>
              {isJauns(s) ? pulss(punktaVeids(gr, s)) : punkts(punktaVeids(gr, s))}
              {arPadomu(
                `atvert:${s.id}`,
                s.sis ? t.padoms.sisSesija : isJauns(s) ? t.padoms.jaunasIzmainas : t.padoms.atvertSesiju,
                // Sesija, kurā esi, ir akcenta krāsā (primary), nevis ar uzrakstu.
                <Button
                  key={`atvert:${s.id}`}
                  label={isis(nosaukums(s), 90)}
                  {...(s.sis ? { variant: 'primary' as const } : {})}
                  onPress={atvertSesiju(s)}
                />,
                'kreisi',
              )}
              {isPilna &&
                'Input' in el &&
                arPadomu(
                  `pievienot:${s.id}`,
                  t.padoms.jaunsDarbs,
                  <Button
                    key={`pievienot:${s.id}`}
                    plain
                    label={IKONA.pievienot}
                    onPress={() =>
                      update($, izversti, x =>
                        x.includes(`${s.id}:ievade`) ? x.filter(y => y !== `${s.id}:ievade`) : [...x, `${s.id}:ievade`],
                      )
                    }
                  />,
                  'kreisi',
                )}
            </Box>
            <Box flexDirection="row" gap={1} alignItems="center" flexShrink={0}>
              {pogas.map(p => arPadomu(p.key, p.padoms, <Button key={p.key} label={p.label} plain onPress={p.onPress} />))}
            </Box>
          </Box>
          {isPilna && (
            <Box flexDirection="column" marginLeft={2}>
              {ievadesRinda(s)}
              {darbuRindas(s)}
              {pazinosanasRinda(s)}
              {atskaitesBloks(s)}
            </Box>
          )}
        </Box>
      )
    }

    const sadala = (gr: Grupa, v: Veids, teksts: string, tukss: string, isPilna: boolean) =>
      g[gr].length === 0 && tukss === '' ? null : (
        <Box flexDirection="column">
          {virsraksts(v, teksts, g[gr].length)}
          {g[gr].length === 0 && <Text dimColor>{tukss}</Text>}
          {g[gr].map(s => kartite(gr, s, isPilna))}
        </Box>
      )

    const pabeigtas =
      g.pabeigtas.length === 0 ? null : (
        <Box flexDirection="column">
          <Box flexDirection="row" gap={1} alignItems="center">
            {virsraksts('gatavs', t.pabeigtas, g.pabeigtas.length)}
            <Button
              key="radit-pabeigtas"
              label={radaPabeigtas ? t.slept : t.radit}
              dimColor
              onPress={() => update($, radiPabeigtas, x => !x)}
            />
          </Box>
          {radaPabeigtas && g.pabeigtas.map(s => kartite('pabeigtas', s, false))}
        </Box>
      )

    return (
      <Box flexDirection="column" gap={1}>
        <Box flexDirection="row" gap={1} alignItems="center">
          <Text dimColor>{d.laiks ? `${t.atjaunots} ${laiks(d.laiks)}` : t.ielade}</Text>
          {arPadomu('atjaunot', t.atjaunot, <Button key="atjaunot" plain dimColor label="↻" onPress={() => atjaunot($)} />, 'kreisi')}
        </Box>
        {sisSesija && sisGrupa && (
          <Box flexDirection="column">
            {virsraksts(punktaVeids(sisGrupa, sisSesija), t.padoms.sisSesija, 1)}
            {kartite(sisGrupa, sisSesija, true)}
          </Box>
        )}
        {d.kluda !== '' && <Text color="red">{d.kluda}</Text>}
        {msg !== '' && <Text color={KRASA.gaida}>{msg}</Text>}

        {sadala('gaida', 'gaida', t.gaidaTevi, t.nekasNegaida, true)}
        {sadala('turpinat', 'turpinat', t.claudeVarTurpinat, '', true)}

        {repoSadala}

        {sadala('bez', 'bez', t.bezStatusa, '', false)}
        {pabeigtas}
      </Box>
    )
  })
}
