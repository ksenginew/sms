import { error, fail } from '@sveltejs/kit';
import { eq, inArray, and } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { attendance, classes, classPerson, people } from '$lib/server/db/schema';

function formatDateLabel(value: string) {
    const date = new Date(`${value}T00:00:00`);
    return new Intl.DateTimeFormat('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    }).format(date);
}

function getDatabaseErrorMessage(error: any): string {
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

export const load = async ({ locals, params }) => {
    if (!locals.session || !locals.user) {
        throw error(401, 'Unauthorized');
    }

    const person =
        locals.person ??
        (await db.select().from(people).where(eq(people.userId, locals.user.id)).limit(1).get());

    if (!person) {
        throw error(401, 'Unauthorized');
    }

    const classInfo = await db
        .select()
        .from(classes)
        .where(eq(classes.id, params.class))
        .limit(1)
        .get();

    if (!classInfo) {
        throw error(404, 'Class not found');
    }

    // Get all class members
    const members = await db
        .select({
            personId: people.id,
            name: people.name,
            fullname: people.fullname,
            role: people.role
        })
        .from(classPerson)
        .innerJoin(people, eq(people.id, classPerson.personId))
        .where(eq(classPerson.classId, classInfo.id))
        .orderBy(people.name);

    const allowed =
        person.role === 'admin' ||
        members.some((member) => member.personId === person.id && member.role === 'teacher');

    if (!allowed) {
        throw error(403, 'Forbidden');
    }

    const teacher = members.find((member) => member.role === 'teacher') ?? null;
    const students = members.filter((member) => member.role === 'student');
    const studentIds = students.map((student) => student.personId);

    // Load existing attendance for this date
    const sessionDate = params.session;
    const existingAttendance =
        studentIds.length > 0
            ? await db
                  .select({
                      personId: attendance.personId,
                      status: attendance.status
                  })
                  .from(attendance)
                  .where(
                      and(
                          eq(attendance.date, sessionDate),
                          inArray(attendance.personId, studentIds)
                      )
                  )
            : [];

    const attendanceByPersonId = new Map(
        existingAttendance.map((row) => [row.personId, row.status])
    );

    const sheetRows = students.map((student) => ({
        ...student,
        status: attendanceByPersonId.get(student.personId) ?? 'absent'
    }));

    return {
        person,
        classInfo,
        teacher,
        sessionDate,
        dateLabel: formatDateLabel(sessionDate),
        sheetRows,
        isNewRecord: existingAttendance.length === 0
    };
};

export const actions = {
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

        const allowed =
            person.role === 'admin' ||
            members.some((member) => member.personId === person.id && member.role === 'teacher');

        if (!allowed) {
            throw error(403, 'Forbidden');
        }

        const formData = await request.formData();
        const sessionDate = params.session;
        const studentIds = JSON.parse(formData.get('studentIds') as string);
        const statuses = JSON.parse(formData.get('statuses') as string);

        try {
            // Delete existing records for this date
            const existingRecords = await db
                .select({ id: attendance.id })
                .from(attendance)
                .where(
                    and(
                        eq(attendance.date, sessionDate),
                        inArray(attendance.personId, studentIds)
                    )
                );

            if (existingRecords.length > 0) {
                for (const record of existingRecords) {
                    await db.delete(attendance).where(eq(attendance.id, record.id));
                }
            }

            // Insert new records
            const recordsToInsert = studentIds.map((studentId: string) => ({
                personId: studentId,
                date: sessionDate,
                status: statuses[studentId] || 'absent'
            }));

            if (recordsToInsert.length > 0) {
                await db.insert(attendance).values(recordsToInsert);
            }

            return { success: true };
        } catch (err) {
            return fail(500, { message: getDatabaseErrorMessage(err) });
        }
    }
};
