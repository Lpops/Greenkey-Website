# Greenkey Africa website: project context

Orientation for anyone (human or agent) picking this up cold.
Operational steps live in [DEPLOY.md](DEPLOY.md); this file is the *why*.

Last verified: 30 September 2026.

---

## Status: live

| | |
| --- | --- |
| Live URL | <https://www.greenkeyafrica.com> |
| Apex | `greenkeyafrica.com` 308-redirects to `www` |
| Host | Vercel, auto-deploying from `main` |
| Repo | <https://github.com/Lpops/Greenkey-Website> |
| Deploy root | `website/` (**not** the repo root) |
| Build serving | `?v=20260929c` |
| Weight | 5.8MB, 3 pages, no build step |

Verified live: all three pages 200, `sitemap.xml`, `robots.txt` and `og-image.jpg` 200, zero forms, contact email correct throughout.

## What it is

A 3-page static marketing site for Greenkey Africa, a Kenyan sustainability
consultancy and eco-tourism operator. No framework, no build step, no runtime
dependencies. Plain HTML, CSS and one small JS file.

| Page | File | Covers |
| --- | --- | --- |
| Home | `index.html` | hero, partner logos, three pillars, metrics, standards, testimonial, CTA |
| Consultancy | `services.html` | three service pillars, implementation partners, mission and vision, founder, contact |
| Safaris & Tours | `safaris.html` | warm-toned hero, experiences, itineraries, trust panel, contact |

## How the CSS is arranged

This trips people up, so read it before editing styles.

- `css/ds/` is the **design system**, mirrored from the Claude Design project
  `GreenKey responsive website design`. Tokens for colour, typography, spacing
  and base resets, plus `components.css` (Button, Badge) ported from that
  project's React components. Treat as upstream: a future design sync overwrites it.
- `css/home.css` styles **only** the home page, which is built directly on the
  design system.
- `css/style.css` styles **services and safaris**. These pages predate the design
  system and were migrated onto it by remapping their legacy variable names
  (`--ink`, `--paper`, `--green`, `--gold`…) to design-system tokens at the top
  of the file. The markup never had to change. Edit the token mapping in
  `:root` to restyle both pages at once.

So `index.html` loads `ds/styles.css` + `home.css`; the other two load `style.css`,
which `@import`s the same tokens. There is no shared page stylesheet.

## Conventions that are easy to break

**No em dashes anywhere.** A hard client requirement. Every one was replaced by
hand with punctuation that suits the sentence (colons for definition lists,
commas for parentheticals, full stops where the clause stood alone). Currently
zero in the whole deploy folder, including code comments. Do not reintroduce them.

**Asset links carry a `?v=` cache token.** Bump it in all three HTML files
whenever anything in `css/` or `js/` changes, or returning visitors keep the old
file. This has already caused one round of confusion where a fix looked like it
had not applied.

**Scroll reveal is opt-in via a `.js` class.** `main.js` adds `js` to `<html>`,
and `.js .reveal { opacity: 0 }` hides content only once that lands. Without it
a single failed script would render the entire site blank. Do not restore the
unscoped `.reveal { opacity: 0 }` rule.

**Images are downscaled on the way in.** Originals in `project photos/` are
multi-megabyte. Everything in `website/assets/photos/` has been resized and
recompressed (hero 4.5MB → 761KB, headshot 1.3MB → 74KB). Do not copy originals
in directly.

## Decisions worth knowing

**Contact is email only.** There were two enquiry forms posting to a Vercel
serverless function (`api/contact.js`) that emails via Resend. It was fully
built and tested, but the environment variables were never set in Vercel, so
every live submission returned "not configured yet" while showing the visitor a
"Thank you" message. Enquiries were being silently lost. The forms were replaced
with contact panels: an "Email us" button, the address, and a "Helpful to
include" checklist that preserves the prompting the form fields used to do.

`api/contact.js` and its handler in `main.js` are **still in the repo but
dormant**, nothing references them. Re-enabling means restoring the form markup
and setting `RESEND_API_KEY`, `CONTACT_TO`, `CONTACT_FROM`. Resend also needs
`greenkeyafrica.com` verified, otherwise its fallback sender only delivers to the
Resend account owner.

