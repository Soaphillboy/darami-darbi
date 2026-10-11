import { test, expect } from 'claude-code/testing'

import { pulsaSvg } from '../hooks/ikonas'

const PANE = { component: 'Pane', requestId: 'valejie-darbi', props: { bodyColumns: 70 }, viewport: { columns: 74, rows: 60 } } as const
const TAGAD = 1791300000000

const sesija = (id: string, status: string, ext: Record<string, unknown> = {}) => ({
  id, title: `Sesija ${id}`, link: `claude://x/${id}`, status, detail: `detaļas ${id}`, needs: '', nakamie: '',
  cli: `cli-${id}`, cwd: '/projekts', last: 5, sis: false, stavoklis: '', stavoklisKops: 0, gaita: null, ...ext,
})

const DATI = {
  sesijas: [
    sesija('a', 'blocked', { needs: 'Atiestati paroles' }),
    sesija('t', 'completed', { nakamie: 'Gaida lēmumu par domēniem' }),
    sesija('b', 'completed'),
    sesija('c', 'completed', { nakamie: 'Testi' }),
    sesija('x', 'nav'),
  ],
  repo: [
    {
      nosaukums: 'satura-sistema-paka', cels: '/p', ahead: 2, dirty: 0, commiti: ['abc123 Titru versijas', 'def456 Kas jauns'], faili: [], sig: 's1',
      sesija: 't', sesijasNosaukums: 'Sesija t',
    },
  ],
}

// Nākamie soļi, ko sesijas pašas jau uzrakstījušas pēc saviem gājieniem (krātuvē, kā īstajā panelī).
const solis = (tev: { darbs: string; sikak?: string; atvert?: string }[], claude: { darbs: string; prompts: string; pats?: boolean }[]) => ({
  last: 5, sakts: 1, isGatava: true, isPabeigts: false,
  tev: tev.map(d => ({ sikak: '', atvert: '', ...d })),
  claude,
})
const SOLI = () => ({
  a: solis(
    [
      { darbs: 'Izlem par domēniem', sikak: 'Klientam jāizvēlas divi no četriem domēniem pirms pastkastēm.', atvert: '/projekts/brifs.md' },
      { darbs: 'Ievadi paroli' },
    ],
    [{ darbs: 'Izveidot CRM lapas', prompts: 'Turpini: izveido CRM lapas.' }],
  ),
  t: solis([], [{ darbs: 'Pabeigt testus', prompts: 'Turpini: pabeidz testus.' }]),
  c: solis([], [{ darbs: 'Uzraksti testus', prompts: 'Turpini: uzraksti testus.' }]),
})

// Ko sesija atbild, kad pēc gājiena pati sev (fork) pajautā nākamos soļus.
const IETEIKUMI = {
  prompti: [
    { label: 'Palaid testus', prompt: 'Palaid testus un pasaki rezultātu.' },
    { label: 'Commito izmaiņas', prompt: 'Commito izmaiņas ar īsu aprakstu.' },
    { label: 'Uzraksti README', prompt: 'Uzraksti README sadaļu par jauno pogu.' },
    { label: 'Ceturtais', prompt: 'Šo vairs nerāda.' },
  ],
  tev: [{ darbs: 'Atbildi klientam', sikak: 'Klients gaida atbildi par cenu.', atvert: 'brifs.md' }],
  izdariti: [],
}

function dzinejs(on: any, opts: { suta?: unknown; faili?: Record<string, string>; ieteikumi?: unknown; bezSoliem?: boolean; aplese?: unknown } = {}) {
  const palaisti: string[][] = []
  const forki: string[] = []
  const jautajumi: string[] = []
  const suti: unknown[] = []
  const krātuve = new Map<string, unknown>()
  if (!opts.bezSoliem) krātuve.set('analizes3', SOLI())
  on('store.get', async ($: any, e: any) => ({ value: krātuve.get(e.key) }) as any)
  on('store.set', async ($: any, e: any) => {
    krātuve.set(e.key, JSON.parse(JSON.stringify(e.value)))
    return { value: undefined } as any
  })
  on('session.id', async () => ({ value: 'cli-test' }) as any)
  let pulkstenis = TAGAD
  on('clock.now', async () => ({ value: pulkstenis }) as any)
  on('ui.status', async () => ({ value: undefined }) as any)
  const pazinojumi: string[] = []
  on('ui.toast', async ($: any, e: any) => {
    pazinojumi.push(e.text)
    return { value: undefined } as any
  })
  on('fs.write', async () => ({ value: undefined }) as any)
  const faili = opts.faili ?? {}
  on('fs.exists', async ($: any, e: any) => ({ value: e.path === '/projekts/brifs.md' || Object.keys(faili).some(f => e.path.endsWith(f)) }) as any)
  on('fs.read', async ($: any, e: any) => ({ value: Object.entries(faili).find(([f]) => e.path.endsWith(f))?.[1] ?? '' }) as any)
  // Ārējās Sonnet analīzes vairs nav: ja kaut kas to sauc, tests to redz.
  // Vienīgais model.complete ir laika aplēse gājiena sākumā; cits izsaukums atbildi nedabū.
  on('model.complete', async ($: any, e: any) => {
    jautajumi.push(e.prompt)
    if (String(e.prompt).includes('Request:')) {
      return { value: { isAnswered: true, text: JSON.stringify(opts.aplese ?? { min: 4, soli: 20 }), usage: { input_tokens: 1, output_tokens: 1 } } } as any
    }
    return { value: { isAnswered: false, reason: 'empty-reply', usage: { input_tokens: 0, output_tokens: 0 } } } as any
  })
  on('turn.start', async ($: any, e: any) => ({ turnId: e.turnId }) as any)
  on('model.fork', async ($: any, e: any) => {
    forki.push(e.prompt)
    const atbilde = opts.ieteikumi ?? IETEIKUMI
    return { value: { isAnswered: true, text: `Lūk:\n${JSON.stringify(atbilde)}`, usage: { input_tokens: 1, output_tokens: 1 } } } as any
  })
  on('mcp.call', async ($: any, e: any) => {
    suti.push({ server: e.server, riks: e.tool, ...e.args })
    const deny = (opts.suta as { deny?: string } | undefined)?.deny
    const text = deny ?? 'delivered (delivery: delivered; message_id: m1)'
    return { value: { content: [{ type: 'text', text }], isError: deny !== undefined } } as any
  })
  const iesniegti: string[] = []
  const konteksti: (readonly string[] | undefined)[] = []
  on('prompt.submit', async ($: any, e: any) => {
    iesniegti.push(e.text)
    konteksti.push(e.context)
    return { text: e.text } as any
  })
  const aizpilditi: string[] = []
  on('prompt.fill', async ($: any, e: any) => {
    aizpilditi.push(e.text)
    return { isFilled: true } as any
  })
  on('turn.complete', async ($: any, e: any) => ({ text: e.answer }) as any)
  on('process.run', async ($: any, e: any) => {
    palaisti.push([...e.argv])
    if (e.argv[0] === '/usr/bin/printenv') return { value: { exitCode: 0, stdout: '/Users/es\n', stderr: '' } } as any
    return { value: { exitCode: 0, stdout: JSON.stringify(DATI), stderr: '' } } as any
  })
  const iestatitLaiku = (ms: number) => {
    pulkstenis = ms
  }
  return { palaisti, forki, jautajumi, suti, krātuve, iesniegti, konteksti, pazinojumi, aizpilditi, iestatitLaiku }
}

const atrodi = (ui: any, key: string) => ui.find({ key } as any)
// Darbs, ko hooks atstāj fonā (void), testā jāpagaida.
const pagaidi = async (kamer: () => boolean = () => false, ms = 400) => {
  for (let i = 0; i < ms / 10 && !kamer(); i++) await new Promise(r => (globalThis as any).setTimeout(r, 10))
}
const GAJIENS = { reason: 'answer', answer: 'Nosūtīju.', durationMs: 1, isAborted: false, turnId: 't1' }
const teksts = (ui: any, re: RegExp) => ui.find({ type: 'Text', text: re } as any)
const soli = (d: { krātuve: Map<string, unknown> }) => d.krātuve.get('analizes3') as Record<string, any>

test('tukšs panelis zīmējas abās virsmās', async $ => {
  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ plugin: 'valejie-darbi', surface, ...PANE } as any)
    expect(await teksts(ui, /Ielādē/)).toBeDefined()
    await ui.unmount()
  }
})

