// import { error, fail, redirect } from '@sveltejs/kit';
// import { and, desc, eq, inArray, isNotNull, sql } from 'drizzle-orm';
// import { db } from '$lib/server/db';
// import {
// 	classPerson,
// 	exam_class,
// 	exams,
// 	people,
// 	papers,
// 	scores,
// 	subjects
// } from '$lib/server/db/schema';
// import { createRoleContext } from '$lib/server/role-context';

// function readValue(formData: FormData, key: string) {
// 	const value = formData.get(key)?.toString().trim();
// 	return value ? value : undefined;
// }

// function actionError(action: string, message: string, status = 400) {
// 	return fail(status, { action, message });
// }

// function internalActionError(action: string) {
// 	return fail(500, { action, message: 'Server error. Please try again.' });
// }

// function clampPercentage(value: number) {
// 	if (!Number.isFinite(value)) return 0;
// 	return Math.max(0, Math.min(100, value));
// }

// function readIntParam(value: string | null, fallback: number) {
// 	if (!value) return fallback;
// 	const parsed = Number.parseInt(value, 10);
// 	return Number.isFinite(parsed) ? parsed : fallback;
// }

// export const load = async ({ locals, params, url }: any) => {
// 	if (!locals.session || !locals.user) {
// 		throw error(401, 'Unauthorized');
// 	}

// 	const person =
// 		locals.person ??
// 		(await db.select().from(people).where(eq(people.userId, locals.user.id)).limit(1).get());

// 	if (!person) {
// 		throw error(401, 'Unauthorized');
// 	}

// 	const roleContext = createRoleContext(person);
// 	const examId = Number.parseInt(params.exam, 10);
// 	const paperId = Number.parseInt(params.paper, 10);
// 	const search = (url.searchParams.get('search') ?? '').trim();
// 	const limit = Math.max(1, Math.min(100, readIntParam(url.searchParams.get('limit'), 20)));
// 	const offset = Math.max(0, readIntParam(url.searchParams.get('offset'), 0));

// 	if (!Number.isFinite(examId) || !Number.isFinite(paperId)) {
// 		throw error(404, 'Paper not found');
// 	}

// 	const exam = await db.select().from(exams).where(eq(exams.id, examId)).limit(1).get();
// 	if (!exam) {
// 		throw error(404, 'Paper not found');
// 	}

// 	if (!roleContext.canViewExam(Boolean(exam.visible))) {
// 		throw error(404, 'Paper not found');
// 	}

// 	const paper = await db
// 		.select({
// 			id: papers.id,
// 			examId: papers.examId,
// 			subjectId: papers.subjectId,
// 			title: papers.title,
// 			description: papers.description,
// 			structure: papers.structure,
// 			createdAt: papers.createdAt
// 		})
// 		.from(papers)
// 		.where(and(eq(papers.id, paperId), eq(papers.examId, examId)))
// 		.limit(1)
// 		.get();

// 	if (!paper) {
// 		throw error(404, 'Paper not found');
// 	}

// 	const subject = await db
// 		.select({ id: subjects.id, title: subjects.title })
// 		.from(subjects)
// 		.where(eq(subjects.id, paper.subjectId))
// 		.limit(1)
// 		.get();

// 	const examClasses = await db
// 		.select({ classId: exam_class.classId })
// 		.from(exam_class)
// 		.where(eq(exam_class.examId, examId));

// 	const classIds = examClasses.map((row) => row.classId);

// 	const rosterRows = classIds.length
// 		? await db
// 			.select({
// 				id: people.id,
// 				name: people.name,
// 				idnumber: people.idnumber,
// 				role: people.role
// 			})
// 			.from(classPerson)
// 			.innerJoin(people, eq(people.id, classPerson.personId))
// 			.where(and(inArray(classPerson.classId, classIds), eq(people.role, 'student')))
// 			.orderBy(desc(people.name))
// 		: [];

