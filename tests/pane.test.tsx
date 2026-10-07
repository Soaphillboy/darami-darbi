import { test, expect } from 'claude-code/testing'

const PANE = { component: 'Pane', requestId: 'valejie-darbi', props: { bodyColumns: 70 }, viewport: { columns: 74, rows: 60 } } as const

const sesija = (id: string, status: string, ext: Record<string, unknown> = {}) => ({
  id, title: `Sesija ${id}`, link: `claude://x/${id}`, status, detail: `detaļas ${id}`, needs: '', nakamie: '',
  cli: `cli-${id}`, cwd: '/projekts', last: 5, sis: false, ...ext,
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

// Modeļa atbildes pēc sesijas nosaukuma prompta pirmajā rindā.
const ANALIZES: Record<string, unknown> = {
  'Sesija a': {
    tev: [
      { darbs: 'Izlem par domēniem', sikak: 'Klientam jāizvēlas divi no četriem domēniem pirms pastkastēm.', atvert: 'brifs.md' },
      { darbs: 'Ievadi paroli', atvert: '/izdomats.md' },
    ],
    claude: [{ darbs: 'Izveidot CRM lapas', prompts: 'Turpini: izveido CRM lapas.' }],
    pabeigts: false,
  },
  'Sesija t': { tev: [], claude: [{ darbs: 'Pabeigt testus', prompts: 'Turpini: pabeidz testus.' }], pabeigts: false },
  'Sesija c': { tev: [], claude: [{ darbs: 'Uzraksti testus', prompts: 'Turpini: uzraksti testus.' }], pabeigts: false },
  'Sesija b': { tev: [{ darbs: 'Sagatavo scenāriju', atvert: '' }], claude: [], pabeigts: false },
}

function dzinejs(on: any, opts: { suta?: unknown; faili?: Record<string, string> } = {}) {
  const palaisti: string[][] = []
  const jautajumi: string[] = []
  const suti: unknown[] = []
  const krātuve = new Map<string, unknown>()
  on('store.get', async ($: any, e: any) => ({ value: krātuve.get(e.key) }) as any)
  on('store.set', async ($: any, e: any) => {
    krātuve.set(e.key, JSON.parse(JSON.stringify(e.value)))
    return { value: undefined } as any
  })
  on('session.id', async () => ({ value: 'cli-test' }) as any)
  on('clock.now', async () => ({ value: 1791300000000 }) as any)
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
  on('model.complete', async ($: any, e: any) => {
    jautajumi.push(e.prompt)
    const nosaukums = (String(e.prompt).split('\n')[0] ?? '').replace(/^(Sesija|Session): /, '')
    const atbilde = ANALIZES[nosaukums] ?? { tev: [], claude: [], pabeigts: true }
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
  on('process.run', async ($: any, e: any) => {
    palaisti.push([...e.argv])
    const stdout = e.argv[1]?.endsWith('konteksts.py') ? 'konteksts' : JSON.stringify(DATI)
    return { value: { exitCode: 0, stdout, stderr: '' } } as any
  })
  return { palaisti, jautajumi, suti, krātuve, iesniegti, konteksti, pazinojumi }
}

const atrodi = (ui: any, key: string) => ui.find({ key } as any)
const teksts = (ui: any, re: RegExp) => ui.find({ type: 'Text', text: re } as any)

test('tukšs panelis zīmējas abās virsmās', async $ => {
  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ plugin: 'valejie-darbi', surface, ...PANE } as any)
    expect(await teksts(ui, /Ielādē/)).toBeDefined()
    await ui.unmount()
  }
})

test('kartītes: Tev čeklists ar Atvērt, Claude ķeksīši bez Kopēt', async ($, on) => {
  const d = dzinejs(on)
  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ plugin: 'valejie-darbi', surface, ...PANE } as any)
    await ui.press({ key: 'atjaunot' } as any)
    // Analizē tikai darbus (a, t, c), ne bez statusa (x) un ne pabeigtās (b); otrajā virsmā vairs nejautā.
    expect(d.jautajumi.length).toBe(3)
    expect(await atrodi(ui, 'keksis:a:0')).toBeDefined()
    // Pārbaudītam failam ir Atvērt, izdomātam ceļam nav.
    expect(await atrodi(ui, 'atvert-darbu:a:0')).toBeDefined()
    expect(await atrodi(ui, 'atvert-darbu:a:1')).toBeUndefined()
    expect(await atrodi(ui, 'turpini:a:0')).toBeDefined()
    expect(await atrodi(ui, 'kopet:t:0')).toBeUndefined()
    expect(await atrodi(ui, 'augsa:a')).toBeDefined()
    expect(await atrodi(ui, 'atvert:x')).toBeDefined()
    expect(await atrodi(ui, 'atvert:b')).toBeUndefined()
    expect(await atrodi(ui, 'repo-teksts:0')).toBeDefined()
    await ui.press({ key: 'atvert-darbu:a:0' } as any)
    expect(d.suti.at(-1)).toMatchObject({ server: 'ccd_view', riks: 'show_pane', pane: 'file', path: '/projekts/brifs.md' })
    await ui.unmount()
  }
})

