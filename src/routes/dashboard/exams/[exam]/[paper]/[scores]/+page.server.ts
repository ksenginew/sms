import { error } from '@sveltejs/kit';
import { and, eq, inArray } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { classPerson, exam_class, exams, papers, people, scores, subjects } from '$lib/server/db/schema';
import { createRoleContext } from '$lib/server/role-context';
import type { Actions, PageServerLoad } from './$types';

type SubmittedRow = {
	clientId?: string;
	indexNumber?: string;
	mark?: string;
};

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

function readValue(value: unknown) {
	const text = value?.toString().trim();
	return text ? text : undefined;
}

function parseMark(mark: string) {
	const normalized = mark.trim().toLowerCase();
	if (normalized === 'ab' || normalized === 'abs' || normalized === 'absent') {
		return { numeric: null as number | null, text: 'absent' };
	}

	if (!/^-?\d+$/.test(mark.trim())) {
		return null;
	}

	const numeric = Number.parseInt(mark.trim(), 10);
	if (!Number.isFinite(numeric) || numeric < 0) {
		return null;
	}

	return { numeric, text: null as string | null };
}

function toRowMessage(position: number, message: string) {
	return `Row ${position}: ${message}`;
}

export const load: PageServerLoad = async ({ locals, params }) => {
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
	if (!roleContext.isAdmin() && !roleContext.isTeacher()) {
		throw error(403, 'Forbidden');
	}

	const examId = Number.parseInt(params.exam, 10);
	const paperId = Number.parseInt(params.paper, 10);

	if (!Number.isFinite(examId) || !Number.isFinite(paperId)) {
		throw error(404, 'Paper not found');
	}

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

	const members = classIds.length
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

	if (!roleContext.isAdmin()) {
		const allowed = roleContext.canManageAttendanceForClass(members);
		if (!allowed) {
			throw error(403, 'Forbidden');
		}
	}

	const studentMap = new Map<string, { personId: string; name: string | null; idnumber: string | null }>();
	for (const member of members) {
		if (member.role !== 'student') continue;
		if (!studentMap.has(member.personId)) {
			studentMap.set(member.personId, {
				personId: member.personId,
				name: member.name,
				idnumber: member.idnumber
			});
		}
	}

	return {
		exam,
		paper,
		subject: subject ?? { id: paper.subjectId, title: paper.subjectId },
		students: Array.from(studentMap.values()),
		initialRows: [{ clientId: 'row-1', indexNumber: '', mark: '' } satisfies ActionRow],
		isAdmin: roleContext.isAdmin(),
		isTeacher: roleContext.isTeacher()
	};
};

