import { and, eq } from 'drizzle-orm';
import type { Person } from '$lib/server/db/schema';
import { classPerson } from '$lib/server/db/schema';

type Database = typeof import('$lib/server/db').db;

type ClassMemberLike = {
    personId: string;
    role: "admin" | "teacher" | "student";
}

export type RoleKey = 'external' | 'admin' | 'teacher' | 'student';

// Base role abstraction used by server routes.
// Default behavior is deny-by-default; subclasses explicitly allow capabilities.
export abstract class RoleContext {
    constructor(public readonly person: Person | null) {}

    abstract readonly role: RoleKey;

    isAuthenticated() {
        return this.person !== null;
    }

    isAdmin() {
        return this.role === 'admin';
    }

    isTeacher() {
        return this.role === 'teacher';
    }

    isStudent() {
        return this.role === 'student';
    }

    // Permission flags that routes can ask without knowing role internals.
    canManagePeople() {
        return false;
    }

    canManageClassCatalog() {
        return false;
    }

    canManageClassMembers() {
        return false;
    }

    // Exams are visible to everyone only when marked visible.
    // Admins override this to always true.
    canViewExam(isVisible: boolean) {
        return isVisible;
    }

    // Class detail policy:
    // - Admin: always allowed.
    // - Teacher/Student: class must be visible and user must be a member.
    canViewClassDetail(isVisible: boolean, isMember: boolean) {
        return isVisible && isMember;
    }

    // Attendance class page edit/view policy:
    // - Admin: always allowed.
    // - Teacher: allowed only if teacher is a member of the class.
    // - Student/External: denied by default.
    canManageAttendanceForClass(_members: ClassMemberLike[]) {
        return false;
    }

    // Shared DB-backed membership check used by multiple routes.
    // Keeping this in one place ensures all routes use the same definition of
    // "member of class" and avoids subtle authorization drift.
    async isMemberOfClass(database: Database, classId: string) {
        if (!this.person) return false;

        const memberRow = await database
            .select({ id: classPerson.id })
            .from(classPerson)
            .where(and(eq(classPerson.personId, this.person.id), eq(classPerson.classId, classId)))
            .limit(1)
            .get();

        return Boolean(memberRow);
    }

    // Combined helper for "can this role manage members of this specific class?"
    // - Admin: always true.
    // - Teacher: must be a member of that class.
    // - Student/External: false.
    async canManageMembersForClass(database: Database, classId: string) {
        if (this.isAdmin()) return true;
        if (!this.canManageClassMembers()) return false;
        return this.isMemberOfClass(database, classId);
    }

    protected isTeacherMember(members: ClassMemberLike[]) {
        if (!this.person) return false;
        return members.some((member) => {
            return member.role === 'teacher' && member.personId === this.person!.id;
        });
    }
}

export class ExternalRoleContext extends RoleContext {
    readonly role = 'external' as const;

    constructor() {
        // External users are represented as a null-person context with no privileges.
        super(null);
    }
}

export class AdminRoleContext extends RoleContext {
    readonly role = 'admin' as const;

    // Admin has full access across dashboard management operations.
    canManagePeople() {
        return true;
    }

    canManageClassCatalog() {
        return true;
    }

    canManageClassMembers() {
        return true;
    }

    canViewExam(_isVisible: boolean) {
        return true;
    }

    canViewClassDetail(_isVisible: boolean, _isMember: boolean) {
        return true;
    }

    canManageAttendanceForClass(_members: ClassMemberLike[]) {
        return true;
    }
}

export class TeacherRoleContext extends RoleContext {
    readonly role = 'teacher' as const;

    // Teachers can manage class members, but only in classes they belong to.
    canManageClassMembers() {
        return true;
    }

    canManageAttendanceForClass(members: ClassMemberLike[]) {
        // Teacher must appear in class-member list with role=teacher.
        return this.isTeacherMember(members);
    }
}

export class StudentRoleContext extends RoleContext {
    // Student inherits deny-by-default permissions from RoleContext.
    readonly role = 'student' as const;
}

// Factory entry point for all routes. This keeps role string checks in one place.
export function createRoleContext(person: Person | null | undefined): RoleContext {
    if (!person) return new ExternalRoleContext();
    if (person.role === 'admin') return new AdminRoleContext(person);
    if (person.role === 'teacher') return new TeacherRoleContext(person);
    if (person.role === 'student') return new StudentRoleContext(person);
    return new ExternalRoleContext();
}
