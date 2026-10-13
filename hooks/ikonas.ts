// Lucide ikonas (lucide.dev, ISC) grupu virsrakstiem un krāsaini punkti sesiju rindām, kā aplikācijas sānjoslā.

export type Veids = 'gaida' | 'parskatit' | 'turpinat' | 'repo' | 'bez' | 'gatavs'

export const KRASA: Record<Veids, string> = {
  gaida: '#E5A00D',
  parskatit: '#8B5CF6',
  turpinat: '#3B82F6',
  repo: '#F97316',
  bez: '#8A8A8A',
  gatavs: '#22A06B',
}

const CELI: Record<Veids, string> = {
  gaida: '<circle cx="12" cy="12" r="10"/><line x1="12" x2="12" y1="8" y2="12"/><line x1="12" x2="12.01" y1="16" y2="16"/>',
  parskatit:
    '<path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0"/><circle cx="12" cy="12" r="3"/>',
  turpinat: '<circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/>',
  repo: '<line x1="6" x2="6" y1="3" y2="15"/><circle cx="18" cy="6" r="3"/><circle cx="6" cy="18" r="3"/><path d="M18 9a9 9 0 0 1-9 9"/>',
  bez: '<path d="M10.1 2.182a10 10 0 0 1 3.8 0"/><path d="M13.9 21.818a10 10 0 0 1-3.8 0"/><path d="M17.609 3.721a10 10 0 0 1 2.69 2.7"/><path d="M2.182 13.9a10 10 0 0 1 0-3.8"/><path d="M20.279 17.609a10 10 0 0 1-2.7 2.69"/><path d="M21.818 10.1a10 10 0 0 1 0 3.8"/><path d="M3.721 6.391a10 10 0 0 1 2.7-2.69"/><path d="M6.391 20.279a10 10 0 0 1-2.69-2.7"/>',
  gatavs: '<circle cx="12" cy="12" r="10"/><path d="m9 12 2 2 4-4"/>',
}

// Kartītes galvenes pogu ikonas (Lucide): zīmē ar SVG, spiež neredzama poga virs tām (pogā der tikai teksts).
const POGU_CELI = {
  saklaut: '<path d="m6 9 6 6 6-6"/>',
  izverst: '<path d="m9 18 6-6-6-6"/>',
  pievienot: '<path d="M5 12h14"/><path d="M12 5v14"/>',
  arhivet: '<rect width="20" height="5" x="2" y="3" rx="1"/><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8"/><path d="M10 12h4"/>',
} as const

export type PogasIkona = keyof typeof POGU_CELI

export function poguIkonaSvg(i: PogasIkona): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#8F8D86" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${POGU_CELI[i]}</svg>`
}

/**
 * Plāna progresa josla pa visu platumu: platums SVG ir lielāks par paneli, tāpēc aplikācija to sašaurina līdz rindai,
 * un `preserveAspectRatio="none"` izstiepj viewBox 0..100. `no` → `lidz` (0..1) vienmērīgi `sekundes` laikā (SMIL),
 * tāpēc josla kustas arī starp atjaunošanām. color-scheme: tumšajā tēmā rāmim nav balta fona.
 */
export function joslasSvg(no: number, lidz: number, sekundes: number, krasa: string): string {
  const a = (Math.min(1, Math.max(0, no)) * 100).toFixed(2)
  const b = (Math.min(1, Math.max(0, lidz)) * 100).toFixed(2)
  const kustiba =
    sekundes > 0 && lidz > no ? `<animate attributeName="width" from="${a}" to="${b}" dur="${Math.round(sekundes)}s" fill="freeze"/>` : ''
  return `<svg xmlns="http://www.w3.org/2000/svg" width="4000" height="4" viewBox="0 0 100 4" preserveAspectRatio="none"><style>:root{color-scheme:light dark}</style><rect x="0" y="1" width="100" height="2" fill="${krasa}" fill-opacity="0.22"/><rect x="0" y="1" width="${a}" height="2" fill="${krasa}">${kustiba}</rect></svg>`
}

export function ikonasSvg(v: Veids): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="${KRASA[v]}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${CELI[v]}</svg>`
}

