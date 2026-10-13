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
  Ilgums,
  Izdariti,
  Karta,
  Novertejums,
  PanemtaBalva,
  Repo,
  Sesija,
  TevDarbs,
  ValejieDati,
} from '../types'
import {
  aplisSvg,
  balvasSvg,
  dienasAplisSvg,
  ikonasSvg,
  joslasSvg,
  KRASA,
  malasSvg,
  pilnsAplisSvg,
  poguIkonaSvg,
  pulsaSvg,
  punktaSvg,
  tukssPunktsSvg,
  ZALS,
} from './ikonas'
import { TEKSTI } from './teksti'
import type { Teksti } from './teksti'
import type { Balva, PogasIkona, Veids } from './ikonas'

const PANE = 'valejie-darbi'
const TUKSS: ValejieDati = { sesijas: [], repo: [], laiks: 0, kluda: '' }
const ATJAUNOT_MS = 30 * 1000
const STORE_ATZIMES = 'atzimes'
const STORE_ANALIZES = 'analizes3'
const STORE_IZDARITI = 'izdariti'
const STORE_ATSKAITES = 'atskaites'
// Sesijas, kurām nosūtīts ▷ un no kurām gaidām atskaiti: { sesijasId: kad nosūtīts }.
const STORE_GAIDA_ATSKAITI = 'gaidaAtskaiti'
// Repo, ko lietotājs paslēpa ar ✕: { ceļš: paraksts }; atgriežas, kad paraksts mainās.
const STORE_PASLEPTI_REPO = 'pasleptiRepo'
// "Nenopušots" sadaļa atvērta (pēc noklusējuma sakļauta, kā sānjoslas grupa).
const STORE_REPO_VALA = 'repoVala'
// Izdarītie ☐, ko vēl nepateicām tai sesijai: { sesijasId: [darbs] }; nāk līdzi lietotāja nākamajam promptam tur.
const STORE_PAZINOJUMI = 'pazinojumi'
// Visi lietotāja atzīmētie darbi pa sesijām (pēdējie 30): sesija tos vairs nepiedāvā.
const STORE_VESTURE = 'izdaritiVesture'
// Ko lietotājs kartītē jau redzēja: { sesijasId: paraksts }; ja paraksts mainās, punkts pulsē.
const STORE_REDZETI = 'redzeti'
// lietotāja izvēlētā sesija repo "pušo" komandai, ja automātiskā ir nepareiza: { repoCeļš: sesijasId }.
const STORE_REPO_SESIJAS = 'repoSesijas'
// /darbi padomi: vai rādīt padomus (pārspēj iestatījumu "radiPadomus").
const STORE_PADOMI = 'padomi'
// Prompti, ko lietotājs atmeta ar ✕: { sesijasId: [darbs] }; sesija tos vairs neiesaka.
const STORE_ATMESTI = 'atmesti'
// Kad sesijai pēdējo reizi vajadzēja tevi: pabeidza darbu vai sāka jautāt: { sesijasId: ms }. Pēc tā kārto kartītes.
const STORE_NOTIKUMI = 'notikumi'
// Gājiena laika un soļu aplēse (sākumā): { sesijasId: Novertejums }; un pabeigto gājienu vēsture tās korekcijai.
const STORE_NOVERTEJUMI = 'novertejumi'
const STORE_ILGUMI = 'ilgumi'
// Arhivētās no paneļa: { sesijasId: ms }. Aplikācija atzīmi failā ieraksta mazliet vēlāk, tāpēc panelis tās
// paslēpj uzreiz un neļauj atgriezties, līdz aplikācija tās vairs nerāda (vai ARHIVETIE_MS).
const STORE_ARHIVETIE = 'arhivetie'
const ARHIVETIE_MS = 10 * 60 * 1000
// Kad tu pēdējo reizi biji sesijā (rakstīji tajā vai atvēri no paneļa): { sesijasId: ms }. Vaļā paliek šī un iepriekšējā.
const STORE_APMEKLETI = 'apmekleti'
// Tavu ☐ kārta katrā sesijā: { sesijasId: Karta }. Jauna kārta sākas, kad pēc "viss izdarīts" parādās jauns darbs.
const STORE_KARTAS = 'kartas'
// Šodien jau paņemtā balva: { diena, panemta }.
const STORE_BALVAS = 'balvas'
// ➤ no paneļa: prompts, ko ierakstīt citas sesijas ievades laukā: { sesijasId: { teksts, kad } }. Tā sesija to paņem pati.
const STORE_AIZPILDIT = 'aizpildit'
const AIZPILDIT_MS = 10 * 60 * 1000
const AIZPILDIT_PARBAUDE_MS = 1500
// Ja gājiens beidzās, bet nākamie soļi pēc tā nav ieteikti (moda kods pārlādējās gājiena vidū), panelis tos ieteic pats.
const IETEIKT_NOKAVETS_MS = 90 * 1000
// Ik pēc 10 taviem darbiem dienā balva, pa apli: 10 pauze, 20 kafija, 30 pastaiga, 40 atkal pauze …
const BALVU_SOLIS = 10
const BALVAS: readonly Balva[] = ['pauze', 'kafija', 'pastaiga']
// Sesija bez dzīva procesa, kuras pēdējā darbība ir tik daudz vēlāka par zināmo notikumu, kaut ko darīja nepamanīta.
const NEREDZETS_MS = 10 * 60 * 1000
// Cik nākamo promptu sesija iesaka (kā next-steps) un cik tavu atvērto darbu kartītē paliek (jaunākie).
const MAX_PROMPTI = 2
const MAX_TEV = 3
// Atzīmēts ☐ vai nosūtīts ▷ vēl redzams tik ilgi (var atķeksēt atpakaļ), tad pazūd no kartītes.
// Paziņojuma rinda panelī pazūd pati pēc šī laika (vai ar ✕).
const ZINAS_ILGUMS_MS = 60 * 1000

// Valoda un lietotāja vārds no iestatījumiem; register() tos ieliek pirms visa cita.
let t: Teksti = TEKSTI.lv
let vards = ''
let radiPadomusNoklusejums = true
// Papildu mapes nenopušotu repo meklēšanai (komatiem atdalītas); tukšs = tikai sesiju mapes.
let repoMapes = ''
// Paneļa platums rakstzīmēs, ko pieprasa, atverot (iestatījums "platums"); pavilkts izmērs uzvar.
let panelaPlatums = 60

const dati = atom({ plugin: 'valejie-darbi', key: 'dati' } as const, TUKSS)
const atzimes = atom({ plugin: 'valejie-darbi', key: 'atzimes' } as const, {} as Atzimes)
const analizes = atom({ plugin: 'valejie-darbi', key: 'analizes' } as const, {} as Analizes)
const izdariti = atom({ plugin: 'valejie-darbi', key: 'izdariti' } as const, {} as Izdariti)
const atskaites = atom({ plugin: 'valejie-darbi', key: 'atskaites' } as const, {} as Atskaites)
const pasleptiRepo = atom({ plugin: 'valejie-darbi', key: 'pasleptiRepo' } as const, {} as Record<string, string>)
const repoVala = atom({ plugin: 'valejie-darbi', key: 'repoVala' } as const, false)
// Palielinās pēc katra ievadītā darba: ievades lauki uzzīmējas no jauna un tukši.
const ievadesSkaits = atom({ plugin: 'valejie-darbi', key: 'ievadesSkaits' } as const, 0)
const redzeti = atom({ plugin: 'valejie-darbi', key: 'redzeti' } as const, {} as Record<string, string>)
const radiPadomus = atom({ plugin: 'valejie-darbi', key: 'radiPadomus' } as const, true)
const repoSesijas = atom({ plugin: 'valejie-darbi', key: 'repoSesijas' } as const, {} as Record<string, string>)
// Ko lietotājs pašlaik raksta katras kartītes ievades laukā (lai ✓ un ➤ zina tekstu); tikai šai sesijai.
const ievadesTeksts = atom({ plugin: 'valejie-darbi', key: 'ievadesTeksts' } as const, {} as Record<string, string>)
// Sesijas, kuras pašlaik domā par nākamajiem soļiem (tikai šī, jo katra sesija to dara pati).
const parbauda = atom({ plugin: 'valejie-darbi', key: 'parbauda' } as const, [] as string[])
// Izvērsto darbu atslēgas (pilnais teksts vairākās rindās); tikai šai sesijai, netiek glabāts.
const izversti = atom({ plugin: 'valejie-darbi', key: 'izversti' } as const, [] as string[])
const zinja = atom({ plugin: 'valejie-darbi', key: 'zinja' } as const, '')
const zinjaLaiks = atom({ plugin: 'valejie-darbi', key: 'zinjaLaiks' } as const, 0)
// Pēdējais atzīmētais ☐, ko paziņojuma rindā var atsaukt ('' = nav).
const atsaukt = atom({ plugin: 'valejie-darbi', key: 'atsaukt' } as const, '')
const notikumi = atom({ plugin: 'valejie-darbi', key: 'notikumi' } as const, {} as Record<string, number>)
const novertejumi = atom({ plugin: 'valejie-darbi', key: 'novertejumi' } as const, {} as Record<string, Novertejums>)
const apmekleti = atom({ plugin: 'valejie-darbi', key: 'apmekleti' } as const, {} as Record<string, number>)
const kartas = atom({ plugin: 'valejie-darbi', key: 'kartas' } as const, {} as Record<string, Karta>)
const balvas = atom({ plugin: 'valejie-darbi', key: 'balvas' } as const, { diena: 0, panemta: 0 } as PanemtaBalva)

// Kartītes galvenes pogas: viena zīme katrai (pogā der tikai teksts, ne SVG).
const IKONA = { saklaut: '▾', izverst: '▸', arhivet: '🗄', pievienot: '+', sutit: '➤' }
// Neredzama pogas zīme virs ikonas (Braila tukšums: nav atstarpe, tāpēc platums paliek).
const NEREDZAMA = '⠀⠀'
// Rindas fons kā sānjoslā (neitrāli pelēks ar caurspīdību, der abām tēmām); šai sesijai spilgtāks.
const FONS = '#8080801a'
const FONS_HOVER = '#8080802e'
const FONS_SIS = '#80808059'
// Rinda, kurā visi tavi darbi izdarīti: viegli zaļa.
const FONS_IZDARITS = `${ZALS}1f`
const FONS_IZDARITS_HOVER = `${ZALS}33`

// Aplikācijas sesiju rīki, ko mods izsauc tikai no lietotāja pogas spiediena panelī.
const POGU_RIKI = new Set([
  'mcp__ccd_session_mgmt__archive_session',
  'mcp__ccd_session_mgmt__send_message',
  'mcp__ccd_view__show_pane',
])

// Aplikācijas statusi, kas nozīmē "nekas negaida"; viss pārējais (blocked, review_ready, ...) gaida lietotāju.
const MIERIGI = new Set(['completed', 'nav'])


// Izdarīto atslēgas krātuvē (ne pogu atslēgas: aplikācija pogu atslēgās pieļauj tikai ASCII, tāpēc tur ir numurs).
const tevAtslega = (s: Sesija, d: TevDarbs) => `${s.id}|t|${d.darbs}`
const claudeAtslega = (s: Sesija, d: ClaudeDarbs) => `${s.id}|c|${d.darbs}`

/**
 * Kad sesijai pēdējo reizi vajadzēja tevi: pabeidza darbu vai sāka jautāt (no dzīva procesa, glabāts krātuvē), citādi
 * pēdējā darbība. Kamēr sesija strādā, tas nemainās, tāpēc saraksts nelēkā.
 */
const notikums = (s: Sesija, nt: Record<string, number>) => nt[s.id] ?? s.last

/** Dienas sākums (vietējā laikā). */
function dienasSakums(ms: number): number {
  const d = new Date(ms)
  d.setHours(0, 0, 0, 0)
  return d.getTime()
}

type TavaKarta = { izdarits: number; atverts: number; no: number }

