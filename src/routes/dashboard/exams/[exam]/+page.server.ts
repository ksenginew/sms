import { error } from '@sveltejs/kit';
import { desc, eq } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { exams, papers, people, subjects } from '$lib/server/db/schema';

export const load = async ({ locals, params }) => {
	if (!locals.session || !locals.user) {
		throw error(401, 'Unauthorized');
	}

	const person =
		locals.person ??
		(await db.select().from(people).where(eq(people.userId, locals.user.id)).limit(1).get());

	if (!person) {
		throw error(401, 'Unauthorized');
	}

	if (person.role !== 'admin' && person.role !== 'teacher' && person.role !== 'student') {
		throw error(403, 'Forbidden');
	}

	const examId = Number.parseInt(params.exam, 10);
	if (!Number.isFinite(examId)) {
		throw error(404, 'Exam not found');
	}

	const exam = await db.select().from(exams).where(eq(exams.id, examId)).limit(1).get();

	if (!exam) {
		throw error(404, 'Exam not found');
	}

	if (person.role !== 'admin' && !exam.visible) {
		throw error(404, 'Exam not found');
	}

	const examPapers = await db
		.select({
			id: papers.id,
			title: papers.title,
			description: papers.description,
			createdAt: papers.createdAt,
			subjectId: papers.subjectId,
			subjectTitle: subjects.title
		})
		.from(papers)
		.leftJoin(subjects, eq(subjects.id, papers.subjectId))
		.where(eq(papers.examId, examId))
		.orderBy(desc(papers.createdAt));

	return {
		exam,
		papers: examPapers
	};
};