test('kartītes: tavi ☐ ar Atvērt un nākamie prompti; visas nepaslēptās gaida tevi', async ($, on) => {
  const d = dzinejs(on)
  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ plugin: 'valejie-darbi', surface, ...PANE } as any)
    await ui.press({ key: 'atjaunot' } as any)
    expect(await atrodi(ui, 'keksis:a:0')).toBeDefined()
    // Pārbaudītam failam ir Atvērt, darbam bez faila nav.
    expect(await atrodi(ui, 'atvert-darbu:a:0')).toBeDefined()
    expect(await atrodi(ui, 'atvert-darbu:a:1')).toBeUndefined()
    expect(await atrodi(ui, 'turpini:a:0')).toBeDefined()
    // Bez etiķetēm "Tev" un "Claude": ☐ ir tavs darbs, ▷ Claude prompts.
    expect(await teksts(ui, /^(Tev|Claude)$/)).toBeUndefined()
    // Arī pabeigta sesija (b) un sesija bez statusa (x) gaida tevi, līdz tās paslēp ar ✕.
    for (const id of ['a', 't', 'b', 'c', 'x']) expect(await atrodi(ui, `saklaut:${id}`)).toBeDefined()
    expect(await atrodi(ui, 'repo-teksts:0')).toBeDefined()
    // Padomā redzams, ko tieši atvērs, nevis vēlreiz "Atvērt".
    expect(await teksts(ui, /^ \/projekts\/brifs\.md $/)).toBeDefined()
    await ui.press({ key: 'atvert-darbu:a:0' } as any)
    expect(d.suti.at(-1)).toMatchObject({ server: 'ccd_view', riks: 'show_pane', pane: 'file', path: '/projekts/brifs.md' })
    await ui.unmount()
  }
  // Atjaunošana pati modeli nesauc: nākamos soļus katra sesija uzraksta pēc sava gājiena.
  expect(d.jautajumi.length + d.forki.length).toBe(0)
})

test('ķeksītis atzīmē, bet kartīte paliek savā vietā', async ($, on) => {
  dzinejs(on)
  const ui = await $.ui.mount({ plugin: 'valejie-darbi', surface: 'desktop', ...PANE } as any)
  await ui.press({ key: 'atjaunot' } as any)
  await ui.press({ key: 'keksis:a:0' } as any)
  expect(await atrodi(ui, 'atvert-darbu:a:0')).toBeUndefined()
  await ui.press({ key: 'keksis:a:1' } as any)
  await ui.press({ key: 'turpini:a:0' } as any)
  // Viss izdarīts un nosūtīts, bet kartīte joprojām gaida tevi: paslēpj tikai ✕.
  expect(await atrodi(ui, 'saklaut:a')).toBeDefined()
  expect(await atrodi(ui, 'keksis:a:1')).toBeDefined()
  await ui.unmount()
})

test('▷ nosūta promptu tai sesijai vienreiz', async ($, on) => {
  const d = dzinejs(on)
  const ui = await $.ui.mount({ plugin: 'valejie-darbi', surface: 'desktop', ...PANE } as any)
  await ui.press({ key: 'atjaunot' } as any)
  expect(d.suti.length).toBe(0)
  await ui.press({ key: 'turpini:t:0' } as any)
  expect(d.suti.at(-1)).toMatchObject({ server: 'ccd_session_mgmt', riks: 'send_message', session_id: 't', message: 'Turpini: pabeidz testus.' })
  expect(await teksts(ui, /Nosūtīts uz "Sesija t"/)).toBeDefined()
  await ui.press({ key: 'turpini:t:0' } as any)
  expect(d.suti.length).toBe(1)
  expect(await atrodi(ui, 'saklaut:t')).toBeDefined()
  await ui.unmount()
})

test('▷ šajā sesijā promptu uzreiz iesniedz, nevis sūta sev ziņu', async ($, on) => {
  const d = dzinejs(on)
  DATI.sesijas.push(sesija('m', 'completed', { sis: true, title: 'Sesija m' }))
  d.krātuve.set('analizes3', { m: solis([], [{ darbs: 'Pabeidz', prompts: 'Turpini: pabeidz.' }]) })
  try {
    const ui = await $.ui.mount({ plugin: 'valejie-darbi', surface: 'desktop', ...PANE } as any)
    await ui.press({ key: 'atjaunot' } as any)
    await ui.press({ key: 'turpini:m:0' } as any)
    expect(d.iesniegti).toEqual(['Turpini: pabeidz.'])
    expect(d.aizpilditi.length).toBe(0)
    expect(d.suti.length).toBe(0)
    expect((d.krātuve.get('izdariti') as Record<string, number>)['m|c|Pabeidz']).toBeDefined()
    await ui.unmount()
  } finally {
    DATI.sesijas.pop()
  }
})

test('kārtots ar datumu virsrakstiem; ▾ sakļauj kartīti uz vietas', async ($, on) => {
  dzinejs(on)
  const diena = 86_400_000
  const sA = DATI.sesijas[0] as { last: number }
  const sT = DATI.sesijas[1] as { last: number }
  const sC = DATI.sesijas[3] as { last: number }
  sA.last = TAGAD - 3 * diena
  sT.last = TAGAD - 1000
  sC.last = TAGAD - diena
  try {
    const ui = await $.ui.mount({ plugin: 'valejie-darbi', surface: 'desktop', ...PANE } as any)
    await ui.press({ key: 'atjaunot' } as any)
    expect(await teksts(ui, /^Šodien$/)).toBeDefined()
    expect(await teksts(ui, /^Vakar$/)).toBeDefined()
    expect(await teksts(ui, /^Pēdējās 7 dienas$/)).toBeDefined()
    expect(await atrodi(ui, 'augsa:t')).toBeUndefined()
    // ▾ sakļauj uz vietas: paliek nosaukuma rinda ar 🗄 un ▸, darbu nav.
    await ui.press({ key: 'saklaut:a' } as any)
    expect(await atrodi(ui, 'saklaut:a')).toBeUndefined()
    expect(await atrodi(ui, 'atvert:a')).toBeDefined()
    expect(await atrodi(ui, 'izverst:a')).toBeDefined()
    expect(await atrodi(ui, 'arhivet:a')).toBeDefined()
    expect(await atrodi(ui, 'keksis:a:0')).toBeUndefined()
    await ui.unmount()
  } finally {
    sA.last = 5
    sT.last = 5
    sC.last = 5
  }
})

test('▾ nepārraksta citas sesijas atzīmes ar vecu kopiju', async ($, on) => {
  const { krātuve } = dzinejs(on)
  const ui = await $.ui.mount({ plugin: 'valejie-darbi', surface: 'desktop', ...PANE } as any)
  await ui.press({ key: 'atjaunot' } as any)
  // Cita sesija pa to laiku ierakstīja savu atzīmi krātuvē.
  krātuve.set('atzimes', { citur: { veids: 'gatavs', last: 1, kad: 1 } })
  await ui.press({ key: 'saklaut:a' } as any)
  expect(Object.keys(krātuve.get('atzimes') as object).sort()).toEqual(['a', 'citur'])
  await ui.unmount()
})

test('▸ atver sakļautu sesiju', async ($, on) => {
  const d = dzinejs(on)
  const ui = await $.ui.mount({ plugin: 'valejie-darbi', surface: 'desktop', ...PANE } as any)
  await ui.press({ key: 'atjaunot' } as any)
  await ui.press({ key: 'saklaut:b' } as any)
  expect(await atrodi(ui, 'saklaut:b')).toBeUndefined()
  await ui.press({ key: 'izverst:b' } as any)
  expect(await atrodi(ui, 'saklaut:b')).toBeDefined()
  expect(d.krātuve.get('atzimes')).toEqual({})
  await ui.unmount()
})

test('sakļauta sesija atveras pati, kad tā pabeidz darbu vai jautā; kamēr strādā, paliek sakļauta', async ($, on) => {
  const d = dzinejs(on)
  const sesijaB = DATI.sesijas[2] as { last: number; stavoklis: string; stavoklisKops: number }
  d.krātuve.set('atzimes', { b: { veids: 'gatavs', last: 5, kad: TAGAD } })
  try {
    const ui = await $.ui.mount({ plugin: 'valejie-darbi', surface: 'desktop', ...PANE } as any)
    await ui.press({ key: 'atjaunot' } as any)
    expect(await atrodi(ui, 'izverst:b')).toBeDefined()
    // Sesija sāka strādāt: paliek sakļauta, pie nosaukuma "strādā".
    Object.assign(sesijaB, { last: TAGAD + 30_000, stavoklis: 'busy', stavoklisKops: TAGAD + 30_000 })
    await ui.press({ key: 'atjaunot' } as any)
    expect(await atrodi(ui, 'izverst:b')).toBeDefined()
    expect(await teksts(ui, /^strādā$/)).toBeDefined()
    // Pabeidza: atveras pati.
    Object.assign(sesijaB, { last: TAGAD + 5 * 60_000, stavoklis: 'idle', stavoklisKops: TAGAD + 5 * 60_000 })
    await ui.press({ key: 'atjaunot' } as any)
    expect(await atrodi(ui, 'saklaut:b')).toBeDefined()
    expect(await teksts(ui, /^strādā$/)).toBeUndefined()
    // Sakļauj vēlreiz; sesija sāk jautāt: atkal atveras, pie nosaukuma "jautā tev".
    d.iestatitLaiku(TAGAD + 6 * 60_000)
    await ui.press({ key: 'saklaut:b' } as any)
    Object.assign(sesijaB, { last: TAGAD + 7 * 60_000, stavoklis: 'waiting', stavoklisKops: TAGAD + 7 * 60_000 })
    await ui.press({ key: 'atjaunot' } as any)
    expect(await atrodi(ui, 'saklaut:b')).toBeDefined()
    expect(await teksts(ui, /^jautā tev$/)).toBeDefined()
    await ui.unmount()
  } finally {
    Object.assign(sesijaB, { last: 5, stavoklis: '', stavoklisKops: 0 })
  }
})

