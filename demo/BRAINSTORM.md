# lissarrague.xyz Redesign Brainstorm

## 1. Terminal Visual Redesign

**Demo**: Open `terminal-theme.html` in a browser to see the proposed look.

### Design Principles

- **Looks like a terminal, navigates like a website.** All content is
  accessible via normal links, scrolling, and keyboard navigation. No one needs
  to type commands.
- **Catppuccin Mocha color palette** — dark background, high-contrast pastel
  accents. Comfortable for long reading sessions.
- **Monospace everywhere** — JetBrains Mono / Fira Code with fallbacks.
- **Prompt-driven sections** — each content block is introduced by a fake shell
  prompt (`iker@lissarrague.xyz:~/projects$ ls -la`) that frames the content
  in a terminal metaphor.

### Key Visual Components

| Component | Description |
|-----------|-------------|
| **Window chrome** | macOS-style title bar with traffic light dots and a path in the center |
| **ASCII art name** | Figlet-style name rendered on the home page |
| **Shell prompts** | `user@host:path$` prefix before each content section |
| **Blinking cursor** | CSS-only cursor at the bottom of each page |
| **`ls -la` project table** | Projects listed as files with type, date, name, description columns |
| **Code blocks** | Syntax-highlighted with the Catppuccin palette |
| **Book entries** | Left-bordered cards with hover accent |
| **Social links** | Pill-shaped bordered links |

### Hugo Implementation Plan

The current `hello-friend-ng` theme directory is empty — the theme is likely
installed as a git submodule or copied into `resources/`. To implement the
terminal theme:

1. **Create a custom Hugo theme** at `themes/terminal-portfolio/`:
   ```
   themes/terminal-portfolio/
   ├── layouts/
   │   ├── _default/
   │   │   ├── baseof.html       # Window chrome wrapper
   │   │   ├── single.html       # Project detail / blog post
   │   │   └── list.html         # Project listing / blog index
   │   ├── index.html            # Home page (whoami + ls)
   │   └── partials/
   │       ├── prompt.html       # Reusable prompt component
   │       ├── head.html         # Meta tags, fonts, CSS
   │       ├── titlebar.html     # Terminal window title bar
   │       └── ascii-header.html # ASCII art name
   ├── static/
   │   └── fonts/                # JetBrains Mono / Fira Code
   └── assets/
       └── css/
           └── terminal.css      # Single stylesheet (all from the demo)
   ```

2. **Update `config.toml`** to point to the new theme:
   ```toml
   theme = "terminal-portfolio"
   ```

3. **Content stays untouched** — all Markdown files work as-is. The theme
   handles all visual transformation.

### Accessibility Considerations

- All interactive elements are proper `<a>` and `<button>` tags
- `:focus-visible` outlines on all links
- WCAG AA contrast ratios (Catppuccin Mocha meets this)
- Semantic HTML (`<nav>`, `<main>`, `<article>`) under the visual layer
- No content hidden behind JS — works with JS disabled (except typing animations)
- Responsive down to 320px width

### Optional Enhancements (future)

- **Command palette**: `Ctrl+K` opens a fuzzy-finder to jump between pages
- **Typing animations**: Subtle type-in effect on page load (skippable)
- **Theme toggle**: Switch between Catppuccin Mocha (dark) and Latte (light)
- **CRT scanline effect**: Subtle CSS overlay, toggleable
- **Easter egg**: Actual working terminal input for a few commands (`help`,
  `ls`, `cat README.md`)

---

## 2. Infrastructure: Moving Away from Manual S3 + CloudFront

### Current State

- Hugo static site, built locally
- Manually provisioned S3 bucket + CloudFront distribution
- Domain managed elsewhere (likely Route53 or an external registrar)
- No CI/CD pipeline
- No infrastructure-as-code

### Options Comparison

| Approach | Effort | Cost | Complexity | DNS Change? |
|----------|--------|------|------------|-------------|
| **A. GitHub Pages + Actions** | Low | Free | Minimal | Yes (CNAME) |
| **B. Cloudflare Pages** | Low | Free | Minimal | Yes (if moving DNS) |
| **C. Terraform (keep AWS)** | Medium | ~$1/mo | Medium | No |
| **D. AWS CDK** | Medium | ~$1/mo | Medium-High | No |

