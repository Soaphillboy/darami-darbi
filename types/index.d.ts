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
}

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
 * lietotāja paša atzīme sesijai. `turpinat` = piesprausta pie darbiem; `gatavs` = paslēpta, līdz sesijā atkal kaut kas
 * notiek vairāk nekā 10 min pēc atzīmes (`kad`).
 */
export type Atzime = { veids: 'turpinat' | 'gatavs'; last: number; kad?: number }

export type Atzimes = Record<string, Atzime>

/**
 * Darbs lietotājam; `sikak` ir 1-2 teikumi ar detaļām (rāda, izvēršot); `atvert` ir pārbaudīts faila ceļš vai
 * https saite (brīfs, melnraksts), vai tukšs.
 */
export type TevDarbs = { darbs: string; sikak: string; atvert: string }

/** Darbs, ko Claude var izdarīt pats; `prompts` ir ziņa, ko nosūtīt tajā sesijā. */
export type ClaudeDarbs = { darbs: string; prompts: string }

/**
 * Modeļa analīze vienai sesijai. `isGatava` false = pirmā analīze vēl top. `veido` = kad kāda sesija sāka veidot
 * jaunu (līdz tam redzami vecie darbi). lietotāja neatzīmētie `tev` darbi pāriet uz nākamo analīzi.
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
      pazinots: Record<string, string>
      repoSesijas: Record<string, string>
      radiPadomus: boolean
      parbauda: string[]
      izversti: string[]
      seciba: string[]
      radiPabeigtas: boolean
      zinja: string
    }
  }
}
