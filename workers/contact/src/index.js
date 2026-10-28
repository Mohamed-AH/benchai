// Contact form: check the Turnstile answer and the fields, then email the message to the site owner.
// Every answer is a redirect back to a page of the site, so the form works as a plain HTML form.
import { EmailMessage } from 'cloudflare:email';

const LIMITS = { name: 100, email: 200, message: 5000 };

export default {
  async fetch(request, env) {
    const fail = lang => Response.redirect(`${env.SITE}/${lang}/contact-error`, 303);
    if (request.method !== 'POST') return new Response('Method not allowed', { status: 405, headers: { Allow: 'POST' } });
    const origin = request.headers.get('Origin');
    if (origin && origin !== env.SITE) return new Response('Forbidden', { status: 403 });

    let form;
    try { form = await request.formData(); } catch { return fail('en'); }
    const field = k => String(form.get(k) || '').trim();
    const lang = field('lang') === 'ar' ? 'ar' : 'en';
    const name = field('name'), email = field('email'), message = field('message');

    // "website" is hidden from people; only bots fill it in. Pretend it worked.
    if (field('website')) return Response.redirect(`${env.SITE}/${lang}/contact-sent`, 303);
    if (!name || name.length > LIMITS.name || email.length > LIMITS.email || !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(email)
        || message.length < 10 || message.length > LIMITS.message) return fail(lang);

    const check = await fetch('https://challenges.cloudflare.com/turnstile/v0/siteverify', {
      method: 'POST',
      body: new URLSearchParams({ secret: env.TURNSTILE_SECRET, response: field('cf-turnstile-response'), remoteip: request.headers.get('CF-Connecting-IP') || '' }),
    }).then(r => r.json()).catch(() => ({ success: false }));
    if (!check.success) return fail(lang);

    const text = `Name: ${name}\nEmail: ${email}\nPage language: ${lang}\n\n${message}\n`;
    const raw = [
      `From: "imamabdulaziz.com" <${env.CONTACT_FROM}>`,
      `To: <${env.CONTACT_TO}>`,
      `Reply-To: ${displayName(name)} <${email}>`,
      `Subject: ${headerText('Website message from ' + name)}`,
      `Date: ${new Date().toUTCString()}`,
      `Message-ID: <${crypto.randomUUID()}@imamabdulaziz.com>`,
      'MIME-Version: 1.0',
      'Content-Type: text/plain; charset=UTF-8',
      'Content-Transfer-Encoding: base64',
      '',
      base64(text).replace(/.{76}/g, '$&\r\n'),
    ].join('\r\n');

    try {
      await env.MAIL.send(new EmailMessage(env.CONTACT_FROM, env.CONTACT_TO, raw));
    } catch (err) {
      console.error('send failed', err);
      return fail(lang);
    }
    return Response.redirect(`${env.SITE}/${lang}/contact-sent`, 303);
  },
};

// Header text may be Arabic, and must not carry line breaks.
function headerText(s) {
  const clean = s.replace(/[\r\n]/g, ' ');
  if (/^[\x20-\x7e]*$/.test(clean)) return clean;
  // one encoded word per 15 characters keeps each well under the 75-character limit
  const chars = [...clean], words = [];
  for (let i = 0; i < chars.length; i += 15) words.push(`=?UTF-8?B?${base64(chars.slice(i, i + 15).join(''))}?=`);
  return words.join('\r\n ');
}

function displayName(s) {
  const clean = s.replace(/[\r\n"\\]/g, ' ');
  return /^[\x20-\x7e]*$/.test(clean) ? `"${clean}"` : headerText(clean);
}

function base64(s) {
  let bin = '';
  for (const b of new TextEncoder().encode(s)) bin += String.fromCharCode(b);
  return btoa(bin);
}
