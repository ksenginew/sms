import { db } from '$lib/server/db/index.js';
import { classes, classPerson, people } from '$lib/server/db/schema.js';
import { error } from '@sveltejs/kit';
import { eq,and } from 'drizzle-orm';

export const load = async ({ locals }) => {
    if (!locals.session || !locals.user) {
        throw error(401, 'Unauthorized');
    }

    return {
        user: locals.user,
        person: locals.person!,
    };
};
