import { error, fail } from '@sveltejs/kit';
import { eq, inArray, and } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { attendance, attendanceSessions, classes, classPerson, people } from '$lib/server/db/schema';
import { createRoleContext } from '$lib/server/role-context';
import type { Actions, PageServerLoad } from './$types';

function formatDateLabel(value: string) {
	// Render date consistently for the page header and breadcrumb.
    const date = new Date(`${value}T00:00:00`);
    return new Intl.DateTimeFormat('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    }).format(date);
}

function toDateInput(value: Date) {
    return value.toISOString().slice(0, 10);
}

function parseDateInput(value: string | null) {
	// Strict yyyy-mm-dd parsing to avoid locale-dependent Date parsing behavior.
    if (!value || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
    const parts = value.split('-').map(Number);
    if (parts.length !== 3) return null;
    const [y, m, d] = parts;
    if (!Number.isFinite(y) || !Number.isFinite(m) || !Number.isFinite(d)) return null;
    const date = new Date(Date.UTC(y, m - 1, d));
    return Number.isNaN(date.getTime()) ? null : date;
}

function getDatabaseErrorMessage(error: any): string {
	// Translate low-level DB constraint errors into form-friendly messages.
    const message = error?.message?.toLowerCase() ?? '';
    if (message.includes('foreign key')) {
        return 'Invalid reference: Class or student not found.';
    }
    if (message.includes('not null')) {
        return 'Required field is missing.';
    }
    if (message.includes('unique')) {
        return 'This record already exists.';
    }
    return 'Database error. Please try again.';
}

export const load: PageServerLoad = async ({ locals, params, url }) => {
    if (!locals.session || !locals.user) {
        throw error(401, 'Unauthorized');
    }

    const person =
        locals.person ??
        (await db.select().from(people).where(eq(people.userId, locals.user.id)).limit(1).get());

    if (!person) {
        throw error(401, 'Unauthorized');
    }

    // Build capability object for authorization checks.
    const roleContext = createRoleContext(person);

    const classInfo = await db
        .select()
        .from(classes)
        .where(eq(classes.id, params.class))
        .limit(1)
        .get();

    if (!classInfo) {
        throw error(404, 'Class not found');
    }

    // Load class members once, then derive teacher/student subsets for the sheet.
    const members = await db
        .select({
            personId: people.id,
            name: people.name,
            role: people.role
        })
        .from(classPerson)
        .innerJoin(people, eq(people.id, classPerson.personId))
        .where(eq(classPerson.classId, classInfo.id))
        .orderBy(people.name);

    // Shared role-policy gate for attendance edit access.
    const allowed = roleContext.canManageAttendanceForClass(members);

    if (!allowed) {
        throw error(403, 'Forbidden');
    }

    const teacher = members.find((member) => member.role === 'teacher') ?? null;
    const students = members.filter((member) => member.role === 'student');
    const studentIds = students.map((student) => student.personId);

    const selectedDate = parseDateInput(url.searchParams.get('date')) ?? new Date();
    const selectedDateInput = toDateInput(selectedDate);
    const todayInput = toDateInput(new Date());

    if (selectedDateInput > todayInput) {
        throw error(403, 'Forbidden');
    }

    // Attendance records are grouped by session id, so we resolve/create by date.
    const sessionRecord = await db
        .select()
        .from(attendanceSessions)
        .where(eq(attendanceSessions.date, selectedDateInput))
        .limit(1)
        .get();

    const existingAttendance =
		// Fetch current marks only when both students and a session exist.
        studentIds.length > 0 && sessionRecord
            ? await db
                  .select({
                      personId: attendance.personId,
                      status: attendance.status
                  })
                  .from(attendance)
                  .where(and(eq(attendance.session, sessionRecord.id), inArray(attendance.personId, studentIds)))
            : [];

    const attendanceByPersonId = new Map(
        existingAttendance.map((row) => [row.personId, row.status])
    );

    // Pre-fill each row with existing status, defaulting to absent for unmarked rows.
    const sheetRows = students.map((student) => ({
        ...student,
        status: attendanceByPersonId.get(student.personId) ?? 'absent'
    }));

    return {
        person,
        classInfo,
        teacher,
        selectedDate: selectedDateInput,
        dateLabel: formatDateLabel(selectedDateInput),
        sheetRows,
        isNewRecord: existingAttendance.length === 0,
        hasSession: Boolean(sessionRecord),
        todayDate: todayInput
    };
};

export const actions: Actions = {
    default: async ({ request, locals, params }) => {
        if (!locals.session || !locals.user) {
            throw error(401, 'Unauthorized');
        }

        const person =
            locals.person ??
            (await db
                .select()
                .from(people)
                .where(eq(people.userId, locals.user.id))
                .limit(1)
                .get());

        if (!person) {
            throw error(401, 'Unauthorized');
        }

        // Capability object is reused in write flow for consistent authorization.
        const roleContext = createRoleContext(person);

        const classInfo = await db
            .select()
            .from(classes)
            .where(eq(classes.id, params.class))
            .limit(1)
            .get();

        if (!classInfo) {
            throw error(404, 'Class not found');
        }

        const members = await db
            .select({
                personId: people.id,
                role: people.role
            })
            .from(classPerson)
            .innerJoin(people, eq(people.id, classPerson.personId))
            .where(eq(classPerson.classId, classInfo.id));

        const allowed = roleContext.canManageAttendanceForClass(members);

        if (!allowed) {
            throw error(403, 'Forbidden');
        }

        const formData = await request.formData();
		// The UI sends one date plus serialized status map for all students.
        const sessionDate = formData.get('date')?.toString() ?? '';
        const studentIds = JSON.parse(formData.get('studentIds') as string) as string[];
        const statuses = JSON.parse(formData.get('statuses') as string) as Record<string, string>;
        const todayInput = toDateInput(new Date());

        if (!/^\d{4}-\d{2}-\d{2}$/.test(sessionDate)) {
            return fail(400, { message: 'Invalid date selected.' });
        }

        if (sessionDate > todayInput) {
            throw error(403, 'Forbidden');
        }

        try {
			// Resolve the session for selected date; create it if it does not exist yet.
            let sessionRecord = await db
                .select()
                .from(attendanceSessions)
                .where(eq(attendanceSessions.date, sessionDate))
                .limit(1)
                .get();

            if (!sessionRecord) {
                await db.insert(attendanceSessions).values({
                    date: sessionDate,
                    updatedBy: locals.user!.id
                });

                sessionRecord = await db
                    .select()
                    .from(attendanceSessions)
                    .where(eq(attendanceSessions.date, sessionDate))
                    .limit(1)
                    .get();
            }

            if (!sessionRecord) {
                return fail(500, { message: 'Unable to create attendance session.' });
            }

            // Rewrite strategy: delete existing rows for this session+student set,
            // then insert the submitted state. This keeps writes idempotent.
            if (studentIds.length > 0) {
                await db
                    .delete(attendance)
                    .where(
                        and(
                            eq(attendance.session, sessionRecord.id),
                            inArray(attendance.personId, studentIds)
                        )
                    );
            }

            // Persist the new attendance state in a single bulk insert.
            const recordsToInsert = studentIds.map((studentId: string) => ({
                personId: studentId,
                session: sessionRecord.id,
                status: (statuses[studentId] as 'present' | 'late' | 'absent' | 'excused') || 'absent',
                updatedBy: locals.user!.id
            }));

            if (recordsToInsert.length > 0) {
                await db.insert(attendance).values(recordsToInsert);
            }

            return { success: true };
        } catch (err) {
            console.log(err);
            return fail(500, { message: getDatabaseErrorMessage(err) });
        }
    }
};
