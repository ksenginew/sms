import { error, fail, redirect } from '@sveltejs/kit';
import { and, desc, eq, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { exams, people, classes, exam_class } from '$lib/server/db/schema';
import { createRoleContext } from '$lib/server/role-context';

function readIntParam(value: string | null, fallback: number) {
	if (!value) return fallback;
	const parsed = Number.parseInt(value, 10);
	return Number.isFinite(parsed) ? parsed : fallback;
}

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

	const roleContext = createRoleContext(person);
	// Admins can see all exams. Other roles only see visible exams.
	const isAdmin = roleContext.canManageClassCatalog();
	const search = (url.searchParams.get('search') ?? '').trim();
	const limit = Math.max(1, Math.min(100, readIntParam(url.searchParams.get('limit'), 20)));
	const offset = Math.max(0, readIntParam(url.searchParams.get('offset'), 0));

	const searchCondition = search
		? sql`exams.rowid IN (SELECT rowid FROM exams_fts WHERE exams_fts MATCH ${search} ORDER BY rank)`
		: undefined;

	const filters = [];
	if (!isAdmin) {
		// Enforce exam visibility for non-admin roles.
		filters.push(eq(exams.visible, true));
	}
	if (searchCondition) {
		// Add FTS match condition only when user provided a search term.
		filters.push(searchCondition);
	}

	const whereClause = filters.length > 0 ? and(...filters) : undefined;

	const examsList = whereClause
		// Reuse same where clause for data query.
		? await db.select().from(exams).where(whereClause).orderBy(desc(exams.createdAt)).limit(limit).offset(offset)
		: await db.select().from(exams).orderBy(desc(exams.createdAt)).limit(limit).offset(offset);

	const totalResult = whereClause
		// Count query mirrors list query so pagination stays accurate.
		? await db.select({ count: sql<number>`count(*)` }).from(exams).where(whereClause).get()
		: await db.select({ count: sql<number>`count(*)` }).from(exams).get();

	const total = Number(totalResult?.count ?? 0);
	const hasPrevious = offset > 0;
	const hasNext = offset + examsList.length < total;

	// Load all classes for the create form
	const allClasses = await db.select().from(classes).orderBy(desc(classes.title));

	// Extract unique grades from class tags
	const gradesSet = new Set<string>();
	allClasses.forEach((cls) => {
		if (cls.tags && Array.isArray(cls.tags)) {
			cls.tags.forEach((tag) => {
				if (tag.startsWith('grade-')) {
					gradesSet.add(tag);
				}
			});
		}
	});

	const grades = Array.from(gradesSet).sort();

	return {
		examsList,
		search,
		limit,
		offset,
		total,
		hasPrevious,
		hasNext,
		previousOffset: Math.max(0, offset - limit),
		nextOffset: offset + limit,
		isAdmin,
		allClasses,
		grades
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

		if (!title) {
			return actionError('create', 'Title is required.');
		}

		const rawTags = readValue(formData, 'tags');
		const tags = rawTags
			? rawTags
				.split(',')
				.map((tag) => tag.trim())
				.filter(Boolean)
			: undefined;

		try {
			// Insert the exam
			const examResult = await db
				.insert(exams)
				.values({
					title,
					description: readValue(formData, 'description'),
					tags,
					visible: formData.get('visible') === 'on',
					updatedBy: locals.user?.id ?? null
				})
				.returning({ id: exams.id });

			const examId = examResult[0]?.id;
			if (!examId) throw new Error('Failed to get exam ID');

			// Handle selected classes
			const selectedClassIds = formData
				.getAll('selectedClasses')
				.map((val) => val.toString())
				.filter(Boolean);

			if (selectedClassIds.length > 0) {
				const classExamPairs = selectedClassIds.map((classId) => ({
					examId,
					classId,
					updatedBy: locals.user?.id ?? null
				}));

				await db.insert(exam_class).values(classExamPairs);
			}
		} catch {
			return internalActionError('create');
		}

		throw redirect(303, '/dashboard/exams');
	}
};
