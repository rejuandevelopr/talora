import type { Activity, Approval, Brief, Client, Invoice, Member, Notification, Project, Thread, TimeEntry, Workspace } from './types';

/** The demo is frozen around this date so the data always looks current. */
export const DEMO_TODAY = '2026-10-25';

const P = {
  sam: 'photo-1506794778202-cad84cf45f1d',
  priya: 'photo-1544005313-94ddf0286df2',
  tom: 'photo-1507003211169-0a1dd7228f2d',
  felix: 'photo-1472099645785-5658abf4ff4e',
  sara: 'photo-1494790108377-be9c29b29330',
  leo: 'photo-1527980965255-d3b416303d12',
  amara: 'photo-1531123897727-8f129e1688ce',
  jonas: 'photo-1500648767791-00dcc994a43e',
  elena: 'photo-1517841905240-472988babdf9',
  noah: 'photo-1539571696357-5a69c17a67c6',
  maya: 'photo-1580489944761-15a19d654956',
  daniel: 'photo-1560250097-0b93528c311a',
};
export const photos = P;

export const workspace: Workspace = {
  name: 'Dune & Co',
  slug: 'dune',
  brandColor: '#f4a64a',
  plan: 'Studio',
  billing: 'yearly',
  currency: 'USD',
  timezone: 'Asia/Dhaka',
  invoicePrefix: 'DC',
  paymentTerms: 14,
  integrations: { stripe: true, slack: true, figma: true, google: false, notion: false, quickbooks: false },
  notifications: { approvals: true, payments: true, messages: true, weeklyDigest: true, mentions: true, overdue: false },
};

export const members: Member[] = [
  { id: 'm1', name: 'Sam Rivera', email: 'sam@duneandco.studio', title: 'Founder & Creative Director', role: 'Owner', photo: P.sam, rate: 140, status: 'active' },
  { id: 'm2', name: 'Priya Nair', email: 'priya@duneandco.studio', title: 'Design Lead', role: 'Admin', photo: P.priya, rate: 120, status: 'active' },
  { id: 'm3', name: 'Tom Ashby', email: 'tom@duneandco.studio', title: 'Producer', role: 'Member', photo: P.tom, rate: 95, status: 'active' },
  { id: 'm4', name: 'Felix Hart', email: 'felix@duneandco.studio', title: 'Developer', role: 'Member', photo: P.felix, rate: 110, status: 'active' },
  { id: 'm5', name: 'Sara Lindqvist', email: 'sara@duneandco.studio', title: 'Brand Designer', role: 'Member', photo: P.sara, rate: 100, status: 'active' },
  { id: 'm6', name: 'Leo Grant', email: 'leo@duneandco.studio', title: 'Copywriter', role: 'Member', photo: P.leo, rate: 85, status: 'invited' },
];

