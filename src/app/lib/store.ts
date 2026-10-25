import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import * as seed from './seed';
import type {
  Activity, Approval, ApprovalStatus, Brief, Client, Comment, Invoice, InvoiceStatus, Member, Notification,
  Project, ProjectStatus, Session, Thread, TimeEntry, Timer, Workspace,
} from './types';

export interface Toast { id: string; text: string; tone: 'success' | 'info' | 'error' }

export interface DemoData {
  session: Session | null;
  onboarded: boolean;
  meId: string;
  workspace: Workspace;
  members: Member[];
  clients: Client[];
  projects: Project[];
  invoices: Invoice[];
  approvals: Approval[];
  timeEntries: TimeEntry[];
  threads: Thread[];
  activity: Activity[];
  notifications: Notification[];
  briefs: Brief[];
  timer: Timer | null;
}

interface Actions {
  /** Generic escape hatch: return the slice of state you want to change. */
  update: (fn: (s: DemoData) => Partial<DemoData>) => void;
  reset: () => void;
  login: (session: Session) => void;
  logout: () => void;
  // clients & projects
  addClient: (c: Omit<Client, 'id' | 'since' | 'portalSlug'>) => Client;
  updateClient: (id: string, patch: Partial<Client>) => void;
  addProject: (p: Omit<Project, 'id' | 'tasks' | 'milestones' | 'files' | 'comments'> & Partial<Project>) => Project;
  updateProject: (id: string, patch: Partial<Project>) => void;
  moveProject: (id: string, status: ProjectStatus) => void;
  toggleTask: (projectId: string, taskId: string) => void;
  addTask: (projectId: string, title: string, assigneeId: string, due: string, tag?: string) => void;
  addProjectComment: (projectId: string, text: string) => void;
  // invoices
  addInvoice: (inv: Omit<Invoice, 'id' | 'number'>) => Invoice;
  updateInvoice: (id: string, patch: Partial<Invoice>) => void;
  setInvoiceStatus: (id: string, status: InvoiceStatus) => void;
  // approvals
  decideApproval: (id: string, status: ApprovalStatus, comment?: string, author?: { name: string; photo?: string }) => void;
  // time
  startTimer: (projectId: string, note: string) => void;
  stopTimer: () => void;
  addTimeEntry: (e: Omit<TimeEntry, 'id'>) => void;
  deleteTimeEntry: (id: string) => void;
  // messages
  sendMessage: (threadId: string, text: string, asClient?: { name: string; photo?: string }) => void;
  startThread: (clientId: string, subject: string, text: string) => string;
  markThreadRead: (threadId: string) => void;
  // misc
  addBrief: (b: Omit<Brief, 'id' | 'createdAt'>) => Brief;
  markAllNotificationsRead: () => void;
  markNotificationRead: (id: string) => void;
  log: (a: Omit<Activity, 'id' | 'at'>) => void;
  notify: (title: string, body: string, href: string) => void;
  // toasts (not persisted)
  toasts: Toast[];
  toast: (text: string, tone?: Toast['tone']) => void;
  dismissToast: (id: string) => void;
}

export type Store = DemoData & Actions;

export const uid = (prefix = 'id') => `${prefix}_${Math.random().toString(36).slice(2, 9)}`;
const nowIso = () => new Date().toISOString();

const initial = (): DemoData => structuredClone({
  session: { name: 'Sam Rivera', email: 'sam@duneandco.studio' },
  onboarded: true,
  meId: 'm1',
  workspace: seed.workspace,
  members: seed.members,
  clients: seed.clients,
  projects: seed.projects,
  invoices: seed.invoices,
  approvals: seed.approvals,
  timeEntries: seed.timeEntries,
  threads: seed.threads,
  activity: seed.activity,
  notifications: seed.notifications,
  briefs: seed.briefs,
  timer: null,
});

