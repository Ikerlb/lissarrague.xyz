# Redesign Proposal: lissarrague.xyz

## 1. Terminal-Themed UI

### Demo

Open `terminal-theme.html` in a browser to see the working prototype.

### Design Principles

- **Looks like a terminal, works like a website.** All navigation is
  point-and-click — no one needs to type commands. But the aesthetic
  (monospace font, prompt lines, command metaphors) signals "this person
  lives in the terminal."
- **Accessible by default.** Semantic HTML, keyboard-navigable, readable
  contrast ratios, responsive down to 320px.
- **Multiple color schemes.** Tokyo Night (default), green phosphor, amber
  CRT, and a light mode. Stored in CSS variables — trivial to add more.

### Components in the Demo

| Element | What it does |
|---|---|
| Title bar | macOS-style window chrome with dots, hostname, theme toggle |
| Prompt line | `iker@lissarrague:~$` — updates path & command per section |
| Nav tabs | Clickable links styled as `> about`, `> projects`, etc. |
| Content sections | Rendered as "command output" below the prompt |
| Project cards | Left-bordered cards with name, description, tags |
| Reading log | Year-grouped book list with notes |
| Blog listing | Date + title rows |
| Help page | Explains how to navigate; hosts the color scheme picker |
| Blinking cursor | Bottom of page — cosmetic terminal feel |

### What's Needed to Implement

To apply this to the actual Hugo site:

1. **New Hugo theme.** Replace `hello-friend-ng` with a custom theme that
   uses the HTML/CSS/JS structure from the demo. The theme would consist of:
   - `layouts/_default/baseof.html` — terminal window shell
   - `layouts/index.html` — about page
   - `layouts/_default/list.html` — projects index, blog listing
   - `layouts/_default/single.html` — individual post/project
   - `static/css/terminal.css` — all styles (extracted from the demo)
   - `static/js/terminal.js` — navigation, scheme switching, cursor
   - `static/favicon.svg` — reuse existing

2. **Content stays the same.** All Markdown files are untouched. The theme
   handles presentation.

3. **Estimated effort:** ~1-2 days for the full Hugo theme. The demo already
   has 90% of the CSS/JS. The main work is writing Hugo templates.

---

## 2. Infrastructure

### Current State
- Manually provisioned S3 bucket
- CloudFront distribution in front of it
- Domain managed elsewhere
- No infrastructure-as-code in this repo
- `deploy.sh` was removed — deployment method unclear

### Options

#### Option A: Cloudflare Pages (Recommended)

**Why:** Eliminates all infrastructure management. You push to `main`, it
builds and deploys. Free tier covers everything a personal site needs.

| Feature | Details |
|---|---|
| Build | Hugo build runs on push (zero config for Hugo) |
| CDN | Cloudflare's global edge network (200+ cities) |
| SSL | Automatic, free |
| Custom domain | Point `lissarrague.xyz` DNS to Cloudflare |
| Preview deploys | Every PR gets a unique URL |
| Cost | Free (unlimited bandwidth, 500 builds/month) |
| Rollback | One-click to any previous deploy |

**Setup steps:**
1. Connect GitHub repo to Cloudflare Pages
2. Set build command: `hugo --minify`
3. Set output directory: `public`
4. Add custom domain in Cloudflare dashboard
5. Update DNS (if domain is elsewhere, either transfer to Cloudflare or
   point CNAME)

**Tradeoff:** You give up fine-grained AWS control. For a static portfolio
site, that control isn't buying you anything.

#### Option B: GitHub Pages + GitHub Actions

**Why:** Everything stays in GitHub. Free, simple, well-understood.

| Feature | Details |
|---|---|
| Build | GitHub Actions workflow runs Hugo on push |
| CDN | GitHub's CDN (Fastly-backed) |
| SSL | Automatic via Let's Encrypt |
| Custom domain | Supported with CNAME file |
| Preview deploys | Not built-in (needs extra workflow) |
| Cost | Free |
| Rollback | Re-run a previous workflow |

**Setup steps:**
1. Add `.github/workflows/deploy.yml` with Hugo build + deploy action
2. Enable GitHub Pages in repo settings (source: GitHub Actions)
3. Add custom domain in settings + DNS CNAME

**Tradeoff:** No preview deploys per-PR without extra setup. Slightly less
flexible than Cloudflare Pages.

#### Option C: Terraform + AWS (S3 + CloudFront)

**Why:** Codify what you already have. Full control, familiar tools.

| Feature | Details |
|---|---|
| Build | GitHub Actions (or local) Hugo build, then `aws s3 sync` |
| CDN | CloudFront |
| SSL | ACM certificate |
| Custom domain | Route 53 or external DNS |
| Preview deploys | Would need extra infra per branch |
| Cost | ~$0.50-1/month (S3 + CloudFront at low traffic) |
| Rollback | Redeploy previous build artifact |

**Terraform resources needed:**
- `aws_s3_bucket` + policy
- `aws_cloudfront_distribution`
- `aws_cloudfront_origin_access_identity`
- `aws_acm_certificate` + validation
- `aws_route53_record` (if using Route 53)
- GitHub Actions workflow for build + deploy

**Tradeoff:** Most complex option for a static site. Makes sense if you want
to keep the AWS muscle memory or bundle it with other infra (like the
Mandelrust Lambda).

### Recommendation

**Go with Cloudflare Pages** unless you have a specific reason to stay on
AWS. It eliminates the S3 bucket, CloudFront distribution, SSL cert
management, and deploy scripts — all replaced by "push to main." The free
tier is generous enough that cost is zero.

If you want the AWS IaC route (Option C), I can write the full Terraform
module + GitHub Actions workflow. But I'd argue that's over-engineering for a
portfolio site.

---

## Summary of Work

| Task | Effort | Priority |
|---|---|---|
| Custom Hugo theme (terminal UI) | 1-2 days | P0 |
| Migrate hosting to Cloudflare Pages | 1 hour | P0 |
| Transfer/update DNS | 30 min | P0 |
| (Optional) Terraform for AWS | 2-3 hours | P2 |
| (Optional) GitHub Actions CI | 1 hour | P1 |
