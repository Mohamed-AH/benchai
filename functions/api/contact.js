// /api/contact: hand the contact form to the Worker in workers/contact, bound to this site as CONTACT.
export async function onRequestPost({ request, env }) {
  if (!env.CONTACT) return new Response('The contact form is not set up yet.', { status: 503 });
  return env.CONTACT.fetch(request);
}