export const useStore = create<Store>()(
  persist(
    (set, get) => {
      const me = () => get().members.find((m) => m.id === get().meId)!;
      const mapProject = (id: string, fn: (p: Project) => Project) =>
        set((s) => ({ projects: s.projects.map((p) => (p.id === id ? fn(p) : p)) }));

      return {
        ...initial(),
        toasts: [],

        update: (fn) => set((s) => fn(s)),
        reset: () => { set({ ...initial() }); get().toast('Demo data reset', 'info'); },
        login: (session) => set({ session }),
        logout: () => set({ session: null }),

        addClient: (c) => {
          const client: Client = { ...c, id: uid('c'), since: nowIso().slice(0, 10), portalSlug: c.name.toLowerCase().replace(/[^a-z0-9]+/g, '-') };
          set((s) => ({ clients: [client, ...s.clients] }));
          get().log({ actor: me().name, photo: me().photo, text: `added ${client.name} as a client`, kind: 'client' });
          get().toast(`${client.name} added`);
          return client;
        },
        updateClient: (id, patch) => set((s) => ({ clients: s.clients.map((c) => (c.id === id ? { ...c, ...patch } : c)) })),

        addProject: (p) => {
          const project: Project = { tasks: [], milestones: [], files: [], comments: [], ...p, id: uid('p') } as Project;
          set((s) => ({ projects: [project, ...s.projects] }));
          get().log({ actor: me().name, photo: me().photo, text: `created project ${project.name}`, kind: 'project' });
          get().toast(`Project "${project.name}" created`);
          return project;
        },
        updateProject: (id, patch) => mapProject(id, (p) => ({ ...p, ...patch })),
        moveProject: (id, status) => {
          mapProject(id, (p) => ({ ...p, status }));
          const p = get().projects.find((x) => x.id === id);
          if (p) get().log({ actor: me().name, photo: me().photo, text: `moved ${p.name} to ${status.replace('_', ' ')}`, kind: 'project' });
        },
        toggleTask: (projectId, taskId) => mapProject(projectId, (p) => ({ ...p, tasks: p.tasks.map((t) => (t.id === taskId ? { ...t, done: !t.done } : t)) })),
        addTask: (projectId, title, assigneeId, due, tag = 'General') =>
          mapProject(projectId, (p) => ({ ...p, tasks: [...p.tasks, { id: uid('t'), title, done: false, assigneeId, due, tag }] })),
        addProjectComment: (projectId, text) => {
          const c: Comment = { id: uid('cm'), author: me().name, photo: me().photo, text, at: nowIso() };
          mapProject(projectId, (p) => ({ ...p, comments: [...p.comments, c] }));
        },

        addInvoice: (inv) => {
          const s = get();
          const max = Math.max(0, ...s.invoices.map((i) => parseInt(i.number.split('-')[1] ?? '0', 10)));
          const invoice: Invoice = { ...inv, id: uid('i'), number: `${s.workspace.invoicePrefix}-${String(max + 1).padStart(4, '0')}` };
          set((st) => ({ invoices: [invoice, ...st.invoices] }));
          const client = s.clients.find((c) => c.id === inv.clientId);
          get().log({ actor: me().name, photo: me().photo, text: `${inv.status === 'draft' ? 'drafted' : 'sent'} invoice ${invoice.number} to ${client?.name ?? 'a client'}`, kind: 'invoice' });
          get().toast(inv.status === 'draft' ? `Draft ${invoice.number} saved` : `Invoice ${invoice.number} sent`);
          return invoice;
        },
        updateInvoice: (id, patch) => set((s) => ({ invoices: s.invoices.map((i) => (i.id === id ? { ...i, ...patch } : i)) })),
        setInvoiceStatus: (id, status) => {
          set((s) => ({ invoices: s.invoices.map((i) => (i.id === id ? { ...i, status, paidAt: status === 'paid' ? nowIso().slice(0, 10) : i.paidAt } : i)) }));
          const inv = get().invoices.find((i) => i.id === id);
          if (!inv) return;
          const msg = status === 'paid' ? `marked ${inv.number} as paid` : status === 'sent' ? `sent ${inv.number}` : `updated ${inv.number}`;
          get().log({ actor: me().name, photo: me().photo, text: msg, kind: 'invoice' });
          get().toast(status === 'paid' ? `${inv.number} marked as paid` : status === 'sent' ? `${inv.number} sent` : `${inv.number} updated`);
        },

        decideApproval: (id, status, comment, author) => {
          const who = author ?? { name: me().name, photo: me().photo };
          set((s) => ({
            approvals: s.approvals.map((a) =>
              a.id === id
                ? { ...a, status, comments: comment ? [...a.comments, { id: uid('ac'), author: who.name, photo: who.photo, text: comment, at: nowIso() }] : a.comments }
                : a,
            ),
          }));
          const a = get().approvals.find((x) => x.id === id);
          if (a) {
            const verb = status === 'approved' ? 'approved' : status === 'changes' ? 'requested changes on' : 'reopened';
            get().log({ actor: who.name, photo: who.photo, text: `${verb} ${a.title}`, kind: 'approval' });
            get().toast(status === 'approved' ? `${a.title} approved` : `Changes requested on ${a.title}`);
          }
        },

        startTimer: (projectId, note) => set({ timer: { projectId, note, startedAt: Date.now() } }),
        stopTimer: () => {
          const tm = get().timer;
          if (!tm) return;
          const minutes = Math.max(1, Math.round((Date.now() - tm.startedAt) / 60000));
          set((s) => ({ timer: null, timeEntries: [{ id: uid('te'), memberId: s.meId, projectId: tm.projectId, date: nowIso().slice(0, 10), minutes, note: tm.note || 'Timed session', billable: true }, ...s.timeEntries] }));
          get().toast(`Logged ${minutes} min`);
        },
        addTimeEntry: (e) => { set((s) => ({ timeEntries: [{ ...e, id: uid('te') }, ...s.timeEntries] })); get().toast('Time entry added'); },
        deleteTimeEntry: (id) => set((s) => ({ timeEntries: s.timeEntries.filter((e) => e.id !== id) })),

        sendMessage: (threadId, text, asClient) => {
          const msg = asClient
            ? { id: uid('mg'), from: asClient.name, photo: asClient.photo, mine: false, text, at: nowIso() }
            : { id: uid('mg'), from: me().name, photo: me().photo, mine: true, text, at: nowIso() };
          set((s) => ({ threads: s.threads.map((t) => (t.id === threadId ? { ...t, messages: [...t.messages, msg] } : t)) }));
        },
        startThread: (clientId, subject, text) => {
          const id = uid('th');
          set((s) => ({ threads: [{ id, clientId, subject, unread: 0, messages: [{ id: uid('mg'), from: me().name, photo: me().photo, mine: true, text, at: nowIso() }] }, ...s.threads] }));
          return id;
        },
        markThreadRead: (threadId) => set((s) => ({ threads: s.threads.map((t) => (t.id === threadId ? { ...t, unread: 0 } : t)) })),

        addBrief: (b) => {
          const brief: Brief = { ...b, id: uid('b'), createdAt: nowIso() };
          set((s) => ({ briefs: [brief, ...s.briefs] }));
          return brief;
        },
        markAllNotificationsRead: () => set((s) => ({ notifications: s.notifications.map((n) => ({ ...n, read: true })) })),
        markNotificationRead: (id) => set((s) => ({ notifications: s.notifications.map((n) => (n.id === id ? { ...n, read: true } : n)) })),
        log: (a) => set((s) => ({ activity: [{ ...a, id: uid('ac'), at: nowIso() }, ...s.activity].slice(0, 60) })),
        notify: (title, body, href) => set((s) => ({ notifications: [{ id: uid('n'), title, body, href, at: nowIso(), read: false }, ...s.notifications] })),

        toast: (text, tone = 'success') => {
          const id = uid('toast');
          set((s) => ({ toasts: [...s.toasts, { id, text, tone }] }));
          setTimeout(() => get().dismissToast(id), 3200);
        },
        dismissToast: (id) => set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),
      };
    },
    {
      name: 'talora-demo-v1',
      storage: createJSONStorage(() => localStorage),
      partialize: ({ toasts, ...rest }) => Object.fromEntries(Object.entries(rest).filter(([, v]) => typeof v !== 'function')) as unknown as Store,
    },
  ),
);

/* ---------- selectors & derived helpers ---------- */
export const invoiceTotal = (inv: Pick<Invoice, 'items' | 'taxRate'>) => {
  const sub = inv.items.reduce((a, i) => a + i.qty * i.rate, 0);
  return sub + (sub * (inv.taxRate || 0)) / 100;
};
export const projectProgress = (p: Project) => (p.tasks.length ? Math.round((p.tasks.filter((t) => t.done).length / p.tasks.length) * 100) : p.status === 'done' ? 100 : 0);
export const projectBilled = (p: Project, invoices: Invoice[]) => invoices.filter((i) => i.projectId === p.id && i.status !== 'draft').reduce((a, i) => a + invoiceTotal(i), 0);
