import { useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, CalendarRange, Copy, FileText, FolderPlus, HelpCircle, ListChecks, Plus, Receipt, RefreshCw, Save, Sparkles, Target, Wand2 } from 'lucide-react';
import { useStore, uid } from '../lib/store';
import { addDays, cx, dateLong, getParam, money, relative, today } from '../lib/format';
import type { Brief, BriefOutput, Milestone } from '../lib/types';
import { Button, Card, ClientLogo, EmptyState, Field, Input, PageHeader, Segmented, Select, Textarea, useMe } from '../ui/ui';

type Detail = 'concise' | 'detailed';

const SAMPLE_NOTES = `call w/ Jonas (Oakhaus) tue 3pm
- new collection "Grain" launching march, 14 pieces, mostly oak + walnut
- they want a full campaign: hero shoot in berlin showroom + lifestyle (2 days?)
- current website product pages feel flat, want new collection landing page + PDP template refresh
- also need a lookbook / sales deck for trade fair in stockholm (feb 9!!)
- budget roughly 32k, maybe flex to 35k if shoot needs it
- Jonas signs off but CEO (Marta) wants to see concepts before shoot
- they have a photographer they like, not sure on availability
- timeline ~10 weeks, hard stop for trade fair
- socials: cutdowns for IG + pinterest, nothing paid yet
- worried about last campaign going over on retouching`;

interface Rule { key: RegExp; label: string; detail: string; phase: string; weeks: number; price: number }
const RULES: Rule[] = [
  { key: /\b(logo|wordmark|identity|rebrand|brand)\b/i, label: 'Identity refinement: logo, lockups and core palette', detail: 'Two creative directions, one refinement round, master files and a short usage guide', phase: 'Identity', weeks: 3, price: 7800 },
  { key: /\b(packaging|label|dieline|box)\b/i, label: 'Packaging system across product lines', detail: 'Dielines, print ready files and supplier proofs check', phase: 'Packaging', weeks: 3, price: 6400 },
  { key: /\b(website|site|landing|pdp|shopify|webflow|homepage)\b/i, label: 'Website design and build for the key pages', detail: 'Responsive design, CMS setup, QA across devices and launch support', phase: 'Website', weeks: 4, price: 9600 },
  { key: /\b(app|onboarding|mobile|prototype|product ui)\b/i, label: 'Product UI flows and clickable prototype', detail: 'User flows, high fidelity screens, prototype and developer handoff', phase: 'Product design', weeks: 5, price: 12500 },
  { key: /\b(campaign|launch|social|ig|instagram|pinterest|ads?)\b/i, label: 'Launch campaign concept and rollout assets', detail: 'Campaign idea, key visual, copy lines and social cutdowns', phase: 'Campaign', weeks: 3, price: 6800 },
  { key: /\b(shoot|photo|photography|photographer|lifestyle|video)\b/i, label: 'Art directed photo shoot', detail: 'Shot list, casting and styling brief, on set direction and retouching of 30 selects', phase: 'Production', weeks: 2, price: 8200 },
  { key: /\b(deck|lookbook|pitch|presentation|sales deck)\b/i, label: 'Sales deck and lookbook', detail: 'Narrative, layout system, 20 to 30 slides and an editable master', phase: 'Deck', weeks: 2, price: 4200 },
  { key: /\b(report|annual|impact|whitepaper)\b/i, label: 'Report design and data visualisation', detail: 'Editorial layout, charts, accessible PDF and a web summary', phase: 'Report', weeks: 4, price: 7400 },
];

