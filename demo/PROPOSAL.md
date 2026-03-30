# Proposal: Terminal UI + Infrastructure Modernization

## 1. Terminal-Themed UI Redesign

### Concept

Transform the site into an interactive terminal emulator that visitors can navigate
by typing commands **or** clicking highlighted links. The aesthetic targets tech-savvy
visitors while remaining fully usable for anyone via clickable hints and a help command.

**Live demo:** open `demo/terminal-ui.html` in a browser.

### Design Decisions

| Decision | Choice | Why |
|----------|--------|-----|
| Color palette | Gruvbox (dark default + light toggle) | Warm, high-contrast, well-known among terminal users |
| Font | JetBrains Mono | Free, ligature-friendly, excellent readability |
| Interaction | Real input + clickable hints | Tech folks type; everyone else clicks |
| Framework | Vanilla JS (~3 KB) | No build step, fast, Hugo-compatible |
| Responsiveness | Single-column terminal scales down | Works well on mobile — just a narrower "window" |

### Features in the Demo

- **`about`** — ASCII art banner + bio + social links
- **`projects`** — list all projects with tags
- **`project <slug>`** — detail view for a single project
- **`reading`** — reading log as an ASCII table
- **`social`** — contact links
- **`help`** — command reference
- **`theme`** — toggle light/dark
- **`clear`** / `Ctrl+L` — clear screen
- **Tab** autocomplete with hint dropdown
- **↑/↓** command history
- Clickable highlighted text runs commands for non-typers

### Implementation Plan for Hugo

The current Hugo theme (`hello-friend-ng`) would be replaced with a **custom theme**
that renders each Hugo page type into terminal-compatible output:

```
themes/terminal-portfolio/
├── layouts/
│   ├── _default/
│   │   ├── baseof.html       ← terminal window chrome
│   │   ├── single.html       ← "cat <page>" output
│   │   └── list.html         ← "ls <section>" output
│   ├── index.html            ← boot sequence + welcome
│   └── partials/
│       ├── head.html         ← meta, fonts, CSS
│       ├── prompt.html       ← iker@lissarrague.xyz:~$
│       ├── terminal.html     ← window wrapper
│       └── commands.js.html  ← JS with Hugo data injected
├── static/
│   └── css/
│       └── terminal.css      ← all styles from the demo
└── theme.toml
```

**Hugo generates a JSON data bundle** at build time (using a custom output format)
that the JS terminal reads. This keeps content in Markdown while rendering as
terminal commands:

```toml
# config.toml addition
[outputFormats.SiteData]
  mediaType = "application/json"
  baseName = "site-data"
  isPlainText = true

[outputs]
  home = ["HTML", "RSS", "SiteData"]
```

The HTML pages also work as static fallbacks (for SEO / JS-disabled visitors).

### Open Questions

- **Typing animation on boot?** — cool but potentially annoying on repeat visits;
  could store a "seen" flag in localStorage.
- **Sound effects?** — keystroke sounds? Probably too gimmicky. Skip unless you love it.
- **Embedded apps (mandelrust, toy-totp)?** — these can open in an "iframe pane"
  within the terminal window, or link out. The demo doesn't cover this yet.

---

## 2. Infrastructure: Move from Manual S3/CloudFront to IaC + Simpler Hosting

### Current State

- Manually provisioned S3 bucket
- CloudFront distribution (manual)
- Domain managed elsewhere
- No CI/CD in the repo (deploy.sh was removed)

### Options

| Option | Pros | Cons |
|--------|------|------|
| **A. GitHub Pages** | Free, zero-config CI via Actions, HTTPS included, custom domain support | No edge functions, limited headers control |
| **B. Cloudflare Pages** | Free, global CDN, custom domain + DNS in one place, build previews, edge functions | Vendor lock-in to Cloudflare |
| **C. Terraform (S3+CloudFront)** | Full control, keeps current architecture, IaC | More complex, AWS costs (minimal), you maintain the infra |
| **D. AWS CDK** | Same as C but in TypeScript/Python | Same as C + CDK overhead |