test('ķeksītis atzīmē, bet kartīte paliek savā vietā', async ($, on) => {
  dzinejs(on)
  const ui = await $.ui.mount({ plugin: 'valejie-darbi', surface: 'desktop', ...PANE } as any)
  await ui.press({ key: 'atjaunot' } as any)
  await ui.press({ key: 'keksis:a:0' } as any)
  expect(await atrodi(ui, 'atvert-darbu:a:0')).toBeUndefined()
  await ui.press({ key: 'keksis:a:1' } as any)
  // Visi Tev darbi atzīmēti, bet kartīte joprojām ir "Gaida tevi" ar ↑ ↓ ✓, nevis pārlēkusi citur.
  expect(await atrodi(ui, 'augsa:a')).toBeDefined()
  expect(await atrodi(ui, 'keksis:a:1')).toBeDefined()
  await ui.unmount()
})

test('Claude ▷ palaiž darbu tajā sesijā vienreiz', async ($, on) => {
  const d = dzinejs(on)
  const ui = await $.ui.mount({ plugin: 'valejie-darbi', surface: 'desktop', ...PANE } as any)
  await ui.press({ key: 'atjaunot' } as any)
  expect(d.suti.length).toBe(0)
  await ui.press({ key: 'turpini:t:0' } as any)
  expect(d.suti.at(-1)).toMatchObject({ server: 'ccd_session_mgmt', riks: 'send_message', session_id: 't', message: 'Turpini: pabeidz testus.' })
  expect(await teksts(ui, /Nosūtīts uz "Sesija t"/)).toBeDefined()
  // Tas bija vienīgais darbs, tāpēc kartīte pārgāja uz pabeigtajām.
  expect(d.suti.length).toBe(1)
  expect(await atrodi(ui, 'augsa:t')).toBeUndefined()
  await ui.unmount()
})

test('↑ ↓ maina secību grupā, ✓ paslēpj', async ($, on) => {
  const { krātuve } = dzinejs(on)
  const ui = await $.ui.mount({ plugin: 'valejie-darbi', surface: 'desktop', ...PANE } as any)
  await ui.press({ key: 'atjaunot' } as any)
  expect(krātuve.get('seciba')).toBeUndefined()
  await ui.press({ key: 'leja:t' } as any)
  expect((krātuve.get('seciba') as string[]).slice(0, 2)).toEqual(['c', 't'])
  await ui.press({ key: 'augsa:t' } as any)
  expect((krātuve.get('seciba') as string[]).slice(0, 2)).toEqual(['t', 'c'])
  // ↑ pirmajai kartītei neko nemaina.
  await ui.press({ key: 'augsa:t' } as any)
  expect((krātuve.get('seciba') as string[]).slice(0, 2)).toEqual(['t', 'c'])

  await ui.press({ key: 'gatavs:a' } as any)
  expect(await atrodi(ui, 'augsa:a')).toBeUndefined()
  await ui.press({ key: 'radit-pabeigtas' } as any)
  expect(await atrodi(ui, 'atgriezt:a')).toBeDefined()
  await ui.unmount()
})

