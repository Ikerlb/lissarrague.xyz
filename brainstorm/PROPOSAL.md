# Proposal: Terminal UI Redesign + Infrastructure as Code

## 1. Terminal UI Redesign

### Concept

Transform the site into a **terminal emulator** experience. Visitors see a familiar
terminal window with command prompts, output blocks, and a blinking cursor. Navigation
happens through clickable tabs (accessible to anyone) _and_ an interactive command
line (fun for tech-savvy visitors).

**See `terminal-ui-demo.html` for a working prototype** with all the ideas below.

### Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Font | JetBrains Mono | Free, ligatures, great readability |
| Color palette | Catppuccin Mocha/Latte | Popular in dev community, has dark+light variants |
| Window chrome | macOS-style dots | Universally recognized "terminal" signifier |
| Navigation | Tab bar + interactive CLI | Tabs = accessible; CLI = fun easter egg |
| Framework | **None** (vanilla HTML/CSS/JS) | Keeps Hugo compatibility, no build deps |

### Key UI Elements

1. **Terminal window** - rounded border, title bar with traffic light dots, drop shadow
2. **Tab bar** - pages shown as terminal tabs (`~/about`, `~/projects`, `~/reading_log`)
3. **Prompt lines** - `iker@lissarrague.xyz ~/projects $` styled prompts before content
4. **Content as command output** - about text shown as `cat about.txt` output, projects as `ls` + card listing
5. **Interactive command input** - real input at the bottom, supports `help`, `projects`, `clear`, `theme`, tab-completion
6. **ASCII art** - name rendered as ASCII on the home page
7. **Theme toggle** - light/dark via `[theme]` button or `theme` command

### Accessibility & Usability

- **Non-technical visitors**: tab bar provides standard click navigation; content is fully readable without typing commands
- **Screen readers**: semantic HTML, aria labels, all content visible in DOM
- **Mobile**: responsive - terminal goes full-bleed, tabs remain clickable, input works on mobile keyboards
- **Light mode**: Catppuccin Latte palette for daytime/accessibility

### Implementation Approach

Two options, both compatible with Hugo:

**Option A: Custom Hugo theme (recommended)**
- Create a new theme `themes/terminal-portfolio/`
- Layouts: `baseof.html`, `index.html`, `list.html`, `single.html`
- Single CSS file, single JS file
- Content stays in markdown, theme renders it into terminal blocks
- Keep existing content files as-is

**Option B: Standalone SPA**
- Single `index.html` with all content inlined
- Simpler, but loses Hugo's markdown pipeline and would need manual content updates

### What Needs To Be Built

```
themes/terminal-portfolio/
├── layouts/
│   ├── _default/
│   │   ├── baseof.html      # terminal window chrome + tab bar
│   │   ├── list.html        # project listing as ls + cards
│   │   └── single.html      # project detail as cat output
│   ├── index.html           # home: whoami + cat about.txt
│   └── partials/
│       ├── head.html         # meta, fonts, CSS
│       ├── prompt.html       # reusable prompt-line
│       ├── terminal-input.html  # interactive CLI
│       └── footer.html       # social links
├── static/
│   └── js/
│       └── terminal.js       # command handler, tab completion
└── assets/
    └── css/
        └── terminal.css      # all styles (dark+light)
```

---

## 2. Infrastructure as Code

### Current State

- Manually provisioned S3 bucket + CloudFront distribution
- Domain managed elsewhere (likely Route53 or external registrar)
- Deploy script was removed from repo

### Proposed: Terraform (or OpenTofu)

Since you already read "Terraform: Up & Running" and have Terraform experience
(mentioned in the mandelrust project), Terraform is the natural choice.

### Components Needed

```
infra/
├── main.tf              # provider config, backend
├── variables.tf         # domain name, region, etc.
├── outputs.tf           # CloudFront URL, bucket name
├── s3.tf                # S3 bucket for static hosting
├── cloudfront.tf        # CloudFront distribution
├── acm.tf               # ACM certificate (SSL)
├── route53.tf           # DNS records (if using Route53)
└── terraform.tfvars     # actual values (gitignored)
```

### Component Breakdown

#### S3 Bucket (`s3.tf`)
- Private bucket (no public access) - CloudFront accesses via OAC
- Bucket policy allowing CloudFront OAC read access
- Website hosting config not needed (CloudFront handles routing)

#### CloudFront Distribution (`cloudfront.tf`)
- Origin: S3 bucket via Origin Access Control (OAC)
- Default root object: `index.html`
- Custom error response: 404 → `/404.html`
- Price class: `PriceClass_100` (US/EU only, cheapest)
- Viewer protocol policy: redirect HTTP → HTTPS
- Cache policy: `CachingOptimized` managed policy
- Alternate domain names: `lissarrague.xyz`, `www.lissarrague.xyz`
- ACM certificate association

#### ACM Certificate (`acm.tf`)
- Certificate for `lissarrague.xyz` + `*.lissarrague.xyz`
- DNS validation via Route53
- **Must be in `us-east-1`** (CloudFront requirement)

#### Route53 / DNS (`route53.tf`)
- If you move DNS to Route53:
  - Hosted zone for `lissarrague.xyz`
  - A record alias → CloudFront
  - AAAA record alias → CloudFront
  - ACM validation CNAME records
- If DNS stays external:
  - Skip this file
  - Manually add CNAME for ACM validation
  - Manually point domain to CloudFront

### Deployment Pipeline

#### Option A: GitHub Actions (recommended)
```yaml
# .github/workflows/deploy.yml
# 1. Checkout code
# 2. Setup Hugo
# 3. Build site (hugo --minify)
# 4. Sync to S3 (aws s3 sync public/ s3://bucket --delete)
# 5. Invalidate CloudFront cache
```

#### Option B: Simple deploy script
```bash
#!/bin/bash
hugo --minify
aws s3 sync public/ s3://$BUCKET --delete
aws cloudfront create-invalidation --distribution-id $DIST_ID --paths "/*"
```

### Migration Plan

1. Write Terraform configs and `terraform plan` to verify
2. Import existing S3 bucket and CloudFront into Terraform state (`terraform import`)
3. Apply to reconcile any drift
4. Set up GitHub Actions for automated deploys
5. Verify everything works, then decommission any manual setup

### State Management

- **Remote state**: S3 backend with DynamoDB locking (standard Terraform pattern)
- Or use Terraform Cloud free tier

---

## 3. Suggested Phasing

| Phase | What | Effort |
|-------|------|--------|
| **Phase 1** | Terminal UI demo (this PR) | Done |
| **Phase 2** | Build Hugo theme from demo | Medium |
| **Phase 3** | Terraform configs + import existing infra | Medium |
| **Phase 4** | GitHub Actions CI/CD | Small |
| **Phase 5** | DNS migration to Route53 (optional) | Small |

---

## Open Questions

1. **DNS**: Do you want to move DNS to Route53 (simpler ACM validation, alias records) or keep it external?
2. **Terraform state**: S3 backend or Terraform Cloud?
3. **Hugo vs SPA**: Keep Hugo for markdown content management, or go fully static SPA?
4. **Interactive CLI depth**: Should the command input be a novelty (few commands) or full-featured (navigate to individual projects, search, etc.)?
5. **Existing infra**: Should we `terraform import` the current resources or start fresh with new ones and migrate?