export function punktaSvg(v: Veids): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 10 10"><circle cx="5" cy="5" r="4" fill="${KRASA[v]}"/></svg>`
}

/** Tukšs aplītis sesijai, kurā nekā jauna nav (kā aplikācijas sānjoslā). */
export function tukssPunktsSvg(): string {
  return '<svg xmlns="http://www.w3.org/2000/svg" width="10" height="10" viewBox="0 0 10 10"><circle cx="5" cy="5" r="3.6" fill="none" stroke="#8A8A8A" stroke-width="1.4"/></svg>'
}

/** Šaura krāsaina mala sesijai, kurā esi (kā atzīme sānjoslā). */
export function malasSvg(): string {
  return '<svg xmlns="http://www.w3.org/2000/svg" width="6" height="16" viewBox="0 0 6 16"><rect x="2.5" width="3" height="16" rx="1.5" fill="#D97757"/></svg>'
}

/** Zaļā krāsa izdarītajam: apļi, "Viss izdarīts", dienas rezultāts un balva. */
export const ZALS = '#3DCB7F'
const APLIS = 47.12
const DIENAS_APLIS = 131.95

/** Mazs progresa aplis pie sesijas: kāda daļa tavu ☐ šajā kārtā izdarīta. */
export function aplisSvg(dala: number): string {
  const loks = Math.max(0, Math.min(1, dala)) * APLIS
  const pilda =
    loks > 0
      ? `<circle cx="10" cy="10" r="7.5" fill="none" stroke="${ZALS}" stroke-width="3" stroke-linecap="round" stroke-dasharray="${loks.toFixed(1)} ${APLIS}" transform="rotate(-90 10 10)"/>`
      : ''
  return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 20 20"><circle cx="10" cy="10" r="7.5" fill="none" stroke="#8080804d" stroke-width="3"/>${pilda}</svg>`
}

/** Pilns aplis ar ķeksīti: visi tavi darbi šajā kārtā izdarīti. */
export function pilnsAplisSvg(): string {
  return `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 20 20"><circle cx="10" cy="10" r="9" fill="${ZALS}"/><path d="m6.5 10.2 2.4 2.4 4.6-4.8" fill="none" stroke="#ffffff" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"/></svg>`
}

/** Dienas aplis: šodien izdarītie tavi darbi pret nākamo balvu, skaitlis vidū. */
export function dienasAplisSvg(skaits: number, merkis: number): string {
  const loks = Math.max(0, Math.min(1, skaits / merkis)) * DIENAS_APLIS
  const pilda =
    loks > 0
      ? `<circle cx="26" cy="26" r="21" fill="none" stroke="${ZALS}" stroke-width="5" stroke-linecap="round" stroke-dasharray="${loks.toFixed(1)} ${DIENAS_APLIS}" transform="rotate(-90 26 26)"/>`
      : ''
  return `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40" viewBox="0 0 52 52"><circle cx="26" cy="26" r="21" fill="none" stroke="#8080804d" stroke-width="5"/>${pilda}<text x="26" y="27" text-anchor="middle" dominant-baseline="middle" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif" font-size="18" font-weight="700" fill="${ZALS}">${skaits}</text></svg>`
}

export type Balva = 'pauze' | 'kafija' | 'pastaiga'