**All contact goes to `naheed.popat@greenkeyafrica.com`.** Replaced `info@`
site-wide, and added to the home footer which previously had no address at all.

**The home page came from a design import**, which is why its content differs
from the older services and safaris pages, and why it uses a separate stylesheet.

**The founder section replaced a six-card advisor grid** that was entirely
placeholder copy ("Advisor Name", "Full bio goes here"). Now one real bio and
headshot for Naheed Popat, plus mission and vision statements.

## DNS: handle with care

Registered at **Wix** (the domain was transferred there from GoDaddy, so GoDaddy
access is irrelevant). Nameservers `ns4`/`ns5.wixdns.net`. Registration paid to
**2027-10-23**.

| Record | Value | Note |
| --- | --- | --- |
| `@` A | `216.198.79.1` | Vercel |
| `www` CNAME | `7804a1c735c0fcc1.vercel-dns-017.com` | Vercel, per-project |
| MX × 5 | Google Workspace | **do not touch** |

**Never point the nameservers at Vercel.** Email runs on Google Workspace through
this zone. Moving nameservers would drop the MX records and kill
`naheed.popat@greenkeyafrica.com`, which is now the only contact route on the site.
Change A and CNAME records only.

A snapshot of the pre-migration zone is in
[DNS-BACKUP-greenkeyafrica.com.txt](DNS-BACKUP-greenkeyafrica.com.txt).

To move the domain off Wix, it first had to be unassigned from the published Wix
site; Wix refuses while it is a live site's primary domain. The old Wix site still
exists and can be reassigned a free `wixsite.com` address.

## Open items

**Canonical points at the apex, but `www` is what serves.** Vercel has `www` as
the primary domain, so `greenkeyafrica.com` 308s to `www.greenkeyafrica.com` -
while every `canonical`, `og:url` and sitemap entry says the apex. The cleanest
fix is to make the apex primary in Vercel, which needs no code change. The
alternative is rewriting those 16 URLs to `www`. Decide one way; do not leave
them disagreeing.

**No Projects page.** The old Wix site had one; this site has no equivalent, and
11 optimised project photos sit unreferenced in `assets/photos/` (I&M HQ, Vienna
Court, City Lodge Dar, French Embassy, Eaton Place, Crawford, Makini Ngong and
Kisumu, I&M Rwanda, Rosslyn Grove, Hub Karen). For a consultancy this is usually
load-bearing credibility. Roughly an hour to rebuild from assets already present.

**No SPF or DMARC record.** The zone has no TXT records at all, so mail from the
domain has nothing vouching for it and is more likely to be filtered. Matters
more now that email is the only contact channel. Google Workspace's value is
`v=spf1 include:_spf.google.com ~all`.

**Stale GoDaddy records.** `calendar` and `mail` still CNAME to
`secureserver.net`. Dead pointers, safe to delete.

**Copy to sanity-check.** The home page headlines "Three pillars, one practice"
while the metrics band says "5 sectors served". Also `/favicon.ico` 404s for
legacy browsers; modern ones use `assets/favicon.svg`.

## Local development

```bash
cd website && python3 -m http.server 4173
```

The contact function cannot run under a static server. To exercise it, run the
real handler behind HTTP with the harness pattern described in the git history,
or deploy a preview on Vercel.

## Repo layout

```
greenkey/
├── website/            <- deploy root
│   ├── index.html services.html safaris.html
│   ├── css/  ds/ (design system) · home.css · style.css
│   ├── js/main.js
│   ├── api/contact.js  <- dormant
│   ├── assets/ photos (25) · logos (13) · logo.svg · favicon.svg · og-image.jpg
│   └── vercel.json robots.txt sitemap.xml
├── project photos/     <- full-size originals, not deployed
├── partner logos/      <- source logos, not deployed
├── DEPLOY.md CONTEXT.md DNS-BACKUP-greenkeyafrica.com.txt
└── greenkey logo.svg Greenkey-Color-Pallette.svg Typography Documentation.svg
```