test('augšā sesija, kas pēdējā pabeidza vai jautā, ne tā, kas tikko sāka strādāt', async ($, on) => {
  dzinejs(on)
  const sA = DATI.sesijas[0] as { last: number; stavoklis: string; stavoklisKops: number }
  const sT = DATI.sesijas[1] as { last: number; stavoklis: string; stavoklisKops: number }
  try {
    const ui = await $.ui.mount({ plugin: 'valejie-darbi', surface: 'desktop', ...PANE } as any)
    Object.assign(sA, { last: 100, stavoklis: 'idle', stavoklisKops: 100 })
    Object.assign(sT, { last: 200, stavoklis: 'idle', stavoklisKops: 200 })
    await ui.press({ key: 'atjaunot' } as any)
    const kartes = async () =>
      ((await ui.findAll({ type: 'Button' } as any)) as unknown as { key?: string }[])
        .map(b => String(b.key ?? ''))
        .filter(k => k.startsWith('atvert:'))
    expect((await kartes()).slice(0, 2)).toEqual(['atvert:t', 'atvert:a'])
    // a sāk strādāt (jaunāka darbība), bet t joprojām augšā: kārto pēc pabeigšanas, ne pēc darbības.
    Object.assign(sA, { last: 300, stavoklis: 'busy', stavoklisKops: 300 })
    await ui.press({ key: 'atjaunot' } as any)
    expect((await kartes()).slice(0, 2)).toEqual(['atvert:t', 'atvert:a'])
    // a pabeidz: tagad augšā.
    Object.assign(sA, { last: 400, stavoklis: 'idle', stavoklisKops: 400 })
    await ui.press({ key: 'atjaunot' } as any)
    expect((await kartes()).slice(0, 2)).toEqual(['atvert:a', 'atvert:t'])
    await ui.unmount()
  } finally {
    Object.assign(sA, { last: 5, stavoklis: '', stavoklisKops: 0 })
    Object.assign(sT, { last: 5, stavoklis: '', stavoklisKops: 0 })
  }
})

test('Arhivēt parāda aplikācijas atteikumu, nevis klusi "Arhivēts"', async ($, on) => {
  dzinejs(on, { suta: { deny: 'nav apstiprināts' } })
  const ui = await $.ui.mount({ plugin: 'valejie-darbi', surface: 'desktop', ...PANE } as any)
  await ui.press({ key: 'atjaunot' } as any)
  // 🗄 ir tikai sakļautā kartītē, lai nenospiestu nejauši.
  expect(await atrodi(ui, 'arhivet:x')).toBeUndefined()
  await ui.press({ key: 'saklaut:x' } as any)
  await ui.press({ key: 'arhivet:x' } as any)
  expect(await teksts(ui, /Neizdevās arhivēt "Sesija x": nav apstiprināts/)).toBeDefined()
  await ui.unmount()
})

test('atļauj tikai paša moda pogu izsaukumus, ne Claude', async ($, on) => {
  const parbauditi: string[] = []
  on('tool.check', async ($: any, e: any) => {
    parbauditi.push(String(e.tool))
    return { decision: 'deny', reason: 'klasifikators' } as any
  })
  // Claude (engine) izsaukums iet līdz parastajai pārbaudei.
  const claude = await $.tool.check({ tool: 'mcp__ccd_session_mgmt__archive_session', input: { session_id: 'x' } } as any)
  expect(claude.decision).toBe('deny')
  expect(parbauditi).toEqual(['mcp__ccd_session_mgmt__archive_session'])
})

test('pogu atslēgas ir ASCII, ko aplikācija nemaina', async ($, on) => {
  dzinejs(on)
  const ui = await $.ui.mount({ plugin: 'valejie-darbi', surface: 'desktop', ...PANE } as any)
  await ui.press({ key: 'atjaunot' } as any)
  for (const key of ['keksis:a:0', 'atvert-darbu:a:0', 'turpini:a:0', 'saklaut:a', 'pievienot:a']) {
    expect(/^[A-Za-z0-9:_-]{1,64}$/.test(key)).toBe(true)
    expect(await atrodi(ui, key)).toBeDefined()
  }
  await ui.unmount()
})

test('ja failu panelī atvērt nevar, Atvērt atver failu VS Code, nevis Xcode', async ($, on) => {
  const d = dzinejs(on, { suta: { deny: 'session is not open in any window, nothing shown' } })
  const ui = await $.ui.mount({ plugin: 'valejie-darbi', surface: 'desktop', ...PANE } as any)
  await ui.press({ key: 'atjaunot' } as any)
  await ui.press({ key: 'atvert-darbu:a:0' } as any)
  expect(d.palaisti.at(-1)).toEqual(['open', '-a', 'Visual Studio Code', '/projekts/brifs.md'])
  await ui.unmount()
})

test('uzspiežot uz darba teksta, atveras pilnais apraksts; promptam ko nosūtīs', async ($, on) => {
  dzinejs(on)
  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ plugin: 'valejie-darbi', surface, ...PANE } as any)
    await ui.press({ key: 'atjaunot' } as any)
    expect(await teksts(ui, /Klientam jāizvēlas divi/)).toBeUndefined()
    await ui.press({ key: 'teksts:a:t0' } as any)
    expect(await teksts(ui, /Klientam jāizvēlas divi no četriem domēniem/)).toBeDefined()
    await ui.press({ key: 'teksts:t:c0' } as any)
    expect(await teksts(ui, /Nosūtīs: Turpini: pabeidz testus\./)).toBeDefined()
    await ui.press({ key: 'teksts:a:t0' } as any)
    expect(await teksts(ui, /Klientam jāizvēlas divi/)).toBeUndefined()
    await ui.press({ key: 'teksts:t:c0' } as any)
    await ui.unmount()
  }
})

const ZINA = (no: string, vards: string, teksts: string) =>
  `<cross-session-message from="${no}" name="${vards}">\n${teksts}\n</cross-session-message>`

test('atskaite no citas sesijas parādās tās kartītē, ✕ to aizver', async ($, on) => {
  const d = dzinejs(on)
  on('session.receive', async ($: any, e: any) => ({ text: e.text }) as any)
  const ui = await $.ui.mount({ plugin: 'valejie-darbi', surface: 'desktop', ...PANE } as any)
  await ui.press({ key: 'atjaunot' } as any)
  await ui.press({ key: 'turpini:t:0' } as any)
  // Sesija atsūta atskaiti → tā redzama kartītē.
  const r = await ($ as any).session.receive({ origin: { kind: 'peer' }, text: ZINA('t', 'Sesija t', 'Testi iziet 76/76.\nSīkāk: viss izvietots.') })
  expect(r.text).toContain('Testi iziet')
  expect((d.krātuve.get('atskaites') as Record<string, { teksts: string }>).t?.teksts).toBe('Testi iziet 76/76.\nSīkāk: viss izvietots.')
  await ui.press({ key: 'atjaunot' } as any)
  expect(await atrodi(ui, 'atskaite:t')).toBeDefined()
  expect(await teksts(ui, /Sīkāk: viss izvietots/)).toBeUndefined()
  await ui.press({ key: 'atskaite:t' } as any)
  expect(await teksts(ui, /Sīkāk: viss izvietots/)).toBeDefined()
  await ui.press({ key: 'atskaite-aizvert:t' } as any)
  expect(await atrodi(ui, 'atskaite:t')).toBeUndefined()
  expect(await atrodi(ui, 'saklaut:t')).toBeDefined()
  await ui.unmount()
})

test('atskaiti bez ID atpazīst pēc sesijas nosaukuma; citas ziņas neaiztiek', async ($, on) => {
  const d = dzinejs(on)
  on('session.receive', async ($: any, e: any) => ({ text: e.text }) as any)
  const ui = await $.ui.mount({ plugin: 'valejie-darbi', surface: 'desktop', ...PANE } as any)
  await ui.press({ key: 'atjaunot' } as any)
  // ▷ uz a un b, lai no abām gaidām atskaiti.
  await ui.press({ key: 'turpini:a:0' } as any)
  d.krātuve.set('gaidaAtskaiti', { ...(d.krātuve.get('gaidaAtskaiti') as object), b: 1 })
  await ($ as any).session.receive({ origin: { kind: 'peer' }, text: '<cross-session-message name="Sesija a">Gatavs.</cross-session-message>' })
  await ($ as any).session.receive({ origin: { kind: 'bridge' }, text: ZINA('b', 'Sesija b', 'Nav atskaite') })
  const at = d.krātuve.get('atskaites') as Record<string, unknown>
  expect(Object.keys(at)).toEqual(['a'])
  await ui.unmount()
})

