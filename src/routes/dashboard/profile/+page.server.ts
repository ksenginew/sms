import { fail } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { auth } from '$lib/server/auth';
import { db } from '$lib/server/db';
import { people, account } from '$lib/server/db/schema';
import { eq } from 'drizzle-orm';
import fs from 'fs/promises';

function formDataGet(formData: FormData, key: string): string | undefined {
    const value = formData.get(key);
    return typeof value === 'string' ? value : undefined;
}

export const load: PageServerLoad = async (event) => {
    const user = event.locals.user!;

    // Get user's person record from people table
    const personRecord = await db.select().from(people).where(eq(people.userId, user.id)).limit(1);

    return {
        user,
        person: personRecord[0] || null,
        accounts: (await auth.api.listUserAccounts({
            headers: event.request.headers
        })).map(account => ({
            providerId: account.providerId,
            accountId: account.accountId,
            createdAt: account.createdAt,
        }))
    };
};

export const actions: Actions = {
    updateProfile: async (event) => {
        const formData = await event.request.formData();
        const name = formDataGet(formData, 'name');
        const email = formDataGet(formData, 'email');

        if (!name || !email) {
            return fail(400, { message: 'Name and email are required' });
        }

        try {
            // Update user info in better-auth
            await auth.api.updateUser({
                body: {
                    name,
                },
                headers: event.request.headers
            });
            await auth.api.changeEmail({
                body: {
                    newEmail: email,
                },
                headers: event.request.headers
            });

            // Update or create person record in people table
            const existingPerson = await db
                .select()
                .from(people)
                .where(eq(people.userId, event.locals.user!.id))
                .limit(1);

            if (existingPerson.length > 0) {
                // Update existing record
                await db
                    .update(people)
                    .set({
                        name,
                        email,
                        updatedBy: event.locals.user!.id
                    })
                    .where(eq(people.id, existingPerson[0].id));
            }

            return {
                success: true,
                message: 'Profile updated successfully.' + (
                    email !== event.locals.user!.email
                        ? ' Please check your new email to verify the change.'
                        : ''
                )
            };
        } catch (error) {
            console.error('Profile update error:', error);
            return fail(500, { message: 'Failed to update profile' });
        }
    },
    uploadImage: async (event) => {
        const formData = await event.request.formData();
        const imageFile = formData.get('image');
        if (!(imageFile instanceof File)) {
            return fail(400, { message: 'Invalid image file' });
        }

        if (imageFile.size > 5 * 1024 * 1024) { // 5MB limit
            return fail(400, { message: 'Image file size exceeds 5MB' });
        }

        if (!['image/jpeg', 'image/png', 'image/gif'].includes(imageFile.type)) {
            return fail(400, { message: 'Invalid image file type. Please upload a JPEG, PNG, or GIF file.' });
        }

        try {
            // save in fs
            const imagePath = `uploads/${crypto.randomUUID()}-${imageFile.name}`;
            const arrayBuffer = await imageFile.arrayBuffer();
            const buffer = Buffer.from(arrayBuffer);
            await fs.writeFile(imagePath, buffer);

            await auth.api.updateUser({
                body: {
                    image: `/${imagePath}`,
                },
                headers: event.request.headers
            });
            await db
                .update(people)
                .set({
                    image: `/${imagePath}`,
                    updatedBy: event.locals.user!.id
                })
                .where(eq(people.userId, event.locals.user!.id));
                
            return {
                success: true,
                message: 'Image uploaded successfully',
                imageUrl: `/${imagePath}`
            };
        } catch (error) {
            console.error('Image upload error:', error);
            return fail(500, { message: 'Failed to upload image' });
        }
    }
};
