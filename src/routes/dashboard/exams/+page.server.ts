import { error } from '@sveltejs/kit';
import { and, desc, eq, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { exams, people } from '$lib/server/db/schema';

function readIntParam(value: string | null, fallback: number) {
	if (!value) return fallback;
	const parsed = Number.parseInt(value, 10);
	return Number.isFinite(parsed) ? parsed : fallback;
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

	const isAdmin = person.role === 'admin';
	const search = (url.searchParams.get('search') ?? '').trim();
	const limit = Math.max(1, Math.min(100, readIntParam(url.searchParams.get('limit'), 20)));
	const offset = Math.max(0, readIntParam(url.searchParams.get('offset'), 0));

	const searchCondition = search
		? sql`exams.rowid IN (SELECT rowid FROM exams_fts WHERE exams_fts MATCH ${search} ORDER BY rank)`
		: undefined;

	const filters = [];
	if (!isAdmin) {
		filters.push(eq(exams.visible, true));
	}
	if (searchCondition) {
		filters.push(searchCondition);
	}

	const whereClause = filters.length > 0 ? and(...filters) : undefined;

	const examsList = whereClause
		? await db.select().from(exams).where(whereClause).orderBy(desc(exams.createdAt)).limit(limit).offset(offset)
		: await db.select().from(exams).orderBy(desc(exams.createdAt)).limit(limit).offset(offset);

	const totalResult = whereClause
		? await db.select({ count: sql<number>`count(*)` }).from(exams).where(whereClause).get()
		: await db.select({ count: sql<number>`count(*)` }).from(exams).get();

	const total = Number(totalResult?.count ?? 0);
	const hasPrevious = offset > 0;
	const hasNext = offset + examsList.length < total;

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
		isAdmin
	};
};
