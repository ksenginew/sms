import { error } from '@sveltejs/kit';
import { and, desc, eq, gte, inArray, like, lte, or, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { attendance, attendanceSessions, classes, classPerson, people } from '$lib/server/db/schema';

type PeriodKey = 'this-week' | 'this-month' | 'last-month' | 'this-year' | 'custom';

const PERIODS: PeriodKey[] = ['this-week', 'this-month', 'last-month', 'this-year', 'custom'];

function toDateInput(value: Date) {
    return value.toISOString().slice(0, 10);
}

function parseDateInput(value: string | null) {
    if (!value) return null;
    if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const parsed = new Date(`${value}T00:00:00`);
    if (Number.isNaN(parsed.getTime())) return null;
    return parsed;
}

function getPeriodRange(period: PeriodKey, fromInput: string | null, toInput: string | null) {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());

    if (period === 'custom') {
        const customFrom = parseDateInput(fromInput);
        const customTo = parseDateInput(toInput);

        if (customFrom && customTo && customFrom <= customTo) {
            return {
                selectedPeriod: period,
                from: toDateInput(customFrom),
                to: toDateInput(customTo)
            };
        }
    }

    if (period === 'this-month') {
        const start = new Date(today.getFullYear(), today.getMonth(), 1);
        return {
            selectedPeriod: period,
            from: toDateInput(start),
            to: toDateInput(today)
        };
    }

    if (period === 'last-month') {
        const start = new Date(today.getFullYear(), today.getMonth() - 1, 1);
        const end = new Date(today.getFullYear(), today.getMonth(), 0);
        return {
            selectedPeriod: period,
            from: toDateInput(start),
            to: toDateInput(end)
        };
    }

    if (period === 'this-year') {
        const start = new Date(today.getFullYear(), 0, 1);
        return {
            selectedPeriod: period,
            from: toDateInput(start),
            to: toDateInput(today)
        };
    }

    const day = today.getDay();
    const mondayOffset = day === 0 ? 6 : day - 1;
    const start = new Date(today);
    start.setDate(today.getDate() - mondayOffset);

    return {
        selectedPeriod: 'this-week' as const,
        from: toDateInput(start),
        to: toDateInput(today)
    };
}

export const load = async ({ locals, url }) => {
    if (!locals.session || !locals.user) {
        throw error(401, 'Unauthorized');
    }

    const person =
        locals.person ??
        (await db.select().from(people).where(eq(people.userId, locals.user.id)).limit(1).get());

    if (!person) {
        throw error(401, 'Unauthorized');
    }

    if (person.role !== 'admin' && person.role !== 'teacher' && person.role !== 'student') {
        throw error(403, 'Forbidden');
    }

    const search = (url.searchParams.get('search') ?? '').trim();

    const classSearchCondition = search
        ? or(
            like(classes.title, `%${search}%`),
            like(classes.description, `%${search}%`),
            like(classes.tags, `%${search}%`)
        )
        : undefined;

    const classRows =
        person.role === 'admin'
            ? classSearchCondition
                ? await db.select().from(classes).where(classSearchCondition).orderBy(desc(classes.createdAt))
                : await db.select().from(classes).orderBy(desc(classes.createdAt))
            : person.role === 'teacher'
                ? await db
                    .select({
                        id: classes.id,
                        title: classes.title,
                        description: classes.description,
                        tags: classes.tags,
                        visible: classes.visible,
                        createdAt: classes.createdAt,
                        updatedAt: classes.updatedAt,
                        updatedBy: classes.updatedBy
                    })
                    .from(classes)
                    .innerJoin(classPerson, eq(classes.id, classPerson.classId))
                    .where(
                        classSearchCondition
                            ? and(eq(classPerson.personId, person.id), classSearchCondition)
                            : eq(classPerson.personId, person.id)
                    )
                    .orderBy(desc(classes.createdAt))
                : [];

    const classMembershipCounts =
        classRows.length > 0
            ? await db
                .select({
                    classId: classPerson.classId,
                    count: sql<number>`count(*)`
                })
                .from(classPerson)
                .where(inArray(classPerson.classId, classRows.map((item) => item.id)))
                .groupBy(classPerson.classId)
            : [];

    const classCountsById = new Map(classMembershipCounts.map((row) => [row.classId, Number(row.count)]));

    const classesForView = classRows.map((item) => ({
        ...item,
        memberCount: classCountsById.get(item.id) ?? 0
    }));

    const periodParam = url.searchParams.get('period');
    const period = PERIODS.includes(periodParam as PeriodKey)
        ? (periodParam as PeriodKey)
        : 'this-week';
    const fromParam = url.searchParams.get('from');
    const toParam = url.searchParams.get('to');
    const dateRange = getPeriodRange(period, fromParam, toParam);

    const studentAttendanceRows =
        person.role === 'student'
            ? await db
                .select({
                    personId: attendance.personId,
                    status: attendance.status,
                    date: attendanceSessions.date
                })
                .from(attendance)
                .innerJoin(attendanceSessions, eq(attendanceSessions.id, attendance.session))
                .where(
                    and(
                        eq(attendance.personId, person.id),
                        gte(attendanceSessions.date, dateRange.from),
                        lte(attendanceSessions.date, dateRange.to),
                        search
                            ? or(
                                like(attendanceSessions.date, `%${search}%`),
                                like(attendance.status, `%${search}%`)
                            )
                            : undefined
                    )
                )
                .orderBy(desc(attendanceSessions.date))
            : [];

    const attendanceSummary = {
        total: studentAttendanceRows.length,
        present: studentAttendanceRows.filter((row) => row.status === 'present').length,
        late: studentAttendanceRows.filter((row) => row.status === 'late').length,
        absent: studentAttendanceRows.filter((row) => row.status === 'absent').length,
        excused: studentAttendanceRows.filter((row) => row.status === 'excused').length
    };

    return {
        person,
        role: person.role,
        classes: classesForView,
        selectedPeriod: dateRange.selectedPeriod,
        search,
        from: dateRange.from,
        to: dateRange.to,
        attendanceRows: studentAttendanceRows,
        attendanceSummary
    };
};
