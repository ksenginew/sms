import { describe, expect, it, vi } from 'vitest';
import { createLocals, testUsers } from './user-fixtures';

const insertValues = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const updateWhere = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const deleteWhere = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const updateSet = vi.hoisted(() => vi.fn(() => ({ where: updateWhere })));
const updateMock = vi.hoisted(() => vi.fn(() => ({ set: updateSet })));
const insertMock = vi.hoisted(() => vi.fn(() => ({ values: insertValues })));
const deleteMock = vi.hoisted(() => vi.fn(() => ({ where: deleteWhere })));

vi.mock('$lib/server/db', () => ({
	db: {
		insert: insertMock,
		update: updateMock,
		delete: deleteMock
	}
}));

import { actions } from '../src/routes/dashboard/people/+page.server';

function adminEvent(formData: FormData) {
	return {
		locals: {
			person: { id: 'admin-1', role: 'admin' }
		},
		request: {
			formData: async () => formData
		}
	} as any;
}

describe('people page actions', () => {
	it('creates a person', async () => {
		const formData = new FormData();
		formData.set('name', 'Ava');
		formData.set('email', 'ava@example.com');
		formData.set('role', 'student');
		formData.set('userId', 'user-1');

		await expect(actions.create(adminEvent(formData))).rejects.toMatchObject({
			status: 303,
			location: '/dashboard/people'
		});
		expect(insertMock).toHaveBeenCalledTimes(1);
		expect(insertValues).toHaveBeenCalledWith({
			name: 'Ava',
			email: 'ava@example.com',
			idnumber: undefined,
			phone: undefined,
			mobilePhone: undefined,
			address: undefined,
			role: 'student',
			userId: 'user-1',
			updatedBy: 'admin-1'
		});
	});

	it('updates and deletes people records', async () => {
		const updateForm = new FormData();
		updateForm.set('id', 'person-1');
		updateForm.set('name', 'Ava B');
		updateForm.set('email', 'ava@example.com');
		updateForm.set('role', 'teacher');

		await expect(actions.update(adminEvent(updateForm))).rejects.toMatchObject({
			status: 303,
			location: '/dashboard/people'
		});
		expect(updateMock).toHaveBeenCalledTimes(1);
		expect(updateSet).toHaveBeenCalledTimes(1);
		expect(updateWhere).toHaveBeenCalledTimes(1);

		const deleteForm = new FormData();
		deleteForm.set('id', 'person-1');

		await expect(actions.delete(adminEvent(deleteForm))).rejects.toMatchObject({
			status: 303,
			location: '/dashboard/people'
		});
		expect(deleteMock).toHaveBeenCalledTimes(1);
		expect(deleteWhere).toHaveBeenCalledTimes(1);
	});

	it('validates required fields before writing', async () => {
		const formData = new FormData();
		formData.set('name', 'Ava');

		const result = await actions.create(adminEvent(formData));
		expect(result).toMatchObject({
			status: 400,
			data: { message: 'Role is required.' }
		});
	});

	it('rejects non-admin users', async () => {
		const formData = new FormData();
		formData.set('name', 'Ava');
		formData.set('role', 'student');

		await expect(
			actions.create({
				locals: createLocals(testUsers.teacher),
				request: { formData: async () => formData }
			} as any)
		).rejects.toMatchObject({ status: 403 });

		await expect(
			actions.update({
				locals: createLocals(testUsers.student),
				request: { formData: async () => formData }
			} as any)
		).rejects.toMatchObject({ status: 403 });

		await expect(
			actions.delete({
				locals: createLocals(null, { session: { id: 'session-1' }, user: { id: 'external-user' } }),
				request: { formData: async () => formData }
			} as any)
		).rejects.toMatchObject({ status: 403 });
	});
});
