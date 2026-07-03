import { error, fail, redirect } from '@sveltejs/kit';
import { and, desc, eq, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { exams, people, classes, exam_class } from '$lib/server/db/schema';
import { createRoleContext } from '$lib/server/role-context';

export class ExamsPageService {
	constructor(private readonly database = db) {}

	private readValue(data: FormData | URLSearchParams, key: string): string | undefined {
		const value = data.get(key)?.toString().trim();
		return value ? value : undefined;
	}

	private readIntParam(value: string | null, fallback: number): number {
		if (!value) return fallback;
		const parsed = Number.parseInt(value, 10);
		return Number.isFinite(parsed) ? parsed : fallback;
	}

	private actionError(action: string, message: string, status = 400) {
		return fail(status, { action, message });
	}

	private internalActionError(action: string) {
		return fail(500, { action, message: 'Server error. Please try again.' });
	}

	private assertCanManageExams(person: App.Locals['person'] | null) {
		const roleContext = createRoleContext(person);
		if (!roleContext.canManageClassCatalog()) {
			throw error(403, 'Forbidden');
		}
	}

	async load({ locals, url }: { locals: App.Locals; url: URL }) {
		// Authentication check
		if (!locals.session || !locals.user) {
			throw error(401, 'Unauthorized');
		}

		// Load or reuse cached person record
		const person =
			locals.person ??
			(await this.database
				.select()
				.from(people)
				.where(eq(people.userId, locals.user.id))
				.limit(1)
				.get());

		if (!person) {
			throw error(401, 'Unauthorized');
		}

		// Determine admin status for visibility rules
		const roleContext = createRoleContext(person);
		const isAdmin = roleContext.canManageClassCatalog();

		// Parse and normalize request parameters
		const search = (url.searchParams.get('search') ?? '').trim();
		const limit = Math.max(1, Math.min(100, this.readIntParam(url.searchParams.get('limit'), 20)));
		const offset = Math.max(0, this.readIntParam(url.searchParams.get('offset'), 0));

		// Build search condition using FTS if search term is provided
		const searchCondition = search
			? sql`exams.rowid IN (SELECT rowid FROM exams_fts WHERE exams_fts MATCH ${search} ORDER BY rank)`
			: undefined;

		// Build visibility and search filters
		const filters = [];
		if (!isAdmin) {
			// Non-admins can only see visible exams
			filters.push(eq(exams.visible, true));
		}
		if (searchCondition) {
			filters.push(searchCondition);
		}

		const whereClause = filters.length > 0 ? and(...filters) : undefined;

		// Fetch list and count in parallel for better performance
		const [examsList, totalResult, allClasses] = await Promise.all([
			whereClause
				? this.database
						.select()
						.from(exams)
						.where(whereClause)
						.orderBy(desc(exams.createdAt))
						.limit(limit)
						.offset(offset)
				: this.database
						.select()
						.from(exams)
						.orderBy(desc(exams.createdAt))
						.limit(limit)
						.offset(offset),
			whereClause
				? this.database
						.select({ count: sql<number>`count(*)` })
						.from(exams)
						.where(whereClause)
						.get()
				: this.database
						.select({ count: sql<number>`count(*)` })
						.from(exams)
						.get(),
			this.database.select().from(classes).orderBy(desc(classes.title))
		]);

		// Extract pagination state
		const total = Number(totalResult?.count ?? 0);
		const hasPrevious = offset > 0;
		const hasNext = offset + examsList.length < total;

		// Extract unique grades from class tags for the create form dropdown
		const gradesSet = new Set<string>();
		allClasses.forEach((cls) => {
			if (cls.tags && Array.isArray(cls.tags)) {
				cls.tags.forEach((tag) => {
					if (tag.startsWith('grade-')) {
						gradesSet.add(tag);
					}
				});
			}
		});

		const grades = Array.from(gradesSet).sort();

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
			isAdmin,
			allClasses,
			grades
		};
	}

	async create({ request, locals }: { request: Request; locals: App.Locals }) {
		// Authorization check
		this.assertCanManageExams(locals.person ?? null);

		const formData = await request.formData();
		const title = this.readValue(formData, 'title');

		// Title is required
		if (!title) {
			return this.actionError('create', 'Title is required.');
		}

		// Parse and normalize tags
		const rawTags = this.readValue(formData, 'tags');
		const tags = rawTags
			? rawTags
					.split(',')
					.map((tag) => tag.trim())
					.filter(Boolean)
			: undefined;

		try {
			// Insert exam and get the generated ID
			const examResult = await this.database
				.insert(exams)
				.values({
					title,
					description: this.readValue(formData, 'description'),
					tags,
					visible: formData.get('visible') === 'on',
					updatedBy: locals.user?.id ?? null
				})
				.returning({ id: exams.id });

			const examId = examResult[0]?.id;
			if (!examId) throw new Error('Failed to get exam ID');

			// Handle class assignments
			const selectedClassIds = formData
				.getAll('selectedClasses')
				.map((val) => val.toString())
				.filter(Boolean);

			if (selectedClassIds.length > 0) {
				const classExamPairs = selectedClassIds.map((classId) => ({
					examId,
					classId,
					updatedBy: locals.user?.id ?? null
				}));

				await this.database.insert(exam_class).values(classExamPairs);
			}
		} catch {
			return this.internalActionError('create');
		}

		throw redirect(303, '/dashboard/exams');
	}
}
