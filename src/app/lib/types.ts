export type ID = string;

export interface Member {
  id: ID;
  name: string;
  email: string;
  title: string;
  role: 'Owner' | 'Admin' | 'Member';
  photo: string; // unsplash id
  rate: number; // hourly, USD
  status: 'active' | 'invited';
}

export interface Contact { name: string; email: string; role: string; photo?: string }

export interface Client {
  id: ID;
  name: string;
  industry: string;
  location: string;
  website: string;
  status: 'active' | 'lead' | 'archived';
  since: string; // ISO date
  tone: string; // tailwind gradient classes for the logo tile
  contacts: Contact[];
  portalSlug: string;
  notes: string;
}

export interface Task { id: ID; title: string; done: boolean; assigneeId: ID; due: string; tag: string }
export interface Milestone { id: ID; title: string; due: string; status: 'done' | 'current' | 'upcoming'; amount: number }
export interface ProjectFile { id: ID; name: string; size: string; kind: 'pdf' | 'image' | 'doc' | 'zip' | 'fig'; addedAt: string }
export interface Comment { id: ID; author: string; photo?: string; text: string; at: string }

export type ProjectStatus = 'planning' | 'in_progress' | 'review' | 'done';
export type Health = 'on_track' | 'at_risk' | 'off_track';

export interface Project {
  id: ID;
  clientId: ID;
  name: string;
  description: string;
  status: ProjectStatus;
  health: Health;
  budget: number;
  start: string;
  due: string;
  leadId: ID;
  memberIds: ID[];
  tasks: Task[];
  milestones: Milestone[];
  files: ProjectFile[];
  comments: Comment[];
}

export interface LineItem { id: ID; description: string; qty: number; rate: number }
export type InvoiceStatus = 'draft' | 'sent' | 'paid' | 'overdue';
export interface Invoice {
  id: ID;
  number: string;
  clientId: ID;
  projectId?: ID;
  issued: string;
  due: string;
  status: InvoiceStatus;
  items: LineItem[];
  taxRate: number; // percent
  notes: string;
  paidAt?: string;
}

export type ApprovalStatus = 'pending' | 'approved' | 'changes';
export interface Approval {
  id: ID;
  projectId: ID;
  clientId: ID;
  title: string;
  version: number;
  submittedAt: string;
  status: ApprovalStatus;
  previews: string[]; // tailwind gradient classes
  description: string;
  comments: Comment[];
}

export interface TimeEntry { id: ID; memberId: ID; projectId: ID; date: string; minutes: number; note: string; billable: boolean }

export interface Message { id: ID; from: string; photo?: string; mine: boolean; text: string; at: string }
export interface Thread { id: ID; clientId: ID; subject: string; unread: number; messages: Message[] }

export interface Activity { id: ID; actor: string; photo?: string; text: string; at: string; kind: 'invoice' | 'approval' | 'project' | 'client' | 'time' | 'message' }
export interface Notification { id: ID; title: string; body: string; at: string; read: boolean; href: string }

export interface BriefOutput { goal: string; deliverables: string[]; timeline: { phase: string; weeks: number }[]; quote: number; risks: string[]; questions: string[] }
export interface Brief { id: ID; clientId: ID; title: string; createdAt: string; notes: string; output: BriefOutput }

export interface Workspace {
  name: string;
  slug: string;
  brandColor: string;
  plan: 'Solo' | 'Studio' | 'Agency';
  billing: 'monthly' | 'yearly';
  currency: 'USD' | 'EUR' | 'GBP';
  timezone: string;
  invoicePrefix: string;
  paymentTerms: number; // days
  integrations: Record<string, boolean>;
  notifications: Record<string, boolean>;
}

export interface Session { name: string; email: string }
export interface Timer { projectId: ID; note: string; startedAt: number }