export const actions: Actions = {
	save: async ({ request, locals, params }) => {
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
		if (!roleContext.isAdmin() && !roleContext.isTeacher()) {
			throw error(403, 'Forbidden');
		}

		const examId = Number.parseInt(params.exam, 10);
		const paperId = Number.parseInt(params.paper, 10);
		if (!Number.isFinite(examId) || !Number.isFinite(paperId)) {
			throw error(404, 'Paper not found');
		}

		const exam = await db.select().from(exams).where(eq(exams.id, examId)).limit(1).get();
		const paper = await db
			.select({ id: papers.id, subjectId: papers.subjectId })
			.from(papers)
			.where(and(eq(papers.id, paperId), eq(papers.examId, examId)))
			.limit(1)
			.get();

		if (!exam || !paper) {
			throw error(404, 'Paper not found');
		}

		const examClasses = await db
			.select({ classId: exam_class.classId })
			.from(exam_class)
			.where(eq(exam_class.examId, examId));

		const classIds = examClasses.map((row) => row.classId);
		const members = classIds.length
			? await db
				.select({ personId: people.id, role: people.role, idnumber: people.idnumber })
				.from(classPerson)
				.innerJoin(people, eq(people.id, classPerson.personId))
				.where(inArray(classPerson.classId, classIds))
			: [];

		if (!roleContext.isAdmin()) {
			const allowed = roleContext.canManageAttendanceForClass(members);
			if (!allowed) {
				throw error(403, 'Forbidden');
			}
		}

		const formData = await request.formData();
		const clientIds = formData.getAll('clientId').map((value) => value.toString());
		const indexNumbers = formData.getAll('indexNumber').map((value) => value.toString());
		const marks = formData.getAll('mark').map((value) => value.toString());

		const submittedRows: SubmittedRow[] = clientIds.map((clientId, index) => ({
			clientId,
			indexNumber: indexNumbers[index],
			mark: marks[index]
		}));

		const studentRows = members.filter((member) => member.role === 'student');
		const paperStudentIds = new Set<string>();
		for (const student of studentRows) {
			paperStudentIds.add(student.personId);
		}

		const rowErrors: RowError[] = [];
		const savedRowIds: string[] = [];
		const remainingRows: ActionRow[] = [];

		for (const [position, row] of submittedRows.entries()) {
			const clientId = readValue(row.clientId) ?? `row-${position + 1}`;
			const indexNumber = readValue(row.indexNumber);
			const mark = readValue(row.mark);

			if (!indexNumber) {
				rowErrors.push({ clientId, message: toRowMessage(position + 1, 'Index number is required.') });
				remainingRows.push({ clientId, indexNumber: row.indexNumber ?? '', mark: row.mark ?? '', error: toRowMessage(position + 1, 'Index number is required.') });
				continue;
			}

			const matchingPerson = await db
				.select({ id: people.id, role: people.role })
				.from(people)
				.where(eq(people.idnumber, indexNumber.trim()))
				.limit(1)
				.get();

			if (!matchingPerson) {
				const errorMessage = toRowMessage(position + 1, 'Index number does not exist.');
				rowErrors.push({ clientId, message: errorMessage });
				remainingRows.push({ clientId, indexNumber: row.indexNumber ?? '', mark: row.mark ?? '', error: errorMessage });
				continue;
			}

			if (matchingPerson.role !== 'student') {
				const errorMessage = toRowMessage(position + 1, 'Index number belongs to a non-student record.');
				rowErrors.push({ clientId, message: errorMessage });
				remainingRows.push({ clientId, indexNumber: row.indexNumber ?? '', mark: row.mark ?? '', error: errorMessage });
				continue;
			}

			if (!paperStudentIds.has(matchingPerson.id)) {
				const errorMessage = toRowMessage(position + 1, 'This student is not in the classes for this paper.');
				rowErrors.push({ clientId, message: errorMessage });
				remainingRows.push({ clientId, indexNumber: row.indexNumber ?? '', mark: row.mark ?? '', error: errorMessage });
				continue;
			}

			const personId = matchingPerson.id;

			if (!mark) {
				const errorMessage = toRowMessage(position + 1, 'Marks or AB is required.');
				rowErrors.push({ clientId, message: errorMessage });
				remainingRows.push({ clientId, indexNumber: row.indexNumber ?? '', mark: row.mark ?? '', error: errorMessage });
				continue;
			}

			const normalized = parseMark(mark);
			if (!normalized) {
				const errorMessage = toRowMessage(position + 1, 'Marks must be a whole number or AB.');
				rowErrors.push({ clientId, message: errorMessage });
				remainingRows.push({ clientId, indexNumber: row.indexNumber ?? '', mark: row.mark ?? '', error: errorMessage });
				continue;
			}

			try {
				await db
					.insert(scores)
					.values({
						paperId,
						personId,
						numeric: normalized.numeric,
						text: normalized.text,
						json: null,
						updatedBy: locals.user.id
					})
					.onConflictDoUpdate({
						target: [scores.paperId, scores.personId],
						set: {
							numeric: normalized.numeric,
							text: normalized.text,
							json: null,
							updatedAt: new Date(),
							updatedBy: locals.user.id
						}
					});

				savedRowIds.push(clientId);
			} catch {
				const errorMessage = toRowMessage(position + 1, 'Unable to save this row. Please try again.');
				rowErrors.push({ clientId, message: errorMessage });
				remainingRows.push({ clientId, indexNumber: row.indexNumber ?? '', mark: row.mark ?? '', error: errorMessage });
			}
		}

		if (remainingRows.length === 0) {
			remainingRows.push({ clientId: `row-${Date.now()}`, indexNumber: '', mark: '' });
		}

		const message =
			savedRowIds.length > 0
				? rowErrors.length > 0
					? `${savedRowIds.length} row(s) saved. ${rowErrors.length} row(s) need attention.`
					: `${savedRowIds.length} row(s) saved.`
				: 'No rows were saved.';

		return {
			success: rowErrors.length === 0,
			savedRowIds,
			rowErrors,
			message,
			rows: remainingRows
		};
	}
};
