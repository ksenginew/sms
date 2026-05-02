import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createFormRequest, createLocals, createUrl, testUsers } from './user-fixtures';

const selectQueue = vi.hoisted(() => [] as Array<any>);
const deleteQueue = vi.hoisted(() => [] as Array<any>);
const insertValues = vi.hoisted(() => vi.fn().mockResolvedValue(undefined));
const insertMock = vi.hoisted(() => vi.fn(() => ({ values: insertValues })));
const deleteMock = vi.hoisted(() => vi.fn(() => deleteQueue.shift()));
const selectMock = vi.hoisted(() => vi.fn(() => selectQueue.shift()));

vi.mock('$lib/server/db', () => ({
	db: {
		select: selectMock,
		insert: insertMock,
		delete: deleteMock
	}
}));

import { actions, load } from '../src/routes/dashboard/attendance/[class]/edit/+page.server';

function getChain(result: unknown) {
	return {
		from: () => ({
			where: () => ({
				limit: () => ({ get: async () => result })
			})
		})
	};
}

function membersLoadChain(result: unknown) {
	return {
		from: () => ({
			innerJoin: () => ({
				where: () => ({
					orderBy: async () => result
				})
			})
		})
	};
}

function attendanceRowsChain(result: unknown) {
	return {
		from: () => ({
			where: async () => result
		})
	};
}

function actionMembersChain(result: unknown) {
	return {
		from: () => ({
			innerJoin: () => ({
				where: async () => result
			})
		})
	};
}

beforeEach(() => {
	selectQueue.length = 0;
	deleteQueue.length = 0;
	insertMock.mockClear();
	insertValues.mockClear();
	deleteMock.mockClear();
});

function prepareLoadForTeacher() {
	selectQueue.push(getChain({ id: 'class-1', title: 'Mathematics' }));
	selectQueue.push(membersLoadChain([
		{ personId: testUsers.teacher.id, name: 'Teacher User', role: 'teacher' },
		{ personId: testUsers.student.id, name: 'Student User', role: 'student' }
	]));
	selectQueue.push(getChain({ id: 11, date: '2026-05-02' }));
	selectQueue.push(attendanceRowsChain([
		{ personId: testUsers.student.id, status: 'present' }
	]));
}

describe('attendance edit route load', () => {
	it('allows teachers assigned to the class and blocks students and unlinked users', async () => {
		prepareLoadForTeacher();

		const teacherResult = await load({
			locals: createLocals(testUsers.teacher),
			params: { class: 'class-1' },
			url: createUrl('/dashboard/attendance/class-1/edit?date=2026-05-02')
		} as any);

		expect(teacherResult).toMatchObject({
			classInfo: { id: 'class-1', title: 'Mathematics' },
			teacher: { personId: testUsers.teacher.id },
			hasSession: true,
			isNewRecord: false
		});

		selectQueue.length = 0;
		selectQueue.push(getChain({ id: 'class-1', title: 'Mathematics' }));
		selectQueue.push(membersLoadChain([
			{ personId: testUsers.student.id, name: 'Student User', role: 'student' }
		]));

		await expect(
			load({
				locals: createLocals(testUsers.student),
				params: { class: 'class-1' },
				url: createUrl('/dashboard/attendance/class-1/edit?date=2026-05-02')
			} as any)
		).rejects.toMatchObject({ status: 403 });

		selectQueue.length = 0;
		selectQueue.push(getChain(null));
		await expect(
			load({
				locals: createLocals(null, { session: { id: 'session-1' }, user: { id: 'external-user' } }),
				params: { class: 'class-1' },
				url: createUrl('/dashboard/attendance/class-1/edit?date=2026-05-02')
			} as any)
		).rejects.toMatchObject({ status: 401 });
	});
});

describe('attendance edit route actions', () => {
	it('saves attendance for an assigned teacher', async () => {
		selectQueue.push(getChain({ id: 'class-1', title: 'Mathematics' }));
		selectQueue.push(actionMembersChain([
			{ personId: testUsers.teacher.id, role: 'teacher' },
			{ personId: testUsers.student.id, role: 'student' }
		]));
		selectQueue.push(getChain({ id: 11, date: '2026-05-02' }));
		deleteQueue.push({ where: vi.fn().mockResolvedValue(undefined) });

		await expect(
			actions.default({
				locals: createLocals(testUsers.teacher),
				params: { class: 'class-1' },
				request: createFormRequest({
					date: '2026-05-02',
					studentIds: JSON.stringify([testUsers.student.id]),
					statuses: JSON.stringify({ [testUsers.student.id]: 'present' })
				})
			} as any)
		).resolves.toEqual({ success: true });

		expect(insertMock).toHaveBeenCalledTimes(1);
		expect(insertValues).toHaveBeenCalledWith([
			{
				personId: testUsers.student.id,
				session: 11,
				status: 'present',
				updatedBy: testUsers.teacher.userId
			}
		]);
	});

	it('rejects students, unlinked students, and external users', async () => {
		selectQueue.push(getChain({ id: 'class-1', title: 'Mathematics' }));
		selectQueue.push(actionMembersChain([
			{ personId: testUsers.student.id, role: 'student' }
		]));

		await expect(
			actions.default({
				locals: createLocals(testUsers.student),
				params: { class: 'class-1' },
				request: createFormRequest({
					date: '2026-05-02',
					studentIds: JSON.stringify([testUsers.student.id]),
					statuses: JSON.stringify({ [testUsers.student.id]: 'present' })
				})
			} as any)
		).rejects.toMatchObject({ status: 403 });

		selectQueue.length = 0;
		selectQueue.push(getChain(null));
		await expect(
			actions.default({
				locals: createLocals(null, { session: { id: 'session-1' }, user: { id: 'external-user' } }),
				params: { class: 'class-1' },
				request: createFormRequest({
					date: '2026-05-02',
					studentIds: JSON.stringify([testUsers.student.id]),
					statuses: JSON.stringify({ [testUsers.student.id]: 'present' })
				})
			} as any)
		).rejects.toMatchObject({ status: 401 });
	});
});