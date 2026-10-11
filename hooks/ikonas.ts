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

/**
 * Pulsējošs punkts jaunām izmaiņām (SMIL animācija; aplikācija to zīmē kā interaktīvu SVG atsevišķā rāmī).
 * `color-scheme: light dark`: citādi tumšajā tēmā rāmis ar gaišo shēmu dabū necaurspīdīgu baltu fonu.
 */
export function pulsaSvg(v: Veids): string {
  const k = KRASA[v]
  return `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 14 14"><style>:root{color-scheme:light dark}</style><circle cx="7" cy="7" r="3" fill="none" stroke="${k}" stroke-width="1.5"><animate attributeName="r" values="3;6.5" dur="1.4s" repeatCount="indefinite"/><animate attributeName="opacity" values="0.9;0" dur="1.4s" repeatCount="indefinite"/></circle><circle cx="7" cy="7" r="4" fill="${k}"><animate attributeName="opacity" values="1;0.45;1" dur="1.4s" repeatCount="indefinite"/></circle></svg>`
}
