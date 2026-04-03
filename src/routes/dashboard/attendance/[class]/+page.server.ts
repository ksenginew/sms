import { error } from '@sveltejs/kit';
import { desc, eq, inArray } from 'drizzle-orm';
import { db } from '$lib/server/db';
import { attendance, classes, classPerson, people } from '$lib/server/db/schema';

function toDateInput(value: Date) {
    return value.toISOString().slice(0, 10);
}

function formatDateLabel(value: string) {
    const date = new Date(`${value}T00:00:00`);
    return new Intl.DateTimeFormat('en-GB', {
        day: '2-digit',
        month: 'short',
        year: 'numeric'
    }).format(date);
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

    const classInfo = await db.select().from(classes).where(eq(classes.id, params.class)).limit(1).get();

    if (!classInfo) {
        throw error(404, 'Class not found');
    }

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
        .orderBy(desc(people.createdAt));

    const allowed =
        person.role === 'admin' ||
        members.some((member) => member.personId === person.id && member.role === 'teacher');

    if (!allowed) {
        throw error(403, 'Forbidden');
    }

    const teacher = members.find((member) => member.role === 'teacher') ?? null;
    const students = members.filter((member) => member.role === 'student');
    const studentIds = students.map((student) => student.personId);

    const attendanceRows =
        studentIds.length > 0
            ? await db
                  .select({
                      personId: attendance.personId,
                      date: attendance.date,
                      status: attendance.status
                  })
                  .from(attendance)
                  .where(inArray(attendance.personId, studentIds))
                  .orderBy(desc(attendance.date))
            : [];

    const uniqueDates = Array.from(new Set(attendanceRows.map((row) => row.date))).sort(
        (left, right) => right.localeCompare(left)
    );

    const attendanceByKey = new Map(
        attendanceRows.map((row) => [`${row.personId}:${row.date}`, row.status])
    );

    const attendanceColumns = uniqueDates.map((date) => ({
        value: date,
        label: formatDateLabel(date),
        href: `/dashboard/attendance/${classInfo.id}/${date}`
    }));

    const sheetRows = students.map((student) => ({
        ...student,
        attendance: attendanceColumns.map((column) => ({
            date: column.value,
            status: attendanceByKey.get(`${student.personId}:${column.value}`) ?? null
        }))
    }));

    const today = toDateInput(new Date());
    const todayAlreadyMarked = attendanceColumns.some((column) => column.value === today);

    return {
        person,
        classInfo,
        teacher,
        students,
        attendanceColumns,
        sheetRows,
        today,
        todayAlreadyMarked
    };
};