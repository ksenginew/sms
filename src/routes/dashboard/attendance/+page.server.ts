import { error } from '@sveltejs/kit';
import { and, desc, eq, gte, inArray, like, lte, or, sql } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { createRoleContext } from '$lib/server/role-context';
import {
    ATTENDANCE_STATUSES,
    attendance,
    attendanceSessions,
    classes,
    classPerson,
    people,
    type Person
} from '$lib/server/db/schema';

type PeriodKey = 'this-week' | 'this-month' | 'last-month' | 'this-year' | 'custom';
type StudentStatus = (typeof ATTENDANCE_STATUSES)[number];
type ClassSearchCondition = ReturnType<typeof or>;

type ClassRow = {
    id: string;
    title: string;
    description: string | null;
    tags: string[] | null;
    visible: boolean;
    createdAt: Date;
    updatedAt: Date;
    updatedBy: string | null;
};

type StudentAttendanceRow = {
    personId: string;
    status: StudentStatus;
    date: string;
};

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

function readIntParam(value: string | null, fallback: number) {
    if (!value) return fallback;
    const parsed = Number.parseInt(value, 10);
    return Number.isFinite(parsed) ? parsed : fallback;
}

function getPeriodRange(period: PeriodKey, fromInput: string | null, toInput: string | null) {
	// Compute server-side date range once so all downstream queries stay aligned.
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

// Shared input for student-only attendance table operations.
// Admins and teachers do not currently use these table rows in this page,
// but we keep one shape for polymorphic method signatures.
type StudentAttendanceQueryInput = {
    dateRange: ReturnType<typeof getPeriodRange>;
    tableSearch: string;
    statusFilter: string;
    limit: number;
    offset: number;
};

type StudentAttendanceQueryResult = {
    baseRows: StudentAttendanceRow[];
    totalRows: number;
    boundedOffset: number;
    tableRows: StudentAttendanceRow[];
};

// Base abstraction for role-based attendance behavior.
// Each subclass decides what class list and attendance data the role can access.
abstract class AttendanceRoleContext {
    constructor(
        protected readonly database: typeof db,
        protected readonly person: Person
    ) {}

    // Role-specific class visibility rule.
    abstract getClasses(classSearchCondition: ClassSearchCondition): Promise<ClassRow[]>;

    // Default behavior for non-student roles: no student attendance table data.
    // Student role overrides this with actual queries.
    async getStudentAttendanceData(_input: StudentAttendanceQueryInput): Promise<StudentAttendanceQueryResult> {
        return {
            baseRows: [],
            totalRows: 0,
            boundedOffset: 0,
            tableRows: []
        };
    }
}

// Admins can view all classes, optionally filtered by the search predicate.
class AdminAttendanceContext extends AttendanceRoleContext {
    async getClasses(classSearchCondition: ClassSearchCondition): Promise<ClassRow[]> {
        return classSearchCondition
            ? await this.database.select().from(classes).where(classSearchCondition).orderBy(desc(classes.createdAt))
            : await this.database.select().from(classes).orderBy(desc(classes.createdAt));
    }
}

// Teachers can only view classes they belong to, and the search predicate
// is combined with that membership constraint.
class TeacherAttendanceContext extends AttendanceRoleContext {
    async getClasses(classSearchCondition: ClassSearchCondition): Promise<ClassRow[]> {
        return await this.database
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
                    ? and(eq(classPerson.personId, this.person.id), classSearchCondition)
                    : eq(classPerson.personId, this.person.id)
            )
            .orderBy(desc(classes.createdAt));
    }
}

// Students do not get class-management lists on this page, but they do get
// attendance summary and table rows scoped to their own person id.
class StudentAttendanceContext extends AttendanceRoleContext {
    async getClasses(_classSearchCondition: ClassSearchCondition): Promise<ClassRow[]> {
        return [];
    }