test('ziņa no sesijas, kurai ▷ nesūtījām (piemēram, pats ▷ uzdevums), nav atskaite', async ($, on) => {
  const d = dzinejs(on)
  on('session.receive', async ($: any, e: any) => ({ text: e.text }) as any)
  const ui = await $.ui.mount({ plugin: 'valejie-darbi', surface: 'desktop', ...PANE } as any)
  await ui.press({ key: 'atjaunot' } as any)
  await ($ as any).session.receive({ origin: { kind: 'peer' }, text: ZINA('x', 'Sesija x', 'Turpini: izdari kaut ko.') })
  expect(d.krātuve.get('atskaites')).toBeUndefined()
  await ui.unmount()
})

test('pēc gājiena sesija pati uzraksta līdz 3 nākamajiem promptiem un jaunus darbus tev', async ($, on) => {
  const d = dzinejs(on)
  const sesijaA = DATI.sesijas[0] as { sis: boolean }
  sesijaA.sis = true
  // lietotājs vienu darbu jau atzīmēja: to vairs nepiedāvā, un no saraksta tas pazūd.
  d.krātuve.set('izdariti', { 'a|t|Izlem par domēniem': 1 })
  try {
    await ($ as any).turn.complete(GAJIENS)
    await pagaidi(() => soli(d).a?.claude?.[0]?.darbs === 'Palaid testus')
    expect(d.forki.length).toBe(1)
    expect(d.forki[0]).toContain('1. Ievadi paroli')
    expect(d.forki[0]).not.toContain('Izlem par domēniem')
    const a = soli(d).a
    expect(a.claude.map((c: { darbs: string }) => c.darbs)).toEqual(['Palaid testus', 'Commito izmaiņas', 'Uzraksti README'])
    expect(a.claude[0].prompts).toBe('Palaid testus un pasaki rezultātu.')
    expect(a.tev.map((x: { darbs: string }) => x.darbs)).toEqual(['Ievadi paroli', 'Atbildi klientam'])
    // Relatīvs ceļš sasiets ar sesijas mapi un pārbaudīts.
    expect(a.tev[1].atvert).toBe('/projekts/brifs.md')
    expect(d.jautajumi.length).toBe(0)
    const ui = await $.ui.mount({ plugin: 'valejie-darbi', surface: 'desktop', ...PANE } as any)
    await ui.press({ key: 'atjaunot' } as any)
    expect(await atrodi(ui, 'turpini:a:2')).toBeDefined()
    expect(await atrodi(ui, 'turpini:a:3')).toBeUndefined()
    // Bez etiķetēm "Tev" un "Claude": ☐ ir tavs darbs, ▷ Claude prompts.
    expect(await teksts(ui, /^(Tev|Claude)$/)).toBeUndefined()
    await ui.unmount()
  } finally {
    sesijaA.sis = false
  }
})

test('pēc gājiena izdarītos atzīmē bez piezīmes sesijai; tie paliek kartītē atzīmēti', async ($, on) => {
  const d = dzinejs(on, { ieteikumi: { prompti: [], tev: [], izdariti: [2] } })
  const sesijaA = DATI.sesijas[0] as { sis: boolean }
  sesijaA.sis = true
  try {
    await ($ as any).turn.complete(GAJIENS)
    await pagaidi(() => d.krātuve.get('izdariti') !== undefined && soli(d).a?.claude?.length === 0)
    const iz = d.krātuve.get('izdariti') as Record<string, number>
    expect(iz['a|t|Ievadi paroli']).toBeDefined()
    expect(iz['a|t|Izlem par domēniem']).toBeUndefined()
    expect((d.krātuve.get('izdaritiVesture') as Record<string, string[]>).a).toEqual(['Ievadi paroli'])
    expect((d.krātuve.get('pazinojumi') as Record<string, string[]> | undefined)?.a).toBeUndefined()
    const ui = await $.ui.mount({ plugin: 'valejie-darbi', surface: 'desktop', ...PANE } as any)
    await ui.press({ key: 'atjaunot' } as any)
    // Paliek kartītē atzīmēts (var atķeksēt atpakaļ), tāpēc Atvērt pie tā vairs nav.
    expect(await atrodi(ui, 'keksis:a:1')).toBeDefined()
    await ui.unmount()
  } finally {
    sesijaA.sis = false
  }
})

test('ar izslēgtu iestatījumu pēc gājiena neko neatzīmē, bet promptus uzraksta', { options: { atzimetAutomatiski: false } } as any, async ($: any, on: any) => {
  const d = dzinejs(on, { ieteikumi: { prompti: [{ label: 'Palaid testus', prompt: 'Palaid testus.' }], tev: [], izdariti: [1] } })
  const sesijaA = DATI.sesijas[0] as { sis: boolean }
  sesijaA.sis = true
  try {
    await $.turn.complete(GAJIENS)
    await pagaidi(() => soli(d).a?.claude?.[0]?.darbs === 'Palaid testus')
    expect(soli(d).a.claude.length).toBe(1)
    expect(d.krātuve.get('izdariti')).toBeUndefined()
  } finally {
    sesijaA.sis = false
  }
})

test('pārtraukts gājiens nākamos soļus neprasa', async ($, on) => {
  const d = dzinejs(on)
  const sesijaA = DATI.sesijas[0] as { sis: boolean }
  sesijaA.sis = true
  try {
    await ($ as any).turn.complete({ ...GAJIENS, reason: 'aborted', isAborted: true })
    await pagaidi()
    expect(d.forki.length).toBe(0)
  } finally {
    sesijaA.sis = false
  }
})

test('paša pielikts prompts ("c:") paliek, līdz to nosūta; pārējie prompti katru reizi jauni', async ($, on) => {
  const d = dzinejs(on)
  const sesijaA = DATI.sesijas[0] as { sis: boolean }
  sesijaA.sis = true
  d.krātuve.set('analizes3', {
    a: solis([], [
      { darbs: 'Mans darbs', prompts: 'Mans darbs', pats: true },
      { darbs: 'Vecs prompts', prompts: 'Vecs.' },
    ]),
  })
  try {
    await ($ as any).turn.complete(GAJIENS)
    await pagaidi(() => soli(d).a?.claude?.length === 4)
    expect(soli(d).a.claude.map((c: { darbs: string }) => c.darbs)).toEqual(['Mans darbs', 'Palaid testus', 'Commito izmaiņas', 'Uzraksti README'])
  } finally {
    sesijaA.sis = false
  }
})