// 	const studentsMap = new Map<string, { id: string; name: string | null; idnumber: string | null }>();
// 	for (const row of rosterRows) {
// 		if (!studentsMap.has(row.id)) {
// 			studentsMap.set(row.id, {
// 				id: row.id,
// 				name: row.name,
// 				idnumber: row.idnumber
// 			});
// 		}
// 	}

// 	const students = Array.from(studentsMap.values());

// 	const scoreRows = await db
// 		.select({
// 			id: scores.id,
// 			personId: scores.personId,
// 			numeric: scores.numeric,
// 			updatedAt: scores.updatedAt,
// 			name: people.name,
// 			idnumber: people.idnumber
// 		})
// 		.from(scores)
// 		.innerJoin(people, eq(people.id, scores.personId))
// 		.where(and(eq(scores.paperId, paperId), isNotNull(scores.numeric)))
// 		.orderBy(desc(scores.updatedAt));

// 	const scoreMap = new Map(scoreRows.map((row) => [row.personId, row.numeric ?? null]));
// 	const enteredMarks = scoreRows.length;
// 	const totalStudents = students.length;

// 	// Absent count is determined by scores where text = 'absent' (case-insensitive)
// 	const absentCountRow = await db
// 		.select({ count: sql<number>`count(*)` })
// 		.from(scores)
// 		.where(and(eq(scores.paperId, paperId), sql`lower(${scores.text}) = 'absent'`))
// 		.get();

// 	const absentStudents = Number(absentCountRow?.count ?? 0);

// 	// Marks remaining exclude absent students
// 	const marksRemaining = Math.max(0, totalStudents - enteredMarks - absentStudents);

// 	const averageMark =
// 		enteredMarks > 0
// 			? scoreRows.reduce((sum, row) => sum + Number(row.numeric ?? 0), 0) / enteredMarks
// 			: 0;
// 	const progressPercentage = clampPercentage(averageMark);

// 	// Highest mark and corresponding student name
// 	let highestMarkValue: number | null = null;
// 	let highestMarkName: string | null = null;
// 	if (scoreRows.length > 0) {
// 		const top = scoreRows.reduce((best, row) => {
// 			const val = Number(row.numeric ?? -Infinity);
// 			return val > (best.numeric ?? -Infinity) ? row : best;
// 		}, scoreRows[0]);
// 		highestMarkValue = top.numeric ?? null;
// 		highestMarkName = top.name ?? null;
// 	}

// 	const allTableRows = roleContext.isAdmin()
// 		? scoreRows.map((row) => ({
// 			id: row.personId,
// 			name: row.name,
// 			idnumber: row.idnumber,
// 			score: row.numeric
// 		}))
// 		: students.map((student) => ({
// 			id: student.id,
// 			name: student.name,
// 			idnumber: student.idnumber,
// 			score: scoreMap.get(student.id)
// 		}));

// 	const q = search.toLowerCase();
// 	const filteredRows = allTableRows.filter((row) => {
// 		if (!q) return true;
// 		return (
// 			String(row.name ?? '').toLowerCase().includes(q) ||
// 			String(row.idnumber ?? '').toLowerCase().includes(q) ||
// 			String(row.id ?? '').toLowerCase().includes(q)
// 		);
// 	});

// 	const total = filteredRows.length;
// 	const tableRows = filteredRows.slice(offset, offset + limit);
// 	const hasPrevious = offset > 0;
// 	const hasNext = offset + tableRows.length < total;

// 	return {
// 		exam,
// 		paper,
// 		subject: subject ?? { id: paper.subjectId, title: paper.subjectId },
// 		isAdmin: roleContext.isAdmin(),
// 		students,
// 		tableRows,
// 		totalStudents,
// 		studentsWhoSat: enteredMarks,
// 		absentStudents,
// 		enteredMarks,
// 		marksRemaining,
// 		averageMark,
// 		progressPercentage,
// 		highestMarkValue,
// 		highestMarkName,
// 		search,
// 		limit,
// 		offset,
// 		total,
// 		hasPrevious,
// 		hasNext,
// 		previousOffset: Math.max(0, offset - limit),
// 		nextOffset: offset + limit
// 	};
// };

