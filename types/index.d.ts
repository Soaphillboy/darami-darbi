export type Sesija = {
  id: string
  title: string
  link: string
  status: string
  detail: string
  needs: string
  nakamie: string
  cli: string
  cwd: string
  last: number
  sis: boolean
  /** Dzīva procesa stāvoklis: busy (strādā), shell, idle (pabeidza), waiting (jautā tev); tukšs, ja process nav dzīvs. */
  stavoklis: string
  /** Kopš kura brīža šis stāvoklis (ms), 0 bez dzīva procesa. */
  stavoklisKops: number
  /** Šī gājiena gaita no sarunas faila (strādājošai, jautājošai un šai sesijai), citādi null. */
  gaita: Gaita | null
}

/** Šī gājiena soļi (rīku izsaukumi), pēdējais rīks un tā mērķis; jautājums, ja Claude gaida atbildi. */
export type Gaita = { soli: number; riks: string; merkis: string; jautajums: string; gaidaAtlauju: boolean }

/** Laika un soļu aplēse gājiena sākumā: `min` un `soli` pēc korekcijas, `raw*` modeļa sākotnējā. */
export type Novertejums = { turnId: string; sakts: number; min: number; soli: number; rawMin: number; rawSoli: number }

/** Pabeigts gājiens korekcijai: aplēse (`n` min, `ns` soļi) pret patieso (`f` min, `fs` soļi). */
export type Ilgums = { s: string; n: number; f: number; ns: number; fs: number }

/** Nenopušots repo; `commiti` un `faili` rāda, izvēršot; `sig` mainās līdz ar repo stāvokli. */
export type Repo = {
  nosaukums: string
  cels: string
  ahead: number
  dirty: number
  commiti: string[]
  faili: string[]
  sig: string
  /** Sesija, kas pēdējā strādāja ar šo repo (tai aiziet "pušo"); tukšs, ja nav atrasta. */
  sesija: string
  sesijasNosaukums: string
}

export type ValejieDati = { sesijas: Sesija[]; repo: Repo[]; laiks: number; kluda: string }

/**
 * lietotāja paša atzīme sesijai: `gatavs` = sakļauta ar ▾, līdz sesija pēc atzīmes (`kad`) kaut ko pabeidz vai jautā.
 * `turpinat` ir no vecākas versijas un vairs neko nemaina.
 */
export type Atzime = { veids: 'turpinat' | 'gatavs'; last: number; kad?: number }

export type Atzimes = Record<string, Atzime>

/**
 * Darbs lietotājam; `sikak` ir 1-2 teikumi ar detaļām (rāda, izvēršot); `atvert` ir pārbaudīts faila ceļš vai
 * https saite (brīfs, melnraksts), vai tukšs.
 */
export type TevDarbs = { darbs: string; sikak: string; atvert: string }

/**
 * Nākamais prompts tajā sesijā: `darbs` ir īsais teksts pogai, `prompts` ir tas, ko nosūtīt. Sesija tos pēc katra
 * gājiena uzraksta no jauna; `pats` = lietotāja paša pielikts ("c:"), tas paliek, līdz to nosūta.
 */
export type ClaudeDarbs = { darbs: string; prompts: string; pats?: boolean }

/**
 * Sesijas nākamie soļi, ko tā pati uzraksta pēc katra gājiena: `tev` ir lietotāja darbi (neatzīmētie pāriet uz
 * nākamo reizi), `claude` ir līdz 3 nākamajiem promptiem. `last` = sesijas pēdējā darbība tajā brīdī.
 * `veido` ir no vecākas versijas.
 */
export type Analize = {
  last: number
  sakts: number
  isGatava: boolean
  tev: TevDarbs[]
  claude: ClaudeDarbs[]
  isPabeigts: boolean
  veido?: number
}

export type Analizes = Record<string, Analize>

/** Izdarītie čeklista punkti un nosūtītie Claude darbi: atslēga `${sesija}|${darbs}`. */
export type Izdariti = Record<string, number>

/** Pēdējā atskaite, ko sesija atsūtīja atpakaļ (parasti pēc ▷); rāda tās kartītē, līdz lietotājs to aizver. */
export type Atskaite = { laiks: number; teksts: string }

export type Atskaites = Record<string, Atskaite>

declare module 'claude-code' {
  interface PluginState {
    'valejie-darbi': {
      dati: ValejieDati
      atzimes: Atzimes
      analizes: Analizes
      izdariti: Izdariti
      atskaites: Atskaites
      pasleptiRepo: Record<string, string>
      ievadesSkaits: number
      ievadesTeksts: Record<string, string>
      redzeti: Record<string, string>
      repoSesijas: Record<string, string>
      radiPadomus: boolean
      parbauda: string[]
      izversti: string[]
      zinja: string
      zinjaLaiks: number
      notikumi: Record<string, number>
      novertejumi: Record<string, Novertejums>
    }
  }
}
