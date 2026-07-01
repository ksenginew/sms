import { error, fail, redirect } from '@sveltejs/kit';
import { desc, eq, like, count } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { subjects, people } from '$lib/server/db/schema';
import { createRoleContext } from '$lib/server/role-context';

function readValue(formData: FormData, key: string) {
	const value = formData.get(key)?.toString().trim();
	return value ? value : undefined;
}

function actionError(action: string, message: string, status = 400) {
	return fail(status, { action, message });
}

function internalActionError(action: string) {
	return fail(500, { action, message: 'Server error. Please try again.' });
}

export const load = async ({ locals, url }) => {
	if (!locals.session || !locals.user) {
		throw error(401, 'Unauthorized');
	}

	const person =
		locals.person ??
		(await db.select().from(people).where(eq(people.userId, locals.user.id)).limit(1).get());

	if (!person) {
		throw error(401, 'Unauthorized');
	}

	// Admin only
	if (person.role !== 'admin') {
		throw error(403, 'Forbidden');
	}

	const search = url.searchParams.get('search') || '';
	const limit = Math.min(parseInt(url.searchParams.get('limit') || '10', 10), 100);
	const offset = Math.max(parseInt(url.searchParams.get('offset') || '0', 10), 0);

	let query = db.select().from(subjects);

	if (search) {
		query = query.where(like(subjects.title, `%${search}%`)) as any;
	}

	const subjectsList = await query.orderBy(desc(subjects.title)).limit(limit).offset(offset);

	// Get total count
	let countQuery = db.select({ count: count() }).from(subjects) as any;
	if (search) {
		countQuery = countQuery.where(like(subjects.title, `%${search}%`));
	}
	const totalResult = await countQuery.get();
	const total = totalResult?.count || 0;

	const hasPrevious = offset > 0;
	const hasNext = offset + limit < total;
	const previousOffset = Math.max(0, offset - limit);
	const nextOffset = offset + limit;

	return {
		subjectsList,
		search,
		limit,
		offset,
		total,
		hasPrevious,
		hasNext,
		previousOffset,
		nextOffset
	};
};

export const actions = {
	create: async ({ request, locals }) => {
		const roleContext = createRoleContext(locals.person ?? null);
		if (!roleContext.canManageClassCatalog()) {
			throw error(403, 'Forbidden');
		}

		const formData = await request.formData();
		const title = readValue(formData, 'title');
		const description = readValue(formData, 'description');

		if (!title) {
			return actionError('create', 'Title is required.');
		}

		try {
			// Check if subject already exists
			const existingSubject = await db
				.select()
				.from(subjects)
				.where(eq(subjects.title, title))
				.limit(1)
				.get();

			if (existingSubject) {
				return actionError('create', 'A subject with this title already exists.');
			}

			await db.insert(subjects).values({
				title,
				description: description || null,
				updatedBy: locals.user?.id ?? null
			});
		} catch {
			return internalActionError('create');
		}

		throw redirect(303, '/dashboard/exams/subjects');
	},

	edit: async ({ request, locals, url }) => {
		const roleContext = createRoleContext(locals.person ?? null);
		if (!roleContext.canManageClassCatalog()) {
			throw error(403, 'Forbidden');
		}

		const formData = await request.formData();
		const id = readValue(formData, 'id');
		const title = readValue(formData, 'title');
		const description = readValue(formData, 'description');

		if (!id || !title) {
			return actionError('edit', 'Invalid request.');
		}

		try {
			// Check if another subject has this title
			const existingSubject = await db
				.select()
				.from(subjects)
				.where(eq(subjects.title, title))
				.limit(1)
				.get();

			if (existingSubject && existingSubject.id !== id) {
				return actionError('edit', 'A subject with this title already exists.');
			}

			await db
				.update(subjects)
				.set({
					title,
					description: description || null,
					updatedBy: locals.user?.id ?? null
				})
				.where(eq(subjects.id, id));
		} catch {
			return internalActionError('edit');
		}

		const searchParams = new URLSearchParams(url.searchParams);
		throw redirect(303, `/dashboard/exams/subjects?${searchParams.toString()}`);
	},

	delete: async ({ request, locals, url }) => {
		const roleContext = createRoleContext(locals.person ?? null);
		if (!roleContext.canManageClassCatalog()) {
			throw error(403, 'Forbidden');
		}

		const formData = await request.formData();
		const id = readValue(formData, 'id');

		if (!id) {
			return actionError('delete', 'Invalid request.');
		}

		try {
			await db.delete(subjects).where(eq(subjects.id, id));
		} catch {
			return internalActionError('delete');
		}

		const searchParams = new URLSearchParams(url.searchParams);
		throw redirect(303, `/dashboard/exams/subjects?${searchParams.toString()}`);
	}
};