export const clients: Client[] = [
  { id: 'c1', name: 'Kiln Studio', industry: 'Ceramics & homeware', location: 'Lisbon, PT', website: 'kilnstudio.co', status: 'active', since: '2025-03-12', tone: 'from-amber to-ember', portalSlug: 'kiln',
    contacts: [{ name: 'Amara Okafor', email: 'amara@kilnstudio.co', role: 'Founder', photo: P.amara }, { name: 'Leo Hart', email: 'leo@kilnstudio.co', role: 'Marketing' }],
    notes: 'Prefers async feedback in the portal. Spring launch is the priority for Q1.' },
  { id: 'c2', name: 'Northfold', industry: 'Outdoor apparel', location: 'Oslo, NO', website: 'northfold.no', status: 'active', since: '2024-11-02', tone: 'from-sky-400 to-indigo-500', portalSlug: 'northfold',
    contacts: [{ name: 'Elena Rossi', email: 'elena@northfold.no', role: 'COO', photo: P.elena }],
    notes: 'Website v3 is phased. Phase 2 (shop) quoted separately.' },
  { id: 'c3', name: 'Oakhaus', industry: 'Furniture', location: 'Berlin, DE', website: 'oakhaus.de', status: 'active', since: '2025-06-20', tone: 'from-emerald-400 to-teal-600', portalSlug: 'oakhaus',
    contacts: [{ name: 'Jonas Weber', email: 'jonas@oakhaus.de', role: 'Head of Brand', photo: P.jonas }],
    notes: 'Campaign shoot in Berlin, mid November.' },
  { id: 'c4', name: 'Lumen & Co', industry: 'Fintech', location: 'London, UK', website: 'lumen.co', status: 'active', since: '2024-08-15', tone: 'from-violet-400 to-fuchsia-600', portalSlug: 'lumen',
    contacts: [{ name: 'Maya Ellison', email: 'maya@lumen.co', role: 'Managing Partner', photo: P.maya }],
    notes: 'Strict compliance review on all copy. Allow 3 extra days per round.' },
  { id: 'c5', name: 'Fieldwork', industry: 'Research nonprofit', location: 'Toronto, CA', website: 'fieldwork.org', status: 'active', since: '2025-01-09', tone: 'from-lime-300 to-green-600', portalSlug: 'fieldwork',
    contacts: [{ name: 'Noah Kim', email: 'noah@fieldwork.org', role: 'Comms Director', photo: P.noah }],
    notes: 'Annual report ships every November.' },
  { id: 'c6', name: 'Vantage', industry: 'Venture capital', location: 'New York, US', website: 'vantage.vc', status: 'active', since: '2025-09-01', tone: 'from-slate-300 to-slate-600', portalSlug: 'vantage',
    contacts: [{ name: 'Daniel Brooks', email: 'daniel@vantage.vc', role: 'Partner', photo: P.daniel }],
    notes: 'Fast turnarounds. Pays on receipt.' },
  { id: 'c7', name: 'Parallel', industry: 'SaaS', location: 'Amsterdam, NL', website: 'parallel.app', status: 'lead', since: '2026-10-10', tone: 'from-rose-400 to-orange-500', portalSlug: 'parallel',
    contacts: [{ name: 'Ines de Vries', email: 'ines@parallel.app', role: 'VP Product' }],
    notes: 'Design system proposal sent Oct 18. Follow up next week.' },
  { id: 'c8', name: 'Studio Mono', industry: 'Architecture', location: 'Copenhagen, DK', website: 'studiomono.dk', status: 'archived', since: '2023-05-04', tone: 'from-neutral-200 to-neutral-500', portalSlug: 'mono',
    contacts: [{ name: 'Karl Holm', email: 'karl@studiomono.dk', role: 'Partner' }],
    notes: 'Retainer ended June 2026. Open to new work in 2027.' },
];

const t = (id: string, title: string, done: boolean, assigneeId: string, due: string, tag: string) => ({ id, title, done, assigneeId, due, tag });