    async getStudentAttendanceData(input: StudentAttendanceQueryInput): Promise<StudentAttendanceQueryResult> {
        const { dateRange, tableSearch, statusFilter, limit, offset } = input;

        const baseRows = await this.database
            .select({
                personId: attendance.personId,
                status: attendance.status,
                date: attendanceSessions.date
            })
            .from(attendance)
            .innerJoin(attendanceSessions, eq(attendanceSessions.id, attendance.session))
            .where(
                and(
                    eq(attendance.personId, this.person.id),
                    gte(attendanceSessions.date, dateRange.from),
                    lte(attendanceSessions.date, dateRange.to)
                )
            )
            .orderBy(desc(attendanceSessions.date));

        // This where clause is reused by both count query and paginated data query.
        const studentAttendanceWhere = and(
            eq(attendance.personId, this.person.id),
            gte(attendanceSessions.date, dateRange.from),
            lte(attendanceSessions.date, dateRange.to),
            tableSearch
                ? or(
                    like(attendanceSessions.date, `%${tableSearch}%`),
                    like(attendance.status, `%${tableSearch}%`)
                )
                : undefined,
            statusFilter ? eq(attendance.status, statusFilter as StudentStatus) : undefined
        );

        const totalRow = await this.database
            .select({
                count: sql<number>`count(*)`
            })
            .from(attendance)
            .innerJoin(attendanceSessions, eq(attendanceSessions.id, attendance.session))
            .where(studentAttendanceWhere)
            .limit(1)
            .get();

        const totalRows = Number(totalRow?.count ?? 0);
        const boundedOffset = totalRows > 0 ? Math.min(offset, Math.max(0, totalRows - 1)) : 0;

        const tableRows = await this.database
            .select({
                personId: attendance.personId,
                status: attendance.status,
                date: attendanceSessions.date
            })
            .from(attendance)
            .innerJoin(attendanceSessions, eq(attendanceSessions.id, attendance.session))
            .where(studentAttendanceWhere)
            .orderBy(desc(attendanceSessions.date))
            .limit(limit)
            .offset(boundedOffset);

        return {
            baseRows,
            totalRows,
            boundedOffset,
            tableRows
        };
    }
}

// Factory function that turns a DB person record into a role-specific object.
// This is where inheritance + polymorphism is applied: callers only use the
// base class API, while behavior varies by concrete subclass.
function createAttendanceRoleContext(person: Person, database: typeof db) {
    // Role string parsing is centralized in shared role-context factory.
    // This local factory only maps shared roles to attendance-specific subclasses.
    const roleContext = createRoleContext(person);
    if (roleContext.role === 'admin') return new AdminAttendanceContext(database, person);
    if (roleContext.role === 'teacher') return new TeacherAttendanceContext(database, person);
    if (roleContext.role === 'student') return new StudentAttendanceContext(database, person);
    throw error(403, 'Forbidden');
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

    // Convert raw role string into a role context object.
    // The route no longer branches with long role-specific condition chains.
    const roleContext = createAttendanceRoleContext(person, db);

    const search = (url.searchParams.get('search') ?? '').trim();

    const classSearchCondition = search
        ? or(
            like(classes.title, `%${search}%`),
            like(classes.description, `%${search}%`),
            like(classes.tags, `%${search}%`)
        )
        : undefined;

    // Role-specific class fetching happens through polymorphism.
    const classRows = await roleContext.getClasses(classSearchCondition);

    // Precompute class member counts in one grouped query instead of per-class queries.
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

    // Student table filters are independent from class-card search filters.
    const tableSearch = (url.searchParams.get('tableSearch') ?? '').trim();
    const requestedStatus = (url.searchParams.get('tableStatus') ?? '').trim();
    const statusFilter = ATTENDANCE_STATUSES.includes(requestedStatus as (typeof ATTENDANCE_STATUSES)[number])
        ? requestedStatus
        : '';
    const limitOptions = [10, 25, 50];
    const requestedLimit = readIntParam(url.searchParams.get('tableLimit'), 25);
    const limit = limitOptions.includes(requestedLimit) ? requestedLimit : 25;
    const offset = Math.max(0, readIntParam(url.searchParams.get('tableOffset'), 0));

    // Student attendance table data is also polymorphic.
    // Non-student subclasses return empty results via the base implementation.
    const {
        baseRows: studentBaseAttendanceRows,
        totalRows,
        boundedOffset,
        tableRows: studentTableRows
    } = await roleContext.getStudentAttendanceData({
        dateRange,
        tableSearch,
        statusFilter,
        limit,
        offset
    });

    const hasPrevious = boundedOffset > 0;
    const hasNext = boundedOffset + studentTableRows.length < totalRows;

    const attendanceSummary = {
        total: studentBaseAttendanceRows.length,
        present: studentBaseAttendanceRows.filter((row) => row.status === 'present').length,
        late: studentBaseAttendanceRows.filter((row) => row.status === 'late').length,
        absent: studentBaseAttendanceRows.filter((row) => row.status === 'absent').length,
        excused: studentBaseAttendanceRows.filter((row) => row.status === 'excused').length
    };

    // Return both class-level cards and student-specific table state in one payload.
    return {
        person,
        role: person.role,
        classes: classesForView,
        selectedPeriod: dateRange.selectedPeriod,
        search,
        statusFilter,
        tableSearch,
        from: dateRange.from,
        to: dateRange.to,
        limit,
        limitOptions,
        offset: boundedOffset,
        totalRows,
        hasPrevious,
        hasNext,
        previousOffset: Math.max(0, boundedOffset - limit),
        nextOffset: boundedOffset + limit,
        attendanceRows: studentBaseAttendanceRows,
        tableRows: studentTableRows,
        attendanceSummary
    };
};
