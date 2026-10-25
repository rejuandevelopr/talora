# Talora

**A dark, premium SaaS concept for creative studios.** Marketing site, onboarding, studio dashboard and a client portal, designed and built end to end.

**Live demo:** [talora-studio.vercel.app](https://talora-studio.vercel.app)

| Try it | Link |
| --- | --- |
| Marketing site | [talora-studio.vercel.app](https://talora-studio.vercel.app) |
| Studio app | [talora-studio.vercel.app/app](https://talora-studio.vercel.app/app) |
| Client portal | [talora-studio.vercel.app/portal?client=c1](https://talora-studio.vercel.app/portal?client=c1) |

![Astro](https://img.shields.io/badge/Astro-5-ff5d01?logo=astro&logoColor=white)
![React](https://img.shields.io/badge/React-19-61dafb?logo=react&logoColor=black)
![TypeScript](https://img.shields.io/badge/TypeScript-5-3178c6?logo=typescript&logoColor=white)
![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-4-38bdf8?logo=tailwindcss&logoColor=white)
![Deployed on Vercel](https://img.shields.io/badge/Deployed_on-Vercel-000?logo=vercel&logoColor=white)

---

## About the project

Talora is a concept product: a client workspace for design studios and agencies. It brings clients, projects, approvals, invoices and time tracking into one calm place, plus a branded portal where clients review work and pay.

Most SaaS portfolio pieces stop at the landing page. This one covers the full journey across **27 connected pages**, from the first visit to a working product.

It is a frontend demo with no backend. All data lives in a persisted store in the browser, so everything you click really updates the app and survives a refresh. Every visitor gets their own copy of the demo data. Use **Reset demo data** in the account menu to start over.

## A 60 second tour

1. Open the [studio app](https://talora-studio.vercel.app/app) and look around the dashboard.
2. Press **Ctrl+K** (or **⌘K**) and search for "kiln".
3. Open **Client portal preview** from the sidebar.
4. In the portal, approve "Packaging round 2", then pay invoice DC-0142 with the test card.
5. Go back to the studio app. The notification bell, Approvals and Invoices all reflect it instantly.
6. Open **AI Briefs**, click "Use sample notes", generate a brief, then "Create project from brief".

## Features

**Marketing site**
- Landing page with auto-playing product walkthrough and interactive feature tabs
- Pricing with a monthly and yearly toggle, full plan comparison table and FAQ
- About, changelog, contact form with validation, privacy, terms and a custom 404

**Sign up and onboarding**
- Login, signup with password strength meter, password reset
- 4 step onboarding: studio details, brand colour with live portal preview, team invites, data import

**Studio app**
- Dashboard with revenue chart, cash flow, active projects, approvals and deadlines
- Clients with table and card views, plus detailed client pages
- Projects on a drag and drop board or list, with tasks, milestones, files and discussion
- Timeline view with milestones and a today marker
- Design approvals with previews, versions and comments
- Invoice builder with a live preview, plus a printable invoice
- Time tracker with a live timer and weekly timesheet
- Reports with revenue, utilization and profitability, plus CSV export
- AI brief generator that turns call notes into a scoped project (simulated locally)
- Client messaging with simulated replies
- Settings for profile, workspace branding, team, billing, notifications and integrations
- Global search palette, notifications and quick create menu

**Client portal**
- Project progress and milestones
- Approve designs or request changes
- Pay invoices with a test card
- Shared files and messages with the studio

## Tech stack

| Area | Choice |
| --- | --- |
| Framework | Astro 5 (static pages, React islands only where needed) |
| UI | React 19, Tailwind CSS v4 with custom design tokens |
| State | Zustand, persisted to localStorage |
| Language | TypeScript |
| Charts | Custom SVG components, no chart library |
| Icons | lucide-react |
| Fonts | Manrope and Fraunces, self hosted |
| Hosting | Vercel |

## Run locally

Requires Node.js 18 or newer.

```bash
git clone https://github.com/rejuandevelopr/talora.git
cd talora
npm install
npm run dev      # http://localhost:4321
```

Other commands:

```bash
npm run build    # static output in /dist
npm run preview  # preview the production build
```

## Deploy

This is a fully static site, so it deploys anywhere. On Vercel, import the repository and click Deploy. Vercel detects Astro automatically and redeploys on every push to `main`.

## Project structure

```
src/
  pages/            Routes: marketing, auth, /app and /portal
  layouts/          Base (marketing), AppLayout (sidebar shell), AuthLayout, PortalLayout
  components/       Marketing components (Hero, SiteNav, Pricing, PageHero, ...)
  app/
    lib/            types.ts, seed.ts (mock data), store.ts (zustand), format.ts
    ui/             ui.tsx (design system), charts.tsx (SVG charts), domain widgets
    shell/          AppChrome (top bar, search palette, notifications)
    pages/          One React component per app page
    auth/           Login, signup, password reset, onboarding
    portal/         The client portal
  styles/global.css Tailwind theme tokens and utilities
```

## Credits

- Landing page layout inspired by the Nexora concept design. All branding, copy and the remaining product screens are original.
- Photography from [Unsplash](https://unsplash.com).
- Talora, its customers and all people shown are fictional.

## Author

Designed and built by **S.M. Rejuanul Islam**, Full Stack AI Engineer.

- Portfolio: [rejuandeveloper.com](https://rejuandeveloper.com)
- Contra: [contra.com/rejuanul_islam](https://contra.com/rejuanul_islam)
- LinkedIn: [s-m-rejuanul-islam](https://www.linkedin.com/in/s-m-rejuanul-islam-082a90252)
- Book a call: [cal.com/s.m.rejuanul-islam-cvqtpm](https://cal.com/s.m.rejuanul-islam-cvqtpm)