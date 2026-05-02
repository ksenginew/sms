import { describe, expect, it, vi } from 'vitest';
import { AdminRoleContext, ExternalRoleContext, StudentRoleContext, TeacherRoleContext, createRoleContext } from '../src/lib/server/role-context';

describe('role context', () => {
	it('creates the right context for known roles', () => {
		expect(createRoleContext({ id: '1', role: 'admin' } as any)).toBeInstanceOf(AdminRoleContext);
		expect(createRoleContext({ id: '2', role: 'teacher' } as any)).toBeInstanceOf(TeacherRoleContext);
		expect(createRoleContext({ id: '3', role: 'student' } as any)).toBeInstanceOf(StudentRoleContext);
		expect(createRoleContext(null)).toBeInstanceOf(ExternalRoleContext);
		expect(createRoleContext({ id: '4', role: 'unknown' } as any)).toBeInstanceOf(ExternalRoleContext);
	});

	it('applies the default deny matrix', () => {
		const student = new StudentRoleContext({ id: '3', role: 'student' } as any);

		expect(student.isAuthenticated()).toBe(true);
		expect(student.canManagePeople()).toBe(false);
		expect(student.canManageClassCatalog()).toBe(false);
		expect(student.canManageClassMembers()).toBe(false);
		expect(student.canViewExam(false)).toBe(false);
		expect(student.canViewClassDetail(true, true)).toBe(true);
		expect(student.canViewClassDetail(true, false)).toBe(false);
	});

	it('allows admin access everywhere', () => {
		const admin = new AdminRoleContext({ id: '1', role: 'admin' } as any);

		expect(admin.canManagePeople()).toBe(true);
		expect(admin.canManageClassCatalog()).toBe(true);
		expect(admin.canManageClassMembers()).toBe(true);
		expect(admin.canViewExam(false)).toBe(true);
		expect(admin.canViewClassDetail(false, false)).toBe(true);
		expect(admin.canManageAttendanceForClass([])).toBe(true);
	});

	it('lets teachers manage members and attendance for their own class', async () => {
		const teacher = new TeacherRoleContext({ id: 'teacher-1', role: 'teacher' } as any);
		const membershipLookup = vi.fn().mockResolvedValue({ id: 'membership-1' });
		const database = {
			select: vi.fn(() => ({
				from: () => ({
					where: () => ({
						limit: () => ({ get: membershipLookup })
					})
				})
			}))
		} as any;

		await expect(teacher.isMemberOfClass(database, 'class-1')).resolves.toBe(true);
		expect(membershipLookup).toHaveBeenCalledTimes(1);
		await expect(teacher.canManageMembersForClass(database, 'class-1')).resolves.toBe(true);
		expect(teacher.canManageAttendanceForClass([{ personId: 'teacher-1', role: 'teacher' }])).toBe(true);
		expect(teacher.canManageAttendanceForClass([{ personId: 'student-1', role: 'student' }])).toBe(false);
	});
});