### Option A: GitHub Pages + GitHub Actions (Recommended)

**Why**: Simplest. Free. The repo is already on GitHub. Zero infra to manage.

```
┌──────────┐     git push     ┌──────────────┐     build     ┌──────────────┐
│  Author  │ ───────────────> │    GitHub     │ ────────────> │ GitHub Pages │
│  (you)   │                  │   Actions     │   hugo build  │   (CDN)      │
└──────────┘                  └──────────────┘               └──────────────┘
                                                                     │
                                                              CNAME record
                                                                     │
                                                            lissarrague.xyz
```

**What you need:**
1. A GitHub Actions workflow (`.github/workflows/deploy.yml`):
   ```yaml
   name: Deploy
   on:
     push:
       branches: [main]
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
         - uses: peaceiris/actions-hugo@v3
           with:
             hugo-version: '0.154.2'
         - run: hugo --minify
         - uses: actions/upload-pages-artifact@v3
           with:
             path: ./public
         - id: deployment
           uses: actions/deploy-pages@v4
   ```

2. Enable GitHub Pages in repo settings (source: GitHub Actions)

3. Add a CNAME record pointing `lissarrague.xyz` to `ikerlb.github.io`

4. Delete S3 bucket + CloudFront distribution once DNS propagates

**Tradeoffs:**
- (+) Zero cost, zero infra maintenance
- (+) Automatic HTTPS via GitHub
- (+) Deploy on every push, no manual step
- (-) Less control over CDN behavior (cache headers, redirects)
- (-) GitHub Pages has a soft 100GB/month bandwidth limit (irrelevant for a
  personal site)

### Option B: Cloudflare Pages

Same simplicity as GitHub Pages but with Cloudflare's CDN (faster edge
network, more control over caching/redirects).

**What you need:**
1. Connect the GitHub repo to Cloudflare Pages (UI wizard)
2. Build command: `hugo --minify`, output dir: `public`
3. Add custom domain in Cloudflare Pages settings
4. Move DNS to Cloudflare (free plan) or add CNAME

**Tradeoffs:**
- (+) Fastest CDN, unlimited bandwidth (free tier)
- (+) Built-in analytics, redirects, headers config
- (+) Preview deployments for branches
- (-) Requires Cloudflare account
- (-) If DNS isn't on Cloudflare, slightly more config

### Option C: Terraform (Codify Existing AWS)

Keep S3 + CloudFront but manage it as code. Since you've already read the
Terraform book, this is a natural fit if you want to stay on AWS.

**What you need:**
```
infra/
├── main.tf          # Provider, backend
├── s3.tf            # Bucket, policy, website config
├── cloudfront.tf    # Distribution, OAC, cache behavior
├── acm.tf           # SSL certificate (us-east-1)
├── outputs.tf       # CloudFront URL, bucket name
└── variables.tf     # Domain name, etc.
```

Plus a GitHub Actions workflow that runs `hugo build` and `aws s3 sync`.

**Tradeoffs:**
- (+) Full control over CDN, caching, headers
- (+) IaC — reproducible, versionable
- (-) More moving parts (ACM cert, OAC, bucket policy)
- (-) AWS costs (~$0.50-1/mo for a personal site)
- (-) More maintenance burden than hosted solutions

### Option D: AWS CDK

Same as Terraform but using TypeScript/Python. You already have CDK
experience (mandelrust project).

**Tradeoffs:** Same as C, but trades HCL for a general-purpose language.
Overkill for a static site, better suited for the Lambda-backed projects
you already have.

---

### Recommendation

**Go with GitHub Pages + Actions (Option A)** unless you have a specific need
for AWS CDN features. It eliminates all infrastructure, costs nothing, and
deploys automatically. You can always move to Cloudflare Pages later if you
need more CDN control.

For the terminal theme, build it as a custom Hugo theme so your content
Markdown files stay untouched. The demo HTML shows the exact visual direction.
