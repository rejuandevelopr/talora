import { useEffect, useState } from 'react';
import { useStore } from '../lib/store';
import { addDays, today } from '../lib/format';
import type { Client } from '../lib/types';
import { Badge, Button, Field, Input, Modal, Select, Textarea } from './ui';

export const clientStatusMeta: Record<Client['status'], { label: string; tone: 'green' | 'blue' | 'neutral' }> = {
  active: { label: 'Active', tone: 'green' },
  lead: { label: 'Lead', tone: 'blue' },
  archived: { label: 'Archived', tone: 'neutral' },
};
export const ClientStatusBadge = ({ status }: { status: Client['status'] }) => <Badge tone={clientStatusMeta[status].tone} dot>{clientStatusMeta[status].label}</Badge>;


/** Create project modal shared by the Projects page and the client detail page. */
export function NewProjectModal({ open, onClose, defaultClientId }: { open: boolean; onClose: () => void; defaultClientId?: string }) {
  const clients = useStore((s) => s.clients);
  const members = useStore((s) => s.members);
  const meId = useStore((s) => s.meId);
  const addProject = useStore((s) => s.addProject);
  const selectable = clients.filter((c) => c.status !== 'archived');

  const blank = () => ({
    name: '',
    clientId: defaultClientId ?? selectable[0]?.id ?? '',
    leadId: meId,
    start: today(),
    due: addDays(today(), 42),
    budget: '12000',
    description: '',
  });
  const [f, setF] = useState(blank);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) { setF(blank()); setError(''); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, defaultClientId]);

  const set = <K extends keyof ReturnType<typeof blank>>(k: K, v: ReturnType<typeof blank>[K]) => setF((x) => ({ ...x, [k]: v }));

  const submit = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!f.name.trim()) return setError('Give the project a name.');
    if (!f.clientId) return setError('Pick a client for this project.');
    if (f.due < f.start) return setError('The due date has to be after the start date.');
    const p = addProject({
      name: f.name.trim(),
      clientId: f.clientId,
      leadId: f.leadId,
      memberIds: [f.leadId],
      start: f.start,
      due: f.due,
      budget: Math.max(0, Number(f.budget) || 0),
      description: f.description.trim() || 'Scope to be confirmed with the client.',
      health: 'on_track',
      status: 'planning',
    });
    onClose();
    window.location.href = `/app/projects/view?id=${p.id}`;
  };

  return (
    <Modal open={open} onClose={onClose} title="New project" subtitle="Starts in Planning. You can add tasks and milestones next." wide
      footer={<><Button variant="ghost" onClick={onClose}>Cancel</Button><Button variant="primary" onClick={() => submit()}>Create project</Button></>}>
      <form onSubmit={submit} className="grid gap-4 sm:grid-cols-2">
        <Field label="Project name" className="sm:col-span-2"><Input value={f.name} onChange={(e) => set('name', e.target.value)} placeholder="e.g. Product launch campaign" /></Field>
        <Field label="Client">
          <Select value={f.clientId} onChange={(e) => set('clientId', e.target.value)}>
            {selectable.map((c) => <option key={c.id} value={c.id}>{c.name}{c.status === 'lead' ? ' (lead)' : ''}</option>)}
          </Select>
        </Field>
        <Field label="Project lead">
          <Select value={f.leadId} onChange={(e) => set('leadId', e.target.value)}>
            {members.map((m) => <option key={m.id} value={m.id}>{m.name}, {m.title}</option>)}
          </Select>
        </Field>
        <Field label="Start date"><Input type="date" value={f.start} onChange={(e) => set('start', e.target.value)} /></Field>
        <Field label="Due date"><Input type="date" value={f.due} onChange={(e) => set('due', e.target.value)} /></Field>
        <Field label="Budget (USD)" hint="Fixed fee or estimate"><Input type="number" min={0} step={100} inputMode="numeric" value={f.budget} onChange={(e) => set('budget', e.target.value)} /></Field>
        <div className="hidden sm:block" />
        <Field label="Description" className="sm:col-span-2"><Textarea rows={3} value={f.description} onChange={(e) => set('description', e.target.value)} placeholder="What are we making, and what does success look like?" /></Field>
        {error && <p role="alert" className="text-[12px] text-orange-300 sm:col-span-2">{error}</p>}
        <button type="submit" className="hidden" aria-hidden tabIndex={-1} />
      </form>
    </Modal>
  );
}
