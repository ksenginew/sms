import { auth } from "$lib/server/auth";
import { svelteKitHandler } from "better-auth/svelte-kit";
import { building } from "$app/environment";
import { test_person, test_session, test_user } from "./test";

const dev = true;

export async function handle({ event, resolve }) {
  const session = await auth.api.getSession({
    headers: event.request.headers,
  });

  if (session) {
    event.locals.session = session.session;
    event.locals.user = session.user;
  } else if (dev) {
    event.locals.session = test_session;
    event.locals.user = test_user;
    event.locals.person = test_person
  }

  return svelteKitHandler({ event, resolve, auth, building });
}