import { error, fail, redirect } from '@sveltejs/kit';
import { desc, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { ROLES, people } from '$lib/server/db/schema';
import { admin } from 'better-auth/plugins/admin';

function readValue(formData: FormData, key: string) {
    const value = formData.get(key)?.toString().trim();
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

export const load = async ({ locals, url }) => {
    if (locals.person?.role !== 'admin') {
        throw error(403, 'Forbidden');
    }

    const [rows, editingPerson] = await Promise.all([
        db.select().from(people).orderBy(desc(people.createdAt)),
        url.searchParams.get('edit')
            ? db.select().from(people).where(eq(people.id, url.searchParams.get('edit')!)).limit(1).get()
            : Promise.resolve(null)
    ]);

    return {
        people: rows,
        editingPerson
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
                fullname: readValue(formData, 'fullname'),
                email: readValue(formData, 'email'),
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
                fullname: readValue(formData, 'fullname'),
                email: readValue(formData, 'email'),
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