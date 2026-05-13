import { and, eq } from 'drizzle-orm';
import { error, fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { classPerson, classes, people } from '$lib/server/db/schema';
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

async function requirePerson(locals: App.Locals) {
	// This route requires a fully linked authenticated user context.
	if (!locals.session || !locals.user || !locals.person) {
		throw error(401, 'Unauthorized');
	}

	return locals.person;
}

export const load = async ({ locals, params, url }) => {
	const person = await requirePerson(locals);
	// Build role capability object once and reuse for all policy checks.
	const roleContext = createRoleContext(person);
	const isAdmin = roleContext.canManageClassCatalog();
	const canManageMembers = roleContext.canManageClassMembers();

	const classId = params.classId;
	const classItem = await db.select().from(classes).where(eq(classes.id, classId)).limit(1).get();

	if (!classItem) {
		throw error(404, 'Class not found');
	}

	// Membership and class access policy are now centralized in role-context.
	const isMember = await roleContext.isMemberOfClass(db, classId);

	if (!roleContext.canViewClassDetail(classItem.visible, isMember)) {
		throw error(403, 'Forbidden');
	}

	const members = await db
		.select({
			id: people.id,
			name: people.name,
			email: people.email,
			role: people.role
		})
		.from(classPerson)
		.innerJoin(people, eq(people.id, classPerson.personId))
		.where(eq(classPerson.classId, classId));

	const backParams = new URLSearchParams();
	// Preserve list-page filters when user navigates back from class detail page.
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
		const roleContext = createRoleContext(person);
		// Class metadata updates are restricted to class-catalog managers.
		if (!roleContext.canManageClassCatalog()) throw error(403, 'Forbidden');

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
					updatedBy: locals.user!.id
				})
				.where(eq(classes.id, classId));
		} catch {
			return internalActionError('update');
		}

		throw redirect(303, `/dashboard/classes/${classId}`);
	},
	delete: async ({ locals, params }) => {
		const person = await requirePerson(locals);
		const roleContext = createRoleContext(person);
		// Class deletion is also restricted to class-catalog managers.
		if (!roleContext.canManageClassCatalog()) throw error(403, 'Forbidden');

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
		const roleContext = createRoleContext(person);
		const classId = params.classId;
		const formData = await request.formData();
		const personId = readValue(formData, 'personId');

		if (!personId) {
			return actionError('addMember', 'Person is required.');
		}

		// Teachers may manage only their own classes; admins can manage all.
		if (!(await roleContext.canManageMembersForClass(db, classId))) {
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

			// Skip insert when membership already exists.
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
					updatedBy: locals.user!.id
				});
			}
		} catch {
			return internalActionError('addMember');
		}

		throw redirect(303, `/dashboard/classes/${classId}`);
	},
	removeMember: async ({ request, locals, params }) => {
		const person = await requirePerson(locals);
		const roleContext = createRoleContext(person);
		const classId = params.classId;
		const formData = await request.formData();
		const personId = readValue(formData, 'personId');

		if (!personId) {
			return actionError('removeMember', 'Person is required.');
		}

		if (!(await roleContext.canManageMembersForClass(db, classId))) {
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