// export const actions = {
// 	enterMarks: async ({ request, locals, params }: any) => {
// 		const roleContext = createRoleContext(locals.person ?? null);
// 		if (!roleContext.canManageClassCatalog()) {
// 			throw error(403, 'Forbidden');
// 		}

// 		const examId = Number.parseInt(params.exam, 10);
// 		const paperId = Number.parseInt(params.paper, 10);
// 		if (!Number.isFinite(examId) || !Number.isFinite(paperId)) {
// 			return actionError('enterMarks', 'Invalid paper identifier.');
// 		}

// 		const formData = await request.formData();
// 		const personId = readValue(formData, 'personId');
// 		const scoreValue = readValue(formData, 'numeric');

// 		if (!personId) {
// 			return actionError('enterMarks', 'Student is required.');
// 		}

// 		if (!scoreValue) {
// 			return actionError('enterMarks', 'Score is required.');
// 		}

// 		const numeric = Number.parseFloat(scoreValue);
// 		if (!Number.isFinite(numeric)) {
// 			return actionError('enterMarks', 'Score must be a valid number.');
// 		}

// 		try {
// 			const examStudent = await db
// 				.select({ id: people.id })
// 				.from(classPerson)
// 				.innerJoin(people, eq(people.id, classPerson.personId))
// 				.innerJoin(exam_class, eq(exam_class.classId, classPerson.classId))
// 				.where(and(eq(exam_class.examId, examId), eq(people.id, personId), eq(people.role, 'student')))
// 				.limit(1)
// 				.get();

// 			if (!examStudent) {
// 				return actionError('enterMarks', 'Selected student is not linked to this exam.');
// 			}

// 			const paperRow = await db
// 				.select({ id: papers.id })
// 				.from(papers)
// 				.where(and(eq(papers.id, paperId), eq(papers.examId, examId)))
// 				.limit(1)
// 				.get();

// 			if (!paperRow) {
// 				return actionError('enterMarks', 'Paper not found.');
// 			}

// 			await db
// 				.insert(scores)
// 				.values({
// 					paperId,
// 					personId,
// 					numeric,
// 					text: null,
// 					json: null,
// 					updatedBy: locals.user?.id ?? null
// 				})
// 				.onConflictDoUpdate({
// 					target: [scores.paperId, scores.personId],
// 					set: {
// 						numeric,
// 						text: null,
// 						json: null,
// 						updatedAt: new Date(),
// 						updatedBy: locals.user?.id ?? null
// 					}
// 				});
// 		} catch {
// 			return internalActionError('enterMarks');
// 		}

// 		throw redirect(303, `/dashboard/exams/${examId}/${paperId}`);
// 	}
// };


