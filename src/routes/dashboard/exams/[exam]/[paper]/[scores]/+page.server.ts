import { error } from '@sveltejs/kit';
import { and, eq, inArray } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { classPerson, exam_class, exams, papers, people, scores, subjects } from '$lib/server/db/schema';
import { createRoleContext } from '$lib/server/role-context';
import type { Actions, PageServerLoad } from './$types';

type RoleContext = ReturnType<typeof createRoleContext>;

type ActionRow = {
	clientId: string;
	indexNumber: string;
	mark: string;
	error?: string;
};

type RowError = {
	clientId: string;
	message: string;
};

type Member = {
	personId: string;
	role: 'admin' | 'teacher' | 'student';
	name?: string | null;
	idnumber: string | null;
};

// ---------------------------------------------------------------------------
// Value Object: Mark
// Encapsulates the one piece of business logic that decides what a raw
// string typed into the "Marks" column actually means (a number, "AB", or
// invalid). Nothing outside this class needs to know the parsing rules.
// ---------------------------------------------------------------------------
class Mark {
	private constructor(
		public readonly numeric: number | null,
		public readonly text: string | null
	) {}

	static parse(raw: string): Mark | null {
		const normalized = raw.trim().toLowerCase();

		if (normalized === 'ab' || normalized === 'abs' || normalized === 'absent') {
			return new Mark(null, 'absent');
		}

		if (!/^-?\d+$/.test(raw.trim())) {
			return null;
		}

		const numeric = Number.parseInt(raw.trim(), 10);
		if (!Number.isFinite(numeric) || numeric < 0) {
			return null;
		}

		return new Mark(numeric, null);
	}
}

// ---------------------------------------------------------------------------
// Value Object: SubmittedRow
// Wraps one raw row of form data (clientId/indexNumber/mark) and knows how
// to clean itself up and describe its own position-aware error messages.
// The rest of the code never touches raw form strings directly.
// ---------------------------------------------------------------------------
class SubmittedRow {
	readonly clientId: string;
	readonly indexNumber?: string;
	readonly mark?: string;
	readonly rawIndexNumber: string;
	readonly rawMark: string;
	readonly position: number;

	constructor(clientId: string | undefined, indexNumber: string | undefined, mark: string | undefined, position: number) {
		this.position = position;
		this.clientId = SubmittedRow.clean(clientId) ?? `row-${position + 1}`;
		this.indexNumber = SubmittedRow.clean(indexNumber);
		this.mark = SubmittedRow.clean(mark);
		this.rawIndexNumber = indexNumber ?? '';
		this.rawMark = mark ?? '';
	}

	private static clean(value: string | undefined) {
		const text = value?.toString().trim();
		return text ? text : undefined;
	}

	describeError(message: string) {
		return `Row ${this.position + 1}: ${message}`;
	}
}

// ---------------------------------------------------------------------------
// Entity: ExamPaperContext
// Loads everything that both the `load` function and the `save` action need
// (exam, paper, subject, class roster) and centralizes the class-level
// permission check. This is the piece that removes the duplication that
// existed between `load` and `actions.save` in the original file.
// ---------------------------------------------------------------------------
class ExamPaperContext {
	private constructor(
		// use looser `any` here to avoid tight coupling to generated types
		public readonly exam: any,
		public readonly paper: any,
		public readonly subject: { id: string; title: string },
		public readonly members: Member[],
		public readonly roleContext: RoleContext
	) {}

	static async load(examId: number, paperId: number, roleContext: RoleContext) {
		const exam = await db.select().from(exams).where(eq(exams.id, examId)).limit(1).get();
		if (!exam) {
			throw error(404, 'Paper not found');
		}

		const paper = await db
			.select()
			.from(papers)
			.where(and(eq(papers.id, paperId), eq(papers.examId, examId)))
			.limit(1)
			.get();

		if (!paper) {
			throw error(404, 'Paper not found');
		}

		const subject = await db
			.select({ id: subjects.id, title: subjects.title })
			.from(subjects)
			.where(eq(subjects.id, paper.subjectId))
			.limit(1)
			.get();

		const examClasses = await db
			.select({ classId: exam_class.classId })
			.from(exam_class)
			.where(eq(exam_class.examId, examId));

		const classIds = examClasses.map((row) => row.classId);

		const members: Member[] = classIds.length
			? await db
				.select({
					personId: people.id,
					role: people.role,
					name: people.name,
					idnumber: people.idnumber
				})
				.from(classPerson)
				.innerJoin(people, eq(people.id, classPerson.personId))
				.where(inArray(classPerson.classId, classIds))
				.orderBy(people.name)
			: [];

		return new ExamPaperContext(
			exam,
			paper,
			subject ?? { id: paper.subjectId, title: String(paper.subjectId) },
			members,
			roleContext
		);
	}