const RISK_LIBRARY: { key: RegExp; text: string }[] = [
  { key: /\b(ceo|board|founder|sign ?off|signs off|approv)/i, text: 'Multiple approvers. Agree one final decision maker before concepts go out.' },
  { key: /\b(retouch|over budget|going over|overrun)/i, text: 'Retouching scope crept last time. Cap selects and rounds in the contract.' },
  { key: /\b(photographer|availability|crew)\b/i, text: 'Preferred photographer availability is unconfirmed and could move the shoot.' },
  { key: /\b(trade fair|fair|event|deadline|hard stop|!!)\b/i, text: 'Fixed external deadline with no slack. Any late feedback compresses production.' },
  { key: /\b(supplier|print|lead time)\b/i, text: 'Print and supplier lead times may exceed the design schedule.' },
  { key: /\b(compliance|legal|kyc|regulat)/i, text: 'Compliance review adds unpredictable time to every copy round.' },
  { key: /\b(content|copy|photos? not|assets)\b/i, text: 'Content readiness. Copy and product data need to arrive before build starts.' },
];

const QUESTION_LIBRARY: { key: RegExp; text: string }[] = [
  { key: /\b(ceo|marta|board)\b/i, text: 'When can the CEO review concepts, and how much weight does that review carry?' },
  { key: /\b(photographer)\b/i, text: 'Can you share the photographer\'s contact so we can hold dates this week?' },
  { key: /\b(website|site|pdp|landing)\b/i, text: 'Which platform is the site on, and who on your side manages it after launch?' },
  { key: /\b(paid|ads)\b/i, text: 'Is paid media planned later, so we can size the assets for it now?' },
  { key: /\b(social|ig|pinterest)\b/i, text: 'How many social cutdowns per channel do you expect at launch?' },
  { key: /\b(budget|k\b|\$)/i, text: 'Is the flex on budget approved, or should we price the extra shoot day as an option?' },
];

const fallbackQuestions = ['Who is the final decision maker on this project?', 'What does success look like three months after launch?', 'Are there brand guidelines or past work we should build on?'];
const fallbackRisks = ['Feedback rounds slipping beyond two business days.', 'Scope additions without a matching budget change.'];

function parseMoney(notes: string): number | null {
  const m = notes.match(/(?:\$|€|£|usd|eur|budget[^\d]{0,20})\s?(\d[\d,.]*)\s?(k)?/i) ?? notes.match(/\b(\d{2,3})\s?k\b/i);
  if (!m) return null;
  const raw = parseFloat((m[1] ?? '').replace(/,/g, ''));
  if (!raw) return null;
  const k = m[2] || /k/i.test(m[0].slice(-2));
  const n = k || raw < 1000 ? raw * 1000 : raw;
  return n >= 1000 && n <= 2_000_000 ? n : null;
}

function parseWeeks(notes: string): number | null {
  const m = notes.match(/(\d{1,2})\s*(?:-|to)?\s*(?:\d{1,2}\s*)?weeks?/i);
  return m ? parseInt(m[1], 10) : null;
}