export const projects: Project[] = [
  { id: 'p1', clientId: 'c1', name: 'Spring rebrand', status: 'review', health: 'on_track', budget: 18400, start: '2026-09-15', due: '2026-12-04', leadId: 'm2', memberIds: ['m2', 'm5', 'm3'],
    description: 'Refresh the Kiln identity for the spring ceramics launch: logo refinement, packaging system and a six page site.',
    tasks: [t('t1', 'Finalize packaging dielines', true, 'm5', '2026-10-20', 'Design'), t('t2', 'Share round 2 with Amara', false, 'm2', '2026-10-27', 'Client'), t('t3', 'Photograph sample mugs', false, 'm3', '2026-11-03', 'Shoot'), t('t4', 'Prepare launch site copy', false, 'm6', '2026-11-10', 'Copy'), t('t5', 'Logo lockups export', true, 'm5', '2026-10-12', 'Design')],
    milestones: [{ id: 'ms1', title: 'Discovery & moodboards', due: '2026-09-30', status: 'done', amount: 3600 }, { id: 'ms2', title: 'Logo & packaging system', due: '2026-10-31', status: 'current', amount: 6200 }, { id: 'ms3', title: 'Launch website', due: '2026-12-04', status: 'upcoming', amount: 8600 }],
    files: [{ id: 'f1', name: 'Kiln_moodboard_v2.pdf', size: '8.4 MB', kind: 'pdf', addedAt: '2026-09-28' }, { id: 'f2', name: 'Packaging_round2.fig', size: '24 MB', kind: 'fig', addedAt: '2026-10-22' }, { id: 'f3', name: 'Logo_lockups.zip', size: '3.1 MB', kind: 'zip', addedAt: '2026-10-12' }],
    comments: [{ id: 'cm1', author: 'Amara Okafor', photo: P.amara, text: 'Love the warmer palette. Can we try the wordmark slightly heavier?', at: '2026-10-23T10:12:00' }, { id: 'cm2', author: 'Priya Nair', photo: P.priya, text: 'Yes, sharing a heavier option with round 2 on Monday.', at: '2026-10-23T11:40:00' }] },
  { id: 'p2', clientId: 'c2', name: 'Website v3', status: 'in_progress', health: 'on_track', budget: 32000, start: '2026-08-01', due: '2026-12-18', leadId: 'm4', memberIds: ['m4', 'm2', 'm6'],
    description: 'New marketing site on a headless CMS with a product storytelling system and journal.',
    tasks: [t('t6', 'Build product template', true, 'm4', '2026-10-15', 'Dev'), t('t7', 'Journal CMS schema', false, 'm4', '2026-10-29', 'Dev'), t('t8', 'Homepage hero animation', false, 'm2', '2026-11-05', 'Design'), t('t9', 'Write about page', false, 'm6', '2026-11-08', 'Copy')],
    milestones: [{ id: 'ms4', title: 'Design system', due: '2026-09-10', status: 'done', amount: 8000 }, { id: 'ms5', title: 'Templates build', due: '2026-11-15', status: 'current', amount: 14000 }, { id: 'ms6', title: 'Launch', due: '2026-12-18', status: 'upcoming', amount: 10000 }],
    files: [{ id: 'f4', name: 'Sitemap_v3.pdf', size: '1.2 MB', kind: 'pdf', addedAt: '2026-08-05' }, { id: 'f5', name: 'Northfold_UI.fig', size: '41 MB', kind: 'fig', addedAt: '2026-09-09' }],
    comments: [{ id: 'cm3', author: 'Elena Rossi', photo: P.elena, text: 'The product template looks fantastic on mobile.', at: '2026-10-16T09:02:00' }] },
  { id: 'p3', clientId: 'c3', name: 'Winter campaign shoot', status: 'planning', health: 'on_track', budget: 9750, start: '2026-10-20', due: '2026-11-28', leadId: 'm3', memberIds: ['m3', 'm1'],
    description: 'Two day studio and location shoot for the winter collection, plus social cutdowns.',
    tasks: [t('t10', 'Location scouting', true, 'm3', '2026-10-24', 'Shoot'), t('t11', 'Shot list sign off', false, 'm3', '2026-10-31', 'Client'), t('t12', 'Book photographer', false, 'm1', '2026-11-02', 'Ops')],
    milestones: [{ id: 'ms7', title: 'Pre production', due: '2026-11-06', status: 'current', amount: 3000 }, { id: 'ms8', title: 'Shoot & edit', due: '2026-11-28', status: 'upcoming', amount: 6750 }],
    files: [{ id: 'f6', name: 'Locations_Berlin.pdf', size: '12 MB', kind: 'pdf', addedAt: '2026-10-24' }], comments: [] },
  { id: 'p4', clientId: 'c4', name: 'App onboarding', status: 'in_progress', health: 'at_risk', budget: 21300, start: '2026-09-01', due: '2026-11-20', leadId: 'm2', memberIds: ['m2', 'm4', 'm6'],
    description: 'Redesign the first run experience of the Lumen app to lift activation.',
    tasks: [t('t13', 'Flow audit', true, 'm2', '2026-09-12', 'Research'), t('t14', 'Compliance copy review', false, 'm6', '2026-10-26', 'Copy'), t('t15', 'Prototype v2', false, 'm2', '2026-11-01', 'Design'), t('t16', 'Usability sessions', false, 'm2', '2026-11-10', 'Research')],
    milestones: [{ id: 'ms9', title: 'Audit & concepts', due: '2026-09-30', status: 'done', amount: 7100 }, { id: 'ms10', title: 'Prototype & testing', due: '2026-11-20', status: 'current', amount: 14200 }],
    files: [{ id: 'f7', name: 'Onboarding_audit.pdf', size: '5.6 MB', kind: 'pdf', addedAt: '2026-09-14' }],
    comments: [{ id: 'cm4', author: 'Maya Ellison', photo: P.maya, text: 'Compliance needs one more pass on the KYC screen copy.', at: '2026-10-21T15:20:00' }] },
  { id: 'p5', clientId: 'c5', name: 'Annual report 2026', status: 'review', health: 'off_track', budget: 7200, start: '2026-09-20', due: '2026-11-12', leadId: 'm5', memberIds: ['m5', 'm6'],
    description: '48 page annual report, print and interactive web edition.',
    tasks: [t('t17', 'Data charts', true, 'm5', '2026-10-18', 'Design'), t('t18', 'Cover options', false, 'm5', '2026-10-25', 'Design'), t('t19', 'Proofread', false, 'm6', '2026-11-02', 'Copy')],
    milestones: [{ id: 'ms11', title: 'Layout', due: '2026-10-25', status: 'current', amount: 4000 }, { id: 'ms12', title: 'Print & web', due: '2026-11-12', status: 'upcoming', amount: 3200 }],
    files: [], comments: [] },
  { id: 'p6', clientId: 'c6', name: 'Fund III pitch deck', status: 'done', health: 'on_track', budget: 4800, start: '2026-09-25', due: '2026-10-15', leadId: 'm1', memberIds: ['m1', 'm5'],
    description: 'Investor deck and one pager for the Fund III raise.',
    tasks: [t('t20', 'Narrative outline', true, 'm1', '2026-09-30', 'Strategy'), t('t21', 'Deck design', true, 'm5', '2026-10-10', 'Design')],
    milestones: [{ id: 'ms13', title: 'Deck delivered', due: '2026-10-15', status: 'done', amount: 4800 }], files: [{ id: 'f8', name: 'Vantage_FundIII.pdf', size: '9.8 MB', kind: 'pdf', addedAt: '2026-10-14' }], comments: [] },
  { id: 'p7', clientId: 'c7', name: 'Design system', status: 'planning', health: 'on_track', budget: 26500, start: '2026-11-15', due: '2027-02-28', leadId: 'm2', memberIds: ['m2', 'm4'],
    description: 'Component library and documentation site for the Parallel product team.',
    tasks: [t('t22', 'Kickoff workshop', false, 'm2', '2026-11-16', 'Strategy')],
    milestones: [{ id: 'ms14', title: 'Foundations', due: '2026-12-20', status: 'upcoming', amount: 9000 }, { id: 'ms15', title: 'Components & docs', due: '2027-02-28', status: 'upcoming', amount: 17500 }], files: [], comments: [] },
  { id: 'p8', clientId: 'c2', name: 'Holiday email series', status: 'in_progress', health: 'on_track', budget: 3600, start: '2026-10-10', due: '2026-11-25', leadId: 'm6', memberIds: ['m6', 'm5'],
    description: 'Five email holiday campaign with modular templates.',
    tasks: [t('t23', 'Template design', true, 'm5', '2026-10-20', 'Design'), t('t24', 'Write emails 1 to 3', false, 'm6', '2026-10-30', 'Copy')],
    milestones: [{ id: 'ms16', title: 'Campaign live', due: '2026-11-25', status: 'current', amount: 3600 }], files: [], comments: [] },
];

