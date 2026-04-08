# lissarrague.xyz — redesign brainstorm

Two independent tracks live in this folder:

1. **Infra** — get the site (currently a hand-built S3 + CloudFront setup) into something
   reproducible and boring to operate.
2. **Terminal UI** — replace the hello-friend-ng theme with a terminal-styled
   experience that delights the tech crowd while staying navigable for everyone else.

The two tracks are deliberately decoupled. You can pick one direction per track and
they won't fight each other.

---

## Track 1 — Infrastructure

### Where we are today

- A manually-provisioned S3 bucket holds the built Hugo site.
- CloudFront sits in front for TLS + caching.
- DNS is managed elsewhere (Cloudflare? Namecheap? — externally either way).
- Deploys used to run via a `deploy.sh` (already removed in `8692107`).
- There's no CI: pushes to `main` don't actually publish anything.

Pain points:
- The bucket and distribution exist as snowflakes — no way to recreate them.
- Cache invalidations are manual.
- AWS costs ~something even for a low-traffic site.
- No preview environments for PRs.

### Option A — Terraform + GitHub Actions (own the AWS stack)

Best if you want to keep the site on AWS and have everything codified. You stay in
control, you just stop clicking around in the console.

Components:

| Resource | Purpose |
|---|---|
| `aws_s3_bucket` | Site bucket, private (no website hosting) |
| `aws_cloudfront_origin_access_control` | OAC so only CloudFront can read S3 |
| `aws_cloudfront_distribution` | TLS, caching, custom domain alias |
| `aws_acm_certificate` (us-east-1) | TLS cert for the apex + www |
| `aws_s3_bucket_policy` | Grant CloudFront OAC read access |
| (optional) `aws_route53_*` | Only if you migrate DNS to Route53 |
| `aws_iam_openid_connect_provider` + role | Keyless deploys from GitHub Actions (OIDC) |

A skeleton lives in [`infra/terraform/`](./infra/terraform/main.tf) — it's not
ready to `apply`, it's there to make the moving pieces concrete.

CI/CD (`.github/workflows/deploy.yml`):
1. Checkout
2. Install Hugo (pinned version)
3. `hugo --minify`
4. Assume the OIDC role
5. `aws s3 sync public/ s3://… --delete`
6. `aws cloudfront create-invalidation --paths "/*"` (or be smarter and only
   invalidate paths whose hashes changed)

A starter workflow lives in [`infra/github-actions/deploy.yml`](./infra/github-actions/deploy.yml).

**Pros**
- You own the stack end-to-end. No vendor surprises.
- Easy to add things (lambda@edge, WAF, custom headers) later.
- Reproducible — `terraform destroy` and `terraform apply` get you back.

**Cons**
- More moving parts to maintain.
- Still need an AWS account and to keep an eye on the bill.
- ACM in us-east-1 + everything else in your region is the usual annoyance.

### Option B — Cloudflare Pages (delete the AWS stack)

Best if you'd rather make the infra disappear entirely. For a Hugo blog with low
traffic this is genuinely the lowest-effort option.