test('https Atvērt ir saite, ko atver aplikācija; ~/ ceļu sasien ar mājas mapi', async ($, on) => {
  const d = dzinejs(on, {
    bezSoliem: true,
    faili: { '/Users/es/klienti/brifs.md': '' },
    ieteikumi: {
      prompti: [],
      tev: [
        { darbs: 'Nosūti melnrakstu', atvert: 'https://mail.google.com/mail/#drafts' },
        { darbs: 'Pārskati brīfu', atvert: '~/klienti/brifs.md' },
      ],
      izdariti: [],
    },
  })
  const sesijaA = DATI.sesijas[0] as { sis: boolean }
  sesijaA.sis = true
  try {
    await ($ as any).turn.complete(GAJIENS)
    await pagaidi(() => soli(d)?.a?.tev?.length === 2)
    const ui = await $.ui.mount({ plugin: 'valejie-darbi', surface: 'desktop', ...PANE } as any)
    await ui.press({ key: 'atjaunot' } as any)
    // Saite ir Link (to atver aplikācija), nevis poga, kas palaiž `open` no moda procesa.
    const saites = (await ui.findAll({ type: 'Link' } as any)) as unknown as { props: { href: string; label: string } }[]
    expect(saites.map(x => x.props)).toContainEqual({ href: 'https://mail.google.com/mail/#drafts', label: 'Atvērt' })
    expect(await teksts(ui, /^ mail\.google\.com\/mail\/#drafts $/)).toBeDefined()
    expect(await teksts(ui, /^ ~\/klienti\/brifs\.md $/)).toBeDefined()
    await ui.press({ key: 'atvert-darbu:a:1' } as any)
    expect(d.suti.at(-1)).toMatchObject({ server: 'ccd_view', riks: 'show_pane', path: '/Users/es/klienti/brifs.md' })
    await ui.unmount()
  } finally {
    sesijaA.sis = false
  }
})

test('pulsējošais punkts tumšajā tēmā bez balta fona', async () => {
  // Interaktīvais SVG ir atsevišķā rāmī: bez color-scheme tumšajā tēmā tam ir necaurspīdīgs balts fons.
  expect(pulsaSvg('gaida')).toContain('<style>:root{color-scheme:light dark}</style>')
})

test('Nenopušots: uzspiežot uz teksta redz commitus, ✕ rindu paslēpj', async ($, on) => {
  const d = dzinejs(on)
  const ui = await $.ui.mount({ plugin: 'valejie-darbi', surface: 'desktop', ...PANE } as any)
  await ui.press({ key: 'atjaunot' } as any)
  expect(await teksts(ui, /abc123 Titru versijas/)).toBeUndefined()
  await ui.press({ key: 'repo-teksts:0' } as any)
  expect(await teksts(ui, /abc123 Titru versijas/)).toBeDefined()
  await ui.press({ key: 'repo-x:0' } as any)
  expect(await atrodi(ui, 'pusot:0')).toBeUndefined()
  expect(d.krātuve.get('pasleptiRepo')).toEqual({ '/p': 's1' })
  await ui.unmount()
})

test('agrāk kļūdaini saglabātu ▷ uzdevumu kā atskaiti izmet', async ($, on) => {
  const d = dzinejs(on)
  d.krātuve.set('atskaites', { a: { laiks: 1, teksts: 'Turpini: pabeidz testus.' }, b: { laiks: 1, teksts: 'Īsta atskaite' } })
  const ui = await $.ui.mount({ plugin: 'valejie-darbi', surface: 'desktop', ...PANE } as any)
  await ui.press({ key: 'atjaunot' } as any)
  await ui.press({ key: 'atjaunot' } as any)
  expect(Object.keys(d.krātuve.get('atskaites') as object)).toEqual(['b'])
  await ui.unmount()
})

test('.pievienot.json pieliek un noņem darbus kartītei un tiek izdzēsts', async ($, on) => {
  const faili: Record<string, string> = {}
  const d = dzinejs(on, { faili })
  const ui = await $.ui.mount({ plugin: 'valejie-darbi', surface: 'desktop', ...PANE } as any)
  await ui.press({ key: 'atjaunot' } as any)
  faili['.pievienot.json'] = JSON.stringify([
    { sesija: 'Sesija x', tev: ['Pievieno darbinieku Gmail kontus botam'], claude: [{ darbs: 'Izdzēs testa kampaņu', prompts: 'Turpini: izdzēs testa kampaņu.' }] },
    { sesija: 'a', nonemt: ['Ievadi paroli', 'Izveidot CRM lapas'] },
    { sesija: 'b', nonemt: ['Kaut kas'] },
  ])
  await ui.press({ key: 'atjaunot' } as any)
  expect(d.palaisti.some(a => a[0] === '/bin/rm' && String(a[2]).endsWith('.pievienot.json'))).toBe(true)
  delete faili['.pievienot.json']
  await ui.press({ key: 'atjaunot' } as any)
  expect(await atrodi(ui, 'keksis:x:0')).toBeDefined()
  expect(await atrodi(ui, 'turpini:x:0')).toBeDefined()
  const an = soli(d)
  expect(an.a?.tev.map((x: { darbs: string }) => x.darbs)).toEqual(['Izlem par domēniem'])
  expect(an.a?.claude).toEqual([])
  // Sesijai bez nākamajiem soļiem tikai noņemšana neveido tukšus.
  expect(an.b).toBeUndefined()
  await ui.unmount()
})

test('+ atver lauku; Enter un ✓ saglabā darbu, ➤ uzreiz nosūta Claude', async ($, on) => {
  const d = dzinejs(on)
  const ui = (await $.ui.mount({ plugin: 'valejie-darbi', surface: 'desktop', ...PANE } as any)) as any
  await ui.press({ key: 'atjaunot' } as any)
  // Lauks nav redzams, līdz nospiež +.
  expect(await atrodi(ui, 'jauns:t:0')).toBeUndefined()
  await ui.press({ key: 'pievienot:t' })
  await ui.input({ key: 'jauns:t:0', text: 'Piezvani klientam' })
  expect(await atrodi(ui, 'keksis:t:0')).toBeDefined()
  // Pēc saglabāšanas lauks aizveras.
  expect(await atrodi(ui, 'jauns:t:1')).toBeUndefined()

  await ui.press({ key: 'pievienot:t' })
  await ui.input({ key: 'jauns:t:1', text: 'c: Uzraksti atskaiti klientam', kind: 'change' })
  await ui.press({ key: 'saglabat:t' })
  const an = soli(d)
  expect(an.t?.tev.map((x: { darbs: string }) => x.darbs)).toEqual(['Piezvani klientam'])
  expect(an.t?.claude.map((x: { prompts: string }) => x.prompts)).toEqual(['Turpini: pabeidz testus.', 'Uzraksti atskaiti klientam'])
  expect(an.t?.claude[1].pats).toBe(true)

  await ui.press({ key: 'pievienot:t' })
  await ui.input({ key: 'jauns:t:2', text: 'Pārbaudi Instantly limitus', kind: 'change' })
  await ui.press({ key: 'sutit:t' })
  expect(d.suti.at(-1)).toMatchObject({ riks: 'send_message', session_id: 't', message: 'Pārbaudi Instantly limitus' })
  // ➤ neko nesaglabā sarakstā.
  expect(soli(d).t?.tev.length).toBe(1)
  // Enter tukšā laukā lauku aizver, neko nesaglabājot.
  await ui.press({ key: 'pievienot:t' })
  await ui.input({ key: 'jauns:t:3', text: '' })
  expect(await atrodi(ui, 'jauns:t:4')).toBeUndefined()
  expect(await atrodi(ui, 'jauns:t:3')).toBeUndefined()
  expect(soli(d).t?.tev.length).toBe(1)
  await ui.unmount()
})

test('pogām ir padomi, kas parādās, uzbraucot ar peli', async ($, on) => {
  dzinejs(on)
  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ plugin: 'valejie-darbi', surface, ...PANE } as any)
    await ui.press({ key: 'atjaunot' } as any)
    for (const padoms of [/^ Sakļaut $/, /^ Nosūtīt $/, /^ Izdarīts $/, /^ Atvērt sesiju $/, /^ Jauns darbs $/]) {
      expect(await teksts(ui, padoms)).toBeDefined()
    }
    await ui.unmount()
  }
})

test('/darbi padomi pārslēdz padomus un atceras to krātuvē', async ($, on) => {
  const d = dzinejs(on)
  const ui = await $.ui.mount({ plugin: 'valejie-darbi', surface: 'desktop', ...PANE } as any)
  await ui.press({ key: 'atjaunot' } as any)
  expect(await teksts(ui, /^ Sakļaut $/)).toBeDefined()
  const r = await ($ as any).command.run({ command: 'darbi', args: 'padomi' })
  expect(JSON.stringify(r)).toContain('izslēgti')
  expect(d.krātuve.get('padomi')).toBe(false)
  expect(await teksts(ui, /^ Sakļaut $/)).toBeUndefined()
  await ($ as any).command.run({ command: 'darbi', args: 'padomi' })
  expect(d.krātuve.get('padomi')).toBe(true)
  await ui.unmount()
})

test('ar izslēgtiem padomiem tie netiek zīmēti', { options: { radiPadomus: false } } as any, async ($: any, on: any) => {
  dzinejs(on)
  const ui = await $.ui.mount({ plugin: 'valejie-darbi', surface: 'desktop', ...PANE } as any)
  await ui.press({ key: 'atjaunot' } as any)
  expect(await teksts(ui, /^ Sakļaut $/)).toBeUndefined()
  expect(await atrodi(ui, 'saklaut:a')).toBeDefined()
  await ui.unmount()
})

test('pušo nosūta "pušo <repo>" sesijai, kas ar repo strādāja', async ($, on) => {
  const d = dzinejs(on)
  const ui = await $.ui.mount({ plugin: 'valejie-darbi', surface: 'desktop', ...PANE } as any)
  await ui.press({ key: 'atjaunot' } as any)
  expect(await atrodi(ui, 'repo-sesija:0')).toBeDefined()
  await ui.press({ key: 'pusot:0' } as any)
  expect(d.suti.at(-1)).toMatchObject({ riks: 'send_message', session_id: 't', message: 'pušo satura-sistema-paka' })
  // Paslēpts vienīgais repo → rindas nav, paliek tikai "Paslēpti: 1" ar Rādīt.
  await ui.press({ key: 'repo-x:0' } as any)
  expect(await atrodi(ui, 'pusot:0')).toBeUndefined()
  await ui.unmount()
})

test('atzīmēts ☐ klusi aiziet līdzi nākamajam promptam tajā sesijā un paliek atmiņā', async ($, on) => {
  const d = dzinejs(on)
  const sesijaA = DATI.sesijas[0] as { sis: boolean }
  sesijaA.sis = true
  try {
    const ui = await $.ui.mount({ plugin: 'valejie-darbi', surface: 'desktop', ...PANE } as any)
    await ui.press({ key: 'atjaunot' } as any)
    await ui.press({ key: 'keksis:a:0' } as any)
    expect((d.krātuve.get('pazinojumi') as Record<string, string[]>).a).toEqual(['Izlem par domēniem'])
    await ($ as any).prompt.submit({ text: 'Kas tālāk?' })
    expect(d.konteksti.at(-1)?.[0]).toContain('- Izlem par domēniem')
    // Piezīme nodota vienreiz.
    expect((d.krātuve.get('pazinojumi') as Record<string, string[]>).a).toBeUndefined()
    await ($ as any).prompt.submit({ text: 'Un tagad?' })
    expect(d.konteksti.at(-1)).toBeUndefined()
    // Atmiņā paliek, un sesija to pēc gājiena vairs nepiedāvā.
    expect((d.krātuve.get('izdaritiVesture') as Record<string, string[]>).a).toEqual(['Izlem par domēniem'])
    await ui.unmount()
  } finally {
    sesijaA.sis = false
  }
})