const li = (id: string, description: string, qty: number, rate: number) => ({ id, description, qty, rate });

export const invoices: Invoice[] = [
  { id: 'i1', number: 'DC-0142', clientId: 'c1', projectId: 'p1', issued: '2026-10-22', due: '2026-11-05', status: 'sent', items: [li('l1', 'Milestone 2: Logo & packaging system', 1, 6200)], taxRate: 0, notes: 'Thank you for the lovely collaboration.' },
  { id: 'i2', number: 'DC-0141', clientId: 'c2', projectId: 'p2', issued: '2026-10-10', due: '2026-10-24', status: 'paid', paidAt: '2026-10-23', items: [li('l2', 'Templates build, 50% deposit', 1, 7000), li('l3', 'CMS setup', 8, 125)], taxRate: 0, notes: '' },
  { id: 'i3', number: 'DC-0140', clientId: 'c4', projectId: 'p4', issued: '2026-09-30', due: '2026-10-14', status: 'overdue', items: [li('l4', 'Audit & concepts', 1, 7100)], taxRate: 0, notes: 'Reminder sent Oct 16.' },
  { id: 'i4', number: 'DC-0139', clientId: 'c6', projectId: 'p6', issued: '2026-10-15', due: '2026-10-29', status: 'paid', paidAt: '2026-10-16', items: [li('l5', 'Fund III pitch deck', 1, 4800)], taxRate: 0, notes: '' },
  { id: 'i5', number: 'DC-0138', clientId: 'c3', projectId: 'p3', issued: '2026-10-20', due: '2026-11-03', status: 'sent', items: [li('l6', 'Pre production', 1, 3000)], taxRate: 0, notes: '' },
  { id: 'i6', number: 'DC-0137', clientId: 'c5', projectId: 'p5', issued: '2026-09-25', due: '2026-10-09', status: 'paid', paidAt: '2026-10-07', items: [li('l7', 'Annual report deposit', 1, 2400)], taxRate: 0, notes: '' },
  { id: 'i7', number: 'DC-0136', clientId: 'c1', projectId: 'p1', issued: '2026-09-30', due: '2026-10-14', status: 'paid', paidAt: '2026-10-02', items: [li('l8', 'Milestone 1: Discovery & moodboards', 1, 3600)], taxRate: 0, notes: '' },
  { id: 'i8', number: 'DC-0135', clientId: 'c2', projectId: 'p2', issued: '2026-09-10', due: '2026-09-24', status: 'paid', paidAt: '2026-09-20', items: [li('l9', 'Design system', 1, 8000)], taxRate: 0, notes: '' },
  { id: 'i9', number: 'DC-0134', clientId: 'c4', projectId: 'p4', issued: '2026-08-31', due: '2026-09-14', status: 'paid', paidAt: '2026-09-13', items: [li('l10', 'Discovery sprint', 1, 5400)], taxRate: 0, notes: '' },
  { id: 'i10', number: 'DC-0143', clientId: 'c2', projectId: 'p8', issued: '2026-10-25', due: '2026-11-08', status: 'draft', items: [li('l11', 'Holiday email series', 1, 3600)], taxRate: 0, notes: '' },
  { id: 'i11', number: 'DC-0133', clientId: 'c8', issued: '2026-06-30', due: '2026-07-14', status: 'paid', paidAt: '2026-07-10', items: [li('l12', 'Retainer, June', 1, 4000)], taxRate: 0, notes: '' },
  { id: 'i12', number: 'DC-0132', clientId: 'c6', issued: '2026-09-05', due: '2026-09-19', status: 'paid', paidAt: '2026-09-06', items: [li('l13', 'Brand audit', 1, 2800)], taxRate: 0, notes: '' },
];