	/** Throws 403 unless the current person is allowed to manage this class's marks. */
	assertCanManage() {
		if (this.roleContext.isAdmin()) return;
		// `canManageAttendanceForClass` expects the class member list, not
		// an array of role strings — pass the members array.
		if (!this.roleContext.canManageAttendanceForClass(this.members)) {
			throw error(403, 'Forbidden');
		}
	}

	get students() {
		const studentMap = new Map<string, { personId: string; name: string | null; idnumber: string | null }>();
		for (const member of this.members) {
			if (member.role !== 'student') continue;
			if (!studentMap.has(member.personId)) {
				studentMap.set(member.personId, {
					personId: member.personId,
					name: member.name ?? null,
					idnumber: member.idnumber
				});
			}
		}
		return Array.from(studentMap.values());
	}

	get studentIds(): Set<string> {
		return new Set(this.members.filter((m) => m.role === 'student').map((m) => m.personId));
	}

	findStudent(personId: string) {
		return this.members.find((m) => m.personId === personId && m.role === 'student');
	}
}

// ---------------------------------------------------------------------------
// Repository: ScoreRepository
// The only class that knows how a score is persisted. If the storage
// strategy ever changes (different table, soft deletes, audit log, etc.),
// this is the single place to change it.
// ---------------------------------------------------------------------------
class ScoreRepository {
	async upsert(paperId: number, personId: string, mark: Mark, updatedBy: string) {
		await db
			.insert(scores)
			.values({
				paperId,
				personId,
				numeric: mark.numeric,
				text: mark.text,
				json: null,
				updatedBy
			})
			.onConflictDoUpdate({
				target: [scores.paperId, scores.personId],
				set: {
					numeric: mark.numeric,
					text: mark.text,
					json: null,
					updatedAt: new Date(),
					updatedBy
				}
			});
	}
}

// ---------------------------------------------------------------------------
// Aggregate: MarksBatchResult
// Collects the outcome of processing a batch of rows and knows how to
// summarize itself into the exact response shape the Svelte form expects.
// ---------------------------------------------------------------------------
class MarksBatchResult {
	readonly rowErrors: RowError[] = [];
	readonly savedRowIds: string[] = [];
	readonly remainingRows: ActionRow[] = [];

	addSuccess(clientId: string) {
		this.savedRowIds.push(clientId);
	}

	addError(row: SubmittedRow, message: string) {
		const fullMessage = row.describeError(message);
		this.rowErrors.push({ clientId: row.clientId, message: fullMessage });
		this.remainingRows.push({
			clientId: row.clientId,
			indexNumber: row.rawIndexNumber,
			mark: row.rawMark,
			error: fullMessage
		});
	}

	finalize() {
		if (this.remainingRows.length === 0) {
			this.remainingRows.push({ clientId: `row-${Date.now()}`, indexNumber: '', mark: '' });
		}
	}

	private get summaryMessage() {
		if (this.savedRowIds.length === 0) return 'No rows were saved.';
		return this.rowErrors.length > 0
			? `${this.savedRowIds.length} row(s) saved. ${this.rowErrors.length} row(s) need attention.`
			: `${this.savedRowIds.length} row(s) saved.`;
	}

	toActionResult() {
		return {
			success: this.rowErrors.length === 0,
			savedRowIds: this.savedRowIds,
			rowErrors: this.rowErrors,
			message: this.summaryMessage,
			rows: this.remainingRows
		};
	}
}

// ---------------------------------------------------------------------------
// Service: MarksEntryProcessor
// Orchestrates validation + persistence for a batch of submitted rows.
// Depends on ExamPaperContext (for roster data) and ScoreRepository (for
// persistence) rather than reaching into the database directly — composition
// over inheritance, and each collaborator can be swapped or mocked in tests.
// ---------------------------------------------------------------------------
class MarksEntryProcessor {
	constructor(
		private readonly context: ExamPaperContext,
		private readonly repository: ScoreRepository,
		private readonly updatedBy: string
	) {}

