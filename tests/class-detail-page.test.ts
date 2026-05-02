import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createFormRequest, createLocals, createUrl, testUsers } from './user-fixtures';

const selectQueue = vi.hoisted(() => [] as Array<any>);
const deleteQueue = vi.hoisted(() => [] as Array<any>);
const insertValues = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const updateSet = vi.hoisted(() => vi.fn(() => ({ where: vi.fn().mockResolvedValue(undefined) })));
const updateMock = vi.hoisted(() => vi.fn(() => ({ set: updateSet })));
const insertMock = vi.hoisted(() => vi.fn(() => ({ values: insertValues })));
const deleteMock = vi.hoisted(() => vi.fn(() => deleteQueue.shift()));
const selectMock = vi.hoisted(() => vi.fn(() => selectQueue.shift()));

vi.mock('$lib/server/db', () => ({
	db: {
		select: selectMock,
		update: updateMock,
		insert: insertMock,
		delete: deleteMock
	}
}));

import { actions, load } from '../src/routes/dashboard/classes/[classId]/+page.server';

function getChain(result: unknown) {
	return {
		from: () => ({
			where: () => ({
				limit: () => ({ get: async () => result })
			})
		})
	};
}

function listChain(result: unknown) {
	return {
		from: () => ({
			innerJoin: () => ({
				where: async () => result
			})
		})
	};
}

function prepareLoad({ classInfo, membership, members }: {
	classInfo: Record<string, unknown> | null;
	membership: Record<string, unknown> | null;
	members: Array<Record<string, unknown>>;
}) {
	selectQueue.length = 0;
	selectQueue.push(getChain(classInfo));
	selectQueue.push(getChain(membership));
	selectQueue.push(listChain(members));
}

beforeEach(() => {
	selectQueue.length = 0;
	deleteQueue.length = 0;
	insertMock.mockClear();
	insertValues.mockClear();
	updateMock.mockClear();
	updateSet.mockClear();
	deleteMock.mockClear();
});

describe('class detail page load', () => {
	it('allows admins, teachers, and enrolled students to view visible classes', async () => {
		prepareLoad({
			classInfo: { id: 'class-1', title: 'Mathematics', visible: true },
			membership: { id: 'membership-1' },
			members: [
				{ id: testUsers.teacher.id, name: 'Teacher User', email: 'teacher.0051@eduscend.school', role: 'teacher' },
				{ id: testUsers.student.id, name: 'Student User', email: 'student.0251@eduscend.school', role: 'student' }
			]
		});

		const result = await load({
			locals: createLocals(testUsers.teacher),
			params: { classId: 'class-1' },
			url: createUrl('/dashboard/classes/class-1')
		} as any);

		expect(result).toMatchObject({
			classItem: { id: 'class-1', title: 'Mathematics' },
			isAdmin: false,
			canManageMembers: true,
			backLink: '/dashboard/classes'
		});

		prepareLoad({
			classInfo: { id: 'class-1', title: 'Mathematics', visible: true },
			membership: { id: 'membership-1' },
			members: []
		});

		const studentResult = await load({
			locals: createLocals(testUsers.student),
			params: { classId: 'class-1' },
			url: createUrl('/dashboard/classes/class-1')
		} as any);

		expect(studentResult).toMatchObject({
			classItem: { id: 'class-1', title: 'Mathematics' },
			canManageMembers: false
		});
	});

	it('rejects unlinked, external, and hidden-class access when not allowed', async () => {
		prepareLoad({
			classInfo: { id: 'class-1', title: 'Mathematics', visible: true },
			membership: null,
			members: []
		});

		await expect(
			load({
				locals: createLocals(testUsers.unlinkedStudent),
				params: { classId: 'class-1' },
				url: createUrl('/dashboard/classes/class-1')
			} as any)
		).rejects.toMatchObject({ status: 403 });

		await expect(
			load({
				locals: createLocals(null, { session: { id: 'session-1' }, user: { id: 'external-user' } }),
				params: { classId: 'class-1' },
				url: createUrl('/dashboard/classes/class-1')
			} as any)
		).rejects.toMatchObject({ status: 401 });
	});
});

describe('class detail actions', () => {
	it('lets admins edit and delete classes', async () => {
		await expect(
			actions.update({
				locals: createLocals(testUsers.admin),
				params: { classId: 'class-1' },
				request: createFormRequest({ title: 'Advanced Mathematics', description: 'Updated', visible: 'on' })
			} as any)
		).rejects.toMatchObject({ status: 303, location: '/dashboard/classes/class-1' });

		deleteQueue.push({ where: vi.fn().mockResolvedValue(undefined) }, { where: vi.fn().mockResolvedValue(undefined) });
		await expect(
			actions.delete({
				locals: createLocals(testUsers.admin),
				params: { classId: 'class-1' }
			} as any)
		).rejects.toMatchObject({ status: 303, location: '/dashboard/classes' });
	});

	it('lets assigned teachers manage members but not class metadata', async () => {
		selectQueue.length = 0;
		selectQueue.push(getChain({ id: 'membership-1' }));
		selectQueue.push(getChain({ id: testUsers.student.id }));
		selectQueue.push(getChain(null));

		await expect(
			actions.addMember({
				locals: createLocals(testUsers.teacher),
				params: { classId: 'class-1' },
				request: createFormRequest({ personId: testUsers.student.id })
			} as any)
		).rejects.toMatchObject({ status: 303, location: '/dashboard/classes/class-1' });
		expect(insertMock).toHaveBeenCalledTimes(1);

		selectQueue.length = 0;
		selectQueue.push(getChain({ id: 'membership-1' }));
		deleteQueue.push({ where: vi.fn().mockResolvedValue(undefined) });

		await expect(
			actions.removeMember({
				locals: createLocals(testUsers.teacher),
				params: { classId: 'class-1' },
				request: createFormRequest({ personId: testUsers.student.id })
			} as any)
		).rejects.toMatchObject({ status: 303, location: '/dashboard/classes/class-1' });
		expect(deleteMock).toHaveBeenCalledTimes(1);

		await expect(
			actions.update({
				locals: createLocals(testUsers.teacher),
				params: { classId: 'class-1' },
				request: createFormRequest({ title: 'Blocked Edit' })
			} as any)
		).rejects.toMatchObject({ status: 403 });
	});

	it('rejects class actions for student, unlinked student, and external users', async () => {
		await expect(
			actions.update({
				locals: createLocals(testUsers.student),
				params: { classId: 'class-1' },
				request: createFormRequest({ title: 'Blocked Edit' })
			} as any)
		).rejects.toMatchObject({ status: 403 });

		await expect(
			actions.addMember({
				locals: createLocals(testUsers.unlinkedStudent),
				params: { classId: 'class-1' },
				request: createFormRequest({ personId: testUsers.student.id })
			} as any)
		).rejects.toMatchObject({ status: 403 });

		await expect(
			actions.delete({
				locals: createLocals(null, { session: { id: 'session-1' }, user: { id: 'external-user' } }),
				params: { classId: 'class-1' }
			} as any)
		).rejects.toMatchObject({ status: 401 });
	});
});