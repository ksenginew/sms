import { error } from '@sveltejs/kit';
import { and, desc, eq, gte, inArray, lte } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { attendance, attendanceSessions, classes, classPerson, people } from '$lib/server/db/schema';

const toYearMonth = (date: Date) => `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;

export const load = async ({ locals, params, url }) => {
    if (!locals.person)
        return error(401, 'Unauthorized');

    const classInfo = await db.select().from(classes).where(eq(classes.id, params.class)).limit(1).get();
    if (!classInfo)
        throw error(404, 'Class not found');

    const members = await db
        .select({
            id: people.id,
            name: people.name,
            role: people.role
        })
        .from(classPerson)
        .innerJoin(people, eq(people.id, classPerson.personId))
        .where(eq(classPerson.classId, classInfo.id))
        .orderBy(desc(people.createdAt));

    const allowed =
        locals.person.role === 'admin' ||
        members.some((member) => member.id === locals.person!.id && member.role === 'teacher');

    if (!allowed) {
        throw error(403, 'Forbidden');
    }

    const teachers = members.filter((member) => member.role === 'teacher');
    const students = members.filter((member) => member.role === 'student');

    const monthBase = url.searchParams.has('month') ? new Date(url.searchParams.get('month')!) : new Date();
    const monthStart = `${monthBase.getFullYear()}-${String(monthBase.getMonth() + 1).padStart(2, '0')}-01`;
    const monthEnd = `${monthBase.getFullYear()}-${String(monthBase.getMonth() + 1).padStart(2, '0')}-31`;
    const previousMonthDate = new Date(monthBase.getFullYear(), monthBase.getMonth() - 1, 1);
    const nextMonthDate = new Date(monthBase.getFullYear(), monthBase.getMonth() + 1, 1);
    const sessionRows = await db
        .select()
        .from(attendanceSessions)
        .where(
            and(
                gte(attendanceSessions.date, monthStart),
                lte(attendanceSessions.date, monthEnd)
            )
        )
        .orderBy(attendanceSessions.date);

    const attendanceRows = sessionRows.length > 0 && students.length > 0
        ? await db
            .select({
                personId: attendance.personId,
                sessionId: attendance.session,
                status: attendance.status
            })
            .from(attendance)
            .where(
                and(
                    inArray(attendance.personId, students.map((student) => student.id)),
                    inArray(attendance.session, sessionRows.map((session) => session.id))
                )
            )
        : [];

    type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';
    const tableData: Record<string, Record<number, AttendanceStatus>> = {}; // personId -> (sessionId -> status)

    for (const attendanceRecord of attendanceRows) {
        if (!tableData[attendanceRecord.personId]) {
            tableData[attendanceRecord.personId] = {};
        }
        tableData[attendanceRecord.personId][attendanceRecord.sessionId] = attendanceRecord.status;
    }

    return {
        classInfo,
        teachers,
        students,
        sessions: sessionRows,
        attendance: tableData,
        selectedMonth: toYearMonth(monthBase),
        previousMonth: toYearMonth(previousMonthDate),
        nextMonth: toYearMonth(nextMonthDate),
    };
};