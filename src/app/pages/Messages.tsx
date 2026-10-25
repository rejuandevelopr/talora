import { Fragment, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { ArrowLeft, ArrowUpRight, FileText, Inbox, MessageSquarePlus, Paperclip, Send, X } from 'lucide-react';
import { useStore } from '../lib/store';
import { cx, date, getParam, relative, time } from '../lib/format';
import type { Thread } from '../lib/types';
import { Avatar, Button, Card, ClientLogo, EmptyState, Field, Input, Modal, PageHeader, SearchInput, Select, Textarea } from '../ui/ui';

const REPLIES = [
  'Thanks, that is really helpful. I will share it with the team and come back to you by tomorrow.',
  'Perfect, this works for us. Go ahead.',
  'Got it. Could we jump on a quick call Thursday to go through the details?',
  'Love it. One small thing: can we try a slightly warmer tone on the second option?',
  'Great, thank you. I will confirm the dates with finance and get back to you.',
  'Thanks for the quick turnaround. Looks good from my side.',
];

const FILES = ['Moodboard_v2.pdf', 'Round-3-exports.zip', 'Shot-list-draft.pdf', 'Brand-guidelines.pdf', 'Wireframes.fig'];

const dayLabel = (iso: string) => {
  const d = iso.slice(0, 10);
  const now = new Date();
  const t = now.toISOString().slice(0, 10);
  const y = new Date(now.getTime() - 86400000).toISOString().slice(0, 10);
  if (d === t) return 'Today';
  if (d === y) return 'Yesterday';
  return date(iso, { weekday: 'long', month: 'short', day: 'numeric' });
};

const lastAt = (t: Thread) => t.messages[t.messages.length - 1]?.at ?? '';

export default function Messages() {
  const s = useStore();
  const [q, setQ] = useState('');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);
  const [draft, setDraft] = useState('');
  const [attachments, setAttachments] = useState<string[]>([]);
  const [typing, setTyping] = useState<Record<string, boolean>>({});
  const [newOpen, setNewOpen] = useState(false);
  const [form, setForm] = useState({ clientId: '', subject: '', text: '' });
  const scrollRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);
  const timers = useRef<number[]>([]);

  useEffect(() => {
    const st = useStore.getState();
    const id = getParam('thread');
    const found = id && st.threads.find((t) => t.id === id);
    if (found) { open(found.id); setMobileOpen(true); }
    else {
      const first = [...st.threads].sort((a, b) => lastAt(b).localeCompare(lastAt(a)))[0];
      if (first && window.matchMedia('(min-width: 1024px)').matches) open(first.id, false);
    }
    if (getParam('new') === '1') { setNewOpen(true); history.replaceState(null, '', '/app/messages'); }
    return () => timers.current.forEach((t) => clearTimeout(t));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const threads = useMemo(() => {
    const term = q.trim().toLowerCase();
    return [...s.threads]
      .sort((a, b) => lastAt(b).localeCompare(lastAt(a)))
      .filter((t) => {
        if (!term) return true;
        const c = s.clients.find((x) => x.id === t.clientId);
        return [t.subject, c?.name, ...t.messages.map((m) => m.text)].join(' ').toLowerCase().includes(term);
      });
  }, [s.threads, s.clients, q]);

  const active = s.threads.find((t) => t.id === activeId) ?? null;
  const client = active ? s.clients.find((c) => c.id === active.clientId) : undefined;
  const contact = client?.contacts[0];
  const unreadTotal = s.threads.reduce((a, t) => a + t.unread, 0);

  function open(id: string, updateUrl = true) {
    setActiveId(id);
    setMobileOpen(true);
    useStore.getState().markThreadRead(id);
    if (updateUrl) history.replaceState(null, '', `/app/messages?thread=${id}`);
  }

  useLayoutEffect(() => {
    const el = scrollRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [activeId, active?.messages.length, typing]);

  useEffect(() => {
    const el = taRef.current;
    if (!el) return;
    el.style.height = 'auto';
    el.style.height = `${Math.min(el.scrollHeight, 160)}px`;
  }, [draft]);

  const scheduleReply = (threadId: string) => {
    const st = useStore.getState();
    const th = st.threads.find((t) => t.id === threadId);
    const c = st.clients.find((x) => x.id === th?.clientId);
    const who = c?.contacts[0];
    if (!who) return;
    timers.current.push(window.setTimeout(() => setTyping((t) => ({ ...t, [threadId]: true })), 700));
    timers.current.push(window.setTimeout(() => {
      setTyping((t) => ({ ...t, [threadId]: false }));
      const reply = REPLIES[Math.floor(Math.random() * REPLIES.length)];
      useStore.getState().sendMessage(threadId, reply, { name: who.name, photo: who.photo });
      useStore.getState().notify(`New message from ${who.name}`, reply, `/app/messages?thread=${threadId}`);
    }, 2600));
  };

  const send = () => {
    if (!active) return;
    const text = [draft.trim(), ...attachments.map((f) => `Attached: ${f}`)].filter(Boolean).join('\n');
    if (!text) return;
    s.sendMessage(active.id, text);
    setDraft('');
    setAttachments([]);
    scheduleReply(active.id);
  };

  const attach = () => {
    const f = FILES.find((x) => !attachments.includes(x)) ?? FILES[0];
    setAttachments((a) => [...a, f]);
    taRef.current?.focus();
  };

  const createThread = () => {
    if (!form.clientId || !form.subject.trim() || !form.text.trim()) return;
    const id = s.startThread(form.clientId, form.subject.trim(), form.text.trim());
    const c = s.clients.find((x) => x.id === form.clientId);
    s.log({ actor: s.members.find((m) => m.id === s.meId)!.name, text: `started a conversation with ${c?.name}`, kind: 'message' });
    s.toast(`Message sent to ${c?.name}`);
    setNewOpen(false);
    setForm({ clientId: '', subject: '', text: '' });
    setQ('');
    open(id);
    scheduleReply(id);
  };

  return (
    <div>
      <PageHeader
        title="Messages"
        subtitle={unreadTotal ? `${unreadTotal} unread across ${s.threads.filter((t) => t.unread).length} conversations` : 'You are all caught up'}
        actions={<Button variant="primary" icon={<MessageSquarePlus className="size-4" />} onClick={() => setNewOpen(true)}>New conversation</Button>}
      />

      <div className="grid gap-4 lg:h-[calc(100dvh-14rem)] lg:min-h-[560px] lg:grid-cols-[340px_1fr]">
        {/* Thread list */}
        <Card className={cx('flex min-h-0 flex-col overflow-hidden', mobileOpen && activeId && 'hidden lg:flex')}>
          <div className="border-b border-white/[0.06] p-3"><SearchInput value={q} onChange={setQ} placeholder="Search conversations" /></div>
          <ul className="scrollbar-thin flex-1 overflow-y-auto p-1.5">
            {threads.length === 0 && <li><EmptyState icon={<Inbox className="size-5" />} title="No conversations found" body="Try a different search or start a new conversation." /></li>}
            {threads.map((t) => {
              const c = s.clients.find((x) => x.id === t.clientId);
              const last = t.messages[t.messages.length - 1];
              const isActive = t.id === activeId;
              return (
                <li key={t.id}>
                  <button onClick={() => open(t.id)} aria-current={isActive}
                    className={cx('flex w-full gap-3 rounded-xl p-3 text-left transition', isActive ? 'bg-white/[0.06]' : 'hover:bg-white/[0.03]')}>
                    {c && <ClientLogo client={c} size={36} />}
                    <span className="min-w-0 flex-1">
                      <span className="flex items-baseline justify-between gap-2">
                        <span className={cx('truncate text-[13px]', t.unread ? 'font-bold text-white' : 'font-semibold')}>{c?.name}</span>
                        <span className="shrink-0 text-[11px] text-mist-400">{last ? relative(last.at) : ''}</span>
                      </span>
                      <span className={cx('block truncate text-[12px]', t.unread ? 'text-mist-200' : 'text-mist-300')}>{t.subject}</span>
                      <span className="mt-0.5 flex items-center gap-2">
                        <span className="min-w-0 flex-1 truncate text-[12px] text-mist-400">{typing[t.id] ? <span className="text-amber-soft">typing...</span> : last ? `${last.mine ? 'You: ' : ''}${last.text}` : ''}</span>
                        {t.unread > 0 && <span className="grid h-4 min-w-4 place-items-center rounded-full bg-amber px-1 text-[10px] font-bold text-ink-950" aria-label={`${t.unread} unread`}>{t.unread}</span>}
                      </span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </Card>

        {/* Conversation */}
        <Card className={cx('flex min-h-[70dvh] flex-col overflow-hidden lg:min-h-0', !(mobileOpen && activeId) && 'hidden lg:flex')}>
          {!active || !client ? (
            <div className="grid flex-1 place-items-center"><EmptyState icon={<Inbox className="size-5" />} title="Pick a conversation" body="Select a thread on the left or start a new one with a client." /></div>
          ) : (<>
            <div className="flex items-center gap-3 border-b border-white/[0.06] px-4 py-3 sm:px-5">
              <button onClick={() => setMobileOpen(false)} className="grid size-8 place-items-center rounded-lg text-mist-300 hover:bg-white/5 lg:hidden" aria-label="Back to conversations"><ArrowLeft className="size-4" /></button>
              <ClientLogo client={client} size={36} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-[14px] font-semibold">{active.subject}</p>
                <p className="truncate text-[12px] text-mist-400">{client.name}{contact && <> · {contact.name}, {contact.role}</>}</p>
              </div>
              <div className="hidden gap-1.5 sm:flex">
                <Button size="sm" variant="ghost" href={`/app/clients/view?id=${client.id}`}>Client <ArrowUpRight className="size-3.5" /></Button>
                <Button size="sm" variant="ghost" href={`/portal?client=${client.id}`}>Portal <ArrowUpRight className="size-3.5" /></Button>
              </div>
            </div>

            <div ref={scrollRef} className="scrollbar-thin flex-1 space-y-3 overflow-y-auto px-4 py-5 sm:px-6" aria-live="polite">
              {active.messages.map((m, i) => {
                const prev = active.messages[i - 1];
                const newDay = !prev || prev.at.slice(0, 10) !== m.at.slice(0, 10);
                const grouped = prev && !newDay && prev.from === m.from;
                return (
                  <Fragment key={m.id}>
                    {newDay && (
                      <div className="flex items-center gap-3 py-2 text-[11px] font-medium text-mist-400">
                        <span className="h-px flex-1 bg-white/[0.06]" />{dayLabel(m.at)}<span className="h-px flex-1 bg-white/[0.06]" />
                      </div>
                    )}
                    <div className={cx('flex items-end gap-2.5', m.mine && 'flex-row-reverse', grouped && '-mt-1.5')}>
                      <span className="w-7 shrink-0">{!grouped && <Avatar name={m.from} photo={m.photo} size={28} />}</span>
                      <div className={cx('max-w-[78%] sm:max-w-[70%]', m.mine && 'text-right')}>
                        {!grouped && <p className="mb-1 text-[11px] text-mist-400"><span className="font-semibold text-mist-300">{m.mine ? m.from.split(' ')[0] : m.from}</span> · {time(m.at)}</p>}
                        <div className={cx('inline-block whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-left text-[13px] leading-relaxed',
                          m.mine ? 'rounded-br-md bg-amber/15 text-cream ring-1 ring-amber/20' : 'rounded-bl-md bg-ink-700 text-mist-200 ring-1 ring-white/[0.06]')}>
                          {m.text.split('\n').map((line, j) => line.startsWith('Attached: ')
                            ? <span key={j} className="my-1 flex items-center gap-2 rounded-lg bg-black/20 px-2.5 py-1.5 text-[12px] font-medium"><FileText className="size-3.5 text-amber-soft" />{line.slice(10)}</span>
                            : <span key={j} className="block">{line}</span>)}
                        </div>
                      </div>
                    </div>
                  </Fragment>
                );
              })}
              {typing[active.id] && contact && (
                <div className="flex items-end gap-2.5">
                  <Avatar name={contact.name} photo={contact.photo} size={28} />
                  <div className="rounded-2xl rounded-bl-md bg-ink-700 px-3.5 py-3 ring-1 ring-white/[0.06]" aria-label={`${contact.name} is typing`}>
                    <span className="flex gap-1">
                      {[0, 1, 2].map((d) => <span key={d} className="size-1.5 animate-bounce rounded-full bg-mist-300" style={{ animationDelay: `${d * 120}ms` }} />)}
                    </span>
                  </div>
                  <span className="pb-1 text-[11px] text-mist-400">{contact.name.split(' ')[0]} is typing...</span>
                </div>
              )}
            </div>

            <div className="border-t border-white/[0.06] p-3 sm:p-4">
              <div className="rounded-xl bg-ink-850 p-2 ring-1 ring-white/10 focus-within:ring-amber/50">
                {attachments.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 px-1 pb-2">
                    {attachments.map((f) => (
                      <span key={f} className="inline-flex items-center gap-1.5 rounded-lg bg-white/[0.06] py-1 pl-2 pr-1 text-[12px] ring-1 ring-white/10">
                        <FileText className="size-3.5 text-amber-soft" />{f}
                        <button onClick={() => setAttachments((a) => a.filter((x) => x !== f))} className="grid size-5 place-items-center rounded text-mist-400 hover:bg-white/10 hover:text-white" aria-label={`Remove ${f}`}><X className="size-3" /></button>
                      </span>
                    ))}
                  </div>
                )}
                <label htmlFor="msg-composer" className="sr-only">Message {contact?.name ?? client.name}</label>
                <textarea id="msg-composer" ref={taRef} rows={1} value={draft} onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }}
                  placeholder={`Message ${contact?.name.split(' ')[0] ?? client.name}`}
                  className="block max-h-40 w-full resize-none bg-transparent px-1.5 py-1 text-[13px] leading-relaxed outline-none placeholder:text-mist-400/70" />
                <div className="flex items-center justify-between gap-2 pt-1">
                  <button onClick={attach} className="grid size-8 place-items-center rounded-lg text-mist-400 hover:bg-white/5 hover:text-white" aria-label="Attach a file"><Paperclip className="size-4" /></button>
                  <span className="hidden flex-1 text-[11px] text-mist-400 sm:block">Enter to send, Shift + Enter for a new line</span>
                  <Button size="sm" variant="primary" icon={<Send className="size-3.5" />} disabled={!draft.trim() && attachments.length === 0} onClick={send}>Send</Button>
                </div>
              </div>
            </div>
          </>)}
        </Card>
      </div>

      <Modal open={newOpen} onClose={() => setNewOpen(false)} title="New conversation" subtitle="The client gets an email and sees it in their portal."
        footer={<>
          <Button variant="ghost" onClick={() => setNewOpen(false)}>Cancel</Button>
          <Button variant="primary" icon={<Send className="size-4" />} disabled={!form.clientId || !form.subject.trim() || !form.text.trim()} onClick={createThread}>Send message</Button>
        </>}>
        <div className="space-y-4">
          <Field label="Client">
            <Select value={form.clientId} onChange={(e) => setForm({ ...form, clientId: e.target.value })}>
              <option value="">Choose a client</option>
              {s.clients.filter((c) => c.status !== 'archived').map((c) => <option key={c.id} value={c.id}>{c.name}{c.contacts[0] ? ` · ${c.contacts[0].name}` : ''}</option>)}
            </Select>
          </Field>
          <Field label="Subject"><Input value={form.subject} onChange={(e) => setForm({ ...form, subject: e.target.value })} placeholder="e.g. Kickoff agenda" /></Field>
          <Field label="Message"><Textarea rows={4} value={form.text} onChange={(e) => setForm({ ...form, text: e.target.value })} placeholder="Write your message" /></Field>
        </div>
      </Modal>
    </div>
  );
}
