# Cloudflare Pages — "Option B" setup notes

Concretely, here's what setting up Option B from the brainstorm looks like.
You can do this entirely from the Cloudflare dashboard; no files need to live
in this repo. The notes below are what to click and what to set.

## one-time setup

1. Cloudflare → **Workers & Pages** → **Create application** → **Pages** →
   **Connect to Git**.
2. Authorize the Cloudflare GitHub app and select `Ikerlb/lissarrague.xyz`.
3. Configure the build:
   - **Production branch:** `main`
   - **Framework preset:** Hugo
   - **Build command:** `hugo --minify --gc`
   - **Build output directory:** `public`
   - **Root directory:** *(leave blank)*
   - **Environment variables:**
     - `HUGO_VERSION=0.154.0`
     - `HUGO_ENV=production`
4. **Save and deploy.** First build takes ~1 min.

## custom domain

1. Pages project → **Custom domains** → **Set up a custom domain** →
   `lissarrague.xyz`.
2. If DNS is on Cloudflare already: one click, done.
3. If DNS is elsewhere: Cloudflare gives you a CNAME target — add it at your
   registrar. (You'll need a flattening trick or ALIAS record for the apex.
   Easiest fix: move DNS to Cloudflare.)
4. Repeat for `www.lissarrague.xyz`, set up a redirect rule (www → apex) in
   the Pages project's **Redirects** tab.

## tearing down the AWS stack

Once Cloudflare Pages is serving traffic and DNS is cut over:

```sh
# verify the new origin works
curl -I https://lissarrague.xyz

# only after you're confident:
aws cloudfront update-distribution ...   # disable
aws cloudfront delete-distribution ...
aws s3 rm s3://lissarrague.xyz --recursive
aws s3 rb s3://lissarrague.xyz
aws acm delete-certificate --certificate-arn ...
```

(Or, if you applied the Terraform from `../terraform/`, just `terraform destroy`
that workspace.)

## what you get for free

- **Preview deployments per PR.** Every PR gets a unique URL like
  `https://<hash>.lissarrague-xyz.pages.dev`. Reviewing the terminal UI redesign
  becomes "open the link" instead of "trust the screenshot".
- **Rollbacks.** Pages keeps every deploy; clicking one reverts instantly.
- **Web analytics.** Free, privacy-respecting, no GA tag. You could drop the
  GA snippet in `config.toml` if you want.
- **Build logs.** No more wondering whether `deploy.sh` ran cleanly.

## what you give up

- Infra-as-code for the hosting layer (the build config lives in the dashboard,
  although Cloudflare does support managing Pages projects via Terraform if you
  miss it later).
- Edge customization beyond what Pages exposes — though Cloudflare Workers fill
  most of those gaps if you ever need them.
