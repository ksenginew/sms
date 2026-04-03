import { auth } from "$lib/server/auth";
import { svelteKitHandler } from "better-auth/svelte-kit";
import { building } from "$app/environment";
import { db } from "$lib/server/db";
import { attendance, classes, classPerson, people } from "$lib/server/db/schema";
import { eq, inArray } from "drizzle-orm";
import {
  test_person,
  test_session,
  test_user,
  test_class_1,
  test_class_2,
  test_teacher,
  test_student,
  test_classAssignments,
  test_attendanceRows
} from "./test";

const dev = true;
let testDataSeeded = false;

function resolveDevPersonId(roleOverride: string | null) {
  if (roleOverride === "teacher") return "teacher-001";
  if (roleOverride === "student") return "student-001";
  return "person-123";
}

async function seedTestData() {
  if (testDataSeeded || !dev) return;
  
  try {
    const existingClass = await db.select().from(classes).where(eq(classes.id, "class-001")).get();

    if (!existingClass) {
      await db.insert(classes).values([test_class_1, test_class_2]);
    }

    const seedPeople = [test_person, test_teacher, test_student].map((person) => ({
      ...person,
      userId: null
    }));
    const seedPersonIds = seedPeople.map((person) => person.id).filter((id): id is string => !!id);

    const existingPeople = seedPersonIds.length > 0
      ? await db.select({ id: people.id }).from(people).where(inArray(people.id, seedPersonIds))
      : [];
    const existingPeopleSet = new Set(existingPeople.map((person) => person.id));
    const missingPeople = seedPeople.filter((person) => person.id && !existingPeopleSet.has(person.id));

    if (missingPeople.length > 0) {
      await db.insert(people).values(missingPeople);
    }

    const targetClassIds = ["class-001", "class-002"];
    const existingAssignments = await db
      .select({ classId: classPerson.classId, personId: classPerson.personId })
      .from(classPerson)
      .where(
        inArray(classPerson.classId, targetClassIds)
      );

    const assignmentSet = new Set(existingAssignments.map((item) => `${item.classId}:${item.personId}`));
    const missingAssignments = test_classAssignments.filter(
      (item) => !assignmentSet.has(`${item.classId}:${item.personId}`)
    );

    if (missingAssignments.length > 0) {
      await db.insert(classPerson).values(missingAssignments);
    }

    const attendanceMarker = await db
      .select({ id: attendance.id })
      .from(attendance)
      .where(eq(attendance.personId, "student-001"))
      .limit(1)
      .get();

    if (!attendanceMarker && test_attendanceRows.length > 0) {
      await db.insert(attendance).values(test_attendanceRows);
    }

    console.log("Test data seeded successfully");
    
    testDataSeeded = true;
  } catch (e) {
    console.error("Failed to seed test data:", e);
  }
}

export async function handle({ event, resolve }) {
  const session = await auth.api.getSession({
    headers: event.request.headers,
  });

  if (session) {
    event.locals.session = session.session;
    event.locals.user = session.user;
  } else if (dev) {
    await seedTestData();

    const roleOverride = "student";// Set to "teacher", "student", or null for admin
    const devPersonId = resolveDevPersonId(roleOverride);
    const devPerson = await db.select().from(people).where(eq(people.id, devPersonId)).limit(1).get();

    event.locals.session = test_session;
    event.locals.user = test_user;
    event.locals.person = devPerson ?? test_person;
  }

  return svelteKitHandler({ event, resolve, auth, building });
}