	async process(rows: SubmittedRow[]): Promise<MarksBatchResult> {
		const result = new MarksBatchResult();

		for (const row of rows) {
			await this.processRow(row, result);
		}

		result.finalize();
		return result;
	}

	private async processRow(row: SubmittedRow, result: MarksBatchResult) {
		if (!row.indexNumber) {
			result.addError(row, 'Index number is required.');
			return;
		}

		const matchingPerson = await db
			.select({ id: people.id, role: people.role })
			.from(people)
			.where(eq(people.idnumber, row.indexNumber))
			.limit(1)
			.get();

		if (!matchingPerson) {
			result.addError(row, 'Index number does not exist.');
			return;
		}

		if (matchingPerson.role !== 'student') {
			result.addError(row, 'Index number belongs to a non-student record.');
			return;
		}

		if (!this.context.studentIds.has(matchingPerson.id)) {
			result.addError(row, 'This student is not in the classes for this paper.');
			return;
		}

		if (!row.mark) {
			result.addError(row, 'Marks or AB is required.');
			return;
		}

		const mark = Mark.parse(row.mark);
		if (!mark) {
			result.addError(row, 'Marks must be a whole number or AB.');
			return;
		}

		try {
			await this.repository.upsert(this.context.paper.id, matchingPerson.id, mark, this.updatedBy);
			result.addSuccess(row.clientId);
		} catch {
			result.addError(row, 'Unable to save this row. Please try again.');
		}
	}
}

// ---------------------------------------------------------------------------
// Helpers (kept as plain functions — not everything needs to be a class)
// ---------------------------------------------------------------------------
async function resolvePerson(locals: App.Locals) {
	if (!locals.session || !locals.user) {
		throw error(401, 'Unauthorized');
	}

	const person =
		locals.person ??
		(await db.select().from(people).where(eq(people.userId, locals.user.id)).limit(1).get());

	if (!person) {
		throw error(401, 'Unauthorized');
	}

	return person;
}

function parseId(raw: string) {
	const value = Number.parseInt(raw, 10);
	if (!Number.isFinite(value)) {
		throw error(404, 'Paper not found');
	}
	return value;
}

function assertCanEnterMarks(roleContext: RoleContext) {
	if (!roleContext.isAdmin() && !roleContext.isTeacher()) {
		throw error(403, 'Forbidden');
	}
}

// ---------------------------------------------------------------------------
// SvelteKit load + actions — now thin, readable, and free of duplication
// ---------------------------------------------------------------------------
export const load: PageServerLoad = async ({ locals, params }) => {
	const person = await resolvePerson(locals);
	const roleContext = createRoleContext(person);
	assertCanEnterMarks(roleContext);

	const examId = parseId(params.exam);
	const paperId = parseId(params.paper);

	const context = await ExamPaperContext.load(examId, paperId, roleContext);
	context.assertCanManage();

	return {
		exam: context.exam,
		paper: context.paper,
		subject: context.subject,
		students: context.students,
		initialRows: [{ clientId: 'row-1', indexNumber: '', mark: '' } satisfies ActionRow],
		isAdmin: roleContext.isAdmin(),
		isTeacher: roleContext.isTeacher()
	};
};

export const actions: Actions = {
	save: async ({ request, locals, params }) => {
		const person = await resolvePerson(locals);
		const roleContext = createRoleContext(person);
		assertCanEnterMarks(roleContext);

		const examId = parseId(params.exam);
		const paperId = parseId(params.paper);

		const context = await ExamPaperContext.load(examId, paperId, roleContext);
		context.assertCanManage();

		const formData = await request.formData();
		const clientIds = formData.getAll('clientId').map((value) => value.toString());
		const indexNumbers = formData.getAll('indexNumber').map((value) => value.toString());
		const marks = formData.getAll('mark').map((value) => value.toString());

		const submittedRows = clientIds.map(
			(clientId, index) => new SubmittedRow(clientId, indexNumbers[index], marks[index], index)
		);

		// `resolvePerson` guarantees `locals.user` exists; use non-null assertion
		const processor = new MarksEntryProcessor(context, new ScoreRepository(), locals.user!.id);
		const result = await processor.process(submittedRows);

		return result.toActionResult();
	}
};