test('atķeksējot atpakaļ, piezīme un atmiņas ieraksts tiek noņemti', async ($, on) => {
  const d = dzinejs(on)
  const ui = await $.ui.mount({ plugin: 'valejie-darbi', surface: 'desktop', ...PANE } as any)
  await ui.press({ key: 'atjaunot' } as any)
  await ui.press({ key: 'keksis:a:0' } as any)
  await ui.press({ key: 'keksis:a:0' } as any)
  expect((d.krātuve.get('pazinojumi') as Record<string, string[]>).a).toEqual([])
  expect((d.krātuve.get('izdaritiVesture') as Record<string, string[]>).a).toEqual([])
  await ui.unmount()
})

test('paslēptos repo var parādīt atpakaļ', async ($, on) => {
  dzinejs(on)
  const ui = await $.ui.mount({ plugin: 'valejie-darbi', surface: 'desktop', ...PANE } as any)
  await ui.press({ key: 'atjaunot' } as any)
  await ui.press({ key: 'repo-x:0' } as any)
  expect(await atrodi(ui, 'pusot:0')).toBeUndefined()
  expect(await teksts(ui, /Paslēpti: 1/)).toBeDefined()
  await ui.press({ key: 'radit-paslepto' } as any)
  expect(await atrodi(ui, 'pusot:0')).toBeDefined()
  await ui.unmount()
})

test('atzīmēts darbs sakļaujas; pašreizējā sesija bez "(šī sesija)"', async ($, on) => {
  dzinejs(on)
  const ui = await $.ui.mount({ plugin: 'valejie-darbi', surface: 'desktop', ...PANE } as any)
  await ui.press({ key: 'atjaunot' } as any)
  await ui.press({ key: 'teksts:a:t0' } as any)
  expect(await teksts(ui, /Klientam jāizvēlas divi/)).toBeDefined()
  await ui.press({ key: 'keksis:a:0' } as any)
  expect(await teksts(ui, /Klientam jāizvēlas divi/)).toBeUndefined()
  expect(await teksts(ui, /šī sesija/)).toBeUndefined()
  await ui.unmount()
})

test('jaunas izmaiņas kartītē: punkts pulsē, līdz lietotājs ar kartīti kaut ko dara', async ($, on) => {
  const d = dzinejs(on)
  const ui = await $.ui.mount({ plugin: 'valejie-darbi', surface: 'desktop', ...PANE } as any)
  const jauns = () => teksts(ui, /Jaunas izmaiņas/)
  await ui.press({ key: 'atjaunot' } as any)
  // Pirmo reizi redzētās kartītes nepulsē.
  expect(await jauns()).toBeUndefined()
  const sesijaA = DATI.sesijas[0] as { last: number; stavoklis: string; stavoklisKops: number }
  try {
    // Sesija strādā: tas vēl nav jaunums.
    Object.assign(sesijaA, { last: 8, stavoklis: 'busy', stavoklisKops: 8 })
    await ui.press({ key: 'atjaunot' } as any)
    expect(await jauns()).toBeUndefined()
    // Sesija pabeidza darbu.
    Object.assign(sesijaA, { last: 10, stavoklis: 'idle', stavoklisKops: 10 })
    await ui.press({ key: 'atjaunot' } as any)
    expect(await jauns()).toBeDefined()
    await ui.press({ key: 'teksts:a:t0' } as any)
    expect(await jauns()).toBeUndefined()
    // Cita sesija pēc sava gājiena uzrakstīja jaunus promptus.
    const visi = soli(d)
    d.krātuve.set('analizes3', { ...visi, t: { ...visi.t, claude: [{ darbs: 'Jauns prompts', prompts: 'Jauns.' }] } })
    await ui.press({ key: 'atjaunot' } as any)
    expect(await jauns()).toBeDefined()
  } finally {
    Object.assign(sesijaA, { last: 5, stavoklis: '', stavoklisKops: 0 })
  }
  await ui.unmount()
})

test('punkts nepulsē, ja darbi tikai pazuda (piemēram, notīrīti prompti)', async ($, on) => {
  const faili: Record<string, string> = {}
  dzinejs(on, { faili })
  const ui = await $.ui.mount({ plugin: 'valejie-darbi', surface: 'desktop', ...PANE } as any)
  const jauns = () => teksts(ui, /Jaunas izmaiņas/)
  await ui.press({ key: 'atjaunot' } as any)
  expect(await jauns()).toBeUndefined()
  faili['.komanda.json'] = JSON.stringify({ tiritClaude: true })
  await ui.press({ key: 'atjaunot' } as any)
  delete faili['.komanda.json']
  expect(await jauns()).toBeUndefined()
  await ui.unmount()
})

test('.komanda.json notīra promptus; ☐ paliek, modeli nesauc', async ($, on) => {
  const faili: Record<string, string> = {}
  const d = dzinejs(on, { faili })
  const ui = await $.ui.mount({ plugin: 'valejie-darbi', surface: 'desktop', ...PANE } as any)
  await ui.press({ key: 'atjaunot' } as any)
  faili['.komanda.json'] = JSON.stringify({ tiritClaude: true })
  await ui.press({ key: 'atjaunot' } as any)
  delete faili['.komanda.json']
  expect(d.palaisti.some(a => a[0] === '/bin/rm' && String(a[2]).endsWith('.komanda.json'))).toBe(true)
  const an = soli(d)
  expect(an.a?.tev.map((x: { darbs: string }) => x.darbs)).toEqual(['Izlem par domēniem', 'Ievadi paroli'])
  expect(an.a?.claude).toEqual([])
  expect(d.jautajumi.length + d.forki.length).toBe(0)
  await ui.unmount()
})

test('pienākot atskaitei: macOS paziņojums ar skaņu un aplikācijas paziņojums', async ($, on) => {
  const d = dzinejs(on)
  on('session.receive', async ($: any, e: any) => ({ text: e.text }) as any)
  const ui = await $.ui.mount({ plugin: 'valejie-darbi', surface: 'desktop', ...PANE } as any)
  await ui.press({ key: 'atjaunot' } as any)
  await ui.press({ key: 'turpini:t:0' } as any)
  await ($ as any).session.receive({ origin: { kind: 'peer' }, text: ZINA('t', 'Sesija t', 'Testi iziet "76/76".\nSīkāk.') })
  const osa = d.palaisti.find(a => a[0] === 'osascript')
  expect(osa).toBeDefined()
  expect(osa?.join(' ')).toContain('sound name "Glass"')
  expect(osa?.at(-3)).toBe('Testi iziet "76/76".')
  expect(osa?.at(-2)).toBe('Atskaite: Sesija t')
  expect(osa?.at(-1)).toBe('Darāmie darbi')
  expect(d.pazinojumi.some(p => p.includes('Atskaite no "Sesija t"'))).toBe(true)
  await ui.unmount()
})

test('ar izslēgtu iestatījumu atskaite pienāk klusi', { options: { zinotParAtskaitem: false } } as any, async ($: any, on: any) => {
  const d = dzinejs(on)
  on('session.receive', async ($: any, e: any) => ({ text: e.text }) as any)
  const ui = await $.ui.mount({ plugin: 'valejie-darbi', surface: 'desktop', ...PANE } as any)
  await ui.press({ key: 'atjaunot' } as any)
  await ui.press({ key: 'turpini:t:0' } as any)
  await $.session.receive({ origin: { kind: 'peer' }, text: ZINA('t', 'Sesija t', 'Gatavs.') })
  expect(d.palaisti.some(a => a[0] === 'osascript')).toBe(false)
  expect((d.krātuve.get('atskaites') as Record<string, unknown>).t).toBeDefined()
  await ui.unmount()
})

test('repo rindā var izvēlēties citu sesiju pušo komandai un atgriezt automātisko', async ($, on) => {
  const d = dzinejs(on)
  const ui = (await $.ui.mount({ plugin: 'valejie-darbi', surface: 'desktop', ...PANE } as any)) as any
  await ui.press({ key: 'atjaunot' })
  await ui.select({ key: 'repo-sesija:0', value: 'c' })
  expect(d.krātuve.get('repoSesijas')).toEqual({ '/p': 'c' })
  await ui.press({ key: 'pusot:0' })
  expect(d.suti.at(-1)).toMatchObject({ session_id: 'c', message: 'pušo satura-sistema-paka' })
  // Atpakaļ uz automātisko.
  await ui.select({ key: 'repo-sesija:0', value: '' })
  expect(d.krātuve.get('repoSesijas')).toEqual({})
  await ui.press({ key: 'pusot:0' })
  expect(d.suti.at(-1)).toMatchObject({ session_id: 't' })
  await ui.unmount()
})