export const approvals: Approval[] = [
  { id: 'a1', projectId: 'p1', clientId: 'c1', title: 'Packaging round 2', version: 2, submittedAt: '2026-10-22T16:00:00', status: 'pending', previews: ['from-amber/80 to-ember/70', 'from-cream to-amber-soft/70', 'from-ink-500 to-ink-700'], description: 'Three packaging directions with the heavier wordmark applied.', comments: [] },
  { id: 'a2', projectId: 'p2', clientId: 'c2', title: 'Homepage hero', version: 3, submittedAt: '2026-10-20T11:30:00', status: 'changes', previews: ['from-sky-400/80 to-indigo-600/70', 'from-slate-200 to-sky-300/60'], description: 'Hero layout with seasonal photography and motion.', comments: [{ id: 'ac1', author: 'Elena Rossi', photo: P.elena, text: 'Could the headline be shorter on mobile?', at: '2026-10-21T08:10:00' }] },
  { id: 'a3', projectId: 'p4', clientId: 'c4', title: 'Onboarding flow v2', version: 2, submittedAt: '2026-10-24T09:15:00', status: 'pending', previews: ['from-violet-400/80 to-fuchsia-600/70', 'from-ink-500 to-violet-500/50', 'from-fuchsia-300/60 to-ink-600'], description: 'Seven screen first run flow with progressive KYC.', comments: [] },
  { id: 'a4', projectId: 'p5', clientId: 'c5', title: 'Report cover options', version: 1, submittedAt: '2026-10-23T14:45:00', status: 'pending', previews: ['from-lime-300/70 to-green-700/70', 'from-amber-soft/70 to-ink-600'], description: 'Two cover directions for the 2026 annual report.', comments: [] },
  { id: 'a5', projectId: 'p6', clientId: 'c6', title: 'Fund III deck final', version: 4, submittedAt: '2026-10-13T10:00:00', status: 'approved', previews: ['from-slate-300 to-slate-600'], description: 'Final investor deck.', comments: [{ id: 'ac2', author: 'Daniel Brooks', photo: P.daniel, text: 'Perfect, shipping it to LPs today.', at: '2026-10-14T09:00:00' }] },
];

