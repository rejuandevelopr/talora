# Talora: client workspace for studios (portfolio demo)

A complete, end to end product demo: marketing site, auth, onboarding, the studio web app and a
client facing portal. Built with **Astro 5, Tailwind CSS v4, React 19 islands, zustand and lucide-react**.

It is a frontend demo: there is no backend. All data lives in a persisted store in the browser
(localStorage), so everything you click (create clients, send invoices, approve work, pay invoices,
chat, track time) really updates the app and survives a refresh. Use **Reset demo data** in the
account menu to start over.

## Run

```bash
npm install
npm run dev      # http://localhost:4321
npm run build    # static output in /dist (deploy anywhere: Vercel, Netlify, Cloudflare Pages)
npm run preview
```

## Pages

**Marketing**
| Route | Page |
| --- | --- |
| `/` | Landing page |
| `/pricing` | Plans, full comparison table, FAQ |
| `/about` | Story, values, team |
| `/changelog` | Release timeline |
| `/contact` | Contact form with validation |
| `/privacy`, `/terms` | Legal pages with sticky table of contents |
| `/404` | Not found page |

**Auth**
| Route | Page |
| --- | --- |
| `/login` | Sign in (any email works, or "Continue with demo account") |
| `/signup` | Create a workspace |
| `/forgot-password` | Reset flow with resend countdown |
| `/onboarding` | 4 step setup wizard (studio, brand colour, team invites, import) |

**Studio app** (`/app`)
| Route | Page |
| --- | --- |
| `/app` | Dashboard: KPIs, revenue chart, cash flow, projects, approvals, deadlines, activity |
| `/app/clients`, `/app/clients/view?id=` | Client list (table and cards) and client detail |
| `/app/projects`, `/app/projects/view?id=` | Kanban board (drag and drop) or list, plus project detail with tasks, milestones, files, discussion |
| `/app/timeline` | Gantt timeline with today marker and milestones |
| `/app/approvals` | Review queue with design previews and comments |
| `/app/invoices`, `/app/invoices/new`, `/app/invoices/view?id=` | Invoice list, builder with live preview, printable invoice |
| `/app/time` | Live timer, weekly timesheet, entries |
| `/app/reports` | Revenue, client, utilization and profitability reports, CSV export |
| `/app/briefs` | AI brief generator (simulated locally) that turns call notes into a scoped project |
| `/app/messages` | Client inbox with simulated replies |
| `/app/settings` | Profile, workspace and branding, team, billing, notifications, integrations |

Global: ⌘K / Ctrl+K search palette, notifications, quick create menu, running timer in the top bar.

**Client portal**
| Route | Page |
| --- | --- |
| `/portal?client=c1` | What the client sees: progress, approve or request changes, pay invoices (use the test card), files, messages. Actions show up in the studio app instantly. |

## Try this flow
1. Open `/app` and look around, then open **Client portal preview** in the sidebar.
2. In the portal, approve "Packaging round 2" and pay invoice DC-0142 with the test card.
3. Back in the studio app: the notification bell, Approvals and Invoices all reflect it.
4. Go to **AI Briefs**, click "Use sample notes", generate, then "Create project from brief".

## Structure
```
src/
  pages/            Astro routes (marketing, auth, /app, /portal)
  layouts/          Base (marketing), AppLayout (sidebar shell), AuthLayout, PortalLayout
  components/       Marketing components (Hero, SiteNav, Pricing, PageHero, ...)
  app/
    lib/            types.ts, seed.ts (mock data), store.ts (zustand), format.ts
    ui/             ui.tsx (design system), charts.tsx (SVG charts), domain widgets
    shell/          AppChrome (top bar, search palette, notifications)
    pages/          One React component per app page
    auth/, portal/  Auth flows and the client portal
  styles/global.css Tailwind theme tokens and utilities
```

## Notes
- Dark only design system: ink, cream and amber tokens; Manrope with Fraunces italic accents.
- Photos load from the Unsplash CDN with responsive srcset. If one fails, a warm gradient shows instead.
- Fully responsive (checked at 390px) and keyboard accessible.
