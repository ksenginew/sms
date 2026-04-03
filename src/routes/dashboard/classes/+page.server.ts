import { and, desc, eq, like, or } from 'drizzle-orm';
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

export const load = async ({ locals, url }) => {
	const person = await requirePerson(locals);
	const isAdmin = person.role === 'admin';

	const search = (url.searchParams.get('search') ?? '').trim();
	const showHidden = url.searchParams.get('showHidden') === '1';

	const searchCondition = search
		? or(like(classes.title, `%${search}%`), like(classes.description, `%${search}%`))
		: undefined;

	let classesList: Array<{
		id: string;
		title: string;
		description: string | null;
		visible: boolean;
		createdAt: Date;
		updatedAt: Date;
	}> = [];

	if (isAdmin) {
		const filters = [];
		if (searchCondition) filters.push(searchCondition);

		const whereClause =
			filters.length === 0 ? undefined : filters.length === 1 ? filters[0] : and(...filters);

		classesList = whereClause
			? await db.select().from(classes).where(whereClause).orderBy(desc(classes.updatedAt))
			: await db.select().from(classes).orderBy(desc(classes.updatedAt));
	} else {
		const filters = [eq(classPerson.personId, person.id)];
		if (!showHidden) filters.push(eq(classes.visible, true));
		if (searchCondition) filters.push(searchCondition);

		classesList = await db
			.select({
				id: classes.id,
				title: classes.title,
				description: classes.description,
				visible: classes.visible,
				createdAt: classes.createdAt,
				updatedAt: classes.updatedAt
			})
			.from(classPerson)
			.innerJoin(classes, eq(classes.id, classPerson.classId))
			.where(and(...filters))
			.orderBy(desc(classes.updatedAt));
	}

	return {
		classesList,
		search,
		showHidden,
		isAdmin
	};
};

export const actions = {
	create: async ({ request, locals }) => {
		const person = await requirePerson(locals);
		if (person.role !== 'admin') throw error(403, 'Forbidden');

		const formData = await request.formData();
		const title = readValue(formData, 'title');

		if (!title) {
			return actionError('create', 'Title is required.');
		}

		try {
			await db.insert(classes).values({
				title,
				description: readValue(formData, 'description'),
				visible: formData.get('visible') === 'on',
				updatedBy: person.id
			});
		} catch {
			return internalActionError('create');
		}

		throw redirect(303, '/dashboard/classes');
	},
};