test('➤ pie tava ☐ darba to nodod Claude tajā sesijā un pārvērš par nosūtītu ✓', async ($, on) => {
  const d = dzinejs(on)
  const ui = await $.ui.mount({ plugin: 'valejie-darbi', surface: 'desktop', ...PANE } as any)
  await ui.press({ key: 'atjaunot' } as any)
  await ui.press({ key: 'nodot:a:0' } as any)
  const zina = d.suti.at(-1) as { session_id: string; message: string }
  expect(zina.session_id).toBe('a')
  expect(zina.message).toContain('Palīdzi man izdarīt: Izlem par domēniem')
  expect(zina.message).toContain('Klientam jāizvēlas divi no četriem domēniem')
  expect(zina.message).toContain('soli pa solim')
  const an = soli(d)
  expect(an.a?.tev.map((x: { darbs: string }) => x.darbs)).toEqual(['Ievadi paroli'])
  expect(an.a?.claude.map((x: { darbs: string }) => x.darbs)).toContain('Izlem par domēniem')
  await ui.unmount()
})

test('paša ierakstīts garš darbs netiek nogriezts', async ($, on) => {
  const d = dzinejs(on)
  const ui = (await $.ui.mount({ plugin: 'valejie-darbi', surface: 'desktop', ...PANE } as any)) as any
  await ui.press({ key: 'atjaunot' })
  const garš = 'Sagatavo modu publicēšanai: README ar visiem paskaidrojumiem, valodas izvēle, uzstādīšanas instrukcija un piemēri bez klientu vārdiem.'
  await ui.press({ key: 'pievienot:t' })
  await ui.input({ key: 'jauns:t:0', text: garš })
  expect(soli(d).t?.tev[0]?.darbs).toBe(garš)
  await ui.unmount()
})

test('angļu valoda: panelis, padomi, sesijām sūtītie teksti un jautājums angliski', { options: { valoda: 'en', vards: 'Anna' } } as any, async ($: any, on: any) => {
  const d = dzinejs(on)
  const ui = await $.ui.mount({ plugin: 'valejie-darbi', surface: 'desktop', ...PANE } as any)
  await ui.press({ key: 'atjaunot' } as any)
  expect(await teksts(ui, /^Waiting for you$/)).toBeDefined()
  expect(await teksts(ui, /^ Open session $/)).toBeDefined()
  expect(await teksts(ui, /^(You|Claude)$/)).toBeUndefined()
  await ui.press({ key: 'nodot:a:0' } as any)
  const zina = (d.suti.at(-1) as { message: string }).message
  expect(zina).toContain('Help me get this done: Izlem par domēniem')
  expect(zina).toContain('If you need me')
  await ui.unmount()
  const sesijaA = DATI.sesijas[0] as { sis: boolean }
  sesijaA.sis = true
  try {
    await $.turn.complete(GAJIENS)
    await pagaidi(() => d.forki.length > 0)
    expect(d.forki[0]).toContain('Do not continue the task')
    expect(d.forki[0]).toContain("Anna's open tasks:")
  } finally {
    sesijaA.sis = false
  }
})

test('sesija, kurā esi, ir augšā sadaļā "Šī sesija"; atjaunot ir ikona ↻', async ($, on) => {
  dzinejs(on)
  const sesijaB = DATI.sesijas[2] as { sis: boolean }
  sesijaB.sis = true
  try {
    const ui = await $.ui.mount({ plugin: 'valejie-darbi', surface: 'desktop', ...PANE } as any)
    await ui.press({ key: 'atjaunot' } as any)
    expect(await teksts(ui, /^Šī sesija$/)).toBeDefined()
    expect(await atrodi(ui, 'atvert:b')).toBeDefined()
    expect((await atrodi(ui, 'atjaunot'))?.label ?? '↻').toBe('↻')
    await ui.unmount()
  } finally {
    sesijaB.sis = false
  }
})

test('.pievienot.json "izdarits" izņem darbu un ieraksta izdarīto atmiņā', async ($, on) => {
  const faili: Record<string, string> = {}
  const d = dzinejs(on, { faili })
  const ui = await $.ui.mount({ plugin: 'valejie-darbi', surface: 'desktop', ...PANE } as any)
  await ui.press({ key: 'atjaunot' } as any)
  faili['.pievienot.json'] = JSON.stringify([{ sesija: 'a', izdarits: ['Ievadi paroli'] }])
  await ui.press({ key: 'atjaunot' } as any)
  delete faili['.pievienot.json']
  expect(soli(d).a?.tev.map((x: { darbs: string }) => x.darbs)).toEqual(['Izlem par domēniem'])
  expect((d.krātuve.get('izdaritiVesture') as Record<string, string[]>).a).toEqual(['Ievadi paroli'])
  await ui.unmount()
})

test('✕ pie prompta to atmet; sesija to vairs neiesaka', async ($, on) => {
  const d = dzinejs(on, { ieteikumi: { prompti: [{ label: 'Pabeigt testus', prompt: 'Pabeidz testus.' }, { label: 'Jauns', prompt: 'Jauns.' }], tev: [], izdariti: [] } })
  const ui = await $.ui.mount({ plugin: 'valejie-darbi', surface: 'desktop', ...PANE } as any)
  await ui.press({ key: 'atjaunot' } as any)
  // ✕ ir katram promptam (tavam ☐ darbam ir ☐ un ➤, ✕ nav).
  expect(await atrodi(ui, 'atmest:a:0')).toBeDefined()
  expect(await atrodi(ui, 'atmest:a:t0')).toBeUndefined()
  await ui.press({ key: 'atmest:t:0' } as any)
  expect(await atrodi(ui, 'turpini:t:0')).toBeUndefined()
  expect(d.suti.length).toBe(0)
  expect((d.krātuve.get('atmesti') as Record<string, string[]>).t).toEqual(['Pabeigt testus'])
  await ui.unmount()
  const sesijaT = DATI.sesijas[1] as { sis: boolean }
  sesijaT.sis = true
  try {
    await ($ as any).turn.complete(GAJIENS)
    await pagaidi(() => soli(d).t?.claude?.length === 1)
    expect(d.forki[0]).toContain('- Pabeigt testus')
    expect(soli(d).t.claude.map((c: { darbs: string }) => c.darbs)).toEqual(['Jauns'])
  } finally {
    sesijaT.sis = false
  }
})

test('atzīmēts ☐ un nosūtīts ▷ pazūd no kartītes 10 minūtes pēc atzīmes', async ($, on) => {
  const d = dzinejs(on)
  d.krātuve.set('izdariti', {
    'a|t|Izlem par domēniem': TAGAD - 11 * 60_000,
    'a|t|Ievadi paroli': TAGAD - 60_000,
    'a|c|Izveidot CRM lapas': TAGAD - 11 * 60_000,
  })
  const ui = await $.ui.mount({ plugin: 'valejie-darbi', surface: 'desktop', ...PANE } as any)
  await ui.press({ key: 'atjaunot' } as any)
  expect(await atrodi(ui, 'keksis:a:0')).toBeUndefined()
  // Nesen atzīmētais vēl redzams (var atķeksēt), un tā atslēga nemainās.
  expect(await atrodi(ui, 'keksis:a:1')).toBeDefined()
  expect(await atrodi(ui, 'turpini:a:0')).toBeUndefined()
  await ui.unmount()
})

test('paziņojuma rindu panelī var aizvērt ar ✕, un pēc minūtes tā pazūd pati', async ($, on) => {
  const d = dzinejs(on)
  const ui = await $.ui.mount({ plugin: 'valejie-darbi', surface: 'desktop', ...PANE } as any)
  await ui.press({ key: 'atjaunot' } as any)
  await ui.press({ key: 'turpini:t:0' } as any)
  expect(await teksts(ui, /^Nosūtīts uz "Sesija t"/)).toBeDefined()
  await ui.press({ key: 'zinja-x' } as any)
  expect(await teksts(ui, /^Nosūtīts uz "Sesija t"/)).toBeUndefined()
  await ui.press({ key: 'turpini:c:0' } as any)
  expect(await teksts(ui, /^Nosūtīts uz "Sesija c"/)).toBeDefined()
  d.iestatitLaiku(TAGAD + 2 * 60_000)
  await ui.press({ key: 'atjaunot' } as any)
  expect(await teksts(ui, /^Nosūtīts uz "Sesija c"/)).toBeUndefined()
  await ui.unmount()
})

test('sesija izņem tavus darbus, ko Claude var izdarīt pats, bez atzīmes par izdarītu', async ($, on) => {
  const d = dzinejs(on, { ieteikumi: { prompti: [{ label: 'Ievadi paroli', prompt: 'Ievadi paroli pats.' }], tev: [], izdariti: [], nonemt: [2] } })
  const sesijaA = DATI.sesijas[0] as { sis: boolean }
  sesijaA.sis = true
  try {
    await ($ as any).turn.complete(GAJIENS)
    await pagaidi(() => soli(d).a?.tev?.length === 1)
    expect(soli(d).a.tev.map((x: { darbs: string }) => x.darbs)).toEqual(['Izlem par domēniem'])
    expect(d.krātuve.get('izdariti')).toBeUndefined()
    expect(d.krātuve.get('izdaritiVesture')).toBeUndefined()
  } finally {
    sesijaA.sis = false
  }
})

