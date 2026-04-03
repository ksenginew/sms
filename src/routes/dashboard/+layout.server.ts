import { db } from '$lib/server/db/index.js';
import { classes, classPerson, people } from '$lib/server/db/schema.js';
import { error } from '@sveltejs/kit';
import { eq,and } from 'drizzle-orm';

export const load = async ({ locals }) => {
    if (!locals.session || !locals.user) {
        throw error(401, 'Unauthorized');
    }

    const person = locals.person ?? await db.select().from(people).where(eq(people.userId, locals.user.id)).limit(1).get();

    if (!person) {
        throw error(401, 'Unauthorized');
    }

    const classesPreview = await db
        .select({ class: classes })
        .from(classes)
        .innerJoin(classPerson, eq(classes.id, classPerson.classId))
        .where(
            and(
                eq(classPerson.personId, person.id),
                eq(classes.visible, true)
            )
        );

    return {
        session: locals.session,
        user: locals.user,
        person,
        classesPreview: classesPreview.map(({ class: cls }) => (cls)),
    };
};