import { error, fail, redirect } from '@sveltejs/kit';
import { and, desc, eq, inArray, isNotNull, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import {
	classPerson,
	exam_class,
	exams,
	people,
	papers,
	scores,
	subjects
} from '$lib/server/db/schema';
import { createRoleContext } from '$lib/server/role-context';

// ---------------------------------------------------------------------------
// Small utility classes
// ---------------------------------------------------------------------------

/** Wraps SvelteKit's `fail()` so callers don't repeat the shape of the payload. */
class ActionResult {
	static error(action: string, message: string, status = 400) {
		return fail(status, { action, message });
	}

	static internalError(action: string) {
		return fail(500, { action, message: 'Server error. Please try again.' });
	}
}

/** Thin wrapper around FormData that trims values and turns blanks into undefined. */
class FormReader {
	constructor(private formData: FormData) {}

	string(key: string): string | undefined {
		const value = this.formData.get(key)?.toString().trim();
		return value ? value : undefined;
	}
}

function clampPercentage(value: number) {
	if (!Number.isFinite(value)) return 0;
	return Math.max(0, Math.min(100, value));
}

function readIntParam(value: string | null, fallback: number) {
	if (!value) return fallback;
	const parsed = Number.parseInt(value, 10);
	return Number.isFinite(parsed) ? parsed : fallback;
}

// ---------------------------------------------------------------------------
// Domain types
// ---------------------------------------------------------------------------

interface RosterStudent {
	id: string;
	name: string | null;
	idnumber: string | null;
}

interface TableRow {
	id: string;
	name: string | null;
	idnumber: string | null;
	score: number | null;
}

interface PaperStats {
	totalStudents: number;
	enteredMarks: number;
	absentStudents: number;
	marksRemaining: number;
	averageMark: number;
	progressPercentage: number;
	highestMarkValue: number | null;
	highestMarkName: string | null;
}

class PaperNotFoundError extends Error {}

// ---------------------------------------------------------------------------
// PaperGradebookService — everything needed to render the gradebook page
// ---------------------------------------------------------------------------

class PaperGradebookService {
	constructor(
		private readonly db: typeof import('$lib/server/db').db,
		private readonly roleContext: ReturnType<typeof createRoleContext>
	) {}

	async loadExam(examId: number) {
		const exam = await this.db.select().from(exams).where(eq(exams.id, examId)).limit(1).get();
		if (!exam) throw new PaperNotFoundError('Paper not found');
		if (!this.roleContext.canViewExam(Boolean(exam.visible))) {
			throw new PaperNotFoundError('Paper not found');
		}
		return exam;
	}

	async loadPaper(examId: number, paperId: number) {
		const paper = await this.db
			.select({
				id: papers.id,
				examId: papers.examId,
				subjectId: papers.subjectId,
				title: papers.title,
				description: papers.description,
				structure: papers.structure,
				createdAt: papers.createdAt
			})
			.from(papers)
			.where(and(eq(papers.id, paperId), eq(papers.examId, examId)))
			.limit(1)
			.get();

		if (!paper) throw new PaperNotFoundError('Paper not found');
		return paper;
	}

	async loadSubject(subjectId: string) {
		const subject = await this.db
			.select({ id: subjects.id, title: subjects.title })
			.from(subjects)
			.where(eq(subjects.id, subjectId))
			.limit(1)
			.get();
		return subject ?? { id: subjectId, title: String(subjectId) };
	}

	async loadClassIds(examId: number): Promise<string[]> {
		const examClasses = await this.db
			.select({ classId: exam_class.classId })
			.from(exam_class)
			.where(eq(exam_class.examId, examId));
		return examClasses.map((row) => row.classId);
	}

	async loadRoster(classIds: string[]): Promise<RosterStudent[]> {
		if (!classIds.length) return [];

		const rosterRows = await this.db
			.select({
				id: people.id,
				name: people.name,
				idnumber: people.idnumber,
				role: people.role
			})
			.from(classPerson)
			.innerJoin(people, eq(people.id, classPerson.personId))
			.where(and(inArray(classPerson.classId, classIds), eq(people.role, 'student')))
			.orderBy(desc(people.name));

		const studentsMap = new Map<string, RosterStudent>();
		for (const row of rosterRows) {
			if (!studentsMap.has(row.id)) {
				studentsMap.set(row.id, { id: row.id, name: row.name, idnumber: row.idnumber });
			}
		}
		return Array.from(studentsMap.values());
	}

	async loadScores(paperId: number) {
		return this.db
			.select({
				id: scores.id,
				personId: scores.personId,
				numeric: scores.numeric,
				updatedAt: scores.updatedAt,
				name: people.name,
				idnumber: people.idnumber
			})
			.from(scores)
			.innerJoin(people, eq(people.id, scores.personId))
			.where(and(eq(scores.paperId, paperId), isNotNull(scores.numeric)))
			.orderBy(desc(scores.updatedAt));
	}

	async loadAbsentCount(paperId: number): Promise<number> {
		// Absent count is determined by scores where text = 'absent' (case-insensitive)
		const row = await this.db
			.select({ count: sql<number>`count(*)` })
			.from(scores)
			.where(and(eq(scores.paperId, paperId), sql`lower(${scores.text}) = 'absent'`))
			.get();
		return Number(row?.count ?? 0);
	}

	computeStats(
		totalStudents: number,
		scoreRows: Awaited<ReturnType<PaperGradebookService['loadScores']>>,
		absentStudents: number
	): PaperStats {
		const enteredMarks = scoreRows.length;
		// Marks remaining exclude absent students
		const marksRemaining = Math.max(0, totalStudents - enteredMarks - absentStudents);

		const averageMark =
			enteredMarks > 0
				? scoreRows.reduce((sum, row) => sum + Number(row.numeric ?? 0), 0) / enteredMarks
				: 0;

		let highestMarkValue: number | null = null;
		let highestMarkName: string | null = null;
		if (scoreRows.length > 0) {
			const top = scoreRows.reduce((best, row) => {
				const val = Number(row.numeric ?? -Infinity);
				return val > (best.numeric ?? -Infinity) ? row : best;
			}, scoreRows[0]);
			highestMarkValue = top.numeric ?? null;
			highestMarkName = top.name ?? null;
		}

		return {
			totalStudents,
			enteredMarks,
			absentStudents,
			marksRemaining,
			averageMark,
			progressPercentage: clampPercentage(averageMark),
			highestMarkValue,
			highestMarkName
		};
	}

	buildTableRows(
		students: RosterStudent[],
		scoreRows: Awaited<ReturnType<PaperGradebookService['loadScores']>>
	): TableRow[] {
		if (this.roleContext.isAdmin()) {
			return scoreRows.map((row) => ({
				id: row.personId,
				name: row.name,
				idnumber: row.idnumber,
				score: row.numeric
			}));
		}

		const scoreMap = new Map(scoreRows.map((row) => [row.personId, row.numeric ?? null]));
		return students.map((student) => ({
			id: student.id,
			name: student.name,
			idnumber: student.idnumber,
			score: scoreMap.get(student.id) ?? null
		}));
	}

	filterRows(rows: TableRow[], search: string): TableRow[] {
		const q = search.toLowerCase();
		if (!q) return rows;
		return rows.filter(
			(row) =>
				String(row.name ?? '').toLowerCase().includes(q) ||
				String(row.idnumber ?? '').toLowerCase().includes(q) ||
				String(row.id ?? '').toLowerCase().includes(q)
		);
	}

	paginate(rows: TableRow[], limit: number, offset: number) {
		const total = rows.length;
		const pageRows = rows.slice(offset, offset + limit);
		return {
			pageRows,
			total,
			hasPrevious: offset > 0,
			hasNext: offset + pageRows.length < total,
			previousOffset: Math.max(0, offset - limit),
			nextOffset: offset + limit
		};
	}
}

// ---------------------------------------------------------------------------
// MarksEntryService — everything needed to handle the `enterMarks` action
// ---------------------------------------------------------------------------

class MarksEntryValidationError extends Error {}

class MarksEntryService {
	constructor(private readonly db: typeof import('$lib/server/db').db) {}

	async assertStudentLinkedToExam(examId: number, personId: string) {
		const examStudent = await this.db
			.select({ id: people.id })
			.from(classPerson)
			.innerJoin(people, eq(people.id, classPerson.personId))
			.innerJoin(exam_class, eq(exam_class.classId, classPerson.classId))
			.where(
				and(eq(exam_class.examId, examId), eq(people.id, personId), eq(people.role, 'student'))
			)
			.limit(1)
			.get();

		if (!examStudent) {
			throw new MarksEntryValidationError('Selected student is not linked to this exam.');
		}
	}

	async assertPaperExists(examId: number, paperId: number) {
		const paperRow = await this.db
			.select({ id: papers.id })
			.from(papers)
			.where(and(eq(papers.id, paperId), eq(papers.examId, examId)))
			.limit(1)
			.get();

		if (!paperRow) {
			throw new MarksEntryValidationError('Paper not found.');
		}
	}

	async upsertScore(paperId: number, personId: string, numeric: number, updatedBy: string | null) {
		await this.db
			.insert(scores)
			.values({
				paperId,
				personId,
				numeric,
				text: null,
				json: null,
				updatedBy
			})
			.onConflictDoUpdate({
				target: [scores.paperId, scores.personId],
				set: {
					numeric,
					text: null,
					json: null,
					updatedAt: new Date(),
					updatedBy
				}
			});
	}
}

// ---------------------------------------------------------------------------
// SvelteKit glue — load() and actions stay as required exports, but now just
// orchestrate calls into the services above.
// ---------------------------------------------------------------------------

export const load = async ({ locals, params, url }: any) => {
	if (!locals.session || !locals.user) {
		throw error(401, 'Unauthorized');
	}

	const person =
		locals.person ??
		(await db.select().from(people).where(eq(people.userId, locals.user.id)).limit(1).get());

	if (!person) {
		throw error(401, 'Unauthorized');
	}

	const roleContext = createRoleContext(person);
	const service = new PaperGradebookService(db, roleContext);

	const examId = Number.parseInt(params.exam, 10);
	const paperId = Number.parseInt(params.paper, 10);
	const search = (url.searchParams.get('search') ?? '').trim();
	const limit = Math.max(1, Math.min(100, readIntParam(url.searchParams.get('limit'), 20)));
	const offset = Math.max(0, readIntParam(url.searchParams.get('offset'), 0));

	if (!Number.isFinite(examId) || !Number.isFinite(paperId)) {
		throw error(404, 'Paper not found');
	}

	let exam, paper, subject;
	try {
		exam = await service.loadExam(examId);
		paper = await service.loadPaper(examId, paperId);
		subject = await service.loadSubject(paper.subjectId);
	} catch (e) {
		if (e instanceof PaperNotFoundError) throw error(404, e.message);
		throw e;
	}

	const classIds = await service.loadClassIds(examId);
	const students = await service.loadRoster(classIds);
	const scoreRows = await service.loadScores(paperId);
	const absentStudents = await service.loadAbsentCount(paperId);

	const stats = service.computeStats(students.length, scoreRows, absentStudents);
	const allTableRows = service.buildTableRows(students, scoreRows);
	const filteredRows = service.filterRows(allTableRows, search);
	const page = service.paginate(filteredRows, limit, offset);

	return {
		exam,
		paper,
		subject,
		isAdmin: roleContext.isAdmin(),
		students,
		tableRows: page.pageRows,
		...stats,
		search,
		limit,
		offset,
		total: page.total,
		hasPrevious: page.hasPrevious,
		hasNext: page.hasNext,
		previousOffset: page.previousOffset,
		nextOffset: page.nextOffset
	};
};

export const actions = {
	enterMarks: async ({ request, locals, params }: any) => {
		const roleContext = createRoleContext(locals.person ?? null);
		if (!roleContext.canManageClassCatalog()) {
			throw error(403, 'Forbidden');
		}

		const examId = Number.parseInt(params.exam, 10);
		const paperId = Number.parseInt(params.paper, 10);
		if (!Number.isFinite(examId) || !Number.isFinite(paperId)) {
			return ActionResult.error('enterMarks', 'Invalid paper identifier.');
		}

		const formData = await request.formData();
		const form = new FormReader(formData);
		const personId = form.string('personId');
		const scoreValue = form.string('numeric');

		if (!personId) {
			return ActionResult.error('enterMarks', 'Student is required.');
		}
		if (!scoreValue) {
			return ActionResult.error('enterMarks', 'Score is required.');
		}

		const numeric = Number.parseFloat(scoreValue);
		if (!Number.isFinite(numeric)) {
			return ActionResult.error('enterMarks', 'Score must be a valid number.');
		}

		const service = new MarksEntryService(db);

		try {
			await service.assertStudentLinkedToExam(examId, personId);
			await service.assertPaperExists(examId, paperId);
			await service.upsertScore(paperId, personId, numeric, locals.user?.id ?? null);
		} catch (e) {
			if (e instanceof MarksEntryValidationError) {
				return ActionResult.error('enterMarks', e.message);
			}
			return ActionResult.internalError('enterMarks');
		}

		throw redirect(303, `/dashboard/exams/${examId}/${paperId}`);
	}
};