test('✓ nepārraksta citas sesijas atzīmes ar vecu kopiju', async ($, on) => {
  const { krātuve } = dzinejs(on)
  const ui = await $.ui.mount({ plugin: 'valejie-darbi', surface: 'desktop', ...PANE } as any)
  await ui.press({ key: 'atjaunot' } as any)
  // Cita sesija pa to laiku ierakstīja savu atzīmi krātuvē.
  krātuve.set('atzimes', { citur: { veids: 'gatavs', last: 1, kad: 1 } })
  await ui.press({ key: 'gatavs:a' } as any)
  expect(Object.keys(krātuve.get('atzimes') as object).sort()).toEqual(['a', 'citur'])
  await ui.unmount()
})

test('↑ pie pabeigtas sesijas to atgriež un uzreiz pārbauda', async ($, on) => {
  const d = dzinejs(on)
  const ui = await $.ui.mount({ plugin: 'valejie-darbi', surface: 'desktop', ...PANE } as any)
  await ui.press({ key: 'atjaunot' } as any)
  await ui.press({ key: 'radit-pabeigtas' } as any)
  const pirms = d.jautajumi.length
  await ui.press({ key: 'atgriezt:b' } as any)
  expect(d.jautajumi.length).toBe(pirms + 1)
  expect(await atrodi(ui, 'keksis:b:0')).toBeDefined()
  await ui.unmount()
})

