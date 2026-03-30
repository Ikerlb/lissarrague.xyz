# Infrastructure Plan: Hosting lissarrague.xyz (Hugo Static Site)

**Date:** 2026-03-30
**Current state:** Manually provisioned S3 bucket + CloudFront distribution. Domain `lissarrague.xyz` managed externally.

---

## Table of Contents

1. [Option 1: Terraform (AWS S3 + CloudFront)](#option-1-terraform-aws-s3--cloudfront)
2. [Option 2: AWS CDK (TypeScript)](#option-2-aws-cdk-typescript)
3. [Option 3: GitHub Pages](#option-3-github-pages)
4. [Option 4: Cloudflare Pages](#option-4-cloudflare-pages)
5. [Option 5: Vercel / Netlify](#option-5-vercel--netlify)
6. [Final Recommendation](#final-recommendation)

---

## Option 1: Terraform (AWS S3 + CloudFront)

**Complexity: 4/5** | **Monthly cost: ~$0.02-$0.50 (low-traffic static site)**

Codify the existing manually provisioned setup into Terraform so it becomes reproducible, version-controlled, and tear-down-safe.

### Resources Managed

| Resource | Purpose |
|---|---|
| `aws_s3_bucket` | Static file storage |
| `aws_s3_bucket_public_access_block` | Block all direct public access to the bucket |
| `aws_s3_bucket_policy` | Grant CloudFront OAC read access |
| `aws_cloudfront_origin_access_control` | Secure S3 origin (replaces legacy OAI) |
| `aws_cloudfront_distribution` | CDN, HTTPS termination, caching |
| `aws_cloudfront_function` | Rewrite `/path/` to `/path/index.html` (Hugo generates `dir/index.html`) |
| `aws_acm_certificate` + validation | TLS certificate for `lissarrague.xyz` (must be in `us-east-1`) |

### DNS Note

Since the domain is managed outside AWS, you will need to:

1. Create a **CNAME** (or ALIAS if apex) record pointing `lissarrague.xyz` to the CloudFront distribution domain name (e.g., `d1234abcdef.cloudfront.net`).
2. Add a CNAME record for ACM certificate DNS validation (one-time, for certificate issuance).

### Skeleton File Structure

```
infra/
  main.tf
  variables.tf
  outputs.tf
  providers.tf
  cloudfront-function.js
```

### Sample `main.tf`

```hcl
terraform {
  required_version = ">= 1.5"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }

  backend "s3" {
    bucket = "lissarrague-tf-state"
    key    = "site/terraform.tfstate"
    region = "eu-west-1"
  }
}

provider "aws" {
  region = var.aws_region
}

# ACM must live in us-east-1 for CloudFront
provider "aws" {
  alias  = "us_east_1"
  region = "us-east-1"
}

# ---------- Variables ----------
variable "aws_region" {
  default = "eu-west-1"
}

variable "domain_name" {
  default = "lissarrague.xyz"
}

variable "bucket_name" {
  default = "lissarrague-xyz-site"
}

# ---------- S3 ----------
resource "aws_s3_bucket" "site" {
  bucket = var.bucket_name
}

resource "aws_s3_bucket_public_access_block" "site" {
  bucket                  = aws_s3_bucket.site.id
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_policy" "site" {
  bucket = aws_s3_bucket.site.id
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [{
      Sid       = "AllowCloudFrontOAC"
      Effect    = "Allow"
      Principal = { Service = "cloudfront.amazonaws.com" }
      Action    = "s3:GetObject"
      Resource  = "${aws_s3_bucket.site.arn}/*"
      Condition = {
        StringEquals = {
          "AWS:SourceArn" = aws_cloudfront_distribution.site.arn
        }
      }
    }]
  })
}

# ---------- ACM ----------
resource "aws_acm_certificate" "site" {
  provider          = aws.us_east_1
  domain_name       = var.domain_name
  validation_method = "DNS"

  lifecycle {
    create_before_destroy = true
  }
}

# NOTE: You must add the ACM DNS validation CNAME record
# at your external DNS provider. Check `aws_acm_certificate.site`
# outputs for the record name and value.

# ---------- CloudFront Function ----------
resource "aws_cloudfront_function" "rewrite" {
  name    = "rewrite-index"
  runtime = "cloudfront-js-2.0"
  code    = file("${path.module}/cloudfront-function.js")
}

# ---------- OAC ----------
resource "aws_cloudfront_origin_access_control" "site" {
  name                              = "${var.bucket_name}-oac"
  origin_access_control_origin_type = "s3"
  signing_behavior                  = "always"
  signing_protocol                  = "sigv4"
}

# ---------- CloudFront ----------
resource "aws_cloudfront_distribution" "site" {
  enabled             = true
  default_root_object = "index.html"
  aliases             = [var.domain_name]
  is_ipv6_enabled     = true
  price_class         = "PriceClass_100"

  origin {
    domain_name              = aws_s3_bucket.site.bucket_regional_domain_name
    origin_id                = "s3"
    origin_access_control_id = aws_cloudfront_origin_access_control.site.id
  }

  default_cache_behavior {
    target_origin_id       = "s3"
    viewer_protocol_policy = "redirect-to-https"
    allowed_methods        = ["GET", "HEAD"]
    cached_methods         = ["GET", "HEAD"]
    compress               = true

    # Use managed cache policy: CachingOptimized
    cache_policy_id = "658327ea-f89d-4fab-a63d-7e88639e58f6"

    function_association {
      event_type   = "viewer-request"
      function_arn = aws_cloudfront_function.rewrite.arn
    }
  }

  viewer_certificate {
    acm_certificate_arn      = aws_acm_certificate.site.arn
    ssl_support_method       = "sni-only"
    minimum_protocol_version = "TLSv1.2_2021"
  }

  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  custom_error_response {
    error_code         = 404
    response_code      = 404
    response_page_path = "/404.html"
  }
}

# ---------- Outputs ----------
output "cloudfront_domain" {
  value       = aws_cloudfront_distribution.site.domain_name
  description = "Point your DNS CNAME here"
}

output "cloudfront_distribution_id" {
  value = aws_cloudfront_distribution.site.id
}
```

### Deploy Workflow

```bash
# Build and sync Hugo output to S3
hugo --minify && aws s3 sync public/ s3://lissarrague-xyz-site --delete

# Invalidate CloudFront cache
aws cloudfront create-invalidation \
  --distribution-id $(terraform -chdir=infra output -raw cloudfront_distribution_id) \
  --paths "/*"
```

### Pros

- Codifies and documents the exact current setup -- nothing changes architecturally.
- Full control over caching, headers, WAF, logging, etc.
- `terraform plan` shows drift from desired state.
- Import existing resources with `terraform import` to avoid re-creation.

### Cons

- Still need to manage AWS credentials, state file, and deployments.
- CloudFront invalidations on deploy add a manual step (or need a CI script).
- ACM certificate validation requires a manual DNS record at the external provider.
- More moving parts than a managed platform for a simple blog.

---

## Option 2: AWS CDK (TypeScript)

**Complexity: 3/5** | **Monthly cost: ~$0.02-$0.50 (same AWS resources)**

Same infrastructure as Option 1, expressed in TypeScript with the CDK. CDK's higher-level constructs handle much of the wiring (OAC + bucket policy) automatically.

### Example Stack

```typescript
import * as cdk from "aws-cdk-lib";
import { Construct } from "constructs";
import * as s3 from "aws-cdk-lib/aws-s3";
import * as cloudfront from "aws-cdk-lib/aws-cloudfront";
import * as origins from "aws-cdk-lib/aws-cloudfront-origins";
import * as acm from "aws-cdk-lib/aws-certificatemanager";
import * as s3deploy from "aws-cdk-lib/aws-s3-deployment";

export class SiteStack extends cdk.Stack {
  constructor(scope: Construct, id: string, props?: cdk.StackProps) {
    super(scope, id, props);

    const domainName = "lissarrague.xyz";

    // S3 bucket (private, no public access)
    const bucket = new s3.Bucket(this, "SiteBucket", {
      bucketName: `${domainName}-site`,
      blockPublicAccess: s3.BlockPublicAccess.BLOCK_ALL,
      removalPolicy: cdk.RemovalPolicy.RETAIN,
    });

    // ACM certificate -- must deploy this stack to us-east-1 for CloudFront.
    // With external DNS, use DNS validation and manually create the CNAME records.
    const certificate = new acm.Certificate(this, "SiteCert", {
      domainName: domainName,
      subjectAlternativeNames: [`*.${domainName}`],
      validation: acm.CertificateValidation.fromDns(), // no hosted zone arg = manual DNS
    });

    // CloudFront function for index.html rewriting
    const rewriteFunction = new cloudfront.Function(this, "Rewrite", {
      code: cloudfront.FunctionCode.fromInline(`
        function handler(event) {
          var request = event.request;
          var uri = request.uri;
          if (uri.endsWith('/')) { request.uri += 'index.html'; }
          else if (!uri.includes('.')) { request.uri += '/index.html'; }
          return request;
        }
      `),
      runtime: cloudfront.FunctionRuntime.JS_2_0,
    });

    // CloudFront distribution
    // S3BucketOrigin.withOriginAccessControl() automatically creates the OAC
    // and configures the bucket policy -- no manual wiring needed.
    const distribution = new cloudfront.Distribution(this, "CDN", {
      defaultBehavior: {
        origin: origins.S3BucketOrigin.withOriginAccessControl(bucket),
        viewerProtocolPolicy:
          cloudfront.ViewerProtocolPolicy.REDIRECT_TO_HTTPS,
        compress: true,
        functionAssociations: [
          {
            function: rewriteFunction,
            eventType: cloudfront.FunctionEventType.VIEWER_REQUEST,
          },
        ],
      },
      domainNames: [domainName],
      certificate,
      defaultRootObject: "index.html",
      priceClass: cloudfront.PriceClass.PRICE_CLASS_100,
      errorResponses: [
        {
          httpStatus: 404,
          responseHttpStatus: 404,
          responsePagePath: "/404.html",
        },
      ],
    });

    // Optional: deploy site content directly via CDK
    // new s3deploy.BucketDeployment(this, "DeploySite", {
    //   sources: [s3deploy.Source.asset("../public")],
    //   destinationBucket: bucket,
    //   distribution,
    //   distributionPaths: ["/*"],
    // });

    new cdk.CfnOutput(this, "DistributionDomain", {
      value: distribution.distributionDomainName,
    });
  }
}
```

### Pros

- TypeScript type safety and IDE autocomplete.
- Higher-level constructs (e.g., `S3BucketOrigin.withOriginAccessControl`) reduce boilerplate -- OAC and bucket policy are handled automatically.
- `BucketDeployment` construct can upload Hugo output and invalidate CloudFront in a single `cdk deploy`.
- Existing CDK experience from the mandelrust project means less ramp-up time.
- Consistent tooling if you already maintain other CDK stacks.

### Cons

- Same operational overhead as Terraform (AWS creds, CloudFormation state, deploy scripts).
- CDK bootstrap required per account/region.
- Harder to import existing resources compared to Terraform (`terraform import` is more mature).
- Synthesized CloudFormation templates can be difficult to debug when something goes wrong.

---

## Option 3: GitHub Pages

**Complexity: 1/5** | **Monthly cost: $0**

Push Hugo source to GitHub. A GitHub Actions workflow builds the site and deploys to GitHub Pages. No infrastructure to manage at all.

### Sample GitHub Actions Workflow

`.github/workflows/deploy.yml`:

```yaml
name: Deploy Hugo to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: false

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
        with:
          submodules: true  # fetch Hugo themes if using git submodules

      - name: Setup Hugo
        uses: peaceiris/actions-hugo@v3
        with:
          hugo-version: "latest"
          extended: true

      - name: Build
        run: hugo --minify --baseURL "https://lissarrague.xyz/"

      - name: Upload artifact
        uses: actions/upload-pages-artifact@v3
        with:
          path: ./public

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - name: Deploy to GitHub Pages
        id: deployment
        uses: actions/deploy-pages@v4
```

### Custom Domain

1. Add a file `static/CNAME` containing `lissarrague.xyz` (Hugo copies it to `public/`).
2. At your DNS provider, create:
   - An **A** record pointing to GitHub Pages IPs (`185.199.108-111.153`), or
   - A **CNAME** record pointing to `<username>.github.io`.
3. Enable HTTPS in the repository Pages settings (free, automatic via Let's Encrypt).

### Pros

- Zero infrastructure. Zero cost. Zero maintenance.
- Automatic deploys on `git push`.
- GitHub handles TLS, CDN (Fastly-backed), and availability.
- No AWS credentials or state files to manage.

### Cons

- Limited control over HTTP headers and caching behavior.
- No server-side redirects (client-side 404.html only).
- Build minutes are capped (2,000/month free for private repos; unlimited for public).
- Slightly less performant than a dedicated CDN for global audiences (though still fast).

---

## Option 4: Cloudflare Pages

**Complexity: 1/5** | **Monthly cost: $0 (free tier)**

Connect the Git repository directly. Cloudflare builds Hugo and deploys to its edge network (300+ PoPs).

### Setup

1. Sign up at Cloudflare Pages and connect the GitHub/GitLab repo.
2. Set build command: `hugo --minify`
3. Set output directory: `public`
4. Set environment variable `HUGO_VERSION` to your desired version.
5. Add custom domain `lissarrague.xyz` -- Cloudflare provides the DNS records to add (or transfer DNS to Cloudflare for automatic management).

### Free Tier Includes

- Unlimited bandwidth
- 500 builds/month
- Preview deployments per branch/PR
- Built-in Web Analytics (privacy-friendly, no JS tag needed -- could replace Google Analytics)
- Automatic HTTPS
- DDoS protection

### Pros

- Arguably the best free tier for static hosting.
- Edge network is larger and faster than GitHub Pages for international visitors.
- Built-in analytics removes the need for Google Analytics (simpler, GDPR-friendly).
- Preview deploys for every pull request.
- Rollback to any previous deploy with one click.

### Cons

- Vendor lock-in to Cloudflare ecosystem (mild -- it is just static files, easy to move).
- Build environment is less customizable than GitHub Actions.
- If DNS is not on Cloudflare, custom domain setup requires manual CNAME records.

---

## Option 5: Vercel / Netlify

**Complexity: 1/5** | **Monthly cost: $0 (free tier)**

Both are strong platforms for static/Jamstack sites with Git-based deploys.

| Feature | Vercel | Netlify |
|---|---|---|
| Free tier bandwidth | 100 GB/month | 100 GB/month |
| Build minutes (free) | 6,000/month | 300/month |
| Preview deploys | Yes | Yes |
| Serverless functions | Yes (focus area) | Yes |
| Analytics | Paid add-on ($10/mo) | Paid add-on ($9/mo) |
| Edge network | Good | Good |
| Hugo support | Supported (needs config) | First-class |
| Custom headers/redirects | `vercel.json` | `_redirects` / `_headers` files |

### Pros

- Simple Git-based workflow, similar to Cloudflare Pages.
- Netlify has slightly better Hugo integration (auto-detects Hugo, manages versions).
- Both support form handling, split testing, and other niceties.

### Cons

- Bandwidth caps on free tier (100 GB) -- fine for a personal blog but worth noting.
- Analytics costs extra on both platforms.
- Vercel is more focused on Next.js; Hugo is a second-class citizen there.
- Netlify free tier build minutes (300/month) are low if you iterate frequently.

---

## Cost Comparison Summary

| Option | Monthly Cost | Complexity | Deploy Effort | Custom Domain |
|---|---|---|---|---|
| Terraform (S3+CF) | $0.02-$0.50 | 4/5 | CI script + invalidation | CNAME to CloudFront |
| CDK (S3+CF) | $0.02-$0.50 | 3/5 | CI script + invalidation | CNAME to CloudFront |
| GitHub Pages | $0 | 1/5 | `git push` | A/CNAME to GitHub |
| Cloudflare Pages | $0 | 1/5 | `git push` | CNAME to Cloudflare |
| Vercel | $0 | 1/5 | `git push` | CNAME to Vercel |
| Netlify | $0 | 1/5 | `git push` | CNAME to Netlify |

---

## Final Recommendation

For a simple Hugo static site, **Cloudflare Pages** is the strongest choice:

1. **Zero cost, zero infrastructure.** No AWS bills, no Terraform state, no credentials to rotate.
2. **Built-in analytics** can replace Google Analytics entirely -- one fewer third-party script, better privacy, simpler site.
3. **Fastest edge network** among the free options (300+ PoPs vs GitHub Pages' Fastly or Netlify/Vercel).
4. **Preview deploys** for every PR give you a staging workflow for free.
5. **Unlimited bandwidth** on the free tier removes any worry about traffic spikes.

**Migration path:** Push Hugo source to GitHub, connect to Cloudflare Pages, update DNS records at the external provider to point to Cloudflare, and decommission the S3 bucket and CloudFront distribution. Total effort: under an hour.

**Runner-up:** GitHub Pages, if you prefer to stay entirely within the GitHub ecosystem and do not need built-in analytics.

**When to keep AWS (Terraform/CDK):** Only if you need fine-grained control over caching rules, custom response headers, WAF integration, or access logging -- requirements that are unusual for a personal blog.
