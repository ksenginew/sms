import { attendance, classes, classPerson } from "$lib/server/db/schema";
import type { Person } from "$lib/server/db/schema";
import type { Session, User } from "better-auth";

export const test_user: User = {
    id: "1234567890",
    createdAt: new Date(),
    updatedAt: new Date(),
    email: "test@example.com",
    emailVerified: true,
    name: "Test User",
    image: "https://example.com/avatar.png"
};

export const test_session: Session = {
    id: "test-session-id",
    createdAt: new Date(),
    updatedAt: new Date(),
    userId: "1234567890",
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    token: "test-session-token",
    ipAddress: null,
    userAgent: null
}

export const test_person: Person = {
    id: "person-123",
    createdAt: new Date(),
    updatedAt: new Date(),
    name: "Test Person",
    fullname: "Test Person Fullname",
    email: "test-person@example.com",
    role: "admin",
    userId: null,
    updatedBy: null
};

export const test_teacher: Person = {
    id: "teacher-001",
    createdAt: new Date(),
    updatedAt: new Date(),
    name: "Teacher One",
    fullname: "Teacher One",
    email: "teacher@example.com",
    role: "teacher",
    userId: null,
    updatedBy: "person-123"
};

export const test_student: Person = {
    id: "student-001",
    createdAt: new Date(),
    updatedAt: new Date(),
    name: "Student One",
    fullname: "Student One",
    email: "student@example.com",
    role: "student",
    userId: null,
    updatedBy: "person-123"
};

export const test_class_1: typeof classes.$inferInsert = {
    id: "class-001",
    title: "Mathematics 101",
    description: "Introduction to algebra and geometry. Master the fundamentals of mathematical thinking.",
    tags: "math,beginner,fundamentals",
    visible: true,
    updatedBy: "person-123"
};

export const test_class_2: typeof classes.$inferInsert = {
    id: "class-002",
    title: "English Literature",
    description: "Classic literature, writing skills, and literary analysis for advanced learners.",
    tags: "literature,english,advanced,reading",
    visible: true,
    updatedBy: "person-123"
};

export const test_classAssignments: Array<typeof classPerson.$inferInsert> = [
    {
        classId: "class-001",
        personId: "teacher-001",
        updatedBy: "person-123"
    },
    {
        classId: "class-001",
        personId: "student-001",
        updatedBy: "person-123"
    },
    {
        classId: "class-002",
        personId: "student-001",
        updatedBy: "person-123"
    }
];

export const test_attendanceRows: Array<typeof attendance.$inferInsert> = [
    { personId: "student-001", date: "2026-04-01", status: "present", updatedBy: "teacher-001" },
    { personId: "student-001", date: "2026-04-02", status: "late", updatedBy: "teacher-001" },
    { personId: "student-001", date: "2026-04-03", status: "absent", updatedBy: "teacher-001" },
    { personId: "student-001", date: "2026-03-27", status: "present", updatedBy: "teacher-001" },
    { personId: "student-001", date: "2026-03-18", status: "excused", updatedBy: "teacher-001" },
    { personId: "student-001", date: "2026-02-21", status: "present", updatedBy: "teacher-001" }
];

