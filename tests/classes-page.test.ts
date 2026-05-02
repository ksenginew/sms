import { describe, expect, it, vi } from 'vitest';
import { createLocals, testUsers } from './user-fixtures';

const insertValues = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const insertMock = vi.hoisted(() => vi.fn(() => ({ values: insertValues })));

vi.mock('$lib/server/db', () => ({
	db: {
		insert: insertMock
	}
}));

import { actions, actionError, internalActionError, readIntParam, readValue } from '../src/routes/dashboard/classes/+page.server';

describe('classes page helpers', () => {
	it('reads and normalizes values', () => {
		const formData = new FormData();
		formData.set('title', '  Algebra  ');
		formData.set('empty', '   ');

		expect(readValue(formData, 'title')).toBe('Algebra');
		expect(readValue(formData, 'empty')).toBeUndefined();
		expect(readIntParam('8', 20)).toBe(8);
		expect(readIntParam('bad', 20)).toBe(20);
		expect(actionError('create', 'Title is required.')).toMatchObject({
			status: 400,
			data: { action: 'create', message: 'Title is required.' }
		});
		expect(internalActionError('create')).toMatchObject({
			status: 500,
			data: { action: 'create', message: 'Server error. Please try again.' }
		});
	});
});

describe('classes page actions', () => {
	it('creates a class and redirects on success', async () => {
		const formData = new FormData();
		formData.set('title', 'Mathematics');
		formData.set('description', 'Core class');
		formData.set('visible', 'on');

		const event = {
			locals: {
				person: { id: 'admin-1', role: 'admin' }
			},
			request: {
				formData: async () => formData
			}
		} as any;

		await expect(actions.create(event)).rejects.toMatchObject({
			status: 303,
			location: '/dashboard/classes'
		});
		expect(insertMock).toHaveBeenCalledTimes(1);
		expect(insertValues).toHaveBeenCalledWith({
			title: 'Mathematics',
			description: 'Core class',
			visible: true,
			updatedBy: 'admin-1'
		});
	});

	it('rejects missing titles before writing', async () => {
		const formData = new FormData();
		formData.set('description', 'Core class');

		const event = {
			locals: {
				person: { id: 'admin-1', role: 'admin' }
			},
			request: {
				formData: async () => formData
			}
		} as any;

		const result = await actions.create(event);
		expect(result).toMatchObject({
			status: 400,
			data: { action: 'create', message: 'Title is required.' }
		});
	});

	it('rejects non-admin users', async () => {
		const formData = new FormData();
		formData.set('title', 'Mathematics');

		await expect(
			actions.create({
				locals: createLocals(testUsers.teacher),
				request: { formData: async () => formData }
			} as any)
		).rejects.toMatchObject({ status: 403 });

		await expect(
			actions.create({
				locals: createLocals(testUsers.student),
				request: { formData: async () => formData }
			} as any)
		).rejects.toMatchObject({ status: 403 });

		await expect(
			actions.create({
				locals: createLocals(null, { session: { id: 'session-1' }, user: { id: 'external-user' } }),
				request: { formData: async () => formData }
			} as any)
		).rejects.toMatchObject({ status: 403 });
	});
});
