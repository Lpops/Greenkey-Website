// Vercel serverless function: delivers website enquiries by email via Resend.
//
// Required environment variables (set in the Vercel dashboard):
//   RESEND_API_KEY  Resend API key.
//   CONTACT_TO      Destination inbox, e.g. info@greenkeyafrica.com
//   CONTACT_FROM    Verified sender, e.g. "Greenkey Africa <site@greenkeyafrica.com>".
//                   Until a domain is verified in Resend, leave this unset: it falls
//                   back to onboarding@resend.dev, which can ONLY deliver to the email
//                   address that owns the Resend account.

const RESEND_ENDPOINT = 'https://api.resend.com/emails';
const FALLBACK_FROM = 'Greenkey Africa <onboarding@resend.dev>';

// Which fields each form may submit, in the order they appear in the email.
const FORMS = {
  consult: {
    label: 'Consultancy enquiry',
    fields: ['name', 'organisation', 'email', 'service', 'message'],
  },
  safari: {
    label: 'Safari & tours enquiry',
    fields: ['name', 'email', 'adults', 'children', 'dates', 'interests', 'message'],
  },
};

const LABELS = {
  name: 'Name',
  organisation: 'Organisation',
  email: 'Email',
  service: 'Interested in',
  adults: 'Adults',
  children: 'Children & ages',
  dates: 'Travel dates',
  interests: 'Curious about',
  message: 'Message',
};

const MAX_FIELD = 5000;

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (c) => (
    { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
  ));
}

function isEmail(value) {
  return typeof value === 'string' && /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(value.trim());
}

function normalise(value) {
  if (Array.isArray(value)) return value.map((v) => String(v).trim()).filter(Boolean).join(', ');
  return String(value ?? '').trim();
}

function buildEmail(form, data) {
  const rows = form.fields
    .map((key) => [LABELS[key] || key, normalise(data[key])])
    .filter(([, value]) => value !== '');

  const html = `<div style="font-family:system-ui,-apple-system,'Segoe UI',sans-serif;color:#28332C;line-height:1.5">
  <h2 style="font-size:18px;margin:0 0 16px">${escapeHtml(form.label)}</h2>
  <table cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%;max-width:640px">
    ${rows.map(([label, value]) => `<tr>
      <td style="padding:8px 16px 8px 0;vertical-align:top;color:#5E7463;white-space:nowrap;border-bottom:1px solid #E6E6E6"><strong>${escapeHtml(label)}</strong></td>
      <td style="padding:8px 0;vertical-align:top;border-bottom:1px solid #E6E6E6;white-space:pre-wrap">${escapeHtml(value)}</td>
    </tr>`).join('\n    ')}
  </table>
  <p style="margin-top:20px;font-size:12px;color:#A9A9A9">Sent from the Greenkey Africa website.</p>
</div>`;

  const text = rows.map(([label, value]) => `${label}: ${value}`).join('\n');
  return { html, text };
}

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).json({ ok: false, error: 'Method not allowed.' });
  }

  const apiKey = process.env.RESEND_API_KEY;
  const to = process.env.CONTACT_TO;
  if (!apiKey || !to) {
    console.error('contact: missing RESEND_API_KEY or CONTACT_TO');
    return res.status(500).json({ ok: false, error: "The contact form isn't configured yet. Please email us directly." });
  }

  const body = typeof req.body === 'string' ? safeParse(req.body) : req.body;
  if (!body || typeof body !== 'object') {
    return res.status(400).json({ ok: false, error: 'Invalid request.' });
  }

  // Honeypot: real people never fill this in.
  if (normalise(body.company_url) !== '') {
    return res.status(200).json({ ok: true });
  }

  const form = FORMS[body.form];
  if (!form) return res.status(400).json({ ok: false, error: 'Unknown form.' });

  const name = normalise(body.name);
  const email = normalise(body.email);
  if (!name) return res.status(400).json({ ok: false, error: 'Please add your name.' });
  if (!isEmail(email)) return res.status(400).json({ ok: false, error: 'Please check your email address.' });

  for (const key of form.fields) {
    if (normalise(body[key]).length > MAX_FIELD) {
      return res.status(400).json({ ok: false, error: 'That message is too long: please shorten it.' });
    }
  }

  const { html, text } = buildEmail(form, body);

  try {
    const response = await fetch(RESEND_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: process.env.CONTACT_FROM || FALLBACK_FROM,
        to: to.split(',').map((s) => s.trim()).filter(Boolean),
        reply_to: email,
        subject: `${form.label}: ${name}`,
        html,
        text,
      }),
    });

    if (!response.ok) {
      // Log the provider's reason server-side; never expose it to the browser.
      console.error('contact: resend rejected', response.status, await response.text());
      return res.status(502).json({ ok: false, error: "We couldn't send that just now. Please email us directly." });
    }

    return res.status(200).json({ ok: true });
  } catch (err) {
    console.error('contact: request failed', err);
    return res.status(502).json({ ok: false, error: "We couldn't send that just now. Please email us directly." });
  }
}

function safeParse(raw) {
  try { return JSON.parse(raw); } catch { return null; }
}
