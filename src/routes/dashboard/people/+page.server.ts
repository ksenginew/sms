import { error, fail, redirect } from '@sveltejs/kit';
import { desc, eq, like, or, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { ROLES, people } from '$lib/server/db/schema';

function readValue(data: FormData | URLSearchParams, key: string) {
    const value = data.get(key)?.toString().trim();
    return value ? value : undefined;
}

function getDatabaseErrorMessage(reason: unknown) {
    const message = reason instanceof Error ? reason.message : String(reason);

    if (/FOREIGN KEY constraint failed/i.test(message)) {
        return 'The selected user ID does not exist.';
    }

    if (/NOT NULL constraint failed/i.test(message)) {
        return 'Please fill in all required fields.';
    }

    if (/UNIQUE constraint failed/i.test(message)) {
        return 'A person with the same value already exists.';
    }

    return 'Something went wrong while saving the person. Please try again.';
}

function readIntParam(value: string | null, fallback: number) {
    if (!value) return fallback;
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : fallback;
}

export const load = async ({ locals, url }) => {
    if (locals.person?.role !== 'admin') {
        throw error(403, 'Forbidden');
    }

    const search = readValue(url.searchParams, 'search')?.trim()
    const limit = Math.max(1, Math.min(100, readIntParam(url.searchParams.get('limit'), 20)));
    const offset = Math.max(0, readIntParam(url.searchParams.get('offset'), 0));
    const whereClause = search ? sql`rowid IN (SELECT rowid FROM people_fts WHERE people_fts MATCH ${search} ORDER BY rank)` : undefined;

    const [rows, totalRows, editingPerson] = await Promise.all([
        db.select().from(people).where(whereClause).orderBy(desc(people.createdAt)).limit(limit).offset(offset),
        db.select({ count: sql<number>`count(*)` }).from(people).where(whereClause).get(),
        url.searchParams.get('edit')
            ? db.select().from(people).where(eq(people.id, url.searchParams.get('edit')!)).limit(1).get()
            : Promise.resolve(null)
    ]);

    const total = Number(totalRows?.count ?? 0);
    const hasPrevious = offset > 0;
    const hasNext = offset + rows.length < total;

    return {
        people: rows,
        editingPerson,
        search: search ?? '',
        limit,
        offset,
        total,
        hasPrevious,
        hasNext,
        previousOffset: Math.max(0, offset - limit),
        nextOffset: offset + limit
    };
};

export const actions = {
    create: async ({ request, locals }) => {
        if (locals.person?.role !== 'admin') {
            throw error(403, 'Forbidden');
        }
        const formData = await request.formData();
        const role = readValue(formData, 'role');

        if (!role || !ROLES.includes(role as (typeof ROLES)[number])) {
            return fail(400, { message: 'Role is required.' });
        }

        try {
            await db.insert(people).values({
                name: readValue(formData, 'name'),
                email: readValue(formData, 'email'),
                idnumber: readValue(formData, 'idnumber'),
                phone: readValue(formData, 'phone'),
                mobilePhone: readValue(formData, 'mobilePhone'),
                address: readValue(formData, 'address'),
                role: role as (typeof ROLES)[number],
                userId: readValue(formData, 'userId'),
                updatedBy: locals.person?.id
            });
        } catch (reason) {
            return fail(500, { message: getDatabaseErrorMessage(reason) });
        }

        throw redirect(303, '/dashboard/people');
    },
    update: async ({ request, locals }) => {
        if (locals.person?.role !== 'admin') {
            throw error(403, 'Forbidden');
        }
        const formData = await request.formData();
        const id = readValue(formData, 'id');
        const role = readValue(formData, 'role');

        if (!id) {
            return fail(400, { message: 'Missing person id.' });
        }

        if (!role || !ROLES.includes(role as (typeof ROLES)[number])) {
            return fail(400, { message: 'Role is required.' });
        }

        try {
            await db.update(people).set({
                name: readValue(formData, 'name'),
                email: readValue(formData, 'email'),
                idnumber: readValue(formData, 'idnumber'),
                phone: readValue(formData, 'phone'),
                mobilePhone: readValue(formData, 'mobilePhone'),
                address: readValue(formData, 'address'),
                role: role as (typeof ROLES)[number],
                userId: readValue(formData, 'userId'),
                updatedBy: locals.person?.id,
                updatedAt: new Date()
            }).where(eq(people.id, id));
        } catch (reason) {
            return fail(500, { message: getDatabaseErrorMessage(reason) });
        }

        throw redirect(303, '/dashboard/people');
    },
    delete: async ({ request, locals }) => {
        if (locals.person?.role !== 'admin') {
            throw error(403, 'Forbidden');
        }
        const formData = await request.formData();
        const id = readValue(formData, 'id');

        if (!id) {
            return fail(400, { message: 'Missing person id.' });
        }

        try {
            await db.delete(people).where(eq(people.id, id));
        } catch (reason) {
            return fail(500, { message: getDatabaseErrorMessage(reason) });
        }
        throw redirect(303, '/dashboard/people');
    }
};