How it works:
- Connect the `Ikerlb/lissarrague.xyz` repo to Cloudflare Pages.
- Build command: `hugo --minify` (Cloudflare's build image already has Hugo).
- Output directory: `public`.
- Add the custom domain — if DNS is already on Cloudflare, this is one click.
- Free tier is more than enough.

Bonus: you get **automatic preview deployments per PR**, which would make
reviewing the terminal UI redesign much nicer.

**Pros**
- ~Zero infra to maintain.
- Free, generous limits.
- Automatic PR previews at unique URLs.
- Free, automatic SSL.

**Cons**
- Vendor lock-in (mitigated: it's just a static site, you can leave any time).
- Less control over edge behavior (still possible via Cloudflare Workers).

### Option C — GitHub Pages

Free, GitHub-native, painless. Set up a GitHub Actions workflow that builds Hugo
and pushes to `gh-pages`. The trade-off vs. Cloudflare Pages is no PR previews
out of the box and slightly less flexible custom-domain handling. Mentioned for
completeness.

### Recommendation

- **If you want to keep learning AWS / Terraform:** Option A.
- **If you want the infra to disappear:** Option B. For a personal Hugo site,
  this is the right answer 9 times out of 10.

A reasonable compromise: do **Option B** now (instant relief) and keep the
Terraform sketch around in case you ever want to migrate back.

---

## Track 2 — Terminal UI

### Goals

1. Look and feel like a terminal — opinionated, monospaced, aware of its own theme.
2. Navigable by anyone — a non-technical visitor should never feel stuck because
   they don't know `cd`.
3. Still a Hugo site — don't throw away the content pipeline (markdown → pages,
   tags, RSS, etc).

### Three flavors to choose from

#### Flavor 1 — "Terminal skin"

The cheapest option: keep the existing layout, restyle it.

- New CSS only: monospace font, terminal palette, ASCII rules instead of
  borders, prompt-style headings (`$ projects`).
- No JS. No new templates.
- Accessibility unchanged from today.

Best if the goal is "looks like a terminal" but you don't actually want fake
shell semantics.

#### Flavor 2 — "Fake shell, real site"  ← **recommended**

A real terminal-window UI that hosts the Hugo content, with a *prompt that
actually accepts commands* but also a normal nav bar so non-tech users can
just click. This is the hybrid that makes both audiences happy.

What's in the viewport:
- **Window chrome** — title bar with the three traffic-light dots, title
  `iker@lissarrague: ~`. Pure decoration.
- **Persistent nav** — `[ about ] [ projects ] [ reading_log ] [ contact ]`
  rendered as plain links. This is the "anyone can use it" escape hatch.
- **Output area** — the rendered content of the current page, styled like
  shell output. Markdown still flows through Hugo, so no content changes.
- **Prompt line** — `iker@lissarrague:~$ ▌` with a real text input. Power
  users can type `ls`, `cat about.md`, `cd projects`, `help`, `theme amber`,
  `open github`, etc.

Commands (initial set):

| Command | Behavior |
|---|---|
| `help` | List available commands |
| `ls [path]` | List directory (mapped to Hugo sections) |
| `cd <path>` | Navigate (changes the URL via History API) |
| `pwd` | Print current path |
| `cat <file>` | Render a content file inline |
| `clear` | Clear the output area |
| `whoami` | Returns `iker` plus the about blurb |
| `history` | Show previous commands |
| `theme <name>` | Switch palette: `green`, `amber`, `mono`, `light` |
| `open <name>` | Open social link in a new tab (`github`, `linkedin`, `email`) |
| `echo <text>` | Standard echo, mostly for fun |
| `date` | Current date/time |
| `sudo <anything>` | Easter-egg refusal (`permission denied: nice try`) |

UX details:
- Up/Down arrows walk command history.
- Tab completes file/dir names.
- Unknown commands suggest `help`.
- Every command also has a clickable equivalent in the nav, so the prompt is
  optional.
- Prompt input always re-focuses when the user clicks anywhere in the terminal.
- Caret blinks via CSS (`@keyframes blink`).

Hugo wiring:
- Layouts override under `layouts/_default/baseof.html` to inject the chrome,
  nav, and prompt.
- A small `terminal.js` reads the rendered page content and a JSON map of
  sections (built at Hugo build time via a `data` template) so commands like
  `ls` and `cat` know what exists.
- All commands are progressive enhancement — if JS is disabled the page is
  still a normal Hugo page with normal links.

#### Flavor 3 — "Terminal-only"

A pure REPL. No nav bar, no clickable links — you have to type to do anything.
Looks the coolest, but trades away the "usable by anyone" goal. Not recommended
unless you decide the whole site is for fellow devs.

### Recommendation

Flavor 2. It hits both goals, the JS layer is optional, and you can ship Flavor 1
first and add the prompt in a follow-up if you want.

### Demo

A working standalone prototype lives in
[`terminal-ui-demo/index.html`](./terminal-ui-demo/index.html). Open it in a
browser — no build step. It implements:

- Window chrome + persistent nav
- Themeable palette (`theme green | amber | mono | light`)
- A mock filesystem mirroring the current `content/` layout
- `help`, `ls`, `cd`, `pwd`, `cat`, `clear`, `whoami`, `history`, `theme`,
  `open`, `echo`, `date`, and the `sudo` easter egg
- Up/Down history, Tab completion, click-to-focus
- Scanline + CRT glow toggleable via `theme`

The prototype is intentionally framework-free (vanilla HTML/CSS/JS, ~400 LOC
total) so the patterns map 1:1 to a Hugo partial.

### Components needed for the real Hugo integration

If you greenlight Flavor 2, here's the breakdown of what would actually need to
land in the Hugo project (separate PR):

1. **Layouts**
   - `layouts/_default/baseof.html` — terminal chrome wrapper
   - `layouts/_default/single.html` — output area for single pages
   - `layouts/_default/list.html` — output area for section indexes
   - `layouts/partials/terminal-nav.html` — clickable nav
   - `layouts/partials/terminal-prompt.html` — input + history container
2. **Static assets**
   - `static/css/terminal.css` — palette variables, monospace stack, scanlines
   - `static/js/terminal.js` — command parser, history, completion
   - `static/js/fs.json` — generated at build time, listing sections + pages
3. **Hugo data**
   - A `layouts/index.fs.json` template that emits the JSON site map at build
     time so the JS layer can `ls`/`cat` without hardcoding anything
4. **Theming**
   - CSS variables for `--bg`, `--fg`, `--accent`, `--dim`
   - `prefers-color-scheme` honored by default
   - User choice persisted via `localStorage`
5. **Accessibility**
   - The prompt is an `<input>` with a real `<label>`
   - Nav is a real `<nav><ul><li><a>` — keyboard + screen-reader friendly
   - Color choices keep WCAG AA contrast (the default green palette in the
     demo passes against black at ~7:1)
   - `prefers-reduced-motion` disables blink + scanline animation
6. **Fallback**
   - `<noscript>` block reveals a plain table-of-contents so the site is fully
     usable without JS

### Open questions for you

- Pick a flavor (1, 2, or 3).
- Pick a default palette — green-on-black, amber-on-black, or something more
  modern like the Catppuccin / Tokyo Night style?
- Keep the CRT scanline effect, or is that too much?
- Do you want to keep `hello-friend-ng` as a fallback theme, or replace it
  outright?

---

## Suggested rollout order

1. **Land Track 1 first** (Cloudflare Pages, ~1 afternoon). You immediately
   get PR previews, which makes Track 2 way more pleasant to review.
2. **Ship Flavor 1** of the terminal UI as a CSS-only PR. Low risk, instant
   visual change.
3. **Layer Flavor 2 on top** in a follow-up PR — the prompt and command
   parser, gated behind progressive enhancement.

Each step is independently shippable and reversible.