test('Arhivēt parāda aplikācijas atteikumu, nevis klusi "Arhivēts"', async ($, on) => {
  dzinejs(on, { suta: { deny: 'nav apstiprināts' } })
  const ui = await $.ui.mount({ plugin: 'valejie-darbi', surface: 'desktop', ...PANE } as any)
  await ui.press({ key: 'atjaunot' } as any)
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
  for (const key of ['keksis:a:0', 'atvert-darbu:a:0', 'turpini:a:0', 'augsa:a']) {
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

test('uzspiežot uz darba teksta, atveras pilnais apraksts; Claude darbam ko nosūtīs', async ($, on) => {
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

test('kad visi darbi izdarīti, kartīte pati pāriet uz pabeigtajām', async ($, on) => {
  dzinejs(on)
  const ui = await $.ui.mount({ plugin: 'valejie-darbi', surface: 'desktop', ...PANE } as any)
  await ui.press({ key: 'atjaunot' } as any)
  await ui.press({ key: 'keksis:a:0' } as any)
  await ui.press({ key: 'keksis:a:1' } as any)
  expect(await atrodi(ui, 'augsa:a')).toBeDefined()
  await ui.press({ key: 'turpini:a:0' } as any)
  expect(await atrodi(ui, 'augsa:a')).toBeUndefined()
  await ui.press({ key: 'radit-pabeigtas' } as any)
  expect(await atrodi(ui, 'atgriezt:a')).toBeDefined()
  await ui.unmount()
})

test('▷ pašreizējā sesijā iesniedz promptu šeit, nevis sūta sev ziņu', async ($, on) => {
  const d = dzinejs(on)
  DATI.sesijas.push(sesija('m', 'completed', { sis: true, title: 'Sesija m' }))
  d.krātuve.set('analizes3', {
    m: { last: 5, sakts: 1, isGatava: true, tev: [], claude: [{ darbs: 'Pabeidz', prompts: 'Turpini: pabeidz.' }], isPabeigts: false },
  })
  try {
    const ui = await $.ui.mount({ plugin: 'valejie-darbi', surface: 'desktop', ...PANE } as any)
    await ui.press({ key: 'atjaunot' } as any)
    await ui.press({ key: 'turpini:m:0' } as any)
    expect(d.iesniegti).toEqual(['Turpini: pabeidz.'])
    expect(d.suti.length).toBe(0)
    await ui.unmount()
  } finally {
    DATI.sesijas.pop()
  }
})

const ZINA = (no: string, vards: string, teksts: string) =>
  `<cross-session-message from="${no}" name="${vards}">\n${teksts}\n</cross-session-message>`

test('atskaite no citas sesijas parādās tās kartītē, ✕ to aizver', async ($, on) => {
  const d = dzinejs(on)
  on('session.receive', async ($: any, e: any) => ({ text: e.text }) as any)
  const ui = await $.ui.mount({ plugin: 'valejie-darbi', surface: 'desktop', ...PANE } as any)
  await ui.press({ key: 'atjaunot' } as any)
  // ▷ palaiž vienīgo darbu → kartīte pāriet uz pabeigtajām.
  await ui.press({ key: 'turpini:t:0' } as any)
  expect(await atrodi(ui, 'augsa:t')).toBeUndefined()
  // Sesija atsūta atskaiti → kartīte atkal redzama ar atskaiti.
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
  expect(await atrodi(ui, 'augsa:t')).toBeUndefined()
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

test('jauna analīze nenoņem neatzīmētos Tev darbus, tikai pieliek jaunus', async ($, on) => {
  const d = dzinejs(on)
  const ui = await $.ui.mount({ plugin: 'valejie-darbi', surface: 'desktop', ...PANE } as any)
  await ui.press({ key: 'atjaunot' } as any)
  await ui.press({ key: 'keksis:a:0' } as any)
  // Sesijā kaut kas notika; modelis tagad redz citus darbus un vairs nemin "Ievadi paroli".
  const veca = ANALIZES['Sesija a']
  const sesijaA = DATI.sesijas[0] as { last: number }
  ANALIZES['Sesija a'] = { tev: [{ darbs: 'Izlem par domēniem', atvert: '' }, { darbs: 'Atbildi klientam', atvert: '' }], claude: [], pabeigts: true }
  sesijaA.last = 10
  try {
    await ui.press({ key: 'atjaunot' } as any)
    expect(d.jautajumi.at(-1)).toContain('- Ievadi paroli')
    const an = (d.krātuve.get('analizes3') as Record<string, { tev: { darbs: string }[] }>).a
    // Neatzīmētais paliek, atzīmētais neatgriežas, jaunais pievienots.
    expect(an?.tev.map(x => x.darbs)).toEqual(['Ievadi paroli', 'Atbildi klientam'])
    // Arī nepalaistais Claude darbs paliek, lai gan modelis to vairs nemin.
    expect((an as unknown as { claude: { darbs: string }[] }).claude.map(x => x.darbs)).toEqual(['Izveidot CRM lapas'])
    expect(await atrodi(ui, 'augsa:a')).toBeDefined()
  } finally {
    ANALIZES['Sesija a'] = veca
    sesijaA.last = 5
  }
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
  const an = d.krātuve.get('analizes3') as Record<string, { tev: { darbs: string }[]; claude: unknown[] }>
  expect(an.a?.tev.map(x => x.darbs)).toEqual(['Izlem par domēniem'])
  expect(an.a?.claude).toEqual([])
  // Sesijai bez analīzes tikai noņemšana neveido tukšu analīzi.
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
  const an = d.krātuve.get('analizes3') as Record<string, { tev: { darbs: string }[]; claude: { prompts: string }[] }>
  expect(an.t?.tev.map(x => x.darbs)).toEqual(['Piezvani klientam'])
  expect(an.t?.claude.map(x => x.prompts)).toEqual(['Turpini: pabeidz testus.', 'Uzraksti atskaiti klientam'])

  await ui.press({ key: 'pievienot:t' })
  await ui.input({ key: 'jauns:t:2', text: 'Pārbaudi Instantly limitus', kind: 'change' })
  await ui.press({ key: 'sutit:t' })
  expect(d.suti.at(-1)).toMatchObject({ riks: 'send_message', session_id: 't', message: 'Pārbaudi Instantly limitus' })
  // ➤ neko nesaglabā sarakstā.
  expect((d.krātuve.get('analizes3') as typeof an).t?.tev.length).toBe(1)
  // Enter tukšā laukā lauku aizver, neko nesaglabājot.
  await ui.press({ key: 'pievienot:t' })
  await ui.input({ key: 'jauns:t:3', text: '' })
  expect(await atrodi(ui, 'jauns:t:4')).toBeUndefined()
  expect(await atrodi(ui, 'jauns:t:3')).toBeUndefined()
  expect((d.krātuve.get('analizes3') as typeof an).t?.tev.length).toBe(1)
  await ui.unmount()
})

test('✕ pie Claude darba to atmet, un nākamā analīze to neatgriež', async ($, on) => {
  const d = dzinejs(on)
  const ui = await $.ui.mount({ plugin: 'valejie-darbi', surface: 'desktop', ...PANE } as any)
  await ui.press({ key: 'atjaunot' } as any)
  expect(await atrodi(ui, 'atmest:a:0')).toBeDefined()
  // Tavs ☐ darbs ✕ nedabū.
  expect(await atrodi(ui, 'atmest:a:t0')).toBeUndefined()
  await ui.press({ key: 'atmest:a:0' } as any)
  expect(await atrodi(ui, 'turpini:a:0')).toBeUndefined()
  expect(d.suti.length).toBe(0)
  // Sesijā kaut kas notiek; modelis atkal piedāvā to pašu Claude darbu.
  const sesijaA = DATI.sesijas[0] as { last: number }
  sesijaA.last = 10
  try {
    await ui.press({ key: 'atjaunot' } as any)
    const an = d.krātuve.get('analizes3') as Record<string, { claude: unknown[] }>
    expect(an.a?.claude).toEqual([])
  } finally {
    sesijaA.last = 5
  }
  await ui.unmount()
})

test('pogām ir padomi, kas parādās, uzbraucot ar peli', async ($, on) => {
  dzinejs(on)
  for (const surface of ['terminal', 'desktop'] as const) {
    const ui = await $.ui.mount({ plugin: 'valejie-darbi', surface, ...PANE } as any)
    await ui.press({ key: 'atjaunot' } as any)
    for (const padoms of [/^ Augšā $/, /^ Atmest $/, /^ Palaist $/, /^ Izdarīts $/, /^ Atvērt sesiju $/]) {
      expect(await teksts(ui, padoms)).toBeDefined()
    }
    await ui.unmount()
  }
})

test('/darbi padomi pārslēdz padomus un atceras to krātuvē', async ($, on) => {
  const d = dzinejs(on)
  const ui = await $.ui.mount({ plugin: 'valejie-darbi', surface: 'desktop', ...PANE } as any)
  await ui.press({ key: 'atjaunot' } as any)
  expect(await teksts(ui, /^ Augšā $/)).toBeDefined()
  const r = await ($ as any).command.run({ command: 'darbi', args: 'padomi' })
  expect(JSON.stringify(r)).toContain('izslēgti')
  expect(d.krātuve.get('padomi')).toBe(false)
  expect(await teksts(ui, /^ Augšā $/)).toBeUndefined()
  await ($ as any).command.run({ command: 'darbi', args: 'padomi' })
  expect(d.krātuve.get('padomi')).toBe(true)
  await ui.unmount()
})

test('ar izslēgtiem padomiem tie netiek zīmēti', { options: { radiPadomus: false } } as any, async ($: any, on: any) => {
  dzinejs(on)
  const ui = await $.ui.mount({ plugin: 'valejie-darbi', surface: 'desktop', ...PANE } as any)
  await ui.press({ key: 'atjaunot' } as any)
  expect(await teksts(ui, /^ Augšā $/)).toBeUndefined()
  expect(await atrodi(ui, 'augsa:a')).toBeDefined()
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
  const sesijaA = DATI.sesijas[0] as { sis: boolean; last: number }
  sesijaA.sis = true
  // Pašreizējo sesiju automātiski neanalizē, tāpēc tās darbi jau ir krātuvē.
  d.krātuve.set('analizes3', {
    a: { last: 5, sakts: 1, isGatava: true, tev: [{ darbs: 'Izlem par domēniem', sikak: '', atvert: '' }], claude: [], isPabeigts: false },
  })
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
    // Atmiņā paliek, un nākamā analīze to redz kā izdarītu.
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
  dzinejs(on)
  const ui = await $.ui.mount({ plugin: 'valejie-darbi', surface: 'desktop', ...PANE } as any)
  const jauns = () => teksts(ui, /Jaunas izmaiņas/)
  await ui.press({ key: 'atjaunot' } as any)
  // Pirmā analīze atnesa darbus pēc tam, kad sesija jau bija "redzēta": tās ir jaunas izmaiņas.
  expect(await jauns()).toBeDefined()
  await ui.press({ key: 'teksts:a:t0' } as any)
  await ui.press({ key: 'teksts:a:t0' } as any)
  await ui.press({ key: 'teksts:t:c0' } as any)
  await ui.press({ key: 'teksts:t:c0' } as any)
  await ui.press({ key: 'teksts:c:c0' } as any)
  await ui.press({ key: 'teksts:c:c0' } as any)
  expect(await jauns()).toBeUndefined()
  // Sesijā kaut kas notika, analīze atnesa jaunu darbu.
  const veca = ANALIZES['Sesija a']
  const sesijaA = DATI.sesijas[0] as { last: number }
  ANALIZES['Sesija a'] = { tev: [{ darbs: 'Jauns darbs klientam', atvert: '' }], claude: [], pabeigts: false }
  sesijaA.last = 10
  try {
    await ui.press({ key: 'atjaunot' } as any)
    expect(await jauns()).toBeDefined()
    await ui.press({ key: 'teksts:a:t0' } as any)
    expect(await jauns()).toBeUndefined()
  } finally {
    ANALIZES['Sesija a'] = veca
    sesijaA.last = 5
  }
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

test('➤ pie tava ☐ darba to nodod Claude tajā sesijā un pārvērš par Claude ✓', async ($, on) => {
  const d = dzinejs(on)
  const ui = await $.ui.mount({ plugin: 'valejie-darbi', surface: 'desktop', ...PANE } as any)
  await ui.press({ key: 'atjaunot' } as any)
  await ui.press({ key: 'nodot:a:0' } as any)
  const zina = d.suti.at(-1) as { session_id: string; message: string }
  expect(zina.session_id).toBe('a')
  expect(zina.message).toContain('Palīdzi man izdarīt: Izlem par domēniem')
  expect(zina.message).toContain('Klientam jāizvēlas divi no četriem domēniem')
  expect(zina.message).toContain('soli pa solim')
  const an = d.krātuve.get('analizes3') as Record<string, { tev: { darbs: string }[]; claude: { darbs: string }[] }>
  expect(an.a?.tev.map(x => x.darbs)).toEqual(['Ievadi paroli'])
  expect(an.a?.claude.map(x => x.darbs)).toContain('Izlem par domēniem')
  await ui.unmount()
})

test('paša ierakstīts garš darbs netiek nogriezts', async ($, on) => {
  const d = dzinejs(on)
  const ui = (await $.ui.mount({ plugin: 'valejie-darbi', surface: 'desktop', ...PANE } as any)) as any
  await ui.press({ key: 'atjaunot' })
  const garš = 'Sagatavo modu publicēšanai: README ar visiem paskaidrojumiem, valodas izvēle, uzstādīšanas instrukcija un piemēri bez klientu vārdiem.'
  await ui.press({ key: 'pievienot:t' })
  await ui.input({ key: 'jauns:t:0', text: garš })
  const an = d.krātuve.get('analizes3') as Record<string, { tev: { darbs: string }[] }>
  expect(an.t?.tev[0]?.darbs).toBe(garš)
  await ui.unmount()
})

test('angļu valoda: panelis, padomi un sesijām sūtītie teksti angliski', { options: { valoda: 'en', vards: 'Anna' } } as any, async ($: any, on: any) => {
  const d = dzinejs(on)
  const ui = await $.ui.mount({ plugin: 'valejie-darbi', surface: 'desktop', ...PANE } as any)
  await ui.press({ key: 'atjaunot' } as any)
  expect(await teksts(ui, /^Waiting for you$/)).toBeDefined()
  expect(await teksts(ui, /^ Up $/)).toBeDefined()
  expect(await teksts(ui, /^You$/)).toBeDefined()
  expect(d.jautajumi.at(-1)).toContain('Session: Sesija')
  await ui.press({ key: 'nodot:a:0' } as any)
  const zina = (d.suti.at(-1) as { message: string }).message
  expect(zina).toContain('Help me get this done: Izlem par domēniem')
  expect(zina).toContain('If you need me')
  await ui.unmount()
})

test('no analīzes ne vairāk kā 1 Claude darbs; kamēr gaida ▷ atskaiti, jaunus nepiedāvā', async ($, on) => {
  const d = dzinejs(on)
  const veca = ANALIZES['Sesija t']
  ANALIZES['Sesija t'] = {
    tev: [],
    claude: [
      { darbs: 'Pirmais', prompts: 'Izdari pirmo.' },
      { darbs: 'Otrais', prompts: 'Izdari otro.' },
    ],
    pabeigts: false,
  }
  const sesijaT = DATI.sesijas[1] as { last: number }
  try {
    const ui = await $.ui.mount({ plugin: 'valejie-darbi', surface: 'desktop', ...PANE } as any)
    await ui.press({ key: 'atjaunot' } as any)
    const an = () => (d.krātuve.get('analizes3') as Record<string, { claude: { darbs: string }[] }>).t?.claude.map(x => x.darbs)
    expect(an()).toEqual(['Pirmais'])
    // ▷ aizsūtīts, atskaite vēl nav: sesijā kaut kas notiek, bet jauns Claude darbs nenāk klāt.
    await ui.press({ key: 'turpini:t:0' } as any)
    ANALIZES['Sesija t'] = { tev: [], claude: [{ darbs: 'Trešais', prompts: 'Izdari trešo.' }], pabeigts: false }
    sesijaT.last = 10
    await ui.press({ key: 'atjaunot' } as any)
    expect(an()).toEqual(['Pirmais'])
    await ui.unmount()
  } finally {
    ANALIZES['Sesija t'] = veca
    sesijaT.last = 5
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
    // Pabeigta sesija citādi būtu saliekamajā sadaļā; kā pašreizējā tā redzama augšā ar savu karti.
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
  const an = d.krātuve.get('analizes3') as Record<string, { tev: { darbs: string }[] }>
  expect(an.a?.tev.map(x => x.darbs)).toEqual(['Izlem par domēniem'])
  expect((d.krātuve.get('izdaritiVesture') as Record<string, string[]>).a).toEqual(['Ievadi paroli'])
  await ui.unmount()
})

test('kartītē ne vairāk kā 2 nepalaisti Claude darbi, arī vecajās analīzēs', async ($, on) => {
  const d = dzinejs(on)
  d.krātuve.set('analizes3', {
    t: {
      last: 5, sakts: 1, isGatava: true, tev: [], isPabeigts: false,
      claude: ['V1', 'V2', 'V3', 'V4'].map(x => ({ darbs: x, prompts: x })),
    },
  })
  const ui = await $.ui.mount({ plugin: 'valejie-darbi', surface: 'desktop', ...PANE } as any)
  await ui.press({ key: 'atjaunot' } as any)
  const an = d.krātuve.get('analizes3') as Record<string, { claude: { darbs: string }[] }>
  expect(an.t?.claude.map(x => x.darbs)).toEqual(['V3', 'V4'])
  await ui.unmount()
})

test('.komanda.json notīra Claude darbus un liek visas sesijas pārbaudīt no jauna; ☐ paliek', async ($, on) => {
  const faili: Record<string, string> = {}
  const d = dzinejs(on, { faili })
  const ui = await $.ui.mount({ plugin: 'valejie-darbi', surface: 'desktop', ...PANE } as any)
  await ui.press({ key: 'atjaunot' } as any)
  const pirms = d.jautajumi.length
  faili['.komanda.json'] = JSON.stringify({ tiritClaude: true, parbauditVisas: true })
  await ui.press({ key: 'atjaunot' } as any)
  delete faili['.komanda.json']
  expect(d.palaisti.some(a => a[0] === '/bin/rm' && String(a[2]).endsWith('.komanda.json'))).toBe(true)
  // Pārbaudīja no jauna (a, t, c), ☐ palika, Claude darbi tikai no jaunās analīzes.
  expect(d.jautajumi.length).toBe(pirms + 3)
  const an = d.krātuve.get('analizes3') as Record<string, { tev: { darbs: string }[]; claude: { darbs: string }[] }>
  expect(an.a?.tev.map(x => x.darbs)).toEqual(['Izlem par domēniem', 'Ievadi paroli'])
  expect(an.a?.claude.map(x => x.darbs)).toEqual(['Izveidot CRM lapas'])
  await ui.unmount()
})