/** Tavi ☐ sesijā šajā kārtā (un šodien): cik izdarīti un cik vēl atvērti. Claude prompti ▷ neskaitās. */
function tavaKarta(s: Sesija, an: Analizes, iz: Izdariti, ka: Record<string, Karta>, tagad: number): TavaKarta {
  const no = Math.max(ka[s.id]?.sakums ?? 0, dienasSakums(tagad))
  const prefikss = `${s.id}|t|`
  const izdarits = Object.entries(iz).filter(([k, kad]) => k.startsWith(prefikss) && kad >= no).length
  const r = an[s.id]
  const atverts = r?.isGatava ? Math.min(MAX_TEV, r.tev.filter(d => iz[tevAtslega(s, d)] === undefined).length) : 0
  return { izdarits, atverts, no }
}

/** Visi tavi darbi šajā kārtā izdarīti, un sesija tev neko nejautā. */
const isVissIzdarits = (s: Sesija, k: TavaKarta) => k.atverts === 0 && k.izdarits > 0 && s.stavoklis !== 'waiting'

/** Sesija, kurā biji pirms šīs. */
function iepriekseja(sesijas: Sesija[], apm: Record<string, number>): string {
  let id = ''
  let kad = 0
  for (const s of sesijas) {
    const x = apm[s.id] ?? 0
    if (!s.sis && x > kad) {
      id = s.id
      kad = x
    }
  }
  return id
}

/**
 * Vaļā tikai sesija, kurā esi, un iepriekšējā; pārējās sakļautas. Kad visi tavi darbi izdarīti, sakļaujas arī tās.
 * ▸ atver jebkuru (līdz ▾ vai nākamajam "viss izdarīts"), ▾ sakļauj (līdz sesija atkal ko pabeidz vai jautā).
 */
function isSaklauta(s: Sesija, a: Atzimes, nt: Record<string, number>, ieprieks: string, isViss: boolean, vissKad: number): boolean {
  const atz = a[s.id]
  const kad = atz?.kad ?? atz?.last ?? 0
  if (atz?.veids === 'vala') return isViss && vissKad > kad
  if (atz?.veids === 'gatavs' && notikums(s, nt) <= kad) return true
  return isViss || !(s.sis || s.id === ieprieks)
}

/** Šodienas balva pēc tavu izdarīto skaita: sasniegtā un nākamā. */
function balvaPec(skaits: number): { sasniegts: number; balva: Balva; nakamais: number; nakamaBalva: Balva } {
  const pakape = Math.floor(skaits / BALVU_SOLIS)
  const b = (i: number) => BALVAS[(((i - 1) % BALVAS.length) + BALVAS.length) % BALVAS.length] as Balva
  return { sasniegts: pakape * BALVU_SOLIS, balva: b(pakape), nakamais: (pakape + 1) * BALVU_SOLIS, nakamaBalva: b(pakape + 1) }
}

/** ➤ no cita paneļa: ieraksta promptu šīs sesijas ievades laukā, lai to var pielāgot pirms sūtīšanas. */
async function aizpilditGaidoso($: EngineInterface): Promise<void> {
  const visi = (await lasitStore<Record<string, { teksts: string; kad: number }>>($, STORE_AIZPILDIT)) ?? {}
  if (Object.keys(visi).length === 0) return
  const sis = (await read($, dati)).sesijas.find(x => x.sis)
  const x = sis ? visi[sis.id] : undefined
  if (!sis || !x) return
  const { [sis.id]: _panemts, ...citi } = visi
  await $.store.set(STORE_AIZPILDIT, citi)
  if ((await $.clock.now()) - x.kad > AIZPILDIT_MS) return
  await $.prompt.fill({ text: x.teksts })
}

/** Atceras, ka biji šajā sesijā: tā paliek vaļā arī citu sesiju paneļos kā iepriekšējā. */
async function apmeklets($: EngineInterface, id: string): Promise<void> {
  const apm = (await lasitStore<Record<string, number>>($, STORE_APMEKLETI)) ?? {}
  const nakamie = { ...apm, [id]: await $.clock.now() }
  await $.store.set(STORE_APMEKLETI, nakamie)
  await update($, apmekleti, () => nakamie)
}

/** Kartītes satura paraksts (statuss, darbi, atskaite, pēdējais notikums), lai pamanītu jaunumus. */
function paraksts(s: Sesija, an: Analizes, at: Atskaites, nt: Record<string, number>): string {
  const r = an[s.id]?.isGatava ? an[s.id] : undefined
  return JSON.stringify([
    s.status,
    r?.tev.map(d => d.darbs) ?? [],
    r?.claude.map(d => d.darbs) ?? [],
    at[s.id]?.laiks ?? 0,
    notikums(s, nt),
  ])
}

/**
 * Vai kartītē ir kas JAUNS pret redzēto: sesija pabeidza darbu vai jautā, jauns darbs vai prompts, jaunāka atskaite
 * vai statuss, kurā sesija sāk gaidīt lietotāju. Noņemšana vai notīrīšana nav jaunums.
 */
function irJaunumi(redzets: string | undefined, tagad: string): boolean {
  if (redzets === undefined || redzets === tagad) return false
  try {
    const [st0, tev0, cl0, at0, last0] = JSON.parse(redzets) as [string, string[], string[], number, number?]
    const [st1, tev1, cl1, at1, last1] = JSON.parse(tagad) as [string, string[], string[], number, number?]
    if (at1 > at0) return true
    // Vecāks paraksts bez laika: pēc atjaunināšanas visas kartītes uzreiz nepulsē.
    if (last0 !== undefined && last1 !== undefined && last1 > last0) return true
    if (st1 !== st0 && !MIERIGI.has(st1)) return true
    return tev1.some(x => !tev0.includes(x)) || cl1.some(x => !cl0.includes(x))
  } catch {
    return true
  }
}

/** Vai divi darbi ir viens un tas pats (modelis to pašu mēdz uzrakstīt nedaudz citādi). */
function lidzigs(x: string, y: string): boolean {
  const n = (t: string) => t.toLowerCase().replace(/[^\p{L}\p{N}]+/gu, ' ').trim()
  const a = n(x)
  const b = n(y)
  return a === b || a.startsWith(b.slice(0, 24)) || b.startsWith(a.slice(0, 24))
}

/** Augšā sesija, kas pēdējā pabeidza darbu vai sāka jautāt. */
function kartot(sesijas: Sesija[], nt: Record<string, number>): Sesija[] {
  return [...sesijas].sort((x, y) => notikums(y, nt) - notikums(x, nt))
}

