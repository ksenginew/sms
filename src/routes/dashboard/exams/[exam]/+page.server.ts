import { error, fail, redirect } from '@sveltejs/kit';
import { desc, eq, and } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { exams, papers, people, subjects, classes, exam_class } from '$lib/server/db/schema';
import { createRoleContext } from '$lib/server/role-context';

function readValue(formData: FormData, key: string) {
	const value = formData.get(key)?.toString().trim();
	return value ? value : undefined;
}

function actionError(action: string, message: string, status = 400) {
	return fail(status, { action, message });
}

function internalActionError(action: string) {
	return fail(500, { action, message: 'Server error. Please try again.' });
}

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

	// Load all classes for edit form
	const allClasses = await db.select().from(classes).orderBy(desc(classes.title));

	// Extract unique grades from class tags
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

	// Load currently selected classes for this exam
	const selectedClassRows = await db
		.select({ classId: exam_class.classId })
		.from(exam_class)
		.where(eq(exam_class.examId, examId));

	const selectedClassIds = selectedClassRows.map((row) => row.classId);

	const isAdmin = person.role === 'admin';

	return {
		exam,
		papers: examPapers,
		allClasses,
		grades,
		selectedClassIds,
		isAdmin
	};
};

export const actions = {
	edit: async ({ request, locals, params }) => {
		const roleContext = createRoleContext(locals.person ?? null);
		if (!roleContext.canManageClassCatalog()) {
			throw error(403, 'Forbidden');
		}

		const examId = Number.parseInt(params.exam, 10);
		if (!Number.isFinite(examId)) {
			return actionError('edit', 'Invalid exam ID');
		}

		const formData = await request.formData();
		const title = readValue(formData, 'title');

		if (!title) {
			return actionError('edit', 'Title is required.');
		}

		const rawTags = readValue(formData, 'tags');
		const tags = rawTags
			? rawTags
				.split(',')
				.map((tag) => tag.trim())
				.filter(Boolean)
			: undefined;

		try {
			// Update exam
			await db
				.update(exams)
				.set({
					title,
					description: readValue(formData, 'description'),
					tags,
					visible: formData.get('visible') === 'on',
					updatedBy: locals.user?.id ?? null
				})
				.where(eq(exams.id, examId));

			// Delete existing exam-class relationships
			await db.delete(exam_class).where(eq(exam_class.examId, examId));

			// Insert new exam-class relationships
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

				await db.insert(exam_class).values(classExamPairs);
			}
		} catch {
			return internalActionError('edit');
		}

		throw redirect(303, `/dashboard/exams/${examId}`);
	},

	delete: async ({ request, locals, params }) => {
		const roleContext = createRoleContext(locals.person ?? null);
		if (!roleContext.canManageClassCatalog()) {
			throw error(403, 'Forbidden');
		}

		const examId = Number.parseInt(params.exam, 10);
		if (!Number.isFinite(examId)) {
			return actionError('delete', 'Invalid exam ID');
		}

		try {
			// Delete exam-class relationships (cascade will handle papers/scores)
			await db.delete(exam_class).where(eq(exam_class.examId, examId));

			// Delete exam
			await db.delete(exams).where(eq(exams.id, examId));
		} catch {
			return internalActionError('delete');
		}

		throw redirect(303, '/dashboard/exams');
	}
};
