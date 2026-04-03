import { fail, redirect } from '@sveltejs/kit';
import { auth } from '$lib/server/auth';
import type { Actions } from './$types';

export const actions: Actions = {
	signup: async ({ request }) => {
		const formData = await request.formData();
		const fullName = formData.get('fullName')?.toString().trim() ?? '';
		const email = formData.get('email')?.toString().trim() ?? '';
		const password = formData.get('password')?.toString() ?? '';
		const confirmPassword = formData.get('confirmPassword')?.toString() ?? '';

		if (!fullName || !email || !password || !confirmPassword) {
			return fail(400, { message: 'All fields are required.' });
		}

		if (password !== confirmPassword) {
			return fail(400, { message: 'Passwords do not match.' });
		}

		try {
			await auth.api.signUpEmail({
				body: {
					name: fullName,
					email,
					password,
					callbackURL: '/dashboard'
				},
				headers: request.headers
			});
		} catch (error) {
			const message = error instanceof Error ? error.message : 'Unable to create your account.';
			return fail(400, { message });
		}

		throw redirect(303, '/dashboard');
	}
};