const notes = ['Design review', 'Client call', 'Production', 'Revisions', 'Build', 'Copywriting', 'Planning', 'Research'];
const entryProjects = ['p1', 'p2', 'p4', 'p5', 'p3', 'p8'];
export const timeEntries: TimeEntry[] = Array.from({ length: 36 }, (_, i) => {
  const day = 25 - Math.floor(i / 3);
  const memberId = members[(i % 5)].id;
  return {
    id: `te${i + 1}`,
    memberId,
    projectId: entryProjects[i % entryProjects.length],
    date: `2026-10-${String(day).padStart(2, '0')}`,
    minutes: [90, 120, 45, 180, 60, 150, 75, 210][i % 8],
    note: notes[i % notes.length],
    billable: i % 7 !== 0,
  };
});

export const threads: Thread[] = [
  { id: 'th1', clientId: 'c1', subject: 'Packaging round 2', unread: 2, messages: [
    { id: 'mg1', from: 'Priya Nair', photo: P.priya, mine: true, text: 'Hi Amara, round 2 is up in your portal with the heavier wordmark. Let us know which direction feels right.', at: '2026-10-22T16:05:00' },
    { id: 'mg2', from: 'Amara Okafor', photo: P.amara, mine: false, text: 'These are gorgeous. Leaning towards option A. Sharing with Leo today.', at: '2026-10-24T09:12:00' },
    { id: 'mg3', from: 'Amara Okafor', photo: P.amara, mine: false, text: 'Quick one: can we see A with the cream lid as well?', at: '2026-10-24T09:14:00' },
  ] },
  { id: 'th2', clientId: 'c4', subject: 'Compliance review timing', unread: 1, messages: [
    { id: 'mg4', from: 'Maya Ellison', photo: P.maya, mine: false, text: 'Our compliance team needs until Wednesday for the KYC copy. Does that still work for the prototype?', at: '2026-10-23T13:40:00' },
  ] },
  { id: 'th3', clientId: 'c2', subject: 'Homepage hero feedback', unread: 0, messages: [
    { id: 'mg5', from: 'Elena Rossi', photo: P.elena, mine: false, text: 'Could the headline be shorter on mobile?', at: '2026-10-21T08:10:00' },
    { id: 'mg6', from: 'Felix Hart', photo: P.felix, mine: true, text: 'Absolutely. We will send v4 with a two line version by Tuesday.', at: '2026-10-21T10:02:00' },
  ] },
  { id: 'th4', clientId: 'c3', subject: 'Shoot dates', unread: 0, messages: [
    { id: 'mg7', from: 'Tom Ashby', photo: P.tom, mine: true, text: 'Proposed shoot days: Nov 17 and 18. Shot list coming Friday.', at: '2026-10-20T15:00:00' },
    { id: 'mg8', from: 'Jonas Weber', photo: P.jonas, mine: false, text: 'Both days work for us. Looking forward to it!', at: '2026-10-20T17:22:00' },
  ] },
  { id: 'th5', clientId: 'c7', subject: 'Design system proposal', unread: 0, messages: [
    { id: 'mg9', from: 'Sam Rivera', photo: P.sam, mine: true, text: 'Hi Ines, attached is our proposal for the Parallel design system. Happy to walk through it on a call.', at: '2026-10-18T11:00:00' },
  ] },
];