export function generateBrief(notes: string, title: string, clientName: string, detail: Detail): BriefOutput {
  const matched = RULES.filter((r) => r.key.test(notes));
  const rules = matched.length ? matched : [RULES[0], RULES[2]];
  const target = parseMoney(notes);
  const weeksTarget = parseWeeks(notes);

  const deliverables = rules.map((r) => (detail === 'detailed' ? `${r.label}. ${r.detail}.` : r.label));
  if (detail === 'detailed') deliverables.push('Project management, weekly check ins and a shared approval portal');

  const phases = [{ phase: 'Discovery', weeks: detail === 'detailed' ? 2 : 1 }, ...rules.map((r) => ({ phase: r.phase, weeks: r.weeks }))];
  phases.push({ phase: 'Launch & handoff', weeks: 1 });
  let total = phases.reduce((a, p) => a + p.weeks, 0);
  if (weeksTarget && weeksTarget >= phases.length && total !== weeksTarget) {
    const scale = weeksTarget / total;
    phases.forEach((p) => { p.weeks = Math.max(1, Math.round(p.weeks * scale)); });
    total = phases.reduce((a, p) => a + p.weeks, 0);
    const diff = weeksTarget - total;
    const biggest = phases.reduce((a, p) => (p.weeks > a.weeks ? p : a), phases[0]);
    biggest.weeks = Math.max(1, biggest.weeks + diff);
  }

  const base = rules.reduce((a, r) => a + r.price, 0) + 1800;
  const quote = Math.round((target ? Math.min(Math.max(base, target * 0.9), target * 1.04) : base) / 100) * 100;

  const risks = RISK_LIBRARY.filter((r) => r.key.test(notes)).map((r) => r.text);
  const questions = QUESTION_LIBRARY.filter((q) => q.key.test(notes)).map((q) => q.text);
  const finalRisks = (risks.length ? risks : fallbackRisks).slice(0, detail === 'detailed' ? 5 : 3);
  const finalQuestions = (questions.length ? questions : fallbackQuestions).slice(0, detail === 'detailed' ? 5 : 3);

  const focus = rules.slice(0, 3).map((r) => r.phase.toLowerCase());
  const focusText = focus.length > 1 ? `${focus.slice(0, -1).join(', ')} and ${focus[focus.length - 1]}` : focus[0];
  const name = title.trim() || 'this project';
  const goal = detail === 'detailed'
    ? `Deliver ${name} for ${clientName} across ${focusText}, landing a cohesive launch within ${phases.reduce((a, p) => a + p.weeks, 0)} weeks${target ? ` and close to the ${money(target)} budget` : ''}. Success means one clear creative direction, assets ready ahead of every external deadline and no surprise rounds.`
    : `Deliver ${name} for ${clientName} across ${focusText}, ready for launch in ${phases.reduce((a, p) => a + p.weeks, 0)} weeks.`;

  return { goal, deliverables, timeline: phases, quote, risks: finalRisks, questions: finalQuestions };
}

export function briefToText(title: string, clientName: string, o: BriefOutput) {
  const total = o.timeline.reduce((a, p) => a + p.weeks, 0);
  return [
    `${title} · ${clientName}`,
    '',
    'GOAL', o.goal, '',
    'DELIVERABLES', ...o.deliverables.map((d) => `- ${d}`), '',
    `TIMELINE (${total} weeks)`, ...o.timeline.map((p) => `- ${p.phase}: ${p.weeks} ${p.weeks === 1 ? 'week' : 'weeks'}`), '',
    `ESTIMATED QUOTE: ${money(o.quote)}`, '',
    'RISKS', ...o.risks.map((r) => `- ${r}`), '',
    'OPEN QUESTIONS', ...o.questions.map((q) => `- ${q}`),
  ].join('\n');
}

/* ---------- streaming reveal ---------- */
const segmentsOf = (o: BriefOutput) => [
  o.goal,
  ...o.deliverables,
  'x'.repeat(30), // timeline block
  'x'.repeat(18), // quote block
  ...o.risks,
  ...o.questions,
];

