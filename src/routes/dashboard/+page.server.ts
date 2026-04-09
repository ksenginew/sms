import { error } from '@sveltejs/kit';
import { and, desc, eq, gte, inArray, lte, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { createRoleContext } from '$lib/server/role-context';
import {
    attendance,
    attendanceSessions,
    classPerson,
    classes,
    exam_class,
    exams,
    people
} from '$lib/server/db/schema';

function toDateInput(value: Date) {
    return value.toISOString().slice(0, 10);
}

type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';

function summarizeByStatus(rows: Array<{ status: AttendanceStatus }>) {
	// Create a deterministic summary object used by all overview cards.
    const summary = {
        total: rows.length,
        present: 0,
        absent: 0,
        late: 0,
        excused: 0
    };

    for (const row of rows) {
        if (row.status === 'present') summary.present += 1;
        if (row.status === 'absent') summary.absent += 1;
        if (row.status === 'late') summary.late += 1;
        if (row.status === 'excused') summary.excused += 1;
    }

    const percentage = summary.total > 0 ? Math.round((summary.present / summary.total) * 100) : 0;

    return {
        ...summary,
        percentage
    };
}

export const load = async (event) => {
    const user = event.locals.user!;
    const session = event.locals.session!;
    const person = event.locals.person;
    const now = new Date();
    const today = toDateInput(now);
    const yearStart = `${now.getFullYear()}-01-01`;

    // Common payload every role receives.
    // Role-specific sections are merged on top of this base.
    const base = {
        nowIso: now.toISOString(),
        person,
        user,
    };
    
    if (!person) {
        return {
            ...base,
            role: 'external' as const
        };
    }

    // Convert raw role string to a role object so route logic can be driven by capabilities.
    const roleContext = createRoleContext(person);

    // Student overview: current-year personal attendance summary.
    if (roleContext.isStudent()) {
        const currentYearRows = await db
            .select({
                date: attendanceSessions.date,
                status: attendance.status
            })
            .from(attendance)
            .innerJoin(attendanceSessions, eq(attendanceSessions.id, attendance.session))
            .where(
                and(
                    eq(attendance.personId, person.id),
                    gte(attendanceSessions.date, yearStart),
                    lte(attendanceSessions.date, today)
                )
            )
            .orderBy(desc(attendanceSessions.date));

        return {
            ...base,
            role: roleContext.role,
            studentOverview: {
                attendanceRows: currentYearRows,
                attendanceSummary: summarizeByStatus(currentYearRows),
                examPreview: {
                    ready: false,
                    title: 'Exam result notifications',
                    message: 'Exam result entity is not connected yet. This is a preview placeholder section.'
                }
            }
        };
    }

    // Teacher overview: classes taught + latest marked attendance per class.
    if (roleContext.isTeacher()) {
        const teacherClasses = await db
            .select({
                id: classes.id,
                title: classes.title,
                description: classes.description,
                visible: classes.visible,
                updatedAt: classes.updatedAt
            })
            .from(classPerson)
            .innerJoin(classes, eq(classes.id, classPerson.classId))
            .where(eq(classPerson.personId, person.id))
            .orderBy(desc(classes.updatedAt));

        const classAttendanceCards = [] as Array<{
            classId: string;
            classTitle: string;
            lastMarkedDate: string | null;
            summary: {
                total: number;
                present: number;
                absent: number;
                late: number;
                excused: number;
                percentage: number;
            };
        }>;

        // Build one attendance card per class with latest-session summary.
        for (const classItem of teacherClasses) {
            const lastSession = await db
                .select({
                    sessionId: attendanceSessions.id,
                    date: attendanceSessions.date
                })
                .from(attendanceSessions)
                .innerJoin(attendance, eq(attendance.session, attendanceSessions.id))
                .innerJoin(classPerson, eq(classPerson.personId, attendance.personId))
                .where(eq(classPerson.classId, classItem.id))
                .orderBy(desc(attendanceSessions.date))
                .limit(1)
                .get();

            if (!lastSession) {
                classAttendanceCards.push({
                    classId: classItem.id,
                    classTitle: classItem.title,
                    lastMarkedDate: null,
                    summary: {
                        total: 0,
                        present: 0,
                        absent: 0,
                        late: 0,
                        excused: 0,
                        percentage: 0
                    }
                });
                continue;
            }

            const lastRows = await db
                .select({ status: attendance.status })
                .from(attendance)
                .innerJoin(classPerson, eq(classPerson.personId, attendance.personId))
                .where(
                    and(
                        eq(classPerson.classId, classItem.id),
                        eq(attendance.session, lastSession.sessionId)
                    )
                );

            classAttendanceCards.push({
                classId: classItem.id,
                classTitle: classItem.title,
                lastMarkedDate: lastSession.date,
                summary: summarizeByStatus(lastRows)
            });
        }

        // const classIds = teacherClasses.map((item) => item.id);
        // const examRows = classIds.length > 0
        //     ? await db
        //         .select({
        //             id: exams.id,
        //             title: exams.title,
        //             visible: exams.visible,
        //             createdAt: exams.createdAt
        //         })
        //         .from(exams)
        //         .innerJoin(exam_class, eq(exam_class.examId, exams.id))
        //         .where(and(inArray(exam_class.classId, classIds), eq(exams.visible, true)))
        //         .orderBy(desc(exams.createdAt))
        //     : [];

        // const uniqueExamMap = new Map<number, { id: number; title: string; visible: boolean; createdAt: Date }>();
        // for (const exam of examRows) {
        //     if (!uniqueExamMap.has(exam.id)) {
        //         uniqueExamMap.set(exam.id, exam);
        //     }
        // }

        return {
            ...base,
            role: roleContext.role,
            teacherOverview: {
                attendanceCards: classAttendanceCards,
                classesQuickLinks: teacherClasses.slice(0, 6).map((item) => ({
                    href: `/dashboard/classes/${item.id}`,
                    title: item.title
                })),
                // examsQuickLinks: Array.from(uniqueExamMap.values()).slice(0, 6).map((item) => ({
                //     href: `/dashboard/exams/${item.id}`,
                //     title: item.title
                // }))
            }
        };
    }

    // Admin overview: system-wide quick metrics and latest attendance day snapshot.
    if (roleContext.isAdmin()) {
        const todaySession = await db
            .select({
                sessionId: attendanceSessions.id,
                date: attendanceSessions.date
            })
            .from(attendanceSessions)
            .innerJoin(attendance, eq(attendance.session, attendanceSessions.id))
            .where(eq(attendanceSessions.date, today))
            .limit(1)
            .get();

        const fallbackSession = todaySession
            ? null
            : await db
                .select({
                    sessionId: attendanceSessions.id,
                    date: attendanceSessions.date
                })
                .from(attendanceSessions)
                .innerJoin(attendance, eq(attendance.session, attendanceSessions.id))
                .orderBy(desc(attendanceSessions.date))
                .limit(1)
                .get();

        const activeSession = todaySession ?? fallbackSession;

        const dayRows = activeSession
            ? await db
                .select({ status: attendance.status })
                .from(attendance)
                .where(eq(attendance.session, activeSession.sessionId))
            : [];

        // Fetch aggregate counters in parallel for dashboard quick-access cards.
        const [classesTotal, peopleTotal, examsTotal] = await Promise.all([
            db.select({ count: sql<number>`count(*)` }).from(classes).get(),
            db.select({ count: sql<number>`count(*)` }).from(people).get(),
            db.select({ count: sql<number>`count(*)` }).from(exams).get()
        ]);

        return {
            ...base,
            role: roleContext.role,
            adminOverview: {
                attendanceDay: activeSession?.date ?? null,
                attendanceSummary: summarizeByStatus(dayRows),
                quickAccess: [
                    {
                        title: 'Classes',
                        href: '/dashboard/classes',
                        subtitle: `${Number(classesTotal?.count ?? 0)} total`
                    },
                    {
                        title: 'People',
                        href: '/dashboard/people',
                        subtitle: `${Number(peopleTotal?.count ?? 0)} total`
                    },
                    {
                        title: 'Exams',
                        href: '/dashboard/exams',
                        subtitle: `${Number(examsTotal?.count ?? 0)} total`
                    },
                    {
                        title: 'Attendance',
                        href: '/dashboard/attendance',
                        subtitle: activeSession ? `Latest: ${activeSession.date}` : 'No marks yet'
                    }
                ]
            }
        };
    }

    throw error(403, 'Forbidden');
};
