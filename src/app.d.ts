// See https://svelte.dev/docs/kit/types#app.d.ts
// for information about these interfaces
declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			session?: import('better-auth').Session;
			user?: import('better-auth').User;
			person?: import('$lib/server/db/schema').Person;
		}
		// interface PageData {}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};