### Recommendation: **Cloudflare Pages** (Option B) or **GitHub Pages** (Option A)

Both eliminate manual infrastructure entirely. Here's the breakdown:

#### Option A — GitHub Pages (simplest)

```
┌─────────────┐      ┌──────────────┐      ┌────────────┐
│  git push    │─────▶│ GitHub       │─────▶│ GitHub     │
│  to main     │      │ Actions      │      │ Pages CDN  │
│              │      │ (hugo build) │      │            │
└─────────────┘      └──────────────┘      └────────────┘
                                                 │
                                           lissarrague.xyz
```

**What you need:**

1. `.github/workflows/deploy.yml` — builds Hugo, deploys to `gh-pages` branch
2. Configure custom domain in repo settings
3. DNS: CNAME `lissarrague.xyz` → `ikerlb.github.io`
4. Delete old S3 bucket + CloudFront distribution

**GitHub Actions workflow:**

```yaml
name: Deploy
on:
  push:
    branches: [master]

jobs:
  deploy:
    runs-on: ubuntu-latest
    permissions:
      pages: write
      id-token: write
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - uses: actions/checkout@v4
        with:
          submodules: true
      - name: Setup Hugo
        uses: peaceiris/actions-hugo@v3
        with:
          hugo-version: '0.154.2'
      - name: Build
        run: hugo --minify
      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: ./public
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

#### Option B — Cloudflare Pages (recommended if you want more control)

```
┌─────────────┐      ┌──────────────┐      ┌────────────────┐
│  git push    │─────▶│ Cloudflare   │─────▶│ Cloudflare     │
│  to main     │      │ Build        │      │ Edge Network   │
│              │      │ (hugo build) │      │ (290+ cities)  │
└─────────────┘      └──────────────┘      └────────────────┘
                                                   │
                                             lissarrague.xyz
```

**What you need:**

1. Connect repo to Cloudflare Pages (UI or Wrangler CLI)
2. Build command: `hugo --minify`
3. Build output: `public/`
4. Transfer domain nameservers to Cloudflare (or add CNAME)
5. Delete old S3 bucket + CloudFront distribution

**Cloudflare extras you get for free:**
- Branch preview deployments (every PR gets a URL)
- Web analytics (replace Google Analytics)
- Custom headers / redirects via `_headers` / `_redirects` files
- Edge functions if you ever need server-side logic

#### Option C — Terraform (if you want to keep AWS)

```
infra/
├── main.tf
├── variables.tf
├── outputs.tf
└── modules/
    ├── s3-website/
    │   └── main.tf       ← bucket + policy + website config
    ├── cloudfront/
    │   └── main.tf       ← distribution + OAI + cache policy
    └── acm-cert/
        └── main.tf       ← TLS certificate
```

This codifies your existing setup but doesn't simplify it. I'd only recommend this
if you specifically want to keep the AWS stack for learning/portfolio reasons.

---

## 3. Summary of Work Items

### Phase 1 — Terminal UI (can start now)
- [ ] Create custom Hugo theme with terminal chrome
- [ ] Port demo CSS/JS into Hugo theme
- [ ] Build Hugo JSON output format for site data
- [ ] Implement all commands (about, projects, reading, social, help, theme, clear)
- [ ] Handle embedded apps (mandelrust, toy-totp) — iframe or link-out
- [ ] Static HTML fallback for SEO/accessibility
- [ ] Test responsive behavior on mobile
- [ ] Light/dark mode persistence (localStorage)

### Phase 2 — Infrastructure
- [ ] Choose hosting platform (GitHub Pages vs Cloudflare Pages)
- [ ] Set up CI/CD workflow
- [ ] Configure custom domain + HTTPS
- [ ] Migrate DNS if needed
- [ ] Decommission old S3 bucket + CloudFront
- [ ] Remove `public/` from git (let CI build it)

### Phase 3 — Polish
- [ ] Transition animation / boot sequence
- [ ] 404 page as "command not found"
- [ ] `sitemap.xml` + meta tags for SEO
- [ ] OpenGraph tags for social sharing
- [ ] Lighthouse audit & performance tuning
