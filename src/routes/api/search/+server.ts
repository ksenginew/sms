import { error, json } from '@sveltejs/kit';
import { and, desc, eq, like, or, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { classPerson, classes, exam_class, exams, people } from '$lib/server/db/schema';

function readIntParam(value: string | null, fallback: number) {
    if (!value) return fallback;
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function toSafeFtsQuery(raw: string) {
    return raw
        .trim()
        .split(/\s+/)
        .filter(Boolean)
        .map((token) => `"${token.replace(/"/g, '""')}"`)
        .join(' AND ');
}

type SearchResultCard = {
    key: string;
    type: 'people' | 'classes' | 'attendance' | 'exams';
    title: string;
    subtitle: string;
    href: string;
};

export const GET = async ({ locals, url }) => {
    if (!locals.session || !locals.user || !locals.person) {
        throw error(401, 'Unauthorized');
    }

    const query = (url.searchParams.get('q') ?? '').trim();
    const safeFtsQuery = toSafeFtsQuery(query);
    const limit = Math.max(1, Math.min(24, readIntParam(url.searchParams.get('limit'), 12)));

    if (!query) {
        return json({
            query,
            results: [] as SearchResultCard[]
        });
    }

    const role = locals.person.role;
    const perTypeLimit = Math.max(3, Math.ceil(limit / 3));

    const classesSearchCondition = sql`classes.rowid IN (SELECT rowid FROM classes_fts WHERE classes_fts MATCH ${safeFtsQuery} ORDER BY rank)`;
    const examsSearchCondition = sql`exams.rowid IN (SELECT rowid FROM exams_fts WHERE exams_fts MATCH ${safeFtsQuery} ORDER BY rank)`;
    const peopleSearchCondition = sql`people.rowid IN (SELECT rowid FROM people_fts WHERE people_fts MATCH ${safeFtsQuery} ORDER BY rank)`;

    let classRows: Array<{ id: string; title: string; description: string | null }> = [];
    let examRows: Array<{ id: number; title: string; description: string | null }> = [];
    let peopleRows: Array<{ id: string; name: string | null; role: string }> = [];

    try {
        classRows = role === 'admin'
            ? await db
                .select({
                    id: classes.id,
                    title: classes.title,
                    description: classes.description
                })
                .from(classes)
                .where(classesSearchCondition)
                .orderBy(desc(classes.updatedAt))
                .limit(perTypeLimit)
            : await db
                .select({
                    id: classes.id,
                    title: classes.title,
                    description: classes.description
                })
                .from(classPerson)
                .innerJoin(classes, eq(classes.id, classPerson.classId))
                .where(and(eq(classPerson.personId, locals.person.id), eq(classes.visible, true), classesSearchCondition))
                .orderBy(desc(classes.updatedAt))
                .limit(perTypeLimit);

        examRows = role === 'admin'
            ? await db
                .select({
                    id: exams.id,
                    title: exams.title,
                    description: exams.description
                })
                .from(exams)
                .where(examsSearchCondition)
                .orderBy(desc(exams.createdAt))
                .limit(perTypeLimit)
            : await db
                .select({
                    id: exams.id,
                    title: exams.title,
                    description: exams.description
                })
                .from(classPerson)
                .innerJoin(exam_class, eq(exam_class.classId, classPerson.classId))
                .innerJoin(exams, eq(exams.id, exam_class.examId))
                .where(and(eq(classPerson.personId, locals.person.id), eq(exams.visible, true), examsSearchCondition))
                .orderBy(desc(exams.createdAt))
                .limit(perTypeLimit);

        peopleRows = role === 'admin'
            ? await db
                .select({
                    id: people.id,
                    name: people.name,
                    role: people.role
                })
                .from(people)
                .where(peopleSearchCondition)
                .orderBy(desc(people.createdAt))
                .limit(perTypeLimit)
            : [];
    } catch {
        // Fallback for malformed/unsupported FTS syntax inputs.
        classRows = role === 'admin'
            ? await db
                .select({ id: classes.id, title: classes.title, description: classes.description })
                .from(classes)
                .where(or(like(classes.title, `%${query}%`), like(classes.description, `%${query}%`)))
                .orderBy(desc(classes.updatedAt))
                .limit(perTypeLimit)
            : await db
                .select({ id: classes.id, title: classes.title, description: classes.description })
                .from(classPerson)
                .innerJoin(classes, eq(classes.id, classPerson.classId))
                .where(
                    and(
                        eq(classPerson.personId, locals.person.id),
                        eq(classes.visible, true),
                        or(like(classes.title, `%${query}%`), like(classes.description, `%${query}%`))
                    )
                )
                .orderBy(desc(classes.updatedAt))
                .limit(perTypeLimit);

        examRows = role === 'admin'
            ? await db
                .select({ id: exams.id, title: exams.title, description: exams.description })
                .from(exams)
                .where(or(like(exams.title, `%${query}%`), like(exams.description, `%${query}%`)))
                .orderBy(desc(exams.createdAt))
                .limit(perTypeLimit)
            : await db
                .select({ id: exams.id, title: exams.title, description: exams.description })
                .from(classPerson)
                .innerJoin(exam_class, eq(exam_class.classId, classPerson.classId))
                .innerJoin(exams, eq(exams.id, exam_class.examId))
                .where(
                    and(
                        eq(classPerson.personId, locals.person.id),
                        eq(exams.visible, true),
                        or(like(exams.title, `%${query}%`), like(exams.description, `%${query}%`))
                    )
                )
                .orderBy(desc(exams.createdAt))
                .limit(perTypeLimit);

        peopleRows = role === 'admin'
            ? await db
                .select({ id: people.id, name: people.name, role: people.role })
                .from(people)
                .where(or(like(people.name, `%${query}%`), like(people.email, `%${query}%`), like(people.idnumber, `%${query}%`)))
                .orderBy(desc(people.createdAt))
                .limit(perTypeLimit)
            : [];
    }

    const examMap = new Map<number, { id: number; title: string; description: string | null }>();
    for (const row of examRows) {
        if (!examMap.has(row.id)) {
            examMap.set(row.id, row);
        }
    }

    const results: SearchResultCard[] = [];

    for (const row of peopleRows) {
        results.push({
            key: `people:${row.id}`,
            type: 'people',
            title: row.name || row.id,
            subtitle: `Role: ${row.role}`,
            href: '/dashboard/people'
        });
    }

    for (const row of classRows) {
        results.push({
            key: `classes:${row.id}`,
            type: 'classes',
            title: row.title,
            subtitle: row.description || 'Class',
            href: `/dashboard/classes/${row.id}`
        });

        results.push({
            key: `attendance:${row.id}`,
            type: 'attendance',
            title: `Attendance: ${row.title}`,
            subtitle: 'Open class attendance',
            href: `/dashboard/attendance/${row.id}`
        });
    }

    for (const row of examMap.values()) {
        results.push({
            key: `exams:${row.id}`,
            type: 'exams',
            title: row.title,
            subtitle: row.description || 'Exam',
            href: `/dashboard/exams/${row.id}`
        });
    }

    return json({
        query,
        results: results.slice(0, limit)
    });
};
