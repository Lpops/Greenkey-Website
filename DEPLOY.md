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
| `CONTACT_TO`     | `info@greenkeyafrica.com` (comma-separate for several) |
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

## Known gaps at launch

- **Advisor section** on `/services` is still placeholder copy — real bios pending.
- `/favicon.ico` 404s for legacy browsers. Modern ones use `assets/favicon.svg`.
- Hero text contrast over the pale river photo is on the soft side; the scrim can be
  darkened in `css/home.css` if you want it stronger.
- `assets/photos/spiceken-epz.jpg` (869KB) is no longer referenced by any page —
  safe to delete if you don't want it back in a project gallery later.
