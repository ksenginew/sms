import { and, desc, eq, sql } from 'drizzle-orm';
import { error, fail, redirect } from '@sveltejs/kit';
import { db } from '$lib/server/db';
import { classPerson, classes } from '$lib/server/db/schema';
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

function readIntParam(value: string | null, fallback: number) {
	if (!value) return fallback;
	const parsed = Number.parseInt(value, 10);
	return Number.isFinite(parsed) ? parsed : fallback;
}

export const load = async ({ locals, url }) => {
	if (!locals.person) return error(401, 'Unauthorized');
	// Build a role object so the route asks for capabilities instead of checking
	// raw role strings in multiple places.
	const roleContext = createRoleContext(locals.person);
	const isAdmin = roleContext.canManageClassCatalog();

	const search = (url.searchParams.get('search') ?? '').trim();
	const limit = Math.max(1, Math.min(100, readIntParam(url.searchParams.get('limit'), 20)));
	const offset = Math.max(0, readIntParam(url.searchParams.get('offset'), 0));

	const searchCondition = search
		? sql`classes.rowid IN (SELECT rowid FROM classes_fts WHERE classes_fts MATCH ${search} ORDER BY rank)`
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
		// Admin view can see all classes. Search is optional.
		const filters = [];
		if (searchCondition) filters.push(searchCondition);

		const whereClause =
			filters.length === 0 ? undefined : filters.length === 1 ? filters[0] : and(...filters);

		classesList = whereClause
			? await db.select().from(classes).where(whereClause).orderBy(desc(classes.updatedAt)).limit(limit).offset(offset)
			: await db.select().from(classes).orderBy(desc(classes.updatedAt)).limit(limit).offset(offset);
	} else {
		// Non-admin users only see classes they are assigned to and that are visible.
		const filters = [eq(classPerson.personId, locals.person.id)];
		filters.push(eq(classes.visible, true));
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
			.orderBy(desc(classes.updatedAt))
			.limit(limit)
			.offset(offset);
	}

	const totalResult = isAdmin
		// Count query mirrors the same visibility/search rules used for row fetch.
		? await db
				.select({ count: sql<number>`count(*)` })
				.from(classes)
				.where(searchCondition)
				.get()
		: await db
				.select({ count: sql<number>`count(*)` })
				.from(classPerson)
				.innerJoin(classes, eq(classes.id, classPerson.classId))
				.where(
					and(
						eq(classPerson.personId, locals.person.id),
						eq(classes.visible, true),
						searchCondition
					)
				)
				.get();

	const total = Number(totalResult?.count ?? 0);
	const hasPrevious = offset > 0;
	const hasNext = offset + classesList.length < total;

	return {
		classesList,
		search,
		limit,
		offset,
		total,
		hasPrevious,
		hasNext,
		previousOffset: Math.max(0, offset - limit),
		nextOffset: offset + limit,
		isAdmin
	};
};

export const actions = {
	create: async ({ request, locals }) => {
		// Only class-catalog managers (currently admin) may create classes.
		const roleContext = createRoleContext(locals.person);
		if (!roleContext.canManageClassCatalog()) throw error(403, 'Forbidden');

		const formData = await request.formData();
		const title = readValue(formData, 'title');

		if (!title) {
			return actionError('create', 'Title is required.');
		}

		try {
			// Keep the write payload minimal and rely on DB defaults for timestamps.
			await db.insert(classes).values({
				title,
				description: readValue(formData, 'description'),
				visible: formData.get('visible') === 'on',
				updatedBy: locals.user!.id
			});
		} catch {
			return internalActionError('create');
		}

		throw redirect(303, '/dashboard/classes');
	},
};