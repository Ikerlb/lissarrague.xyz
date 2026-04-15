# lissarrague.xyz — Redesign Brainstorm

This doc captures two parallel workstreams for the site:

1. **Infra-as-Code** — replace the hand-rolled S3 + CloudFront with Terraform (or CDK) and wire a deploy pipeline.
2. **Terminal-style redesign** — make the UI look and feel like a terminal while staying navigable by non-technical visitors.

There are live HTML/CSS/JS demos in `static/demos/` for the visual workstream (open the `index.html` files directly in a browser, or serve them from `hugo server` during development).

---

## 1. Infrastructure as Code

### 1.1 Current state (as observed)

- Hugo static site (`config.toml`, `content/`, theme `hello-friend-ng` pulled locally).
- S3 bucket hosting `public/` output, manually provisioned.
- CloudFront distribution in front of S3, manually configured.
- Domain `lissarrague.xyz` lives with a third-party registrar/DNS.
- No deployment automation: `deploy.sh` is git-ignored and presumably a local script.
- No CI/CD, no IaC, no state storage.

### 1.2 Recommendation: Terraform + GitHub Actions (OIDC)

Terraform is a good fit because it's provider-agnostic, has great AWS coverage, and you already read the Terraform book (per `reading_log.md`). Using GitHub's OIDC provider avoids storing long-lived AWS keys.

#### Component breakdown

| # | Resource | Purpose |
|---|---|---|
| 1 | `aws_s3_bucket` (site) | Holds the built Hugo output. Block all public access; keep private. |
| 2 | `aws_s3_bucket` (tfstate) + `aws_dynamodb_table` | Remote state + lock. One-time bootstrap module. |
| 3 | `aws_cloudfront_origin_access_control` | Modern replacement for OAI. Grants CloudFront-only read access to the S3 bucket. |
| 4 | `aws_s3_bucket_policy` | Allows the OAC principal to `s3:GetObject`. |
| 5 | `aws_cloudfront_distribution` | CDN + TLS termination. Default root object `index.html`, custom error responses (403/404 → `/404.html`). |
| 6 | `aws_cloudfront_function` (optional) | Rewrite `*/` to `*/index.html` so Hugo's pretty URLs work without S3 website hosting. |
| 7 | `aws_acm_certificate` (us-east-1) | TLS cert for `lissarrague.xyz` + `www`. DNS validation. |
| 8 | DNS records | Two options — see §1.3. |
| 9 | `aws_iam_openid_connect_provider` (GitHub) | Lets Actions assume roles without secrets. |
| 10 | `aws_iam_role` (deploy) | Assumed by Actions; permissions: `s3:PutObject/DeleteObject/ListBucket` on the site bucket, `cloudfront:CreateInvalidation` on the distribution. |
| 11 | GitHub Actions workflow | `on: push: branches: [master]` → Hugo build → `aws s3 sync --delete` → invalidate `/*`. |

#### Suggested repo layout

```
infra/
  bootstrap/              # one-shot: state bucket + dynamodb lock table
    main.tf
  live/
    main.tf               # provider, backend "s3"
    s3.tf                 # site bucket + policy
    cloudfront.tf         # distribution + OAC + CF function
    acm.tf                # cert + validation
    dns.tf                # Route53 OR outputs for external DNS
    iam.tf                # OIDC provider + deploy role
    variables.tf
    outputs.tf            # distribution id, bucket name, cert validation CNAMEs
.github/
  workflows/
    deploy.yml
```

#### Example: minimal `cloudfront.tf`

