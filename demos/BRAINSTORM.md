# lissarrague.xyz - Brainstorm: Terminal Redesign + Infrastructure

## 1. Infrastructure: Moving Away from Manual S3/CloudFront

### Current State
- Manually provisioned S3 bucket + CloudFront distribution
- Domain managed externally
- Hugo static site generator builds to `public/`
- No CI/CD pipeline, no Infrastructure as Code

### Options

#### Option A: GitHub Pages (Simplest)
**Effort: Low | Cost: Free**

- Hugo has first-class GitHub Pages support via GitHub Actions
- No AWS infra to manage at all
- Custom domain supported (CNAME + DNS)
- HTTPS via Let's Encrypt (automatic)
- Build on push via GitHub Actions

**Components needed:**
1. `.github/workflows/deploy.yml` - GitHub Actions workflow that runs Hugo build and deploys to `gh-pages` branch
2. `CNAME` file in `static/` with `lissarrague.xyz`
3. DNS: Point domain to GitHub Pages IPs (A records) or CNAME to `ikerlb.github.io`

**Tradeoffs:**
- (+) Zero infrastructure to manage
- (+) Free
- (+) Built-in CDN
- (-) Less control over caching/headers
- (-) No server-side redirects

#### Option B: Netlify / Vercel (Easy + Powerful)
**Effort: Low | Cost: Free tier**

- Auto-deploys from GitHub on push
- Preview deploys for PRs
- Custom domain + HTTPS
- Netlify: `netlify.toml` config; Vercel: `vercel.json`

**Components needed:**
1. `netlify.toml` or `vercel.json` - build config (`hugo` command, publish dir)
2. DNS: Point domain to Netlify/Vercel nameservers or CNAME

**Tradeoffs:**
- (+) Deploy previews on PRs
- (+) Instant rollbacks
- (+) Edge functions if needed later
- (-) Vendor-specific config
- (-) Free tier has bandwidth limits (generous though)

#### Option C: Terraform for AWS (Codify Existing Setup)
**Effort: Medium | Cost: ~$1-2/month**

- Codify the existing S3 + CloudFront setup
- Add CI/CD via GitHub Actions for deploy

**Components needed:**
1. `infra/main.tf` - S3 bucket, CloudFront distribution, ACM certificate, Route53 (or external DNS docs)
2. `infra/variables.tf` - domain name, region, etc.
3. `infra/outputs.tf` - CloudFront URL, S3 bucket name
4. `.github/workflows/deploy.yml` - Build Hugo + sync to S3 + invalidate CloudFront
5. AWS IAM user/role for CI/CD with minimal permissions
6. State backend (S3 bucket for `.tfstate`)

**Tradeoffs:**
- (+) Full control
- (+) Reproducible infrastructure
- (-) More moving parts
- (-) AWS costs (minimal but nonzero)
- (-) Need to manage Terraform state

#### Recommendation
**Option A (GitHub Pages)** unless you need something specific from AWS. It eliminates all infrastructure management and Hugo+GitHub Pages is a well-trodden path. You can always move to Option C later if needs grow.

---

## 2. Terminal UI Redesign

### Concept
Transform the site into a terminal emulator that feels authentic to developers but remains accessible to everyone through clickable hints and intuitive navigation.

### Live Demo
See `demos/terminal-ui/index.html` - open it in a browser to interact with the prototype.

### Design Principles
1. **Terminal-first, not terminal-only** - looks like a terminal, but everything is clickable
2. **Progressive disclosure** - hint bar shows available commands; `help` lists everything
3. **Familiar metaphors** - `cd`, `ls`, `open` for devs; click/tap for everyone else
4. **Dark/light toggle** - Tokyo Night color palette (both modes)
5. **Responsive** - works on mobile; hint bar wraps; font scales

### Architecture: How to Integrate with Hugo

There are two approaches:

#### Approach A: Hugo Generates JSON, JS Renders (Recommended)
Hugo builds structured JSON data from markdown content. The terminal JS loads and renders it.