test('klasifikatora atteikumu rāda saprotami: vajag atļauju', async ($, on) => {
  dzinejs(on, { suta: { deny: 'The server-side auto mode classifier gave no verdict for mcp__ccd_session_mgmt__archive_session: the request …' } })
  const ui = await $.ui.mount({ plugin: 'valejie-darbi', surface: 'desktop', ...PANE } as any)
  await ui.press({ key: 'atjaunot' } as any)
  await ui.press({ key: 'saklaut:t' } as any)
  await ui.press({ key: 'arhivet:t' } as any)
  expect(await teksts(ui, /Neizdevās arhivēt "Sesija t": auto režīms to no pogas neļauj/)).toBeDefined()
  await ui.unmount()
})

test('galvenes pogas labajā pusē ar ikonām; garš nosaukums saīsināts pēc paneļa platuma', async ($, on) => {
  dzinejs(on)
  const sesijaA = DATI.sesijas[0] as { title: string }
  const bija = sesijaA.title
  sesijaA.title = 'Ļoti garš sesijas nosaukums, kas šaurā panelī citādi aizbīdītu pogas ārpus redzamās daļas'
  try {
    const ui = await $.ui.mount({ plugin: 'valejie-darbi', surface: 'desktop', ...PANE, props: { bodyColumns: 40 } } as any)
    await ui.press({ key: 'atjaunot' } as any)
    const poga = (await atrodi(ui, 'atvert:a')) as { props: { label: string } }
    expect(poga.props.label.length).toBeLessThanOrEqual(28)
    expect(poga.props.label.endsWith('…')).toBe(true)
    // Ikona ir SVG, pogā tikai neredzama zīme; telefona pogas vairs nav.
    expect(((await atrodi(ui, 'saklaut:a')) as { props: { label: string } }).props.label.trim()).not.toBe('▾')
    expect(await atrodi(ui, 'rc:a')).toBeUndefined()
    await ui.unmount()
  } finally {
    sesijaA.title = bija
  }
})

test('gājiena sākumā laika aplēse no prompta; korekcija pēc iepriekšējiem gājieniem; beigās pieraksta patieso', async ($, on) => {
  const d = dzinejs(on, { aplese: { min: 4, soli: 20 } })
  const sesijaA = DATI.sesijas[0] as { sis: boolean; gaita: unknown }
  sesijaA.sis = true
  sesijaA.gaita = { soli: 31, riks: 'Edit', merkis: 'hooks/a.ts', jautajums: '', gaidaAtlauju: false }
  // Iepriekš šādi darbi aizņēma divreiz ilgāk nekā aplēsts.
  d.krātuve.set('ilgumi', [1, 2, 3].map(() => ({ s: 'citur', n: 3, f: 6, ns: 10, fs: 15 })))
  try {
    const ui = await $.ui.mount({ plugin: 'valejie-darbi', surface: 'desktop', ...PANE } as any)
    await ui.press({ key: 'atjaunot' } as any)
    await ui.unmount()
    await ($ as any).turn.start({ text: 'Salabo testus jaunajā versijā', turnId: 'g1' })
    await pagaidi(() => (d.krātuve.get('novertejumi') as any)?.a !== undefined)
    expect(d.jautajumi.at(-1)).toContain('Salabo testus jaunajā versijā')
    expect((d.krātuve.get('novertejumi') as any).a).toMatchObject({ turnId: 'g1', sakts: TAGAD, min: 8, soli: 30, rawMin: 4, rawSoli: 20 })
    await ($ as any).turn.complete({ ...GAJIENS, turnId: 'g1', durationMs: 6 * 60_000 })
    await pagaidi(() => ((d.krātuve.get('ilgumi') as unknown[]) ?? []).length === 4)
    expect((d.krātuve.get('ilgumi') as unknown[]).at(-1)).toEqual({ s: 'a', n: 4, f: 6, ns: 20, fs: 31 })
    // Turpinājums bez prompta aplēsi netaisa.
    const pirms = d.jautajumi.length
    await ($ as any).turn.start({ text: '', turnId: 'g2' })
    await pagaidi()
    expect(d.jautajumi.length).toBe(pirms)
  } finally {
    sesijaA.sis = false
    sesijaA.gaita = null
  }
})

test('strādājošai sesijai: ko dara, soļi, atlikušais laiks un josla; pārsniedzot "ilgāk nekā gaidīts"', async ($, on) => {
  const d = dzinejs(on)
  const sesijaT = DATI.sesijas[1] as Record<string, unknown>
  Object.assign(sesijaT, {
    stavoklis: 'busy',
    stavoklisKops: TAGAD - 2 * 60_000,
    gaita: { soli: 12, riks: 'Edit', merkis: 'hooks/register.tsx', jautajums: '', gaidaAtlauju: false },
  })
  d.krātuve.set('novertejumi', { t: { turnId: 'x', sakts: TAGAD - 2 * 60_000, min: 5, soli: 20, rawMin: 5, rawSoli: 20 } })
  try {
    const ui = await $.ui.mount({ plugin: 'valejie-darbi', surface: 'desktop', ...PANE } as any)
    await ui.press({ key: 'atjaunot' } as any)
    expect(await teksts(ui, /^Labo hooks\/register\.tsx · 12\/~20 soļi$/)).toBeDefined()
    expect(await teksts(ui, /^vēl ~3 min$/)).toBeDefined()
    // Plāna SVG josla: 40 % (2 no 5 min) un vienmērīgi līdz 97 % aplēstajā beigu brīdī (vēl ~2,85 min).
    const josla = async () =>
      ((await ui.findAll({ type: 'Svg' } as any)) as unknown as { props: { source: string } }[]).find(x =>
        x.props.source.includes('viewBox="0 0 100 4"'),
      )
    expect((await josla())?.props.source).toContain('from="40.00" to="97.00" dur="171s"')
    // Pārsniegta aplēse.
    d.iestatitLaiku(TAGAD + 4 * 60_000)
    await ui.press({ key: 'atjaunot' } as any)
    expect(await teksts(ui, /^ilgāk nekā gaidīts · 6 min$/)).toBeDefined()
    // Bez aplēses: tikai laiks, bez joslas.
    d.krātuve.set('novertejumi', {})
    await ui.press({ key: 'atjaunot' } as any)
    expect(await teksts(ui, /^6 min$/)).toBeDefined()
    expect(await josla()).toBeUndefined()
    await ui.unmount()
  } finally {
    Object.assign(sesijaT, { stavoklis: '', stavoklisKops: 0, gaita: null })
  }
})

test('jautājošai sesijai rāda jautājumu vai to, kam gaida atļauju', async ($, on) => {
  dzinejs(on)
  const sesijaT = DATI.sesijas[1] as Record<string, unknown>
  const sesijaC = DATI.sesijas[3] as Record<string, unknown>
  Object.assign(sesijaT, {
    stavoklis: 'waiting',
    stavoklisKops: TAGAD,
    gaita: { soli: 3, riks: 'AskUserQuestion', merkis: 'Publicēt šodien vai rīt?', jautajums: 'Publicēt šodien vai rīt?', gaidaAtlauju: false },
  })
  Object.assign(sesijaC, {
    stavoklis: 'waiting',
    stavoklisKops: TAGAD,
    gaita: { soli: 5, riks: 'Bash', merkis: 'Palaiž testus', jautajums: '', gaidaAtlauju: true },
  })
  try {
    const ui = await $.ui.mount({ plugin: 'valejie-darbi', surface: 'desktop', ...PANE } as any)
    await ui.press({ key: 'atjaunot' } as any)
    expect(await teksts(ui, /^Jautā: Publicēt šodien vai rīt\?$/)).toBeDefined()
    expect(await teksts(ui, /^Gaida atļauju: Palaiž testus$/)).toBeDefined()
    await ui.unmount()
  } finally {
    Object.assign(sesijaT, { stavoklis: '', stavoklisKops: 0, gaita: null })
    Object.assign(sesijaC, { stavoklis: '', stavoklisKops: 0, gaita: null })
  }
})

test('artefakta saiti "Atvērt" atver aplikācijā (Artifact open), nevis pārlūkā', async ($, on) => {
  const d = dzinejs(on)
  const rīki: unknown[] = []
  on('tool.call', async ($: any, e: any) => {
    rīki.push({ ...e })
    return { result: 'Opened.', text: 'Opened.' } as any
  })
  d.krātuve.set('analizes3', { a: solis([{ darbs: 'Pārskati dizainu', atvert: 'https://claude.ai/artifact/AbCdEf1234567890XyZ' }], []) })
  const ui = await $.ui.mount({ plugin: 'valejie-darbi', surface: 'desktop', ...PANE } as any)
  await ui.press({ key: 'atjaunot' } as any)
  // Poga, nevis Link.
  const saites = (await ui.findAll({ type: 'Link' } as any)) as unknown[]
  expect(saites.length).toBe(0)
  expect(await teksts(ui, /^ claude\.ai\/artifact\/AbCdEf1234567890XyZ $/)).toBeDefined()
  await ui.press({ key: 'atvert-darbu:a:0' } as any)
  expect(rīki.at(-1)).toMatchObject({ tool: 'Artifact', action: 'open', url: 'https://claude.ai/artifact/AbCdEf1234567890XyZ' })
  await ui.unmount()
})