/** Kurā dienu grupā ir laiks (pret atjaunošanas brīdi): kā sānjoslā. */
function dienasGrupa(ms: number, tagad: number): 'sodien' | 'vakar' | 'nedela' | 'agrak' {
  const dienasSakums = (x: number) => {
    const d = new Date(x)
    d.setHours(0, 0, 0, 0)
    return d.getTime()
  }
  const starpiba = Math.round((dienasSakums(tagad || ms) - dienasSakums(ms)) / 86_400_000)
  if (starpiba <= 0) return 'sodien'
  if (starpiba === 1) return 'vakar'
  if (starpiba < 7) return 'nedela'
  return 'agrak'
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

const minute = (ms: number) => Math.floor(ms / 60_000)

// Claude artefakta saite: to atver aplikācijā (Artifact rīks "open"), nevis pārlūkā.
const ARTEFAKTS = /^https:\/\/(?:[a-z0-9-]+\.)?claude\.(?:ai|com)\/(?:code\/)?artifact\/[A-Za-z0-9_-]+/

/** Ko tieši "Atvērt" atvērs: saite bez https://, fails ar ~ mājas mapes vietā; garam paliek beigas. */
function atvertPadoms(merkis: string): string {
  const teksts = /^https?:\/\//.test(merkis) ? merkis.replace(/^https?:\/\//, '') : merkis.replace(/^\/Users\/[^/]+/, '~')
  return teksts.length > 48 ? `…${teksts.slice(-47)}` : teksts
}

function repoTeksts(r: Repo): string {
  const dalas = []
  if (r.ahead) dalas.push(t.repoCommiti(r.ahead))
  if (r.dirty) dalas.push(t.repoFaili(r.dirty))
  return `${r.nosaukums}: ${dalas.join(', ')}`
}

// Modeļa teksts nonāk ekrānā un citas sesijas promptā: termināļa vadības secības, neredzamās un tagu zīmes prom.
const VADIBAS_SECIBAS = /\x1b\[[0-?]*[ -/]*[@-~]|\x1b\][^\x07\x1b]*(?:\x07|\x1b\\)|\x1b[@-Z\\-_]/g
const NEREDZAMAS = /[\u0000-\u0008\u000b-\u001f\u007f​-‏‪-‮⁠-⁤﻿\u{e0000}-\u{e007f}]/gu

function tirs(text: string): string {
  return text.replace(VADIBAS_SECIBAS, '').replace(NEREDZAMAS, '').trim()
}

/** Darbu numuri (no 1) no modeļa atbildes; viss pārējais tiek ignorēts. */
function numuri(x: unknown): number[] {
  return (Array.isArray(x) ? x : []).map(Number).filter(n => Number.isInteger(n) && n > 0)
}

type Ieteikumi = { prompti: ClaudeDarbs[]; tev: TevDarbs[]; izdariti: number[]; nonemt: number[] }

/** Atbildes sagatavei, kas beidzas ar kolu, atstarpe galā: tur raksti savus vārdus. */
const atbildesBeigas = (x: string) => (/:$/.test(x) ? `${x} ` : x)

/**
 * Ko ➤ ieraksta laukā pie tava ☐: sesijas sagatavotā atbilde ("Pārskatīju …. Mans komentārs: "); vecākiem darbiem bez
 * tās pēc darbības vārda (Pārskati → Pārskatīju …), citādi lūgums palīdzēt. `isPaveikts` = atbilde par izdarītu darbu.
 */
function atbildesSagatave(td: TevDarbs): { teksts: string; isPaveikts: boolean } {
  const palidziba = /^(Palīdzi|Help)\b/i
  if (td.atbilde) return { teksts: td.atbilde, isPaveikts: !palidziba.test(td.atbilde) }
  const [vards = '', ...parejais] = td.darbs.split(' ')
  const pagatne = t.pagatne[vards.toLowerCase()]
  if (pagatne === undefined) return { teksts: t.izdari(td.darbs, td.sikak), isPaveikts: false }
  const kas = parejais.join(' ')
  return { teksts: t.atbildePaveikts(pagatne, kas, /^(izlem|decide)$/i.test(vards)), isPaveikts: true }
}

/** Sesijas atbilde par nākamajiem soļiem (JSON) → līdz 3 prompti, līdz 2 jauni darbi tev, izdarīto numuri. */
function parsetIeteikumus(text: string): Ieteikumi | null {
  const sakums = text.indexOf('{')
  const beigas = text.lastIndexOf('}')
  if (sakums < 0 || beigas <= sakums) return null
  try {
    const j = JSON.parse(text.slice(sakums, beigas + 1)) as {
      prompti?: { label?: unknown; prompt?: unknown }[]
      tev?: { darbs?: unknown; sikak?: unknown; atvert?: unknown; atbilde?: unknown }[]
      izdariti?: unknown
      nonemt?: unknown
    }
    const prompti = (Array.isArray(j.prompti) ? j.prompti : [])
      .filter(p => typeof p?.prompt === 'string' && tirs(p.prompt) !== '')
      .slice(0, MAX_PROMPTI)
      .map(p => {
        const prompts = tirs(String(p.prompt)).slice(0, 1000)
        const label = typeof p.label === 'string' && tirs(p.label) !== '' ? tirs(p.label) : prompts
        return { darbs: isis(label, 80), prompts }
      })
    const tev = (Array.isArray(j.tev) ? j.tev : [])
      .filter(d => typeof d?.darbs === 'string' && tirs(d.darbs) !== '')
      .slice(0, 2)
      .map(d => ({
        darbs: isis(tirs(String(d.darbs)), 100),
        sikak: typeof d.sikak === 'string' ? tirs(d.sikak).slice(0, 500) : '',
        atvert: typeof d.atvert === 'string' ? tirs(d.atvert) : '',
        ...(typeof d.atbilde === 'string' && tirs(d.atbilde) !== '' ? { atbilde: atbildesBeigas(tirs(d.atbilde).slice(0, 300)) } : {}),
      }))
    return { prompti, tev, izdariti: numuri(j.izdariti), nonemt: numuri(j.nonemt) }
  } catch {
    return null
  }
}

/** Modeļa aplēse {"min": 4, "soli": 20} → skaitļi saprātīgās robežās; nesaprotama = null. */
function parsetNovertejumu(text: string): { min: number; soli: number } | null {
  const sakums = text.indexOf('{')
  const beigas = text.lastIndexOf('}')
  if (sakums < 0 || beigas <= sakums) return null
  try {
    const j = JSON.parse(text.slice(sakums, beigas + 1)) as { min?: unknown; soli?: unknown }
    const min = Number(j.min)
    const soli = Number(j.soli)
    if (!Number.isFinite(min) || min <= 0) return null
    return { min: Math.min(240, Math.max(0.2, min)), soli: Number.isFinite(soli) && soli > 0 ? Math.min(1000, Math.round(soli)) : 0 }
  } catch {
    return null
  }
}

/**
 * Cik reizes patiesība pēdējos gājienos atšķīrās no aplēses (mediāna, 0.3 līdz 5): ar to koriģē nākamās aplēses, tāpēc
 * josla kļūst precīzāka, jo vairāk gājienu. Mazāk par 3 pabeigtiem = 1.
 */
function koeficients(ilgumi: readonly Ilgums[], lauks: 'min' | 'soli'): number {
  const attiecibas = ilgumi
    .slice(-20)
    .map(x => (lauks === 'min' ? (x.n > 0 ? x.f / x.n : Number.NaN) : x.ns > 0 && x.fs > 0 ? x.fs / x.ns : Number.NaN))
    .filter(Number.isFinite)
    .sort((a, b) => a - b)
  if (attiecibas.length < 3) return 1
  return Math.min(5, Math.max(0.3, attiecibas[Math.floor(attiecibas.length / 2)] as number))
}

let majasMape: string | undefined

/** Lietotāja mājas mape (`~/…` ceļiem); vienreiz no vides. */
async function majas($: EngineInterface): Promise<string> {
  if (majasMape === undefined) {
    const r = await $.process.run(['/usr/bin/printenv', 'HOME']).catch(() => undefined)
    majasMape = r?.exitCode === 0 ? r.stdout.trim() : ''
  }
  return majasMape
}

/**
 * Atstāj tikai https saites un failus, kas tiešām eksistē: `~/…` sasien ar mājas mapi, relatīvos ar sesijas mapi,
 * `file://` noņem.
 */
async function parbauditAtvert($: EngineInterface, s: Sesija, atvert: string): Promise<string> {
  if (atvert === '') return ''
  if (/^https:\/\//.test(atvert)) return atvert
  let merkis = atvert.replace(/^file:\/\//, '')
  try {
    merkis = decodeURI(merkis)
  } catch {
    // neko: ceļš paliek, kā bija
  }
  if (merkis.startsWith('~/')) {
    const m = await majas($)
    merkis = m ? `${m}/${merkis.slice(2)}` : ''
  }
  const cels = merkis.startsWith('/') ? merkis : merkis && s.cwd ? `${s.cwd}/${merkis.replace(/^\.\//, '')}` : ''
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

/** Paziņojuma rinda panelī (ar laiku, lai pēc ZINAS_ILGUMS_MS pazūd pati). */
async function zinot($: EngineInterface, teksts: string): Promise<void> {
  await update($, zinja, () => isis(teksts, 240))
  await update($, atsaukt, () => '')
  const kad = await $.clock.now()
  await update($, zinjaLaiks, () => kad)
}

/** Aplikācijas atteikums cilvēka valodā: klasifikatora garais teksts → ka vajag atļauju. */
function atteikums(teksts: string): string {
  return /classifier/i.test(teksts) ? t.vajagAtlauju : isis(teksts, 140)
}

/**
 * Vai vērtība nav mainījusies: tad atomu neatjauno. Katra pārzīmēšana pogām dod jaunus rokturus, un spiediens uz
 * vecā zīmējuma pogu aplikācijā pazūd ("ui_press not handled"), tāpēc lieku pārzīmēšanu nedarām. (Atomu jāraksta
 * pašā izsaukuma vietā: stāvokļa bibliotēka pieņem tikai tādus.)
 */
const vienads = (x: unknown, y: unknown) => JSON.stringify(x) === JSON.stringify(y)

type RiksAtbilde = { isOk: boolean; teksts: string; ieraksts: unknown }

/**
 * Izsauc aplikācijas rīku (arhivēt, nosūtīt ziņu citai sesijai, Remote Control, atvērt failu panelī). Vispirms tieši
 * caur MCP serveri, jo tad rīkam nav jābūt ielādētam šajā sesijā; ja tas neiet, caur parasto rīka izsaukumu.
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

let pedejaisStatuss: string | undefined
// Moduļa pirmā atjaunošana pēc ielādes vai pārlādes: panelis jāpārzīmē obligāti. Citādi aplikācija rāda veco
// zīmējumu, kura pogas pieder iepriekšējai moda kopijai, un spiediens pazūd ("ui_press not handled"), līdz dati mainās.
let isJaunsModulis = true

async function atjaunot($: EngineInterface): Promise<void> {
  const sis = await $.session.id()
  const r = await $.process.run(['python3', `${$.plugin.root}/hooks/dati.py`, sis, repoMapes])
  const now = await $.clock.now()
  const veca = await read($, dati)
  if (r.exitCode !== 0) {
    const arKludu = { ...veca, kluda: isis(r.stderr, 300), laiks: now }
    if (!vienads(veca, arKludu)) await update($, dati, () => arKludu)
    return
  }
  const j = JSON.parse(r.stdout) as Pick<ValejieDati, 'sesijas' | 'repo'>
  const arh = (await lasitStore<Record<string, number>>($, STORE_ARHIVETIE)) ?? {}
  if (Object.keys(arh).length > 0) {
    const vel = Object.fromEntries(
      Object.entries(arh).filter(([id, kad]) => now - kad < ARHIVETIE_MS && j.sesijas.some(s => s.id === id)),
    )
    if (!vienads(arh, vel)) await $.store.set(STORE_ARHIVETIE, vel)
    j.sesijas = j.sesijas.filter(s => vel[s.id] === undefined)
  }
  // Pārzīmē tikai tad, ja mainījies kaut kas redzams (vai diena). Katra pārzīmēšana padara vecās pogas nederīgas, un
  // neaktīvā logā ekrānā paliek vecais zīmējums: pirmais klikšķis tad aiziet tukšā. Tāpēc neskaita pēdējās darbības
  // laiku (strādājošai sesijai tas mainās nepārtraukti) un sakļauto sesiju gaitu (tā nav redzama).
  const atzS = (await lasitStore<Atzimes>($, STORE_ATZIMES)) ?? {}
  const apmS = (await lasitStore<Record<string, number>>($, STORE_APMEKLETI)) ?? {}
  const ieprieksS = iepriekseja(j.sesijas, apmS)
  const isRedzama = (s: Sesija) => s.sis || s.id === ieprieksS || atzS[s.id]?.veids === 'vala'
  const zimejamais = (x: Pick<ValejieDati, 'sesijas' | 'repo'>, kluda: string) =>
    JSON.stringify([x.sesijas.map(s => ({ ...s, last: 0, gaita: isRedzama(s) ? s.gaita : null })), x.repo, kluda])
  // Redzamai strādājošai sesijai "vēl ~N min" jāmainās katru minūti.
  const isRedzamaStrada = j.sesijas.some(s => isRedzama(s) && (s.stavoklis === 'busy' || s.stavoklis === 'shell'))
  const minute = (ms: number) => Math.floor(ms / 60_000)
  if (
    zimejamais(veca, veca.kluda) !== zimejamais(j, '') ||
    veca.laiks === 0 ||
    dienasSakums(veca.laiks) !== dienasSakums(now) ||
    (isRedzamaStrada && minute(veca.laiks) !== minute(now))
  ) {
    await update($, dati, () => ({ sesijas: j.sesijas, repo: j.repo, laiks: now, kluda: '' }))
  }

  // Analīzes, atzīmes un ķeksīši var būt mainīti citā sesijā: paņem kopīgo stāvokli no krātuves.
  await pievienotNoFaila($, j.sesijas)
  await izpilditKomandu($)
  const an = (await lasitStore<Analizes>($, STORE_ANALIZES)) ?? {}
  const a = (await lasitStore<Atzimes>($, STORE_ATZIMES)) ?? {}
  const iz = (await lasitStore<Izdariti>($, STORE_IZDARITI)) ?? {}
  const at = await iztiritAtskaites($, (await lasitStore<Atskaites>($, STORE_ATSKAITES)) ?? {}, an)
  const paslepti = (await lasitStore<Record<string, string>>($, STORE_PASLEPTI_REPO)) ?? {}
  if (!vienads(await read($, atskaites), at)) await update($, atskaites, () => at)
  if (!vienads(await read($, pasleptiRepo), paslepti)) await update($, pasleptiRepo, () => paslepti)
  const isRepoVala = (await lasitStore<boolean>($, STORE_REPO_VALA)) === true
  if ((await read($, repoVala)) !== isRepoVala) await update($, repoVala, () => isRepoVala)
  if (!vienads(await read($, analizes), an)) await update($, analizes, () => an)
  if (!vienads(await read($, atzimes), a)) await update($, atzimes, () => a)
  if (!vienads(await read($, izdariti), iz)) await update($, izdariti, () => iz)

  // Kad sesija pabeidza darbu vai sāka jautāt: no dzīvā procesa stāvokļa; glabā krātuvē, jo process vēlāk beidzas.
  // Jaunai sesijai sākumā pēdējā darbība. Kamēr sesija strādā, laiks nemainās (saraksts nelēkā, sakļautā neatveras).
  // Sesija bez dzīva procesa, kurā tomēr kaut kas notika (nebija neviena, kas to redzētu), dabū pēdējo darbību.
  const nt = (await lasitStore<Record<string, number>>($, STORE_NOTIKUMI)) ?? {}
  let isNtMainits = false
  for (const s of j.sesijas) {
    const ir = nt[s.id]
    let jauns: number | undefined
    if ((s.stavoklis === 'idle' || s.stavoklis === 'waiting') && s.stavoklisKops > (ir ?? 0)) jauns = s.stavoklisKops
    else if (ir === undefined) jauns = s.last
    else if (s.stavoklis === '' && s.last > ir + NEREDZETS_MS) jauns = s.last
    if (jauns !== undefined && jauns !== ir) {
      nt[s.id] = jauns
      isNtMainits = true
    }
  }
  for (const id of Object.keys(nt)) {
    if (!j.sesijas.some(s => s.id === id)) {
      delete nt[id]
      isNtMainits = true
    }
  }
  if (isNtMainits) await $.store.set(STORE_NOTIKUMI, nt)
  if (!vienads(await read($, notikumi), nt)) await update($, notikumi, () => nt)
  const nv = (await lasitStore<Record<string, Novertejums>>($, STORE_NOVERTEJUMI)) ?? {}
  if (!vienads(await read($, novertejumi), nv)) await update($, novertejumi, () => nv)

  // Sesijas, kuras redzam pirmo reizi, skaitās jau redzētas: pulsē tikai tas, kas mainās pēc tam. Sesija, kurā esi,
  // ir redzēta vienmēr. Ja kartītē kaut kas tikai pazuda (nav jaunums), redzētais tiek pielīdzināts.
  const red = (await lasitStore<Record<string, string>>($, STORE_REDZETI)) ?? {}
  let isRedMainits = false
  for (const s of j.sesijas) {
    const tagad = paraksts(s, an, at, nt)
    if (red[s.id] === tagad) continue
    if (!s.sis && red[s.id] !== undefined && irJaunumi(red[s.id], tagad)) continue
    red[s.id] = tagad
    isRedMainits = true
  }
  if (isRedMainits) await $.store.set(STORE_REDZETI, red)
  if (!vienads(await read($, redzeti), red)) await update($, redzeti, () => red)

  if ((await read($, zinja)) !== '' && now - (await read($, zinjaLaiks)) > ZINAS_ILGUMS_MS) {
    await update($, zinja, () => '')
    await update($, atsaukt, () => '')
  }

  const repoIzvele = (await lasitStore<Record<string, string>>($, STORE_REPO_SESIJAS)) ?? {}
  if (!vienads(await read($, repoSesijas), repoIzvele)) await update($, repoSesijas, () => repoIzvele)
  const padomi = (await lasitStore<boolean>($, STORE_PADOMI)) ?? radiPadomusNoklusejums
  if ((await read($, radiPadomus)) !== padomi) await update($, radiPadomus, () => padomi)

  // Tavu ☐ kārtas: pilna, kad visi izdarīti; jauna sākas, kad pēc tam parādās jauns darbs.
  const ka = (await lasitStore<Record<string, Karta>>($, STORE_KARTAS)) ?? {}
  let isKaMainits = false
  for (const s of j.sesijas) {
    const k = tavaKarta(s, an, iz, ka, now)
    const ir = ka[s.id]
    if (k.atverts === 0 && k.izdarits > 0 && !ir?.pilna) {
      ka[s.id] = { sakums: ir?.sakums ?? 0, pilna: true, kad: now }
      isKaMainits = true
    } else if (k.atverts > 0 && ir?.pilna) {
      ka[s.id] = { sakums: now, pilna: false, kad: now }
      isKaMainits = true
    }
  }
  if (isKaMainits) await $.store.set(STORE_KARTAS, ka)
  if (!vienads(await read($, kartas), ka)) await update($, kartas, () => ka)
  const apm = (await lasitStore<Record<string, number>>($, STORE_APMEKLETI)) ?? {}
  if (!vienads(await read($, apmekleti), apm)) await update($, apmekleti, () => apm)
  const bv = (await lasitStore<PanemtaBalva>($, STORE_BALVAS)) ?? { diena: 0, panemta: 0 }
  if (!vienads(await read($, balvas), bv)) await update($, balvas, () => bv)

  const sisS = j.sesijas.find(s => s.sis)
  if (
    sisS &&
    sisS.stavoklis === 'idle' &&
    sisS.stavoklisKops > (an[sisS.id]?.sakts ?? 0) &&
    now - sisS.stavoklisKops > IETEIKT_NOKAVETS_MS &&
    sisS.stavoklisKops !== ieteiktsPec &&
    !(await read($, parbauda)).includes(sisS.id)
  ) {
    ieteiktsPec = sisS.stavoklisKops
    void ieteikt($, atzimetAuto).catch(() => undefined)
  }

  const ieprieks = iepriekseja(j.sesijas, apm)
  const atvertas = j.sesijas.filter(s => {
    const k = tavaKarta(s, an, iz, ka, now)
    return !isSaklauta(s, a, nt, ieprieks, isVissIzdarits(s, k), ka[s.id]?.pilna ? (ka[s.id]?.kad ?? 0) : 0)
  }).length
  const jauta = j.sesijas.filter(s => s.stavoklis === 'waiting').length
  const dalas = []
  if (jauta) dalas.push(t.statussJauta(jauta))
  if (atvertas) dalas.push(t.statussGaida(atvertas))
  const redzamieRepo = j.repo.filter(r => paslepti[r.cels] !== r.sig)
  if (redzamieRepo.length) dalas.push(t.statussNenopusoti(redzamieRepo.length))
  const statuss = dalas.length ? `${t.statuss}: ${dalas.join(' · ')} (/darbi)` : undefined
  if (statuss !== pedejaisStatuss) {
    pedejaisStatuss = statuss
    $.ui.status(statuss)
  }
  if (isJaunsModulis) {
    isJaunsModulis = false
    $.ui.invalidate('ui.render')
  }
}

/**
 * Gājiena sākumā: ātrs modelis no prompta novērtē minūtes un soļus; korekcija pēc pabeigtajiem gājieniem. No tā panelis
 * zīmē joslu un "vēl ~N min". Fonā, gājiens to negaida; tukšs prompts (turpinājums) bez aplēses.
 */
async function novertet($: EngineInterface, teksts: string, turnId: string): Promise<void> {
  if (teksts.trim() === '') return
  const s = (await read($, dati)).sesijas.find(x => x.sis)
  if (!s) return
  const sakts = await $.clock.now()
  const ilgumi = (await lasitStore<Ilgums[]>($, STORE_ILGUMI)) ?? []
  const piemeri = ilgumi.filter(x => x.s === s.id).slice(-3)
  const r = await $.model
    .complete({
      model: 'haiku',
      system: t.novertejumaSistema,
      prompt: t.novertejumaJautajums(s.title, teksts, piemeri),
      maxTokens: 60,
      timeoutMs: 20_000,
    })
    .catch(() => undefined)
  const p = r?.isAnswered ? parsetNovertejumu(r.text) : null
  if (!p) return
  const visi = (await lasitStore<Record<string, Novertejums>>($, STORE_NOVERTEJUMI)) ?? {}
  visi[s.id] = {
    turnId,
    sakts,
    min: p.min * koeficients(ilgumi, 'min'),
    soli: Math.round(p.soli * koeficients(ilgumi, 'soli')),
    rawMin: p.min,
    rawSoli: p.soli,
  }
  await $.store.set(STORE_NOVERTEJUMI, visi)
  await update($, novertejumi, () => visi)
}

/** Gājiena beigās: patiesais ilgums un soļi pret aplēsi, nākamo aplēšu korekcijai (pēdējie 60). */
async function pierakstitIlgumu($: EngineInterface, turnId: string, ilgumsMs: number): Promise<void> {
  const s = (await read($, dati)).sesijas.find(x => x.sis)
  if (!s) return
  const nv = ((await lasitStore<Record<string, Novertejums>>($, STORE_NOVERTEJUMI)) ?? {})[s.id]
  if (!nv || nv.turnId !== turnId || nv.rawMin <= 0) return
  const ilgumi = (await lasitStore<Ilgums[]>($, STORE_ILGUMI)) ?? []
  const jauns: Ilgums = { s: s.id, n: nv.rawMin, f: ilgumsMs / 60_000, ns: nv.rawSoli, fs: s.gaita?.soli ?? 0 }
  await $.store.set(STORE_ILGUMI, [...ilgumi, jauns].slice(-60))
}

let ieteikumuKarta = 0
// Pēc kura gājiena beigām (stavoklisKops) nākamie soļi jau mēģināti ieteikt no jauna.
let ieteiktsPec = 0
let atzimetAuto = true
// Pēdējais zīmējums katrā vietā un tā ievaddati (sk. ui.render).
const zimejumuKess = new Map<string, { paraksts: string; koks: RenderElement }>()
/**
 * Pēc katra gājiena šī sesija pati pasaka nākamos soļus: līdz 3 promptiem, jaunus darbus lietotājam un kuri viņa
 * atvērtie ☐ jau izdarīti. Fork redz visu sarunu no kešatmiņas (cena kā viena īsa atbilde); rezultāts nonāk kopīgajā
 * krātuvē, un to redz visu sesiju paneļi.
 */
async function ieteikt($: EngineInterface, isAtzimet: boolean): Promise<void> {
  const karta = ++ieteikumuKarta
  // Pēdējā nākamo soļu pieprasījuma iznākums diskā: panelī kļūda redzama tikai šai sesijai.
  const zurnals = async (x: Record<string, unknown>) =>
    $.fs
      .write(`${$.plugin.root}/.pedeja-ieteiksana.json`, JSON.stringify({ laiks: await $.clock.now(), ...x }, null, 2))
      .catch(() => undefined)
  const s = (await read($, dati)).sesijas.find(x => x.sis)
  if (!s?.cli) {
    await zurnals({ iznakums: 'nav šīs sesijas datos', sesijas: (await read($, dati)).sesijas.length })
    return
  }
  const esosa = ((await lasitStore<Analizes>($, STORE_ANALIZES)) ?? {})[s.id]
  const vecie = esosa?.isGatava ? esosa.tev : []
  const iz = (await lasitStore<Izdariti>($, STORE_IZDARITI)) ?? {}
  const atvertie = vecie.filter(d => iz[tevAtslega(s, d)] === undefined)
  const vesture = ((await lasitStore<Record<string, string[]>>($, STORE_VESTURE)) ?? {})[s.id] ?? []
  const noraiditi = (((await lasitStore<Record<string, string[]>>($, STORE_ATMESTI)) ?? {})[s.id] ?? []).slice(-10)
  await update($, parbauda, ids => [...ids.filter(id => id !== s.id), s.id])
  await zurnals({ sesija: s.title, iznakums: 'jautā' })
  try {
    let r: Awaited<ReturnType<EngineInterface['model']['fork']>>
    try {
      r = await $.model.fork({ prompt: t.ieteikumuJautajums(vards, atvertie.map(d => d.darbs), vesture, noraiditi) })
    } catch (err) {
      // Piemēram, vecāka aplikācijas versija bez fork: paliek iepriekšējie soļi, gājiena beigas neizgāžas.
      await zurnals({ sesija: s.title, iznakums: 'kļūda', kluda: String(err) })
      if (karta === ieteikumuKarta) await zinot($, t.neizdevasIeteikt(isis(String(err), 120)))
      return
    }
    // Pa to laiku beidzās jaunāks gājiens: tā ieteikumi būs svaigāki.
    if (karta !== ieteikumuKarta) {
      await zurnals({ sesija: s.title, iznakums: 'jaunāks gājiens' })
      return
    }
    const parsets = r.isAnswered ? parsetIeteikumus(r.text) : null
    if (!parsets) {
      await zurnals({
        sesija: s.title,
        iznakums: r.isAnswered ? 'nesaprotama atbilde' : r.reason,
        teksts: r.isAnswered ? r.text.slice(0, 1500) : '',
      })
      // Pārtraukts gājiens vai vēl nav ko forkot: klusi paliek iepriekšējie soļi.
      if (r.isAnswered) await zinot($, t.neizdevasIeteikt(t.nesaprotamaAtbilde))
      else if (r.reason === 'api-error') await zinot($, t.neizdevasIeteikt(r.reason))
      return
    }
    if (isAtzimet) {
      await atzimetAutomatiski(
        $,
        s,
        parsets.izdariti.map(n => atvertie[n - 1]).filter((d): d is TevDarbs => d !== undefined),
      )
    }
    const jauni = parsets.tev.filter(
      n => !vecie.some(v => lidzigs(v.darbs, n.darbs)) && !vesture.some(v => lidzigs(v, n.darbs)),
    )
    const parbauditi = await Promise.all(jauni.map(async d => ({ ...d, atvert: await parbauditAtvert($, s, d.atvert) })))
    // Neatzīmētie ☐ paliek (arī tikko automātiski atzīmētie, lai var atķeksēt atpakaļ), jaunie nāk klāt; prom tikai tie,
    // ko sesija sauc par ne tavējiem (Claude var pats) vai atkārtotiem. Ja par daudz, paliek jaunākie.
    const nonemtie = parsets.nonemt.map(n => atvertie[n - 1]).filter((d): d is TevDarbs => d !== undefined)
    const tev = [...atvertie.filter(d => !nonemtie.includes(d)), ...parbauditi].slice(-MAX_TEV)
    const visas = (await lasitStore<Analizes>($, STORE_ANALIZES)) ?? {}
    const izTagad = (await lasitStore<Izdariti>($, STORE_IZDARITI)) ?? {}
    // Prompti katru reizi jauni; paliek tikai paša lietotāja pieliktie, kamēr tie nav nosūtīti.
    const pasa = (visas[s.id]?.claude ?? []).filter(c => c.pats && izTagad[claudeAtslega(s, c)] === undefined)
    const claude = [
      ...pasa,
      ...parsets.prompti.filter(p => !pasa.some(x => lidzigs(x.darbs, p.darbs)) && !noraiditi.some(x => lidzigs(x, p.darbs))),
    ]
    visas[s.id] = {
      last: s.last,
      sakts: await $.clock.now(),
      isGatava: true,
      tev,
      claude,
      isPabeigts: tev.length + claude.length === 0,
    }
    await $.store.set(STORE_ANALIZES, visas)
    await update($, analizes, () => visas)
    await zurnals({
      sesija: s.title,
      iznakums: 'ierakstīts',
      prompti: claude.map(c => c.darbs),
      tev: parbauditi.map(d => d.darbs),
      izdariti: parsets.izdariti,
      nonemt: nonemtie.map(d => d.darbs),
    })
  } finally {
    await update($, parbauda, ids => ids.filter(id => id !== s.id))
  }
}

/**
 * Darbi, kas pēc sarunas jau izdarīti: atzīmē kā ☐ un ieraksta izdarīto atmiņā, bet bez klusās piezīmes
 * sesijai (tā to jau zina). Lietotājs var atķeksēt atpakaļ, ja modelis kļūdījās.
 */
async function atzimetAutomatiski($: EngineInterface, s: Sesija, darbi: TevDarbs[]): Promise<void> {
  if (darbi.length === 0) return
  const now = await $.clock.now()
  const iz = (await lasitStore<Izdariti>($, STORE_IZDARITI)) ?? {}
  const jauni = darbi.filter(d => iz[tevAtslega(s, d)] === undefined)
  if (jauni.length === 0) return
  const nakamie = { ...iz, ...Object.fromEntries(jauni.map(d => [tevAtslega(s, d), now])) }
  await $.store.set(STORE_IZDARITI, nakamie)
  await update($, izdariti, () => nakamie)
  const vesture = (await lasitStore<Record<string, string[]>>($, STORE_VESTURE)) ?? {}
  const bija = (vesture[s.id] ?? []).filter(x => !jauni.some(d => d.darbs === x))
  await $.store.set(STORE_VESTURE, { ...vesture, [s.id]: [...bija, ...jauni.map(d => d.darbs)].slice(-30) })
  await zinot($, t.autoIzdariti(jauni.map(d => d.darbs)))
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
  // Tavs ☐ (ne prompts ▷): sesijai klusa piezīme ar nākamo promptu un ieraksts atmiņā.
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

/** ✕ pie prompta: izņem to no kartītes un atceras, lai sesija to vairs neiesaka. */
async function atmestPromptu($: EngineInterface, s: Sesija, c: ClaudeDarbs): Promise<void> {
  const visas = (await lasitStore<Analizes>($, STORE_ANALIZES)) ?? {}
  const r = visas[s.id]
  if (r) visas[s.id] = { ...r, claude: r.claude.filter(x => x.darbs !== c.darbs) }
  await $.store.set(STORE_ANALIZES, visas)
  await update($, analizes, () => visas)
  const atmesti = (await lasitStore<Record<string, string[]>>($, STORE_ATMESTI)) ?? {}
  await $.store.set(STORE_ATMESTI, { ...atmesti, [s.id]: [...(atmesti[s.id] ?? []), c.darbs].slice(-20) })
}

/**
 * Agrākā versija par "atskaiti" saglabāja arī pašu ▷ uzdevumu, kas pienāca mērķa sesijā. Tos atpazīst pēc tā, ka
 * teksts sakrīt ar kāda prompta tekstu, un izmet.
 */
async function iztiritAtskaites($: EngineInterface, at: Atskaites, an: Analizes): Promise<Atskaites> {
  const prompti = Object.values(an).flatMap(r => r.claude.map(c => c.prompts.trim()))
  const liekas = Object.keys(at).filter(id => prompti.includes((at[id]?.teksts ?? '').trim()))
  if (liekas.length === 0) return at
  const tiras = Object.fromEntries(Object.entries(at).filter(([id]) => !liekas.includes(id)))
  await $.store.set(STORE_ATSKAITES, tiras)
  return tiras
}

type Pievienojamie = {
  tev?: string[]
  claude?: { darbs?: string; prompts?: string }[]
  nonemt?: string[]
  // Kā ☐: izņem no kartītes un ieraksta izdarīto atmiņā, lai sesija to vairs nepiedāvā.
  izdarits?: string[]
}

/**
 * Pieliek (vai noņem) darbus sesijas kartītē: lietotājs no ievades lauka vai `.pievienot.json`. Pieliktie ir parasti
 * neatzīmēti darbi, tāpēc paliek arī pēc nākamā gājiena.
 */
async function pievienotDarbus($: EngineInterface, s: Sesija, p: Pievienojamie): Promise<void> {
  const visas = (await lasitStore<Analizes>($, STORE_ANALIZES)) ?? {}
  const veca = visas[s.id]?.isGatava ? (visas[s.id] as Analize) : undefined
  const izdarits = (p.izdarits ?? []).filter((x): x is string => typeof x === 'string')
  if (izdarits.length > 0) {
    const vesture = (await lasitStore<Record<string, string[]>>($, STORE_VESTURE)) ?? {}
    const bija = (vesture[s.id] ?? []).filter(x => !izdarits.includes(x))
    await $.store.set(STORE_VESTURE, { ...vesture, [s.id]: [...bija, ...izdarits].slice(-30) })
  }
  // Tikai noņemt, bet nav no kā: neveido tukšus soļus, kas aizstātu īstos.
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
      // Paša pieliktais paliek arī tad, kad sesija pēc gājiena uzraksta jaunus promptus.
      claude.push({ darbs: c.darbs.trim().slice(0, 2000), prompts: c.prompts.slice(0, 2000), pats: true })
    }
  }
  const nonemt = [...(p.nonemt ?? []), ...izdarits].filter((x): x is string => typeof x === 'string')
  const paliek = (darbs: string) => !nonemt.some(n => lidzigs(n, darbs))
  visas[s.id] = {
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
 * "nonemt": ["…"], "izdarits": ["…"], "nonemtAtskaiti": true }]. Pēc ielādes fails tiek izdzēsts.
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

/**
 * `.komanda.json` mapē: vienreizēja komanda visām kartītēm. Formāts: { "tiritClaude": true } izņem visus nākamos
 * promptus (tavi ☐ paliek); sesijas uzrakstīs jaunus pēc sava nākamā gājiena. Pēc izpildes fails tiek izdzēsts.
 */
async function izpilditKomandu($: EngineInterface): Promise<void> {
  const cels = `${$.plugin.root}/.komanda.json`
  if (!(await $.fs.exists(cels))) return
  let k: { tiritClaude?: boolean } = {}
  try {
    k = JSON.parse(await $.fs.read(cels)) as typeof k
  } catch {
    k = {}
  }
  await $.process.run(['/bin/rm', '-f', cels])
  if (!k.tiritClaude) return
  const visas = (await lasitStore<Analizes>($, STORE_ANALIZES)) ?? {}
  for (const [id, r] of Object.entries(visas)) visas[id] = { ...r, claude: [] }
  await $.store.set(STORE_ANALIZES, visas)
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

export const register: Register = (on, options) => {
  t = TEKSTI[options.valoda === 'en' ? 'en' : 'lv']
  vards = typeof options.vards === 'string' ? options.vards.trim() : ''
  repoMapes = typeof options.repoMapes === 'string' ? options.repoMapes : ''
  radiPadomusNoklusejums = options.radiPadomus !== false
  panelaPlatums = Math.max(30, Math.min(200, Math.round(Number(options.platums) || 60)))
  atzimetAuto = options.atzimetAutomatiski !== false
  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'darbi',
      description: t.komandasApraksts,
      argumentHint: '[padomi]',
    })
    void atjaunot($)
    $.clock.every(ATJAUNOT_MS, () => atjaunot($))
    $.clock.every(AIZPILDIT_PARBAUDE_MS, () => aizpilditGaidoso($).catch(() => undefined))
    if (options.atvertAutomatiski !== false) void $.ui.open({ id: PANE, title: t.panelis, columns: panelaPlatums })
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
    await $.ui.open({ id: PANE, title: t.panelis, columns: panelaPlatums })
    await atjaunot($)
    return { text: t.panelisAtverts }
  })

  // Auto režīma klasifikators spriež pēc sarunas, bet pogas spiediens panelī sarunā neparādās, tāpēc tas atteic.
  // Atļauj tikai šī moda paša izsaukumus (pogas); tie paši rīki no Claude iet caur parasto pārbaudi.
  on('tool.check', async ($, e, next) => {
    if (next.origin.plugin === 'valejie-darbi' && POGU_RIKI.has(String(e.tool))) {
      return { decision: 'allow', reason: t.pogasAtlauja }
    }
    // Artefakta atvēršana aplikācijā no "Atvērt" pogas: tikai "open", nekas cits.
    if (next.origin.plugin === 'valejie-darbi' && String(e.tool) === 'Artifact' && (e as { action?: unknown }).action === 'open') {
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
    await apmeklets($, sis.id)
    const visi = (await lasitStore<Record<string, string[]>>($, STORE_PAZINOJUMI)) ?? {}
    const darbi = visi[sis.id] ?? []
    if (darbi.length === 0) return next(e)
    const { [sis.id]: _nodoti, ...citi } = visi
    await $.store.set(STORE_PAZINOJUMI, citi)
    const piezime = t.piezime(vards, darbi)
    return next({ ...e, context: [...(e.context ?? []), piezime] })
  })

  // Gājiena beigās (fonā, gājiens to negaida): svaigi dati, tad šīs sesijas nākamie soļi. Pārtrauktam gājienam ne.
  // Ja moda kods pārlādējas gājiena vidū, tā gājiena beigas apstrādā vecā kopija un nepabeidz: soļi nāks pēc nākamā.
  // Gājiena sākumā laika aplēse joslai (fonā).
  on('turn.start', async ($, e, next) => {
    void novertet($, e.text, e.turnId).catch(() => undefined)
    return next(e)
  })

  on('turn.complete', async ($, e, next) => {
    const result = await next(e)
    if (e.reason === 'answer') {
      void (async () => {
        await atjaunot($)
        await pierakstitIlgumu($, e.turnId, e.durationMs)
        await ieteikt($, options.atzimetAutomatiski !== false)
      })().catch((err: unknown) =>
        $.fs.write(`${$.plugin.root}/.pedeja-ieteiksana.json`, JSON.stringify({ iznakums: 'kļūda pēc gājiena', kluda: String(err) }, null, 2)),
      )
    }
    return result
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const el = $.ui.resolve(e)
    const { Box, Text, Button, Link } = el
    const d = await read($, dati)
    const a = await read($, atzimes)
    const an = await read($, analizes)
    const iz = await read($, izdariti)
    const domajosas = await read($, parbauda)
    const izverstie = await read($, izversti)
    const at = await read($, atskaites)
    const paslepti = await read($, pasleptiRepo)
    const isRepoVala = await read($, repoVala)
    const ievadesNr = await read($, ievadesSkaits)
    const red = await read($, redzeti)
    const nt = await read($, notikumi)
    const nov = await read($, novertejumi)
    const msg = await read($, zinja)
    const atsauc = await read($, atsaukt)
    const repoIzvele = await read($, repoSesijas)
    const isPadomi = await read($, radiPadomus)
    const ka = await read($, kartas)
    const apm = await read($, apmekleti)
    const bv = await read($, balvas)
    // Ja nekas nav mainījies, atdod to pašu zīmējumu: tad pogām paliek tie paši rokturi, un klikšķis, kas pienāk pēc
    // aplikācijas pašas pārzīmēšanas (piemēram, aktivizējot logu), vēl trāpa. Katrs jauns koks = jauni rokturi.
    const kesasAtslega = `${e.surface}\u0000${e.requestId}`
    const zimesParaksts = JSON.stringify([
      (e.props as { bodyColumns?: unknown }).bodyColumns,
      d, a, an, iz, domajosas, izverstie, at, paslepti, isRepoVala, ievadesNr, red, nt, nov, msg, atsauc, repoIzvele, isPadomi, ka, apm, bv,
    ])
    const kesa = zimejumuKess.get(kesasAtslega)
    if (kesa?.paraksts === zimesParaksts) return kesa.koks
    const irAplikacija = 'Svg' in el
    // Sesija, kurā esi, stāv sarakstā savā vietā (kā aplikācijas sānjoslā), tikai ar iekrāsotu fonu.
    const saraksts = kartot(d.sesijas, nt)
    const ieprieks = iepriekseja(d.sesijas, apm)
    const kartaS = (s: Sesija) => tavaKarta(s, an, iz, ka, d.laiks)
    const sakl = (s: Sesija) => {
      const k = kartaS(s)
      return isSaklauta(s, a, nt, ieprieks, isVissIzdarits(s, k), ka[s.id]?.pilna ? (ka[s.id]?.kad ?? 0) : 0)
    }

    const pazinot = async (teksts: string) => {
      await zinot($, teksts)
      $.ui.toast(isis(teksts, 160), { timeoutMs: 6000 })
    }
    const isJauns = (s: Sesija) => !s.sis && irJaunumi(red[s.id], paraksts(s, an, at, nt))
    // lietotājs kaut ko darīja ar kartīti: tās pašreizējais saturs skaitās redzēts, punkts vairs nepulsē.
    const apskatits = async (s: Sesija) => {
      if (!isJauns(s)) return
      const visi = (await lasitStore<Record<string, string>>($, STORE_REDZETI)) ?? {}
      const nakamie = { ...visi, [s.id]: paraksts(s, an, at, nt) }
      await $.store.set(STORE_REDZETI, nakamie)
      await update($, redzeti, () => nakamie)
    }
    // Vispirms atver (pārslēgšanās sākas uzreiz), pieraksti pēc tam.
    const atvertSesiju = (s: Sesija) => async () => {
      const r = await $.process.run(['open', s.link])
      if (r.exitCode !== 0) await pazinot(t.neizdevasAtvertSesiju(r.stderr))
      await apmeklets($, s.id)
      await apskatits(s)
    }
    // Saite → pārlūks. Mape → Finder. Fails → Claude aplikācijas failu panelis blakus sarunai; ja tur nevar (nav šīs
    // sesijas mapē, sesija nav ekrānā), tad parāda to Finderī (ne VS Code, ne Xcode, kas .md atver lēni).
    const atvertSaiti = (merkis: string) => async () => {
      if (ARTEFAKTS.test(merkis)) {
        const r = (await $.tool.call({ tool: 'Artifact', action: 'open', url: merkis } as never).catch((err: unknown) => ({
          deny: String(err),
        }))) as { deny?: string; isError?: boolean; text?: string }
        await $.fs.write(`${$.plugin.root}/.pedeja-atvert.json`, JSON.stringify({ merkis, ka: 'artefakts', ...r }, null, 2))
        if (r.deny !== undefined || r.isError) await pazinot(t.neizdevasAtvertSaiti(atteikums(r.deny ?? r.text ?? '')))
        return
      }
      if (/^https?:\/\//.test(merkis)) {
        const r = await $.process.run(['open', merkis])
        if (r.exitCode !== 0) await pazinot(t.neizdevasAtvertSaiti(r.stderr))
        return
      }
      // Pēdējais "Atvērt" diskā, lai var nolasīt, ja poga atkal "neko nedara".
      const zurnals = (x: unknown) =>
        $.fs.write(`${$.plugin.root}/.pedeja-atvert.json`, JSON.stringify({ merkis, ...(x as object) }, null, 2))
      if ((await $.process.run(['test', '-d', merkis])).exitCode === 0) {
        const r = await $.process.run(['open', merkis])
        await zurnals({ ka: 'Finder (mape)', exitCode: r.exitCode, stderr: r.stderr })
        if (r.exitCode !== 0) await pazinot(t.neizdevasAtvertFailu(r.stderr))
        return
      }
      const panelis = await ccdRiks($, 'ccd_view', 'show_pane', { pane: 'file', path: merkis })
      const isPanelis = panelis.isOk && !/nothing|not open|isn't open|outside|not inside|own window/i.test(panelis.teksts)
      if (isPanelis) {
        await zurnals({ ka: 'failu panelis', panelis })
        return
      }
      const r = await $.process.run(['open', '-R', merkis])
      await zurnals({ ka: 'Finder', panelis, exitCode: r.exitCode, stderr: r.stderr })
      if (r.exitCode !== 0) await pazinot(t.neizdevasAtvertFailu(r.stderr))
    }
    // Pēdējā sesiju rīka atbilde diskā, lai to var nolasīt, ja kaut kas neiet.
    const rikaZurnals = (riks: string, s: Sesija, r: RiksAtbilde) =>
      $.fs.write(`${$.plugin.root}/.pedeja-riks.json`, JSON.stringify({ riks, sesija: s.id, ...r }, null, 2))
    const arhivet = (s: Sesija) => async () => {
      const r = await ccdRiks($, 'ccd_session_mgmt', 'archive_session', { session_id: s.id, reason: t.arhivesanasIemesls })
      if (r.isOk) {
        // Uzreiz prom no saraksta (arī citu sesiju paneļos), nevis tikai tad, kad aplikācija ieraksta failu.
        const arh = (await lasitStore<Record<string, number>>($, STORE_ARHIVETIE)) ?? {}
        await $.store.set(STORE_ARHIVETIE, { ...arh, [s.id]: await $.clock.now() })
        await update($, dati, x => ({ ...x, sesijas: x.sesijas.filter(y => y.id !== s.id) }))
      }
      await pazinot(r.isOk ? t.arhivets(s.title) : t.neizdevasArhivet(isis(s.title, 40), atteikums(r.teksts)))
      await rikaZurnals('archive_session', s, r)
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
      await rikaZurnals('send_message', s, r)
      if (!r.isOk) {
        await pazinot(t.neizdevasNosutit(isis(s.title, 40), atteikums(r.teksts)))
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
    // ➤ pie tava ☐ darba: nosūta to Claude tajā sesijā un pārvērš par nosūtītu promptu ✓ ("nodots").
    // ➤ pie tava ☐: atver to sesiju un ieraksta darbu tās ievades laukā kā promptu, lai vari pielāgot un nosūtīt.
    // Citā sesijā promptu ieraksta tās pašas sesijas mods (krātuvē gaida līdz 10 min).
    const nodotClaude = (s: Sesija, td: TevDarbs) => async () => {
      const { teksts: prompts, isPaveikts } = atbildesSagatave(td)
      if (s.sis) {
        await $.prompt.fill({ text: prompts })
        await pazinot(t.ierakstitsLauka)
      } else {
        const visi = (await lasitStore<Record<string, { teksts: string; kad: number }>>($, STORE_AIZPILDIT)) ?? {}
        await $.store.set(STORE_AIZPILDIT, { ...visi, [s.id]: { teksts: prompts, kad: await $.clock.now() } })
        const r = await $.process.run(['open', s.link])
        if (r.exitCode !== 0) await pazinot(t.neizdevasAtvertSesiju(r.stderr))
        else await pazinot(t.ierakstitsSesijas(isis(s.title, 40)))
        await apmeklets($, s.id)
      }
      // Atbilde par paveikto: tavs darbs izdarīts (ieskaitās aplī, var atsaukt). Lūgums palīdzēt: darbs pāriet Claude.
      if (isPaveikts) {
        await atzimetTavu(tevAtslega(s, td), td.darbs)
        await apskatits(s)
        return
      }
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
    // ▷ pie prompta: nosūta uzreiz (citai sesijai ziņu, šajā sesijā iesniedz kā tavu promptu, rindā, ja Claude strādā).
    const palaistPromptu = (s: Sesija, c: ClaudeDarbs) => async () => {
      if (await sutitSesijai(s, c.prompts)) await parslegtIzdaritu($, claudeAtslega(s, c), true)
    }
    // ▾ sakļauj kartīti uz vietas (viena rinda), ▸ to atver. Sakļauta atveras pati, kad sesija ko pabeidz vai jautā.
    const saklaut = (s: Sesija) => async () => {
      await apskatits(s)
      await atzimet($, s, { veids: 'gatavs', last: s.last, kad: await $.clock.now() })
    }
    const izverst = (s: Sesija) => async () => atzimet($, s, { veids: 'vala', last: s.last, kad: await $.clock.now() })

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

    // Sesijas punkts, katram viena nozīme: jautā tev (mirgo dzeltens), strādā (mirgo pelēks), ir kaut kas jauns,
    // ko neesi redzējis (mirgo zils), citādi tukšs aplītis kā sānjoslā.
    const sesijasPunkts = (s: Sesija) => {
      if (s.stavoklis === 'waiting') return pulss('gaida')
      if (s.stavoklis === 'busy' || s.stavoklis === 'shell') return pulss('bez')
      if (isJauns(s)) return pulss('turpinat')
      return 'Svg' in el ? (
        <el.Svg source={tukssPunktsSvg()} alt={t.nekaJauna} width={10} height={10} />
      ) : (
        <Text dimColor>○</Text>
      )
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
            // Virs pogas: zemāk to pārklātu nākamā rinda (tā zīmējas vēlāk).
            top={-1}
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

    type Poga = { key: string; ikona: PogasIkona; padoms: string; onPress: () => unknown }
    // Visas galvenes pogas labajā pusē fiksētās vietās (šaurā panelī stāv vienā kolonnā): atvērtai + un ▾,
    // sakļautai 🗄 (arhivēt, lai nenospiestu nejauši atvērtā) un ▸.
    const galvasPogas = (s: Sesija, isSakl: boolean): Poga[] => {
      const p = (ikona: PogasIkona, padoms: string, onPress: () => unknown): Poga => ({
        key: `${ikona}:${s.id}`,
        ikona,
        padoms,
        onPress,
      })
      const ievade = () =>
        update($, izversti, x =>
          x.includes(`${s.id}:ievade`) ? x.filter(y => y !== `${s.id}:ievade`) : [...x, `${s.id}:ievade`],
        )
      if (isSakl) {
        return [...(s.sis ? [] : [p('arhivet', t.padoms.arhivet, arhivet(s))]), p('izverst', t.padoms.izverst, izverst(s))]
      }
      return [...('Input' in el ? [p('pievienot', t.padoms.jaunsDarbs, ievade)] : []), p('saklaut', t.padoms.saklaut, saklaut(s))]
    }
    // Aplikācijā Lucide ikona un virs tās neredzama poga (pogā der tikai teksts); terminālī teksta zīme.
    const ikonasPoga = (p: Poga) =>
      'Svg' in el ? (
        // Pogai platums nav ierobežots (citādi tā savu neredzamo tekstu nogriež ar "…"); lieko nogriež ārējā kaste.
        <Box
          key={`ip:${p.key}`}
          position="relative"
          width={3}
          height={1}
          flexShrink={0}
          justifyContent="center"
          alignItems="center"
          overflow="hidden"
        >
          <el.Svg source={poguIkonaSvg(p.ikona)} alt={p.padoms} width={16} height={16} />
          <Box position="absolute" top={0} left={0}>
            <Button key={p.key} plain label={NEREDZAMA} onPress={p.onPress} />
          </Box>
        </Box>
      ) : (
        <Button key={p.key} plain label={IKONA[p.ikona]} onPress={p.onPress} />
      )

    type DarbaRinda = {
      s: Sesija
      i: number
      veids: 't' | 'c'
      darbs: string
      sikak: string
      atvert: string
      isAtzimets: boolean
      padoms: string
      onKeksis: () => unknown
      onNodot?: () => unknown
      onAtmest?: () => unknown
    }
    // Ķeksītis (vai ▷) ir atsevišķa poga. Darba teksts arī ir poga: uzspiežot to, zem tā atveras pilnais teksts un
    // detaļas vairākās rindās (pogas teksts pats nepāriet jaunā rindā, parasts teksts pāriet).
    const darbaRinda = (d: DarbaRinda) => {
      const id = `${d.s.id}:${d.veids}${d.i}`
      const isIzverts = izverstie.includes(id)
      const pilnais = [d.darbs.length > 45 ? d.darbs : '', d.sikak].filter(Boolean)
      const isTev = d.veids === 't'
      const pogasKey = isTev ? `keksis:${d.s.id}:${d.i}` : `turpini:${d.s.id}:${d.i}`
      return (
        <Box key={`darbs:${id}`} flexDirection="row" gap={1} alignItems="flex-start">
          {/* Tev: ☐ ķeksītis. Prompts: ▷, kas citā sesijā to nosūta un kļūst par ✓. */}
          {arPadomu(
            pogasKey,
            d.padoms,
            <Button
              key={pogasKey}
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
              atvertPadoms(d.atvert),
              // Artefaktu atver aplikācijā (poga); citu https saiti atver pati aplikācija pārlūkā (Link), jo `open` no
              // moda procesa to klusi nedarīja.
              /^https:\/\//.test(d.atvert) && !ARTEFAKTS.test(d.atvert) ? (
                <Link key={`atvert-darbu:${d.s.id}:${d.i}`} href={d.atvert} label={t.atvertPoga} />
              ) : (
                <Button key={`atvert-darbu:${d.s.id}:${d.i}`} label={t.atvertPoga} dimColor onPress={atvertSaiti(d.atvert)} />
              ),
            )}
        </Box>
      )
    }

    // Atzīmēts ☐ vai nosūtīts ▷ pazūd no kartītes uzreiz.
    const isPazudis = (atslega: string) => iz[atslega] !== undefined
    // Tā kā ☐ pazūd uzreiz, paziņojuma rindā ir "Atsaukt" (nejaušam klikšķim).
    const atzimetTavu = async (atslega: string, darbs: string) => {
      await parslegtIzdaritu($, atslega, true)
      await zinot($, t.atzimets(darbs))
      await update($, atsaukt, () => atslega)
    }
    const aizvertZinju = async () => {
      await update($, zinja, () => '')
      await update($, atsaukt, () => '')
    }
    const darbuRindas = (s: Sesija) => {
      const r = an[s.id]
      const isDoma = domajosas.includes(s.id)
      if (!r?.isGatava) {
        const rezerve = s.needs || s.nakamie || s.detail
        return <Text dimColor>{isDoma ? t.doma : rezerve ? isis(rezerve, 200) : t.pecGajiena}</Text>
      }
      // Numurs `i` paliek no pilnā saraksta: pogu atslēgas nemainās, kad atzīmētie pazūd.
      // Ne vairāk par 3 taviem (jaunākie) un 2 ieteiktiem promptiem; paša pieliktie prompti vienmēr.
      const tev = r.tev
        .map((td, i) => ({ td, i }))
        .filter(x => !isPazudis(tevAtslega(s, x.td)))
        .slice(-MAX_TEV)
      const prompti = r.claude
        .map((c, i) => ({ c, i }))
        .filter(x => !isPazudis(claudeAtslega(s, x.c)))
        .filter((x, _, visi) => x.c.pats || visi.filter(y => !y.c.pats).indexOf(x) < MAX_PROMPTI)
      if (tev.length + prompti.length === 0) return <Text dimColor>{isDoma ? t.doma : t.nekasVairs}</Text>
      return (
        <Box flexDirection="column">
          {isDoma && <Text dimColor>{t.doma}</Text>}
          {tev.length > 0 && (
            <Box flexDirection="column">
              <Box flexDirection="column" flexGrow={1} flexShrink={1} minWidth={0}>
                {tev.map(({ td, i }) => {
                  const isAtzimets = iz[tevAtslega(s, td)] !== undefined
                  return darbaRinda({
                    s,
                    i,
                    veids: 't',
                    darbs: td.darbs,
                    sikak: td.sikak,
                    atvert: td.atvert,
                    isAtzimets,
                    padoms: isAtzimets ? t.padoms.atcelt : t.padoms.izdarits,
                    onKeksis: () => atzimetTavu(tevAtslega(s, td), td.darbs),
                    onNodot: nodotClaude(s, td),
                  })
                })}
              </Box>
            </Box>
          )}
          {/* Nākamie prompti (kā next-steps): ▷, ✕ un teksts, kas izvēršot rāda visu promptu. ☐ ir tavs, ▷ Claude. */}
          {prompti.length > 0 && (
            <Box flexDirection="column">
              <Box flexDirection="column" flexGrow={1} flexShrink={1} minWidth={0}>
                {prompti.map(({ c, i }) => {
                  const isNosutits = iz[claudeAtslega(s, c)] !== undefined
                  return darbaRinda({
                    s,
                    i,
                    veids: 'c',
                    darbs: c.darbs,
                    sikak: t.nosutis(c.prompts),
                    atvert: '',
                    isAtzimets: isNosutits,
                    padoms: isNosutits ? t.padoms.nosutits : t.padoms.nosutit,
                    onKeksis: isNosutits ? () => undefined : palaistPromptu(s, c),
                    onAtmest: () => atmestPromptu($, s, c),
                  })
                })}
              </Box>
            </Box>
          )}
        </Box>
      )
    }

    // Sesijas atsūtītā atskaite: pirmā rinda kā poga (uzspiežot atveras viss teksts), ✕ to aizver.
    const atskaitesBloks = (s: Sesija) => {
      const r = at[s.id]
      if (!r) return null
      const id = `${s.id}:atskaite`
      const isIzverts = izverstie.includes(id)
      const pirma = r.teksts.split('\n').find(x => x.trim() !== '') ?? ''
      return (
        <Box flexDirection="row" marginTop={1} gap={1} alignItems="flex-start">
          <Text color={KRASA.gatavs}>{laiks(r.laiks)}</Text>
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
        {/* Virsraksts ar bultiņu kā sānjoslas grupai; sakļautā redzams tikai skaits. */}
        <Box flexDirection="row" gap={1} alignItems="center">
          {virsraksts('repo', t.nenopusots, redzamieRepo.length)}
          {arPadomu(
            isRepoVala ? 'repo-saklaut' : 'repo-izverst',
            isRepoVala ? t.padoms.saklaut : t.padoms.izverst,
            ikonasPoga({
              key: isRepoVala ? 'repo-saklaut' : 'repo-izverst',
              ikona: isRepoVala ? 'saklaut' : 'izverst',
              padoms: isRepoVala ? t.padoms.saklaut : t.padoms.izverst,
              onPress: async () => {
                await $.store.set(STORE_REPO_VALA, !isRepoVala)
                await update($, repoVala, () => !isRepoVala)
              },
            }),
          )}
        </Box>
        {isRepoVala && pasleptoSkaits > 0 && (
          <Box flexDirection="row" gap={1} alignItems="center">
            <Text dimColor>{t.paslepti(pasleptoSkaits)}</Text>
            <Button key="radit-paslepto" plain dimColor label={t.radit} onPress={raditPaslepto} />
          </Box>
        )}
        {isRepoVala &&
          redzamieRepo.map((r, i) => {
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

    // + kartītes galvenē atver ievades lauku. ✓ vai Enter saglabā tekstu kā tavu ☐ darbu ("c:" priekšā: prompts ▷,
    // kas paliek, līdz to nosūta), ➤ to uzreiz nosūta Claude tajā sesijā. Pēc tam lauks aizveras un ir tukšs.
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
    // Lauks sākas tur, kur ķeksīši; ✓ un ➤ uzreiz aiz tā. Lauka platumu nosaka aplikācija (Input nav platuma
    // iestatījuma), tāpēc to neietin platā kastē, kas pogas aizbīdītu pie malas.
    const ievadesRinda = (s: Sesija) =>
      'Input' in el && izverstie.includes(`${s.id}:ievade`) ? (
        <Box flexDirection="row" marginBottom={1} gap={1} alignItems="center">
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

    // Progresa josla: aizpildītā un tukšā daļa, abas pa visu atlikušo platumu (zīmju virkni nogriež kastes mala).
    // Paneļa platums rakstzīmēs (nosaukumu saīsināšanai un termināļa joslai).
    const kolonnas = Number((e.props as { bodyColumns?: unknown }).bodyColumns) || 60
    // Progresa josla: aplikācijā plāns SVG pa visu platumu, kas pats aizpildās līdz `lidz` `sekundes` laikā;
    // terminālī zīmju rinda paneļa platumā.
    const josla = (dala: number, lidz: number, sekundes: number) => {
      if ('Svg' in el) {
        return (
          <el.Svg
            source={joslasSvg(dala, lidz, sekundes, KRASA.turpinat)}
            alt={`${Math.round(dala * 100)}%`}
            height={4}
            isInteractive
          />
        )
      }
      const garums = Math.max(10, kolonnas - 6)
      const pilns = Math.round(Math.min(1, Math.max(0, dala)) * garums)
      return (
        <Box flexDirection="row">
          <Text color={KRASA.turpinat}>{'━'.repeat(pilns)}</Text>
          <Text dimColor>{'─'.repeat(garums - pilns)}</Text>
        </Box>
      )
    }
    // Ko sesija dara tagad: strādājot darbība, soļi, laiks un josla pēc aplēses; jautājot jautājums vai atļauja.
    const gaitasBloks = (s: Sesija) => {
      const g = s.gaita
      if (s.stavoklis === 'waiting') {
        const teksts = g?.jautajums
          ? t.jautaTeksts(g.jautajums)
          : g?.gaidaAtlauju && g.riks
            ? t.gaidaAtlaujuTeksts(t.darbiba(g.riks, g.merkis))
            : ''
        return teksts === '' ? null : (
          <Box paddingLeft={1} paddingRight={1}>
            <Text color={KRASA.gaida} wrap="truncate-end">
              {teksts}
            </Text>
          </Box>
        )
      }
      if (s.stavoklis !== 'busy' && s.stavoklis !== 'shell') return null
      const nv = nov[s.id]
      // Aplēse der tikai šim darba posmam (taisīta, kad sesija sāka strādāt).
      const ap = nv && nv.min > 0 && nv.sakts >= s.stavoklisKops - 60_000 ? nv : undefined
      const pagajis = Math.max(0, (d.laiks - (ap?.sakts ?? s.stavoklisKops)) / 60_000)
      const kreisi = [g?.riks ? t.darbiba(g.riks, g.merkis) : '', g ? t.soli(g.soli, ap?.soli ?? 0) : '']
        .filter(Boolean)
        .join(' · ')
      const labi = ap
        ? pagajis < ap.min
          ? t.atlicis(Math.max(1, Math.ceil(ap.min - pagajis)))
          : t.ilgak(Math.max(1, Math.round(pagajis)))
        : t.stradaMin(Math.max(1, Math.round(pagajis)))
      return (
        <Box flexDirection="column" paddingLeft={1} paddingRight={1}>
          <Box flexDirection="row" gap={1}>
            <Box flexGrow={1} flexShrink={1} minWidth={0}>
              <Text dimColor wrap="truncate-end">
                {kreisi}
              </Text>
            </Box>
            {/* Laiks vienmēr vienā rindā; saīsinās darbības teksts pa kreisi. */}
            <Box flexShrink={0}>
              <Text dimColor wrap="truncate-end">
                {labi}
              </Text>
            </Box>
          </Box>
          {/* Kamēr strādā, josla nekad nav pilna (līdz 97 % pie aplēstā beigu laika); pārsniedzot aplēsi, pilna. */}
          {ap &&
            (pagajis < ap.min
              ? josla(pagajis / ap.min, 0.97, (ap.min * 0.97 - pagajis) * 60)
              : josla(1, 1, 0))}
        </Box>
      )
    }

    // Nosaukums saīsināts pēc paneļa platuma, lai pogas labajā pusē vienmēr ir savā vietā.
    const nosaukumaGarums = (s: Sesija) => {
      const uzraksts = s.stavoklis === 'waiting' ? t.jauta.length + 1 : s.stavoklis === 'busy' || s.stavoklis === 'shell' ? t.strada.length + 1 : 0
      return Math.max(12, kolonnas - 12 - uzraksts - progresaGarums(s))
    }
    const isStrada = (s: Sesija) => s.stavoklis === 'busy' || s.stavoklis === 'shell'
    // Tavu ☐ progress rindā: aplis un "2/3"; kad viss izdarīts, zaļš aplis ar ķeksīti.
    const progresaTeksts = (s: Sesija) => {
      const k = kartaS(s)
      if (k.izdarits + k.atverts === 0) return ''
      const x = `${k.izdarits}/${k.izdarits + k.atverts}`
      return isVissIzdarits(s, k) && !irAplikacija ? `✓ ${x}` : x
    }
    // Fiksēts platums ("12/13" + aplis), aplis pie pogām: apļi visās rindās stāv vienā kolonnā, skaitļi pa labi.
    const PROGRESA_PLATUMS = 8
    const progresaGarums = (s: Sesija) => (progresaTeksts(s) === '' ? 0 : PROGRESA_PLATUMS + 1)
    const progress = (s: Sesija) => {
      const k = kartaS(s)
      const x = progresaTeksts(s)
      if (x === '') return null
      const isViss = isVissIzdarits(s, k)
      return (
        <Box
          key={`progress:${s.id}`}
          flexDirection="row"
          gap={1}
          alignItems="center"
          justifyContent="flex-end"
          flexShrink={0}
          width={PROGRESA_PLATUMS}
        >
          <Text color={k.izdarits > 0 ? ZALS : undefined} dimColor={k.izdarits === 0}>
            {x}
          </Text>
          {irAplikacija && (
            <el.Svg
              source={isViss ? pilnsAplisSvg() : aplisSvg(k.izdarits / (k.izdarits + k.atverts))}
              alt={isViss ? t.vissIzdarits(k.izdarits) : t.progresaAlt(k.izdarits, k.izdarits + k.atverts)}
              width={16}
              height={16}
            />
          )}
        </Box>
      )
    }
    // "3 izdarīti šajā sesijā ▸": uzspiežot redzami pašā kārtā izdarītie tavi darbi (jaunākie augšā).
    const izdaritieBloks = (s: Sesija) => {
      const k = kartaS(s)
      if (k.izdarits === 0) return null
      const prefikss = `${s.id}|t|`
      const darbi = Object.entries(iz)
        .filter(([x, kad]) => x.startsWith(prefikss) && kad >= k.no)
        .sort((x, y) => y[1] - x[1])
        .map(([x]) => x.slice(prefikss.length))
      const id = `${s.id}:izdariti`
      const isIzverts = izverstie.includes(id)
      return (
        <Box flexDirection="column" marginTop={1}>
          <Box flexDirection="row" gap={1}>
            <Text color={ZALS}>✓</Text>
            <Button
              key={`izdariti:${s.id}`}
              plain
              label={`${t.izdaritiSesija(k.izdarits)} ${isIzverts ? '▾' : '▸'}`}
              onPress={() => update($, izversti, ids => (ids.includes(id) ? ids.filter(x => x !== id) : [...ids, id]))}
            />
          </Box>
          {isIzverts &&
            darbi.slice(0, 5).map((x, i) => (
              <Text key={`izd:${s.id}:${i}`} dimColor wrap="truncate-end">
                {`  ✓ ${x}`}
              </Text>
            ))}
          {isIzverts && darbi.length > 5 && <Text dimColor>{`  ${t.unVel(darbi.length - 5)}`}</Text>}
        </Box>
      )
    }

    const kartite = (s: Sesija) => {
      const isSakl = sakl(s)
      const pogas = galvasPogas(s, isSakl)
      const isAplikacija = irAplikacija
      const isViss = isVissIzdarits(s, kartaS(s))
      // Kā sānjoslā: fons tikai sesijai, kurā esi, un uzbraucot ar peli.
      const fonsHover = s.sis ? FONS_SIS : isViss ? FONS_IZDARITS : FONS_HOVER
      const padomsAtvert = s.sis ? t.padoms.sisSesija : isJauns(s) ? t.padoms.jaunasIzmainas : t.padoms.atvertSesiju
      const nosaukums = isis(s.title, nosaukumaGarums(s))
      return (
        <Box key={`kartite:${s.id}`} flexDirection="column" marginBottom={isSakl ? 0 : 1}>
          {/* Nosaukuma rinda pa visu platumu ar fonu, kā aplikācijas sānjoslā; sesija, kurā esi, spilgtāka un ar malu. */}
          <Box
            key={`rinda:${s.id}`}
            position="relative"
            flexDirection="row"
            justifyContent="space-between"
            alignItems="center"
            paddingLeft={1}
            // Rāmis pats pieliek atstarpes; bez tām rinda ir vienu rindiņu augsta, un neredzamā poga to nosedz visu.
            paddingTop={0}
            paddingBottom={0}
            paddingRight={0}
            {...(isAplikacija
              ? {
                  // Noapaļoti stūri: aplikācija "round" rāmi zīmē ar border-radius; pats rāmis caurspīdīgs.
                  borderStyle: 'round',
                  borderColor: '#00000000',
                  ...(s.sis ? { backgroundColor: FONS_SIS } : {}),
                  hover: { backgroundColor: fonsHover },
                }
              : {})}
          >
            {s.sis && 'Svg' in el && (
              <Box position="absolute" top={0} bottom={0} left={0} alignItems="center">
                <el.Svg source={malasSvg()} alt="" width={6} height={16} />
              </Box>
            )}
            <Box flexDirection="row" gap={1} alignItems="center" flexShrink={1} flexGrow={1}>
              {sesijasPunkts(s)}
              {isAplikacija ? (
                <Text key={`nosaukums:${s.id}`} bold={s.sis} wrap="truncate-end">
                  {nosaukums}
                </Text>
              ) : (
                arPadomu(`atvert:${s.id}`, padomsAtvert, <Button key={`atvert:${s.id}`} plain label={nosaukums} onPress={atvertSesiju(s)} />, 'kreisi')
              )}
              {/* Ko sesija dara tagad: jautā tev (vai gaida atļauju) vai vēl strādā. */}
              {s.stavoklis === 'waiting' && <Text color={KRASA.gaida}>{t.jauta}</Text>}
              {(s.stavoklis === 'busy' || s.stavoklis === 'shell') && <Text dimColor>{t.strada}</Text>}
            </Box>
            {progress(s)}
            {/* Aplikācijā visa rinda atver sesiju: neredzama poga pāri visam platumam (pogā der tikai teksts);
                pogas labajā pusē ir vēlāk un stāv virs tās. */}
            {isAplikacija && (
              <Box key={`p:atvert:${s.id}`} position="absolute" top={0} bottom={0} left={0} width="100%">
                {/* Pogai platums nav ierobežots (citādi tā savu neredzamo tekstu nogriež ar "…"); lieko nogriež ārējā kaste. */}
                <Box position="relative" width="100%" height="100%" overflow="hidden">
                  <Box position="absolute" top={0} left={0}>
                    <Button key={`atvert:${s.id}`} plain label={'⠀'.repeat(kolonnas + 20)} onPress={atvertSesiju(s)} />
                  </Box>
                </Box>
                {isPadomi && (
                  <Box position="absolute" top={-1} left={0} width={padomsAtvert.length + 2} display="none" hover={{ display: 'flex' }}>
                    <Text inverse wrap="truncate-end">{` ${padomsAtvert} `}</Text>
                  </Box>
                )}
              </Box>
            )}
            {/* Vienmēr vieta divām pogām (arī ja arhivēt nav), lai apļi un pogas visās rindās stāv vienās kolonnās. */}
            <Box
              position="relative"
              flexDirection="row"
              gap={1}
              alignItems="center"
              justifyContent="flex-end"
              flexShrink={0}
              {...(isAplikacija ? { width: 7 } : {})}
            >
              {pogas.map(p => arPadomu(p.key, p.padoms, ikonasPoga(p)))}
            </Box>
          </Box>
          {!isSakl && gaitasBloks(s)}
          {!isSakl && (
            <Box flexDirection="column" marginLeft={1}>
              {ievadesRinda(s)}
              {darbuRindas(s)}
              {izdaritieBloks(s)}
              {atskaitesBloks(s)}
            </Box>
          )}
        </Box>
      )
    }

    // Datuma virsraksts pirms katras jaunas dienu grupas, kā sānjoslā (Šodien, Vakar, …), pēc pēdējā notikuma.
    const arDatumiem = (saraksts: Sesija[]) =>
      saraksts.flatMap((s, i) => {
        const diena = dienasGrupa(notikums(s, nt), d.laiks)
        const ieprieks = i > 0 ? dienasGrupa(notikums(saraksts[i - 1] as Sesija, nt), d.laiks) : undefined
        return [
          ...(diena !== ieprieks
            ? [
                <Text key={`diena:${diena}`} dimColor italic>
                  {t.dienas[diena]}
                </Text>,
              ]
            : []),
          kartite(s),
        ]
      })


    // Dienas rezultāts: tavi ☐ šodien visās sesijās un aplis līdz nākamajai balvai. Sasniedzot desmitu, balva.
    const sodien = Object.entries(iz).filter(([k, kad]) => k.includes('|t|') && kad >= dienasSakums(d.laiks)).length
    const velGaida = saraksts.reduce((n, s) => n + kartaS(s).atverts, 0)
    const bp = balvaPec(sodien)
    const isBalva = bp.sasniegts >= BALVU_SOLIS && !(bv.diena === dienasSakums(d.laiks) && bv.panemta >= bp.sasniegts)
    const panemtBalvu = async () => {
      const nakama = { diena: dienasSakums(await $.clock.now()), panemta: bp.sasniegts }
      await $.store.set(STORE_BALVAS, nakama)
      await update($, balvas, () => nakama)
    }
    const cikls = Math.floor((bp.sasniegts / BALVU_SOLIS - 1) / BALVAS.length)
    const kapnes = BALVAS.map((b, i) => {
      const n = (cikls * BALVAS.length + i + 1) * BALVU_SOLIS
      return `${n <= bp.sasniegts ? '✓ ' : ''}${n} ${t.balvuNosaukumi[b]}`
    }).join(' · ')
    const ramis = (ar: { fons: string; mala?: string }) =>
      irAplikacija ? { borderStyle: 'round', borderColor: ar.mala ?? '#00000000', backgroundColor: ar.fons } : {}
    const dienasBloks =
      d.laiks === 0 ? null : isBalva ? (
        <Box key="balva" flexDirection="column" alignItems="center" gap={1} paddingY={1} {...ramis({ fons: FONS_IZDARITS, mala: `${ZALS}55` })}>
          {'Svg' in el && <el.Svg source={balvasSvg(bp.balva)} alt={t.balvuNosaukumi[bp.balva]} width={112} height={112} isInteractive />}
          <Text bold color={ZALS}>
            {t.balvaVirsraksts(bp.sasniegts)}
          </Text>
          <Text wrap="wrap">{t.balvaTeksts[bp.balva]}</Text>
          <Button key="balva" label={t.balvaPoga[bp.balva]} onPress={panemtBalvu} />
          <Text dimColor wrap="wrap">
            {kapnes}
          </Text>
        </Box>
      ) : (
        <Box key="diena" flexDirection="row" gap={1} alignItems="center" paddingLeft={1} paddingRight={1} {...ramis({ fons: FONS_IZDARITS })}>
          {'Svg' in el ? (
            <el.Svg source={dienasAplisSvg(sodien, bp.nakamais)} alt={t.sodienIzdariti(sodien)} width={40} height={40} />
          ) : (
            <Text bold color={ZALS}>{`${sodien}/${bp.nakamais}`}</Text>
          )}
          <Box flexDirection="column" flexGrow={1} flexShrink={1} minWidth={0}>
            <Text bold wrap="truncate-end">
              {t.sodienIzdariti(sodien)}
            </Text>
            <Text dimColor wrap="truncate-end">
              {t.lidzBalvai(bp.nakamais - sodien, bp.nakamaBalva)}
            </Text>
          </Box>
          {velGaida > 0 && (
            <Box flexShrink={0}>
              <Text dimColor>{t.velGaida(velGaida)}</Text>
            </Box>
          )}
        </Box>
      )
    const gaidaSadala = (
      <Box flexDirection="column">
        {saraksts.length === 0 && <Text dimColor>{t.nekasNegaida}</Text>}
        {arDatumiem(saraksts)}
      </Box>
    )

    const koks = (
      <Box flexDirection="column" gap={1}>
        {/* Bez pulksteņa un ↻: panelis atjaunojas pats (ik 30 s un pēc gājiena), ar rokām /darbi. */}
        {d.laiks === 0 && <Text dimColor>{t.ielade}</Text>}
        {d.kluda !== '' && <Text color="red">{d.kluda}</Text>}
        {msg !== '' && (
          <Box flexDirection="row" gap={1} alignItems="flex-start">
            <Box flexGrow={1} flexShrink={1} minWidth={0}>
              <Text color={KRASA.gaida} wrap="wrap">
                {msg}
              </Text>
            </Box>
            {atsauc !== '' && (
              <Button
                key="atsaukt"
                plain
                label={t.atsaukt}
                onPress={async () => {
                  await parslegtIzdaritu($, atsauc, false)
                  await aizvertZinju()
                }}
              />
            )}
            {arPadomu('zinja-x', t.padoms.aizvert, <Button key="zinja-x" plain dimColor label="✕" onPress={aizvertZinju} />)}
          </Box>
        )}

        {dienasBloks}
        {gaidaSadala}
        {repoSadala}
      </Box>
    )
    zimejumuKess.set(kesasAtslega, { paraksts: zimesParaksts, koks })
    return koks
  })
}
