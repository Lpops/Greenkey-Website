# Greenkey Africa — deployment runbook

Static site + one serverless function. No build step, no dependencies.

- **Deploy root:** `website/` (not the repo root)
- **Pages:** `/` `/services` `/safaris` (`cleanUrls` is on, so `.html` redirects to the clean path)
- **Function:** `api/contact.js` — handles both enquiry forms

---

## 1. Resend (do this first — it has a DNS wait)

1. Create an account at <https://resend.com>.
2. **Domains → Add Domain → `greenkeyafrica.com`**, then add the TXT/MX records it
   gives you to your DNS. Verification usually lands in minutes.
3. **API Keys → Create**, with *Sending access* only. Copy the key.

> **Why verify the domain even though we're launching on `vercel.app`?**
> Resend's unverified fallback sender (`onboarding@resend.dev`) can only deliver to the
> email address that owns the Resend account — nobody else. Verifying
> `greenkeyafrica.com` is a DNS-only step and is independent of where the site is
> hosted, so it works fine while the site still lives on a `vercel.app` URL.
> Skip it and enquiries will silently fail to reach `info@greenkeyafrica.com`.

## 2. Deploy to Vercel

**Option A — CLI (fastest)**

```bash
cd /Users/laana/Desktop/Freelance/greenkey/website && npx vercel
```

Accept the defaults; when it asks for the directory to deploy, it's the one you're
already in. Then `npx vercel --prod` to promote it.

**Option B — Git + dashboard**

```bash
cd /Users/laana/Desktop/Freelance/greenkey && git init && git add -A && git commit -m "Greenkey Africa website"
```

Push to GitHub, then Vercel → **Add New Project** → import the repo → set
**Root Directory** to `website` → Deploy.

## 3. Environment variables

Vercel → Project → **Settings → Environment Variables**. Add to *all* environments:

| Name             | Value                                                  |
| ---------------- | ------------------------------------------------------ |
| `RESEND_API_KEY` | the key from step 1                                    |
| `CONTACT_TO`     | `naheed.popat@greenkeyafrica.com` (comma-separate for several) |
| `CONTACT_FROM`   | `Greenkey Africa <site@greenkeyafrica.com>`            |

Leave `CONTACT_FROM` unset only if you skipped domain verification — read the warning above.

**Redeploy after adding these.** Env vars are baked in at deploy time.

## 4. Verify live

- Submit both forms; confirm the email arrives and **Reply** goes to the enquirer,
  not to Greenkey.
- Check `/services` and `/safaris` resolve without `.html`.
- Paste the URL into Slack or WhatsApp — the OG card should show the hero photo.
- Load `/robots.txt` and `/sitemap.xml`.

## 5. When the real domain is ready

Vercel → **Settings → Domains** → add `greenkeyafrica.com`, then update the 16
hard-coded absolute URLs:

```bash
cd /Users/laana/Desktop/Freelance/greenkey/website && grep -rl "greenkey-africa.vercel.app" . | xargs sed -i '' 's|https://greenkey-africa.vercel.app|https://greenkeyafrica.com|g'
```

Redeploy. (Ask me and I'll do it — it also needs a sanity re-check of the OG tags.)

---

## Known gaps

**Blocking: the contact forms cannot send.** Verified live on 29 Sep 2026: the
function is deployed and routing (a GET to `/api/contact` correctly returns 405),
but every POST returns `500 "The contact form isn't configured yet"`. That is the
branch that fires when `RESEND_API_KEY` or `CONTACT_TO` is missing, so the
environment variables in section 3 have not been set in Vercel yet. Until they
are, every enquiry submitted on the live site is lost. Set them, redeploy, then
re-test.

Non-blocking:

- `/favicon.ico` 404s for legacy browsers. Modern ones use `assets/favicon.svg`.
- Hero text contrast over the pale river photo is on the soft side; the scrim can be
  darkened in `css/home.css` if you want it stronger.
- ~1.1MB of unreferenced images remain in `assets/photos/` from the previous home
  page's project gallery (`spiceken-epz.jpg` alone is 869KB). They cost nothing in
  page weight but bloat the repo. Safe to delete unless the gallery comes back.
- Asset links carry a `?v=` cache-busting token. Bump it in all three HTML files
  whenever `css/` or `js/` changes, or returning visitors keep the old file.

---

## 6. GitHub push (added Aug 2026)

Local repo is already initialized and committed (branch `main`, 95 files). To get it onto GitHub:

1. On github.com, create a new **empty** repository (no README/.gitignore/license — we already have those) named `greenkey-africa`, visibility: private.
2. Generate a token to push with: GitHub → Settings → Developer settings → Personal access tokens → Fine-grained tokens → Generate new token, scoped to just this repo, permission "Contents: Read and write".
3. From `/Users/laana/Desktop/Freelance/greenkey`:
   ```bash
   git remote add origin https://github.com/<your-username>/greenkey-africa.git
   git push -u origin main
   ```
   When git prompts for credentials, the username is your GitHub username and the password is the token from step 2 (not your GitHub account password).

## 7. Deploy on Vercel (account setup)

1. Sign up at vercel.com — choose "Continue with GitHub" so Vercel can import the repo directly.
2. Add New Project → Import `greenkey-africa`.
3. **Root Directory: `website`** — critical, the repo root is not the deploy root.
4. Deploy, then add the env vars from section 3 above and redeploy.

## 8. Move greenkeyafrica.com off Wix and onto Vercel

The domain is registered *and* currently hosted at Wix — no need to transfer registrars, just repoint DNS.

1. In Vercel: Project → Settings → Domains → add `greenkeyafrica.com` and `www.greenkeyafrica.com`. Vercel shows a domain card with the exact A-record IP and CNAME target **for this specific project** — Vercel now hands out different values per project/account, so use whatever is shown there, not a value copied from elsewhere or from an old guide.
2. In Wix: account → Domains → select `greenkeyafrica.com` → find "DNS Records" / "Advanced DNS" (this is domain management, separate from the website editor). If it's set to "Connect to a Wix site," switch it to manual DNS records.
3. Remove any existing A/AAAA/CNAME records Wix added for `@` and `www`, then add:
   - A record, host `@`, value = the IP from Vercel's domain card
   - CNAME record, host `www`, value = the target from Vercel's domain card
4. Check for a CAA record on the domain. If present and it doesn't allow `letsencrypt.org`, Vercel's SSL certificate will get stuck generating — update or remove it.
5. Propagation can take minutes to ~48 hours. Vercel's Domains page shows "Invalid Configuration" until the records resolve, then flips to "Valid Configuration" and auto-issues SSL.
6. Once the real domain is confirmed live, do the URL swap in section 5 above and redeploy.
