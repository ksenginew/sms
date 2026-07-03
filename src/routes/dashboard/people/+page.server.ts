import { error, fail, redirect } from '@sveltejs/kit';
import { desc, eq, like, or, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { ROLES, people } from '$lib/server/db/schema';
import { createRoleContext } from '$lib/server/role-context';




class PeoplePageService {
    
    
    constructor(private readonly database = db) {}

    
    
    private readValue(data: FormData | URLSearchParams, key: string) {
        const value = data.get(key)?.toString().trim();
        return value ? value : undefined;
    }

    
    
    private readIntParam(value: string | null, fallback: number) {
        if (!value) return fallback;
        const parsed = Number.parseInt(value, 10);
        return Number.isFinite(parsed) ? parsed : fallback;
    }

    
    
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

    
    
    private assertAdmin(locals: App.Locals) {
        
        
        const roleContext = createRoleContext(locals.person as App.Locals['person']);
        if (!roleContext.canManagePeople()) {
            throw error(403, 'Forbidden');
        }
    }

    
    
    async load({ locals, url }: { locals: App.Locals; url: URL }) {
        this.assertAdmin(locals);

        
        const search = this.readValue(url.searchParams, 'search')?.trim();
        const limit = Math.max(1, Math.min(100, this.readIntParam(url.searchParams.get('limit'), 20)));
        const offset = Math.max(0, this.readIntParam(url.searchParams.get('offset'), 0));

        
        
        const whereClause = search ? sql`rowid IN (SELECT rowid FROM people_fts WHERE people_fts MATCH ${search} ORDER BY rank)` : undefined;

        
        
        const [rows, totalRows, editingPerson] = await Promise.all([
            this.database.select().from(people).where(whereClause).orderBy(desc(people.createdAt)).limit(limit).offset(offset),
            this.database.select({ count: sql<number>`count(*)` }).from(people).where(whereClause).get(),
            url.searchParams.get('edit')
                ? this.database.select().from(people).where(eq(people.id, url.searchParams.get('edit')!)).limit(1).get()
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
    }

    
    
    async create({ request, locals }: { request: Request; locals: App.Locals }) {
        this.assertAdmin(locals);

        
        const formData = await request.formData();
        const role = this.readValue(formData, 'role');

        if (!role || !ROLES.includes(role as (typeof ROLES)[number])) {
            return fail(400, { message: 'Role is required.' });
        }

        try {
            
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
            
            return fail(500, { message: this.getDatabaseErrorMessage(reason) });
        }

        
        throw redirect(303, '/dashboard/people');
    }

    
    
    async update({ request, locals }: { request: Request; locals: App.Locals }) {
        this.assertAdmin(locals);

        const formData = await request.formData();
        const id = this.readValue(formData, 'id');
        const role = this.readValue(formData, 'role');

        
        if (!id) {
            return fail(400, { message: 'Missing person id.' });
        }

        
        if (!role || !ROLES.includes(role as (typeof ROLES)[number])) {
            return fail(400, { message: 'Role is required.' });
        }

        try {
            
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
            
            return fail(500, { message: this.getDatabaseErrorMessage(reason) });
        }

        
        throw redirect(303, '/dashboard/people');
    }

    
    
    
    async delete({ request, locals }: { request: Request; locals: App.Locals }) {
        this.assertAdmin(locals);

        const formData = await request.formData();
        const id = this.readValue(formData, 'id');

        
        if (!id) {
            return fail(400, { message: 'Missing person id.' });
        }

        try {
            
            await this.database.delete(people).where(eq(people.id, id));
        } catch (reason) {
            console.log(reason);
            return fail(500, { message: this.getDatabaseErrorMessage(reason) });
        }

        
        throw redirect(303, '/dashboard/people');
    }
}


const peoplePageService = new PeoplePageService();


export const load = (event) => peoplePageService.load(event);

export const actions = {
    create: (event) => peoplePageService.create(event),
    update: (event) => peoplePageService.update(event),
    delete: (event) => peoplePageService.delete(event)
};