```hcl
resource "aws_cloudfront_origin_access_control" "site" {
  name                              = "lissarrague-oac"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

resource "aws_cloudfront_distribution" "site" {
  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"
  aliases             = ["lissarrague.xyz", "www.lissarrague.xyz"]

  origin {
    domain_name              = aws_s3_bucket.site.bucket_regional_domain_name
    origin_id                = "s3-site"
    origin_access_control_id = aws_cloudfront_origin_access_control.site.id
  }

  default_cache_behavior {
    target_origin_id       = "s3-site"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    compress               = true
    cache_policy_id        = data.aws_cloudfront_cache_policy.optimized.id

    function_association {
      event_type   = "viewer-request"
      function_arn = aws_cloudfront_function.rewrite.arn
    }
  }

  custom_error_response {
    error_code            = 403
    response_code         = 404
    response_page_path    = "/404.html"
    error_caching_min_ttl = 10
  }

  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate.site.arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  restrictions { geo_restriction { restriction_type = "none" } }
}
```

#### Example: GitHub Actions deploy

```yaml
name: deploy
on:
  push:
    branches: [master]
permissions:
  id-token: write
  contents: read
jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with: { submodules: recursive }
      - uses: peaceiris/actions-hugo@v3
        with: { hugo-version: latest, extended: true }
      - run: hugo --minify
      - uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: ${{ secrets.DEPLOY_ROLE_ARN }}
          aws-region: us-east-1
      - run: aws s3 sync ./public s3://${{ secrets.SITE_BUCKET }} --delete --cache-control "public,max-age=3600"
      - run: aws cloudfront create-invalidation --distribution-id ${{ secrets.CF_DIST_ID }} --paths "/*"
```

### 1.3 DNS — two paths, pick one

- **A. Stay with external DNS.** Terraform outputs the ACM validation CNAMEs and the CloudFront domain; you paste them in manually. Cheapest, one-time pain.
- **B. Delegate `lissarrague.xyz` to Route53.** Terraform manages records end-to-end. Small recurring cost (~$0.50/mo per hosted zone) and a one-time NS change at the registrar.

Recommendation: **B** if you'll keep iterating; **A** if you just want to freeze things.

### 1.4 Migration plan (safe, zero-downtime)

1. Bootstrap: create state bucket + lock table (one-off, no dependency on existing infra).
2. **Import** the existing bucket and distribution into Terraform (`terraform import`) so nothing is recreated.
3. Add the missing pieces (OIDC, deploy role, CF function) incrementally with plans reviewed.
4. Move deploys to GitHub Actions; retire the local `deploy.sh`.
5. If choosing path B: create the hosted zone, update NS at the registrar during a low-traffic window.

### 1.5 Alternatives considered

- **AWS CDK** — nicer for TypeScript folks; overkill for a static site.
- **Pulumi** — same ergonomics argument as CDK; extra runtime to learn.
- **SST / OpenNext / Amplify** — aimed at dynamic apps; too heavy here.
- **Cloudflare Pages / Netlify / Vercel** — would replace S3+CF entirely. Valid "nuke the infra" option if the AWS footprint isn't a requirement. Much simpler, but out of scope since the ask is to IaC the current stack.

---

## 2. Terminal-style Redesign

Two design directions are prototyped. Neither locks you in — the CSS is portable into the existing Hugo theme (or a fork of `hello-friend-ng`). Both share a palette, typography, and the "window chrome" shell.

Open these files directly in a browser:

- `static/demos/terminal-static/index.html` — **Option A: static terminal-styled**
- `static/demos/terminal-shell/index.html` — **Option B: interactive shell**

### 2.1 Shared design system

- **Font:** `JetBrains Mono`, fallback to `Menlo, Consolas, "Liberation Mono", monospace`.
- **Palette (dark):** `--bg: #0b0d0c; --fg: #c9d1d9; --dim: #6e7681; --accent: #7ee787; --accent-2: #79c0ff; --warn: #f0883e; --err: #ff7b72;`
- **Palette (light):** flip `--bg` to `#f6f8fa`, `--fg` to `#1f2328`, keep greens/blues for syntax cues.
- **Chrome:** rounded window with three "traffic lights" and a title bar (`iker@lissarrague:~`).
- **Cursor:** blinking `▋` block at the end of the current prompt line.
- **Motion:** subtle CRT scanline overlay (toggleable), optional boot animation where the first paragraph "types" itself at ~60 wpm.