// Lucide: armchair, coffee, footprints. Kafijai tvaiks (trīs īsās līnijas) kūp.
const BALVU_CELI: Record<Balva, string> = {
  pauze:
    '<path d="M19 9V6a2 2 0 0 0-2-2H7a2 2 0 0 0-2 2v3"/><path d="M3 16a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-5a2 2 0 0 0-4 0v1.5a.5.5 0 0 1-.5.5h-9a.5.5 0 0 1-.5-.5V11a2 2 0 0 0-4 0z"/><path d="M5 18v2"/><path d="M19 18v2"/>',
  kafija:
    '<path d="M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h14a4 4 0 1 1 0 8h-1"/>' +
    ['M6 2v2', 'M10 2v2', 'M14 2v2']
      .map((d, i) => `<path d="${d}" opacity="0"><animate attributeName="opacity" values="0;1;0" dur="2.2s" begin="${(1.2 + i * 0.6).toFixed(1)}s" repeatCount="indefinite"/></path>`)
      .join(''),
  pastaiga:
    '<path d="M4 16v-2.38C4 11.5 2.97 10.5 3 8c.03-2.72 1.49-6 4.5-6C9.37 2 10 3.8 10 5.5c0 3.11-2 5.66-2 8.68V16a2 2 0 1 1-4 0Z"/><path d="M20 20v-2.38c0-2.12 1.03-3.12 1-5.62-.03-2.72-1.49-6-4.5-6C14.63 6 14 7.8 14 9.5c0 3.11 2 5.66 2 8.68V20a2 2 0 1 0 4 0Z"/><path d="M16 17h4"/><path d="M4 13h4"/>',
}

/**
 * Balva, kad šodien sasniegts kārtējais desmits: aplis piepildās līdz galam, no tā izšaujas dzirksteles, vidū
 * parādās balvas ikona un pašūpojas. Interaktīvs SVG (animācija), tāpēc ar `color-scheme`.
 */
export function balvasSvg(balva: Balva): string {
  const krasas = [ZALS, '#E5A00D', ZALS, '#D97757']
  const dzirksteles = [0, 45, 90, 135, 180, 225, 270, 315]
    .map(
      (l, i) =>
        `<g transform="rotate(${l} 26 26)"><circle cx="26" cy="3" r="1.8" fill="${krasas[i % 4]}" opacity="0"><animate attributeName="cy" values="4;-9" dur="1.4s" begin="1.1s" repeatCount="indefinite"/><animate attributeName="opacity" values="1;0" dur="1.4s" begin="1.1s" repeatCount="indefinite"/></circle></g>`,
    )
    .join('')
  return `<svg xmlns="http://www.w3.org/2000/svg" width="112" height="112" viewBox="-10 -10 72 72"><style>:root{color-scheme:light dark}</style><circle cx="26" cy="26" r="21" fill="none" stroke="#8080803d" stroke-width="4"/><circle cx="26" cy="26" r="21" fill="none" stroke="${ZALS}" stroke-width="4" stroke-linecap="round" stroke-dasharray="${DIENAS_APLIS} ${DIENAS_APLIS}" stroke-dashoffset="0" transform="rotate(-90 26 26)"><animate attributeName="stroke-dashoffset" from="${(DIENAS_APLIS * 0.3).toFixed(1)}" to="0" dur="1.2s" fill="freeze"/></circle>${dzirksteles}<g opacity="0"><animate attributeName="opacity" from="0" to="1" begin="0.9s" dur="0.4s" fill="freeze"/><g transform="translate(14 14)" fill="none" stroke="${ZALS}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><g>${BALVU_CELI[balva]}<animateTransform attributeName="transform" type="rotate" values="0 12 20;-8 12 20;7 12 20;0 12 20;0 12 20" keyTimes="0;0.1;0.2;0.3;1" dur="2.8s" begin="1.3s" repeatCount="indefinite"/></g></g></g></svg>`
}

/**
 * Pulsējošs punkts jaunām izmaiņām (SMIL animācija; aplikācija to zīmē kā interaktīvu SVG atsevišķā rāmī).
 * `color-scheme: light dark`: citādi tumšajā tēmā rāmis ar gaišo shēmu dabū necaurspīdīgu baltu fonu.
 */
export function pulsaSvg(v: Veids): string {
  const k = KRASA[v]
  return `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 14 14"><style>:root{color-scheme:light dark}</style><circle cx="7" cy="7" r="3" fill="none" stroke="${k}" stroke-width="1.5"><animate attributeName="r" values="3;6.5" dur="1.4s" repeatCount="indefinite"/><animate attributeName="opacity" values="0.9;0" dur="1.4s" repeatCount="indefinite"/></circle><circle cx="7" cy="7" r="4" fill="${k}"><animate attributeName="opacity" values="1;0.45;1" dur="1.4s" repeatCount="indefinite"/></circle></svg>`
}
