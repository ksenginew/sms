import { error, fail, redirect } from '@sveltejs/kit';
import { desc, eq, like, or, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { ROLES, people } from '$lib/server/db/schema';
import { createRoleContext } from '$lib/server/role-context';

// This page is intentionally organized as a small service object.
// The route handlers at the bottom stay thin, while the service owns
// the actual business logic for loading, creating, updating, and deleting people.
class PeoplePageService {
    // The database dependency is injected so the class is easier to test
    // and so the route does not reach for the DB directly.
    constructor(private readonly database = db) {}

    // Read a form or query parameter, trim it, and normalize empty strings to undefined.
    // This keeps validation and insert/update logic from repeating the same cleanup steps.
    private readValue(data: FormData | URLSearchParams, key: string) {
        const value = data.get(key)?.toString().trim();
        return value ? value : undefined;
    }

    // Parse a numeric query parameter safely.
    // If the value is missing or invalid, the caller gets the fallback instead.
    private readIntParam(value: string | null, fallback: number) {
        if (!value) return fallback;
        const parsed = Number.parseInt(value, 10);
        return Number.isFinite(parsed) ? parsed : fallback;
    }

    // Convert low-level database errors into messages that are safe to show in the UI.
    // This is a small abstraction layer between SQLite/Drizzle errors and user-facing text.
    private getDatabaseErrorMessage(reason: unknown) {
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

    // Centralized authorization check.
    // Every operation in this page is restricted to admins, so the rule lives in one place.
    private assertAdmin(locals: App.Locals) {
        // Role checks are delegated to the shared inherited role context.
        // This avoids hard-coding string comparisons in each route.
        const roleContext = createRoleContext(locals.person as App.Locals['person']);
        if (!roleContext.canManagePeople()) {
            throw error(403, 'Forbidden');
        }
    }

    // Load the list page state: search term, pagination, and the optional record being edited.
    // This is the read-side flow for the page.
    async load({ locals, url }: { locals: App.Locals; url: URL }) {
        this.assertAdmin(locals);

        // Normalize request filters before building the SQL query.
        const search = this.readValue(url.searchParams, 'search')?.trim();
        const limit = Math.max(1, Math.min(100, this.readIntParam(url.searchParams.get('limit'), 20)));
        const offset = Math.max(0, this.readIntParam(url.searchParams.get('offset'), 0));

        // When a search term is present, use the FTS table.
        // Otherwise, return all people ordered by newest first.
        const whereClause = search ? sql`rowid IN (SELECT rowid FROM people_fts WHERE people_fts MATCH ${search} ORDER BY rank)` : undefined;

        // Fetch the current page of rows, the total count, and the edit target in parallel.
        // Doing these queries together keeps the page responsive.
        const [rows, totalRows, editingPerson] = await Promise.all([
            this.database.select().from(people).where(whereClause).orderBy(desc(people.createdAt)).limit(limit).offset(offset),
            this.database.select({ count: sql<number>`count(*)` }).from(people).where(whereClause).get(),
            url.searchParams.get('edit')
                ? this.database.select().from(people).where(eq(people.id, url.searchParams.get('edit')!)).limit(1).get()
                : Promise.resolve(null)
        ]);

        // The count is used to decide whether the pagination UI should show next/previous links.
        const total = Number(totalRows?.count ?? 0);
        const hasPrevious = offset > 0;
        const hasNext = offset + rows.length < total;

        // Return a single shape to the Svelte page so the UI stays simple.
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
    }

    // Create a new person record from the submitted form.
    // This is the write-side flow for the page.
    async create({ request, locals }: { request: Request; locals: App.Locals }) {
        this.assertAdmin(locals);

        // Read the form once and validate the required role field before inserting anything.
        const formData = await request.formData();
        const role = this.readValue(formData, 'role');

        if (!role || !ROLES.includes(role as (typeof ROLES)[number])) {
            return fail(400, { message: 'Role is required.' });
        }

        try {
            // Insert only after validation succeeds.
            await this.database.insert(people).values({
                name: this.readValue(formData, 'name'),
                email: this.readValue(formData, 'email'),
                idnumber: this.readValue(formData, 'idnumber'),
                phone: this.readValue(formData, 'phone'),
                mobilePhone: this.readValue(formData, 'mobilePhone'),
                address: this.readValue(formData, 'address'),
                role: role as (typeof ROLES)[number],
                userId: this.readValue(formData, 'userId'),
                updatedBy: locals.user?.id
            });
        } catch (reason) {
            console.log(reason);
            // Convert database-specific errors into a friendlier response for the form.
            return fail(500, { message: this.getDatabaseErrorMessage(reason) });
        }

        // On success, send the user back to the listing page.
        throw redirect(303, '/dashboard/people');
    }

    // Update an existing person record.
    // This follows the same input rules as create, but requires an id.
    async update({ request, locals }: { request: Request; locals: App.Locals }) {
        this.assertAdmin(locals);

        const formData = await request.formData();
        const id = this.readValue(formData, 'id');
        const role = this.readValue(formData, 'role');

        // An update must target an existing row.
        if (!id) {
            return fail(400, { message: 'Missing person id.' });
        }

        // Role remains mandatory because it is a core domain field.
        if (!role || !ROLES.includes(role as (typeof ROLES)[number])) {
            return fail(400, { message: 'Role is required.' });
        }

        try {
            // The update statement writes all editable fields in one pass.
            await this.database
                .update(people)
                .set({
                    name: this.readValue(formData, 'name'),
                    email: this.readValue(formData, 'email'),
                    idnumber: this.readValue(formData, 'idnumber'),
                    phone: this.readValue(formData, 'phone'),
                    mobilePhone: this.readValue(formData, 'mobilePhone'),
                    address: this.readValue(formData, 'address'),
                    role: role as (typeof ROLES)[number],
                    userId: this.readValue(formData, 'userId'),
                    updatedBy: locals.user?.id,
                    updatedAt: new Date()
                })
                .where(eq(people.id, id));
        } catch (reason) {
            console.log(reason);
            // Reuse the same error mapping so the UI behaves consistently.
            return fail(500, { message: this.getDatabaseErrorMessage(reason) });
        }

        // Redirect after a successful save so refresh does not resubmit the form.
        throw redirect(303, '/dashboard/people');
    }

    // Delete a person record.
    // This action is intentionally small because the business rule is simple:
    // admin only, require an id, then remove the row.
    async delete({ request, locals }: { request: Request; locals: App.Locals }) {
        this.assertAdmin(locals);

        const formData = await request.formData();
        const id = this.readValue(formData, 'id');

        // Deletion cannot proceed without a target id.
        if (!id) {
            return fail(400, { message: 'Missing person id.' });
        }

        try {
            // The schema-level foreign key rules will handle dependent data safely.
            await this.database.delete(people).where(eq(people.id, id));
        } catch (reason) {
            console.log(reason);
            return fail(500, { message: this.getDatabaseErrorMessage(reason) });
        }

        // Keep navigation behavior consistent with create and update.
        throw redirect(303, '/dashboard/people');
    }
}

// Single reusable service instance for this route module.
const peoplePageService = new PeoplePageService();

// Thin adapter functions: SvelteKit calls these exports, and they delegate to the service.
export const load = (event) => peoplePageService.load(event);

export const actions = {
    create: (event) => peoplePageService.create(event),
    update: (event) => peoplePageService.update(event),
    delete: (event) => peoplePageService.delete(event)
};