export const activity: Activity[] = [
  { id: 'ac1', actor: 'Amara Okafor', photo: P.amara, text: 'commented on Packaging round 2', at: '2026-10-24T09:14:00', kind: 'message' },
  { id: 'ac2', actor: 'Lumen & Co', text: 'received onboarding flow v2 for approval', at: '2026-10-24T09:15:00', kind: 'approval' },
  { id: 'ac3', actor: 'Northfold', text: 'paid invoice DC-0141 ($8,000)', at: '2026-10-23T18:02:00', kind: 'invoice' },
  { id: 'ac4', actor: 'Tom Ashby', photo: P.tom, text: 'completed Location scouting', at: '2026-10-24T12:30:00', kind: 'project' },
  { id: 'ac5', actor: 'Priya Nair', photo: P.priya, text: 'logged 3h on Spring rebrand', at: '2026-10-24T17:40:00', kind: 'time' },
  { id: 'ac6', actor: 'Sam Rivera', photo: P.sam, text: 'added Parallel as a lead', at: '2026-10-10T10:00:00', kind: 'client' },
];

export const notifications: Notification[] = [
  { id: 'n1', title: 'Payment received', body: 'Northfold paid DC-0141 ($8,000).', at: '2026-10-23T18:02:00', read: false, href: '/app/invoices/view?id=i2' },
  { id: 'n2', title: 'New comment', body: 'Amara asked for option A with a cream lid.', at: '2026-10-24T09:14:00', read: false, href: '/app/messages?thread=th1' },
  { id: 'n3', title: 'Invoice overdue', body: 'DC-0140 for Lumen & Co is 11 days overdue.', at: '2026-10-25T08:00:00', read: false, href: '/app/invoices/view?id=i3' },
  { id: 'n4', title: 'Approval requested', body: 'Report cover options sent to Fieldwork.', at: '2026-10-23T14:45:00', read: true, href: '/app/approvals?id=a4' },
];

export const briefs: Brief[] = [
  { id: 'b1', clientId: 'c1', title: 'Kiln spring rebrand', createdAt: '2026-09-10T10:00:00', notes: 'Call with Amara. Spring ceramics launch. Logo feels dated, packaging inconsistent, Shopify site slow...',
    output: { goal: 'Refresh the Kiln brand for the spring ceramics launch so it feels warm, crafted and premium.', deliverables: ['Logo refinement and lockups', 'Packaging system for 4 product lines', 'Six page Shopify site'], timeline: [{ phase: 'Discovery', weeks: 2 }, { phase: 'Identity & packaging', weeks: 4 }, { phase: 'Website', weeks: 5 }], quote: 18400, risks: ['Supplier lead times for printed packaging', 'Product photography not yet booked'], questions: ['Who signs off on the final logo?', 'Is the Shopify theme staying?'] } },
];