**How it works:**
1. Hugo outputs a `content.json` file using a custom output format
2. Terminal JS fetches `content.json` on load
3. Commands map to JSON keys; content renders as terminal output
4. Blog posts render as scrollable "cat" output

**Files needed:**
```
layouts/
  _default/
    index.json.json    # JSON output template
  index.html           # Single-page terminal shell
static/
  css/terminal.css
  js/terminal.js
config.toml            # Add JSON output format
```

**config.toml additions:**
```toml
[outputs]
  home = ["HTML", "JSON"]

[outputFormats.JSON]
  mediaType = "application/json"
  baseName = "content"
```

**Tradeoffs:**
- (+) Content still managed as Hugo markdown
- (+) Single page load, snappy navigation
- (+) Hugo handles content pipeline (dates, sorting, taxonomies)
- (-) SEO: need `<noscript>` fallback or server-side rendering of meta tags
- (-) More complex Hugo templates

#### Approach B: Hugo Generates Multiple HTML Pages, Terminal is Visual Only
Keep Hugo's multi-page output. Each page has the terminal chrome. "Navigation" is actually page transitions with a typing animation.

**How it works:**
1. Each page is a full HTML page with terminal UI wrapper
2. Page transitions are normal link navigations
3. On load, content "types in" with animation
4. Commands in the input just navigate to the corresponding page URL

**Tradeoffs:**
- (+) Better SEO (each page has full HTML)
- (+) Simpler JS
- (+) Works without JavaScript (content is in the HTML)
- (-) Page reloads break the terminal illusion
- (-) Less "authentic" terminal feel

#### Recommendation
**Approach A** gives the most authentic experience. SEO can be handled with proper `<meta>` tags and a `<noscript>` section. The JSON output format is a native Hugo feature.

### UI Components Breakdown

| Component | Description | Complexity |
|-----------|-------------|------------|
| Terminal chrome | Title bar with traffic light buttons, window shadow | CSS only |
| Input line | Prompt + text input + blinking cursor | HTML + JS |
| Command parser | Maps typed commands to content | JS |
| Content renderer | Displays text, links, listings | JS + HTML |
| Hint bar | Clickable command buttons below terminal | HTML + CSS |
| Theme toggle | Dark/light mode via CSS variables | CSS + JS |
| ASCII banner | Name/logo as ASCII art on welcome | CSS |
| History | Up/down arrow command history | JS |
| Responsive layout | Mobile-friendly terminal | CSS |
| Tab completion | Auto-complete commands/project names | JS (nice-to-have) |
| Typing animation | Content appears character by character | JS (nice-to-have) |

### Color Palette (Tokyo Night)

**Dark mode:**
- Background: `#1a1b26`
- Foreground: `#a9b1d6`
- Accent (blue): `#7aa2f7`
- Green: `#9ece6a`
- Yellow: `#e0af68`
- Red: `#f7768e`
- Purple: `#bb9af7`

**Light mode:**
- Background: `#f5f5f5`
- Foreground: `#343b58`
- Accent (blue): `#34548a`
- Green: `#485e30`

---

## 3. Suggested Implementation Roadmap

### Phase 1: Terminal UI Prototype (This PR)
- [x] Static HTML/CSS/JS demo of terminal UI
- [ ] Gather feedback on look and feel

### Phase 2: Hugo Integration
- [ ] Create custom Hugo layout (`layouts/index.html`) with terminal shell
- [ ] Add JSON output format for content
- [ ] Write `terminal.js` that loads Hugo-generated JSON
- [ ] Port all content rendering (projects list, reading log, about, contact)
- [ ] SEO: `<meta>` tags, `<noscript>` fallback, Open Graph

### Phase 3: Infrastructure
- [ ] Set up GitHub Actions workflow for Hugo build
- [ ] Configure GitHub Pages (or Netlify) deployment
- [ ] DNS cutover from CloudFront to new hosting
- [ ] Decommission old S3/CloudFront setup

### Phase 4: Polish
- [ ] Tab completion for commands
- [ ] Typing animation (subtle, fast)
- [ ] Mobile testing and refinements
- [ ] Analytics integration
- [ ] 404 page as "command not found"