### 2.2 Option A — Static terminal look (**recommended primary**)

Looks like a terminal, but navigation is plain `<a href>` links. No typing required. Anyone can click `ls projects/` or the project names and land on the corresponding Hugo page.

**What the demo shows:**
- Window chrome with traffic lights.
- Prompt `$ whoami` followed by the "about me" bullets.
- Prompt `$ ls ~/` rendered as a 2-column directory listing with clickable directories/files in accent color (bold for directories, plain for files — mimicking `ls --color`).
- Footer prompt with blinking cursor and a tip: "Tip: press `/` to try the interactive shell."
- Theme toggle (dark/light) in the top right of the chrome.
- Fully responsive: on mobile the `ls` grid collapses to a single column.

**Why recommend this for primary navigation:**
- Works for non-tech visitors — it's just styled links.
- Zero JS required for core navigation (only for theme toggle + cursor blink, both progressive enhancements).
- Accessible: real `<nav>`, `<ul>`, `<a>` semantics under the visual skin.

### 2.3 Option B — Interactive shell

A real in-page command prompt. Tech-savvy visitors can type:
- `help` — list all commands
- `ls [path]`, `cd [path]`, `pwd`, `clear`, `whoami`, `about`
- `cat <file>` — render a Hugo page's content inline
- `open <file>` — navigate to the real URL
- `theme dark|light` — switch palette
- `sudo rm -rf /` — easter egg
- `contact` — print email / social links

**Features in the demo:**
- Command history with `↑` / `↓`.
- Tab completion on the current directory's entries.
- A virtual filesystem seeded from the current Hugo content tree (hardcoded in the demo; in production it would be generated at build time from Hugo's output).
- Fallback menu bar at the top with clickable "about / reading log / projects / contact" so non-typers aren't stranded.
- Respects `prefers-reduced-motion` (disables cursor blink and boot typing).

**Integration idea:** ship Option A as the default theme and Option B as a mode you can toggle with `/` or a "launch shell" button. They share the same CSS.

### 2.4 Accessibility & SEO notes

- Keep semantic HTML underneath; the "terminal look" is CSS only.
- Provide a "plain text mode" toggle (maps to theme="plain" class that strips chrome).
- Ensure color contrast ≥ WCAG AA for both palettes (current demo values pass).
- The interactive shell must **not** be the only path to content — Google and screen readers must see the same HTML as the static view. `cat` should augment, not replace.
- Keep `<title>` / meta description / OG tags wired up per-page; the shell is decoration, not a SPA router.

### 2.5 Hugo theme integration plan

1. Fork `hello-friend-ng` into `themes/lissarrague-term` (or start a fresh minimal theme — probably cleaner given how little of `hello-friend-ng` is actually used).
2. Port the demo's `tokens.css` (palette + typography) into the theme's `assets/css/`.
3. Wrap `layouts/_default/baseof.html` in the window-chrome markup.
4. Replace the site header/nav with the prompt + `ls` rendering driven by `.Site.Menus.main` and `.Site.Pages`.
5. Expose `enableShell = true` in `config.toml` to opt into Option B on top of Option A.
6. Keep `enableThemeToggle = true` but swap in the terminal-style dark/light toggle.

---

## 3. Open questions

- AWS region preference beyond `us-east-1` (for non-CloudFront things)?
- Willing to move DNS to Route53?
- Preference between Option A, Option B, or ship both?
- Do we need Spanish (`es/`) localization to keep working on day one? (Currently generated — both themes need `i18n` wiring preserved.)
- Keep Google Analytics, drop it, or swap for Plausible/Umami?

---

## 4. Suggested next PRs after this brainstorm lands

1. `infra/bootstrap` — state + lock, no prod impact.
2. `infra/live` with `terraform import` of existing S3 + CF.
3. `.github/workflows/deploy.yml` + OIDC role.
4. `themes/lissarrague-term` scaffold from the chosen demo.
5. Cutover: swap theme in `config.toml`, retire `deploy.sh`.
