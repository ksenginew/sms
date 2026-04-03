import { db } from '$lib/server/db/index.js';
import { classes, classPerson, people } from '$lib/server/db/schema.js';
import { error } from '@sveltejs/kit';
import { eq,and } from 'drizzle-orm';

export const load = async ({ locals }) => {
    if (!locals.session || !locals.user || !locals.person) {
        throw error(401, 'Unauthorized');
    }

    const classesPreview = await db
        .select({ class: classes })
        .from(classes)
        .innerJoin(classPerson, eq(classes.id, classPerson.classId))
        .where(
            and(
                eq(classPerson.personId, locals.person!.id),
                eq(classes.visible, true)
            )
        );

    return {
        session: locals.session,
        user: locals.user,
        person: locals.person!,
        classes: classesPreview.map(({ class: cls }) => (cls)),
    };
};
