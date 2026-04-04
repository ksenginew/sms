import { auth } from "$lib/server/auth";
import { svelteKitHandler } from "better-auth/svelte-kit";
import { building } from "$app/environment";
import { db } from "$lib/server/db";
import { eq } from "drizzle-orm";
import { people } from "$lib/server/db/schema";
import { redirect } from "@sveltejs/kit";


// const devRoles = {
//   "external": "external-user-0001",
//   "admin": "auth-user-0001",
//   "teacher": "auth-user-0051",
//   "student": "auth-user-0251",
//   "ustudent": "auth-user-1001",
// }

/**
 * Test users;
 * admin: admin.0001@eduscend.school
 * teacher: teacher.0051@eduscend.school
 * student: student.0251@eduscend.school
 * unlinked student: student.1001@eduscend.school
 * external user: external.0001@eduscend.school
 * 
 * password for all users: password
 */

export async function handle({ event, resolve }) {
  const session = await auth.api.getSession({
    headers: event.request.headers,
  });

  if (session) {
    // If the user is already authenticated and trying to access the sign-in or sign-up page, redirect them to the dashboard.
    if (event.url.pathname === "/auth/signup" || event.url.pathname === "/auth/signin") return redirect(302, "/dashboard");

    event.locals.session = session.session;
    event.locals.user = session.user;
    event.locals.person = await db.select().from(people).where(eq(people.userId, session.user.id)).limit(1).get()
  }
  
  // If the user is not authenticated and trying to access a protected route, redirect them to the sign-in page.
  else if (event.url.pathname === "/auth/signout" || event.url.pathname.startsWith("/dashboard")) {
    return redirect(302, "/auth/signin");
  }

  return svelteKitHandler({ event, resolve, auth, building });
}