export default function Briefs() {
  const s = useStore();
  const me = useMe();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [clientId, setClientId] = useState('');
  const [title, setTitle] = useState('');
  const [notes, setNotes] = useState('');
  const [detail, setDetail] = useState<Detail>('concise');
  const [output, setOutput] = useState<BriefOutput | null>(null);
  const [phase, setPhase] = useState<'idle' | 'thinking' | 'streaming' | 'done'>('idle');
  const [chars, setChars] = useState(0);
  const [savedId, setSavedId] = useState<string | null>(null);
  const timers = useRef<number[]>([]);

  const clear = () => { timers.current.forEach((t) => { clearTimeout(t); clearInterval(t); }); timers.current = []; };
  useEffect(() => () => clear(), []);

  useEffect(() => {
    const c = getParam('client');
    if (c && useStore.getState().clients.some((x) => x.id === c)) setClientId(c);
    const id = getParam('id');
    const b = id && useStore.getState().briefs.find((x) => x.id === id);
    if (b) openSaved(b);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const client = s.clients.find((c) => c.id === clientId);
  const segments = useMemo(() => (output ? segmentsOf(output) : []), [output]);
  const totalChars = segments.reduce((a, x) => a + x.length, 0);
  const offsets = useMemo(() => { let acc = 0; return segments.map((x) => { const o = acc; acc += x.length; return o; }); }, [segments]);
  const shown = (i: number) => {
    if (phase !== 'streaming') return segments[i] ?? '';
    const seg = segments[i] ?? '';
    return seg.slice(0, Math.max(0, chars - offsets[i]));
  };
  const visible = (i: number) => phase !== 'streaming' || chars > offsets[i];
  const complete = (i: number) => phase !== 'streaming' || chars >= offsets[i] + (segments[i]?.length ?? 0);

  const generate = () => {
    if (!client || !notes.trim()) return;
    clear();
    setSelectedId(null);
    setSavedId(null);
    const out = generateBrief(notes, title, client.name, detail);
    setOutput(out);
    setPhase('thinking');
    setChars(0);
    const total = segmentsOf(out).reduce((a, x) => a + x.length, 0);
    timers.current.push(window.setTimeout(() => {
      setPhase('streaming');
      const iv = window.setInterval(() => {
        setChars((c) => {
          const n = c + 7;
          if (n >= total) { clearInterval(iv); setPhase('done'); return total; }
          return n;
        });
      }, 18);
      timers.current.push(iv);
    }, 1500));
  };

  const openSaved = (b: Brief) => {
    clear();
    setSelectedId(b.id);
    setSavedId(b.id);
    setClientId(b.clientId);
    setTitle(b.title);
    setNotes(b.notes);
    setOutput(b.output);
    setPhase('done');
    history.replaceState(null, '', `/app/briefs?id=${b.id}`);
  };

  const startNew = () => {
    clear();
    setSelectedId(null); setSavedId(null); setOutput(null); setPhase('idle');
    setTitle(''); setNotes(''); setClientId('');
    history.replaceState(null, '', '/app/briefs');
  };

  const briefTitle = title.trim() || `${client?.name ?? 'New'} brief`;

  const copy = async () => {
    if (!output) return;
    try { await navigator.clipboard.writeText(briefToText(briefTitle, client?.name ?? '', output)); s.toast('Brief copied to clipboard'); }
    catch { s.toast('Could not access the clipboard', 'error'); }
  };

  const save = () => {
    if (!output || !client) return;
    const b = s.addBrief({ clientId: client.id, title: briefTitle, notes, output });
    setSavedId(b.id); setSelectedId(b.id);
    s.log({ actor: me.name, photo: me.photo, text: `saved the brief ${b.title}`, kind: 'project' });
    s.toast('Brief saved');
    history.replaceState(null, '', `/app/briefs?id=${b.id}`);
  };

  const createProject = () => {
    if (!output || !client) return;
    const start = today();
    const totalWeeks = output.timeline.reduce((a, p) => a + p.weeks, 0);
    let cursor = start;
    const each = Math.floor(output.quote / output.timeline.length / 100) * 100;
    const milestones: Milestone[] = output.timeline.map((p, i) => {
      cursor = addDays(cursor, p.weeks * 7);
      const amount = i === output.timeline.length - 1 ? output.quote - each * (output.timeline.length - 1) : each;
      return { id: uid('ms'), title: p.phase, due: cursor, status: i === 0 ? 'current' : 'upcoming', amount };
    });
    const p = s.addProject({
      clientId: client.id, name: briefTitle, description: output.goal, status: 'planning', health: 'on_track',
      budget: output.quote, start, due: addDays(start, totalWeeks * 7), leadId: me.id, memberIds: [me.id], milestones,
    });
    if (!savedId) s.addBrief({ clientId: client.id, title: briefTitle, notes, output });
    window.location.href = `/app/projects/view?id=${p.id}`;
  };

  const sorted = [...s.briefs].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const totalWeeks = output ? output.timeline.reduce((a, p) => a + p.weeks, 0) : 0;
  const busy = phase === 'thinking' || phase === 'streaming';

  // index helpers into segments
  const dStart = 1;
  const tIdx = output ? dStart + output.deliverables.length : 0;
  const qIdx = tIdx + 1;
  const rStart = qIdx + 1;
  const quStart = output ? rStart + output.risks.length : 0;

  return (
    <div>
      <PageHeader
        title={<>AI <span className="serif-accent text-amber-soft">briefs</span></>}
        subtitle="Turn messy call notes into a scoped brief, timeline and quote in seconds."
        actions={<Button variant="primary" icon={<Plus className="size-4" />} onClick={startNew}>New brief</Button>}
      />

      <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
        {/* Saved briefs */}
        <Card className="self-start">
          <div className="flex items-center justify-between px-4 pb-2 pt-4">
            <h2 className="text-[14px] font-semibold">Saved briefs</h2>
            <span className="text-[12px] text-mist-400">{sorted.length}</span>
          </div>
          <ul className="scrollbar-thin flex gap-2 overflow-x-auto px-3 pb-3 lg:max-h-[calc(100dvh-16rem)] lg:flex-col lg:gap-1 lg:overflow-y-auto lg:overflow-x-visible">
            <li className="shrink-0">
              <button onClick={startNew} className={cx('flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left text-[13px] font-medium ring-1 transition', !selectedId ? 'bg-amber/10 text-amber-soft ring-amber/30' : 'text-mist-300 ring-white/[0.06] hover:bg-white/[0.03]')}>
                <Wand2 className="size-4" />New brief
              </button>
            </li>
            {sorted.map((b) => {
              const c = s.clients.find((x) => x.id === b.clientId);
              return (
                <li key={b.id} className="w-56 shrink-0 lg:w-auto">
                  <button onClick={() => openSaved(b)} aria-current={selectedId === b.id}
                    className={cx('flex w-full items-center gap-2.5 rounded-xl px-3 py-2.5 text-left transition', selectedId === b.id ? 'bg-white/[0.06]' : 'hover:bg-white/[0.03]')}>
                    {c ? <ClientLogo client={c} size={28} /> : <FileText className="size-4" />}
                    <span className="min-w-0 flex-1"><span className="block truncate text-[13px] font-semibold">{b.title}</span><span className="text-[11px] text-mist-400">{c?.name} · {relative(b.createdAt)}</span></span>
                  </button>
                </li>
              );
            })}
          </ul>
        </Card>

        <div className="min-w-0 space-y-4">
          {/* Form */}
          <Card className="p-5">
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Client">
                <Select value={clientId} onChange={(e) => setClientId(e.target.value)}>
                  <option value="">Choose a client</option>
                  {s.clients.filter((c) => c.status !== 'archived').map((c) => <option key={c.id} value={c.id}>{c.name}</option>)}
                </Select>
              </Field>
              <Field label="Project title"><Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="e.g. Grain collection launch" /></Field>
            </div>
            <div className="mt-4">
              <div className="mb-1.5 flex items-center justify-between gap-2">
                <label htmlFor="brief-notes" className="text-[12px] font-medium text-mist-300">Call notes</label>
                <button onClick={() => { setNotes(SAMPLE_NOTES); if (!title) setTitle('Grain collection launch'); if (!clientId) setClientId('c3'); }} className="text-[12px] font-medium text-amber-soft hover:text-amber">Use sample notes</button>
              </div>
              <Textarea id="brief-notes" rows={8} value={notes} onChange={(e) => setNotes(e.target.value)} className="font-mono text-[12px]"
                placeholder="Paste raw notes from your discovery call. Bullet points, typos and half sentences are fine." />
            </div>
            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <span className="text-[12px] text-mist-400">Detail</span>
                <Segmented options={[{ value: 'concise', label: 'Concise' }, { value: 'detailed', label: 'Detailed' }]} value={detail} onChange={setDetail} />
              </div>
              <Button variant="primary" icon={<Sparkles className="size-4" />} disabled={!client || !notes.trim() || busy} onClick={generate}>
                {busy ? 'Generating...' : output && !selectedId ? 'Generate again' : 'Generate brief'}
              </Button>
            </div>
            <p className="mt-3 text-[11px] text-mist-400">Demo: briefs are generated locally in your browser.</p>
          </Card>

          {/* Output */}
          {!output && (
            <Card><EmptyState icon={<Sparkles className="size-5" />} title="Your brief will appear here" body="Pick a client, paste your call notes and hit Generate. Try the sample notes to see it in action." /></Card>
          )}

          {output && phase === 'thinking' && (
            <Card className="p-5" aria-live="polite">
              <div className="flex items-center gap-2 text-[13px] font-medium">
                <Sparkles className="size-4 animate-pulse text-amber" />
                <span className="bg-[linear-gradient(90deg,#8f8a92_0%,#f7c58a_50%,#8f8a92_100%)] bg-[length:200%_100%] bg-clip-text text-transparent [animation:shimmer_1.6s_linear_infinite]">Thinking through scope, timeline and pricing...</span>
              </div>
              <div className="mt-5 space-y-3">
                <div className="skeleton h-4 w-3/4" /><div className="skeleton h-4 w-2/3" /><div className="skeleton h-4 w-1/2" />
                <div className="skeleton mt-4 h-16" />
              </div>
            </Card>
          )}

          {output && phase !== 'thinking' && (
            <Card aria-live="polite" aria-busy={phase === 'streaming'}>
              <div className="flex flex-col gap-3 border-b border-white/[0.06] p-5 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-center gap-3">
                  {client && <ClientLogo client={client} size={36} />}
                  <div><h2 className="text-[16px] font-semibold">{briefTitle}</h2><p className="text-[12px] text-mist-400">{client?.name} · {totalWeeks} weeks · {money(output.quote)}{savedId ? ' · Saved' : ''}</p></div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="ghost" icon={<RefreshCw className="size-3.5" />} disabled={busy || !notes.trim()} onClick={generate}>Regenerate</Button>
                  <Button size="sm" icon={<Copy className="size-3.5" />} disabled={busy} onClick={copy}>Copy as text</Button>
                  <Button size="sm" icon={<Save className="size-3.5" />} disabled={busy || !!savedId} onClick={save}>{savedId ? 'Saved' : 'Save brief'}</Button>
                </div>
              </div>

              <div className="grid gap-6 p-5 xl:grid-cols-2">
                <Section icon={<Target className="size-4" />} title="Goal" className="xl:col-span-2">
                  <p className="text-[14px] leading-relaxed text-mist-200">{shown(0)}{!complete(0) && <Caret />}</p>
                </Section>

                <Section icon={<ListChecks className="size-4" />} title="Deliverables" show={visible(dStart)}>
                  <ul className="space-y-2">
                    {output.deliverables.map((d, i) => visible(dStart + i) && (
                      <li key={i} className="flex gap-2.5 text-[13px] leading-relaxed text-mist-200"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-amber" />{shown(dStart + i)}{!complete(dStart + i) && <Caret />}</li>
                    ))}
                  </ul>
                </Section>

                <Section icon={<CalendarRange className="size-4" />} title={`Timeline · ${totalWeeks} weeks`} show={visible(tIdx)}>
                  <div className="flex h-8 overflow-hidden rounded-lg ring-1 ring-white/[0.07]" role="img" aria-label={output.timeline.map((p) => `${p.phase} ${p.weeks} weeks`).join(', ')}>
                    {output.timeline.map((p, i) => (
                      <div key={i} title={`${p.phase}: ${p.weeks} wk`} style={{ width: `${(p.weeks / totalWeeks) * 100}%`, opacity: 1 - i * (0.55 / output.timeline.length) }}
                        className={cx('grid place-items-center border-r border-ink-900 bg-amber text-[10px] font-bold text-ink-950 last:border-0 transition-all duration-500', !complete(tIdx) && 'animate-pulse')}>
                        {p.weeks}w
                      </div>
                    ))}
                  </div>
                  <ul className="mt-3 grid gap-1.5 text-[12px] sm:grid-cols-2">
                    {output.timeline.map((p, i) => (
                      <li key={i} className="flex items-center gap-2 text-mist-300"><span className="size-2 rounded-sm bg-amber" style={{ opacity: 1 - i * (0.55 / output.timeline.length) }} /><span className="flex-1 truncate">{p.phase}</span><span className="tabular-nums text-mist-400">{p.weeks} {p.weeks === 1 ? 'week' : 'weeks'}</span></li>
                    ))}
                  </ul>
                </Section>

                <Section icon={<Receipt className="size-4" />} title="Estimated quote" show={visible(qIdx)}>
                  <div className="rounded-xl bg-ink-850 p-4 ring-1 ring-white/[0.05]">
                    <p className="text-[28px] font-semibold tracking-tight tabular-nums">{money(complete(qIdx) ? output.quote : Math.round((output.quote * Math.min(1, (chars - offsets[qIdx]) / 18)) / 100) * 100)}</p>
                    <p className="mt-1 text-[12px] text-mist-400">Fixed fee, {output.timeline.length} milestones of about {money(Math.round(output.quote / output.timeline.length / 100) * 100)}. Excludes third party costs.</p>
                  </div>
                </Section>

                <Section icon={<AlertTriangle className="size-4" />} title="Risks" show={visible(rStart)}>
                  <ul className="space-y-2">
                    {output.risks.map((r, i) => visible(rStart + i) && (
                      <li key={i} className="flex gap-2.5 text-[13px] leading-relaxed text-mist-200"><span className="mt-2 size-1.5 shrink-0 rounded-full bg-ember" />{shown(rStart + i)}{!complete(rStart + i) && <Caret />}</li>
                    ))}
                  </ul>
                </Section>

                <Section icon={<HelpCircle className="size-4" />} title="Open questions for the client" show={visible(quStart)} className="xl:col-span-2">
                  <ol className="space-y-2">
                    {output.questions.map((q, i) => visible(quStart + i) && (
                      <li key={i} className="flex gap-2.5 text-[13px] leading-relaxed text-mist-200"><span className="grid size-5 shrink-0 place-items-center rounded-md bg-white/[0.06] text-[11px] font-semibold text-mist-300">{i + 1}</span>{shown(quStart + i)}{!complete(quStart + i) && <Caret />}</li>
                    ))}
                  </ol>
                </Section>
              </div>

              {phase === 'done' && (
                <div className="flex flex-col gap-2 border-t border-white/[0.06] p-4 sm:flex-row sm:items-center sm:justify-end animate-[fade-in_.3s_ease]">
                  <span className="mr-auto text-[12px] text-mist-400">Generated {selectedId ? dateLong((s.briefs.find((b) => b.id === selectedId)?.createdAt ?? today()).slice(0, 10)) : 'just now'}. Review before sharing.</span>
                  <Button icon={<Receipt className="size-4" />} href={`/app/invoices/new?client=${client?.id ?? ''}`}>Create quote invoice draft</Button>
                  <Button variant="primary" icon={<FolderPlus className="size-4" />} onClick={createProject}>Create project from brief</Button>
                </div>
              )}
              {phase === 'streaming' && <span className="sr-only">Writing brief, {Math.round((chars / Math.max(1, totalChars)) * 100)} percent</span>}
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function Caret() {
  return <span className="ml-0.5 inline-block h-[1em] w-[2px] translate-y-[2px] animate-pulse bg-amber" aria-hidden />;
}

function Section({ icon, title, children, className, show = true }: { icon: React.ReactNode; title: string; children: React.ReactNode; className?: string; show?: boolean }) {
  if (!show) return null;
  return (
    <section className={cx('animate-[fade-in_.3s_ease]', className)}>
      <h3 className="mb-3 flex items-center gap-2 text-[11px] font-semibold uppercase tracking-wider text-mist-400"><span className="text-amber-soft">{icon}</span>{title}</h3>
      {children}
    </section>
  );
}
