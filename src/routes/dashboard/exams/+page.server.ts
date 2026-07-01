import { ExamsPageService } from '$lib/server/exams/exams-page.service';

/**
 * Thin adapter layer for the exams list page.
 * All business logic is delegated to ExamsPageService.
 */
const examsPageService = new ExamsPageService();

export const load = (event) => examsPageService.load(event);

export const actions = {
	create: (event) => examsPageService.create(event)
};
