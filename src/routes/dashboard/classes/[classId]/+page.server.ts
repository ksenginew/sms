import { and, eq } from 'drizzle-orm';
import { error, fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { classPerson, classes, people } from '$lib/server/db/schema';

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

async function requirePerson(locals: App.Locals) {
	if (!locals.session || !locals.user || !locals.person) {
		throw error(401, 'Unauthorized');
	}

	return locals.person;
}

async function canAccessClass(personId: string, classId: string) {
	const memberRow = await db
		.select({ id: classPerson.id })
		.from(classPerson)
		.where(and(eq(classPerson.personId, personId), eq(classPerson.classId, classId)))
		.limit(1)
		.get();

	return Boolean(memberRow);
}

async function canManageClass(person: App.Locals['person'], classId: string) {
	if (!person) return false;
	if (person.role === 'admin') return true;
	if (person.role !== 'teacher') return false;
	return canAccessClass(person.id, classId);
}

export const load = async ({ locals, params, url }) => {
	const person = await requirePerson(locals);
	const isAdmin = person.role === 'admin';
	const canManageMembers = person.role === 'admin' || person.role === 'teacher';

	const classId = params.classId;
	const classItem = await db.select().from(classes).where(eq(classes.id, classId)).limit(1).get();

	if (!classItem) {
		throw error(404, 'Class not found');
	}

	if (!isAdmin && !classItem.visible) {
		throw error(403, 'Forbidden');
	}

	if (!isAdmin && !(await canAccessClass(person.id, classId))) {
		throw error(403, 'Forbidden');
	}

	const members = await db
		.select({
			id: people.id,
			name: people.name,
			fullname: people.fullname,
			email: people.email,
			role: people.role
		})
		.from(classPerson)
		.innerJoin(people, eq(people.id, classPerson.personId))
		.where(eq(classPerson.classId, classId));

	const backParams = new URLSearchParams();
	const search = (url.searchParams.get('search') ?? '').trim();
	const showHidden = url.searchParams.get('showHidden') === '1';
	if (search) backParams.set('search', search);
	if (showHidden) backParams.set('showHidden', '1');

	return {
		classItem,
		members,
		isAdmin,
		canManageMembers,
		backLink: `/dashboard/classes${backParams.toString() ? `?${backParams.toString()}` : ''}`
	};
};

export const actions = {
	update: async ({ request, locals, params }) => {
		const person = await requirePerson(locals);
		if (person.role !== 'admin') throw error(403, 'Forbidden');

		const classId = params.classId;
		const formData = await request.formData();
		const title = readValue(formData, 'title');

		if (!title) return actionError('update', 'Title is required.');

		try {
			await db
				.update(classes)
				.set({
					title,
					description: readValue(formData, 'description'),
					visible: formData.get('visible') === 'on',
					updatedAt: new Date(),
					updatedBy: person.id
				})
				.where(eq(classes.id, classId));
		} catch {
			return internalActionError('update');
		}

		throw redirect(303, `/dashboard/classes/${classId}`);
	},
	delete: async ({ locals, params }) => {
		const person = await requirePerson(locals);
		if (person.role !== 'admin') throw error(403, 'Forbidden');

		const classId = params.classId;

		try {
			await db.delete(classPerson).where(eq(classPerson.classId, classId));
			await db.delete(classes).where(eq(classes.id, classId));
		} catch {
			return internalActionError('delete');
		}

		throw redirect(303, '/dashboard/classes');
	},
	addMember: async ({ request, locals, params }) => {
		const person = await requirePerson(locals);
		const classId = params.classId;
		const formData = await request.formData();
		const personId = readValue(formData, 'personId');

		if (!personId) {
			return actionError('addMember', 'Person is required.');
		}

		if (!(await canManageClass(person, classId))) {
			throw error(403, 'Forbidden');
		}

		try {
			const personExists = await db
				.select({ id: people.id })
				.from(people)
				.where(eq(people.id, personId))
				.limit(1)
				.get();

			if (!personExists) {
				return actionError('addMember', 'Person ID not found.');
			}

			const existing = await db
				.select({ id: classPerson.id })
				.from(classPerson)
				.where(and(eq(classPerson.classId, classId), eq(classPerson.personId, personId)))
				.limit(1)
				.get();

			if (!existing) {
				await db.insert(classPerson).values({
					classId,
					personId,
					updatedBy: person.id
				});
			}
		} catch {
			return internalActionError('addMember');
		}

		throw redirect(303, `/dashboard/classes/${classId}`);
	},
	removeMember: async ({ request, locals, params }) => {
		const person = await requirePerson(locals);
		const classId = params.classId;
		const formData = await request.formData();
		const personId = readValue(formData, 'personId');

		if (!personId) {
			return actionError('removeMember', 'Person is required.');
		}

		if (!(await canManageClass(person, classId))) {
			throw error(403, 'Forbidden');
		}

		try {
			await db
				.delete(classPerson)
				.where(and(eq(classPerson.classId, classId), eq(classPerson.personId, personId)));
		} catch {
			return internalActionError('removeMember');
		}

		throw redirect(303, `/dashboard/classes/${classId}`);
	}
};
