import * as schema from './src/lib/server/db/schema';
import { drizzle } from 'drizzle-orm/libsql';
import { createClient } from '@libsql/client';
import { hashPassword } from 'better-auth/crypto';

const currentPassword = await hashPassword('password');

declare const process: {
	env: Record<string, string | undefined>;
};

const databaseUrl = process.env.DATABASE_URL;

if (!databaseUrl) throw new Error('DATABASE_URL is not set');

const client = createClient({ url: databaseUrl });

const db = drizzle(client, { schema });

const {
	account,
	attendance,
	classPerson,
	classes,
	exams,
	papers,
	people,
	session,
	scores,
	user,
	verification,
	subjects
} = schema;
type AttendanceStatus = 'present' | 'absent' | 'late' | 'excused';
type SectionLetter = (typeof sectionLetters)[number];
type AuthUserSeed = typeof user.$inferInsert;
type AuthAccountSeed = typeof account.$inferInsert;
type AuthSessionSeed = typeof session.$inferInsert;

type PersonSeed = {
	id: string;
	role: 'admin' | 'teacher' | 'student';
	name: string;
	firstName: string;
	lastName: string;
	fullname: string;
	email: string;
	idnumber: string;
	phone: string;
	mobilePhone: string;
	address: string;
	createdAt: Date;
	updatedAt: Date;
	updatedBy: string;
	userId?: string;
};

type ClassSeed = {
	id: string;
	title: string;
	description: string;
	tags: string;
	visible: boolean;
	createdAt: Date;
	updatedAt: Date;
	updatedBy: string;
	grade: number;
	section: SectionLetter;
	teacherIds: string[];
	studentIds: string[];
	paperIds: number[];
};

type SubjectSeed = {
	id: string;
	title: string;
	description: string;
};

type ExamSeed = {
	id: number;
	title: string;
	description: string;
	tags: string;
	visible: boolean;
	createdAt: Date;
};

type PaperSeed = {
	id: number;
	examId: number;
	subjectId: string;
	subjectTitle: string;
	title: string;
	description: string;
	structure: string;
	createdAt: Date;
};

type ScoreSeed = {
	id: number;
	paperId: number;
	personId: string;
	numeric: number;
	text: string;
	json: string;
	createdAt: Date;
	updatedAt: Date;
	updatedBy: string;
};

type AttendanceSeed = {
	id: number;
	personId: string;
	date: string;
	status: AttendanceStatus;
	notes: string | null;
	createdAt: Date;
	updatedAt: Date;
	updatedBy: string;
};

const ACADEMIC_YEAR = 2026;
const SEED_TIMESTAMP = new Date('2026-04-03T00:00:00.000Z');
const START_DATE = new Date(Date.UTC(2026, 0, 1));
const END_DATE = new Date(Date.UTC(2026, 2, 31));

const gradeLevels = [6, 7, 8, 9, 10, 11] as const;
const sectionLetters = ['A', 'B', 'C', 'D', 'E', 'F', 'G'] as const;

const juniorSubjects = [
	'Sinhala Language',
	'English Language',
	'Mathematics',
	'Science',
	'History',
	'Geography',
	'Buddhism',
	'Information & Communication Technology',
	'Health & Physical Education',
	'Art',
	'Tamil Language'
] as const;

const seniorSubjects = juniorSubjects.filter((subject) => subject !== 'Art' && subject !== 'Tamil Language');

const nameParts = {
	first: [
		'Nimal', 'Kasun', 'Sampath', 'Dinesh', 'Ruwan', 'Tharindu', 'Prabath', 'Chamara',
		'Sahan', 'Lakshan', 'Pasindu', 'Kamal', 'Hemantha', 'Chathura', 'Gayan', 'Sandun',
		'Ishara', 'Nuwan', 'Buddhika', 'Kavindu', 'Madhawa', 'Rashmi', 'Yasiru', 'Keshani',
		'Shanika', 'Thilini', 'Dinuka', 'Pabasara', 'Dilshan', 'Sajith'
	],
	middle: [
		'Kumara', 'Prasad', 'Suresh', 'Anura', 'Mali', 'Chandana', 'Indika', 'Harsha',
		'Upali', 'Niroshan', 'Nalaka', 'Deepika', 'Romesh', 'Nadeeka', 'Amal', 'Udaya',
		'Ranjith', 'Chinthaka', 'Sanjeewa', 'Wijaya'
	],
	last: [
		'Perera', 'Silva', 'Fernando', 'Jayasinghe', 'Wickramasinghe', 'Herath', 'Mendis',
		'Kumara', 'Rathnayake', 'Rajapaksa', 'Arachchi', 'Pushpakumara', 'Bandara', 'De Silva',
		'Abeysekara', 'Gunasekara', 'Peiris', 'Dissanayake', 'Weerasinghe', 'Liyanage',
		'Hettiarachchi', 'Seneviratne', 'Wijesinghe', 'Ranaweera', 'Kulatunga', 'Jayawardena',
		'Nawarathna', 'Piyasena', 'Ranasinghe'
	]
} as const;

const districtNames = [
	'Colombo', 'Gampaha', 'Kalutara', 'Kandy', 'Matale', 'Nuwara Eliya', 'Galle', 'Matara',
	'Hambantota', 'Jaffna', 'Kilinochchi', 'Mannar', 'Vavuniya', 'Mullaitivu', 'Batticaloa',
	'Ampara', 'Trincomalee', 'Kurunegala', 'Puttalam', 'Anuradhapura', 'Polonnaruwa', 'Badulla',
	'Monaragala', 'Ratnapura', 'Kegalle'
] as const;

const streets = [
	'Main Street', 'School Road', 'Temple Road', 'Station Road', 'Lake Road', 'Market Road',
	'Hospital Road', 'Church Street', 'Maha Vidyalaya Mawatha', 'Paddy Field Lane'
] as const;

const remarks = {
	present: ['On time and prepared.', 'Participated actively.', 'Regular attendance.'],
	late: ['Late due to transport delays.', 'Arrived after morning assembly.', 'Missed the first session.'],
	absent: ['Absent for family reasons.', 'No prior notice received.', 'Away due to illness.'],
	excused: ['Medical note submitted.', 'Approved leave for a family event.', 'Excused by the class teacher.']
} as const;

const subjectDifficulty: Record<string, number> = {
	'Sinhala Language': 2,
	'English Language': -2,
	'Mathematics': -5,
	'Science': -3,
	'History': 1,
	'Geography': 0,
	'Buddhism': 2,
	'Information & Communication Technology': 3,
	'Health & Physical Education': 4,
	'Art': 6,
	'Tamil Language': -1
};

function pad(value: number, size: number) {
	return value.toString().padStart(size, '0');
}

function formatDate(date: Date) {
	return date.toISOString().slice(0, 10);
}

function createHash(input: string) {
	let hash = 2166136261;
	for (let index = 0; index < input.length; index += 1) {
		hash ^= input.charCodeAt(index);
		hash = Math.imul(hash, 16777619);
	}
	return hash >>> 0;
}

function createPersonName(index: number, firstShift: number, middleShift: number, lastShift: number) {
	const first = nameParts.first[(index + firstShift) % nameParts.first.length];
	const middle = nameParts.middle[(index * 3 + middleShift) % nameParts.middle.length];
	const last = nameParts.last[(index * 5 + lastShift) % nameParts.last.length];
	return { first, middle, last, fullname: `${first} ${middle} ${last}` };
}

function createPhone(index: number, prefix: string) {
	return `${prefix}${pad(1000000 + (index % 9000000), 7)}`;
}

function createAddress(index: number, role: string) {
	const district = districtNames[index % districtNames.length];
	const street = streets[(index * 2) % streets.length];
	return `${pad((index % 240) + 1, 3)} ${street}, ${district}, Sri Lanka (${role})`;
}

function scoreToGrade(score: number) {
	if (score >= 85) return 'A+';
	if (score >= 75) return 'A';
	if (score >= 65) return 'B';
	if (score >= 55) return 'C';
	if (score >= 45) return 'S';
	return 'W';
}

function studentCountForClass(grade: number, section: SectionLetter) {
	if (grade >= 9) return 71;
	return section === 'A' ? 71 : 72;
}

function gradeSubjects(grade: number) {
	return grade <= 9 ? juniorSubjects : seniorSubjects;
}

function gradeAbilityOffset(grade: number) {
	if (grade <= 8) return 2;
	if (grade === 9) return 1;
	if (grade >= 11) return -1;
	return 0;
}

function attendanceStatusFor(personId: string, date: string, weekday: number): AttendanceStatus {
	const roll = (createHash(`${personId}:${date}`) + weekday * 17) % 1000;
	if (roll < 930) return 'present';
	if (roll < 955) return 'late';
	if (roll < 990) return 'absent';
	return 'excused';
}

function attendanceNoteFor(status: AttendanceStatus, personId: string, date: string) {
	const options = remarks[status];
	const roll = createHash(`${status}:${personId}:${date}`);
	return options[roll % options.length];
}

function createPeople() {
	const admins: PersonSeed[] = Array.from({ length: 50 }, (_, index) => {
		const name = createPersonName(index, 4, 7, 9);
		return {
			id: `admin-${pad(index + 1, 4)}`,
			role: 'admin',
			name: name.fullname,
			firstName: name.first,
			lastName: name.last,
			fullname: name.fullname,
			email: `admin.${pad(index + 1, 4)}@eduscend.school`,
			idnumber: `ADM-${ACADEMIC_YEAR}-${pad(index + 1, 4)}`,
			phone: createPhone(index, '011'),
			mobilePhone: createPhone(index, '077'),
			address: createAddress(index, 'admin'),
			createdAt: SEED_TIMESTAMP,
			updatedAt: SEED_TIMESTAMP,
			updatedBy: 'seed'
		};
	});

	const teachers: PersonSeed[] = Array.from({ length: 200 }, (_, index) => {
		const name = createPersonName(index + 50, 1, 5, 3);
		return {
			id: `teacher-${pad(index + 1, 4)}`,
			role: 'teacher',
			name: name.fullname,
			firstName: name.first,
			lastName: name.last,
			fullname: name.fullname,
			email: `teacher.${pad(index + 1, 4)}@eduscend.school`,
			idnumber: `TCH-${ACADEMIC_YEAR}-${pad(index + 1, 4)}`,
			phone: createPhone(index + 50, '011'),
			mobilePhone: createPhone(index + 50, '071'),
			address: createAddress(index + 50, 'teacher'),
			createdAt: SEED_TIMESTAMP,
			updatedAt: SEED_TIMESTAMP,
			updatedBy: 'seed'
		};
	});

	const students: PersonSeed[] = Array.from({ length: 3000 }, (_, index) => {
		const name = createPersonName(index + 250, 2, 9, 12);
		return {
			id: `student-${pad(index + 1, 4)}`,
			role: 'student',
			name: name.fullname,
			firstName: name.first,
			lastName: name.last,
			fullname: name.fullname,
			email: `student.${pad(index + 1, 4)}@eduscend.school`,
			idnumber: `STD-${ACADEMIC_YEAR}-${pad(index + 1, 4)}`,
			phone: createPhone(index + 250, '011'),
			mobilePhone: createPhone(index + 250, '075'),
			address: createAddress(index + 250, 'student'),
			createdAt: SEED_TIMESTAMP,
			updatedAt: SEED_TIMESTAMP,
			updatedBy: 'seed'
		};
	});

	return {
		peopleRows: [...admins, ...teachers, ...students],
		teacherIds: teachers.map((person) => person.id),
		studentIds: students.map((person) => person.id)
	};
}

function createAuthUsers(peopleRows: PersonSeed[]) {
	const linkedPeople = peopleRows.slice(0, 1000);
	const unlinkedPeople = peopleRows.slice(1000, 1500);

	const linkedUsers: AuthUserSeed[] = linkedPeople.map((person, index) => {
		const userId = `auth-user-${pad(index + 1, 4)}`;
		person.userId = userId;
		return {
			id: userId,
			name: person.fullname,
			email: person.email,
			emailVerified: true,
			image: null,
			createdAt: SEED_TIMESTAMP,
			updatedAt: SEED_TIMESTAMP
		};
	});

	const unlinkedUsers: AuthUserSeed[] = unlinkedPeople.map((person, index) => ({
		id: `auth-user-${pad(index + 1001, 4)}`,
		name: person.fullname,
		email: person.email,
		emailVerified: index % 4 !== 0,
		image: null,
		createdAt: SEED_TIMESTAMP,
		updatedAt: SEED_TIMESTAMP
	}));

	const externalUsers: AuthUserSeed[] = Array.from({ length: 250 }, (_, index) => ({
		id: `external-user-${pad(index + 1, 4)}`,
		name: `External User ${pad(index + 1, 4)}`,
		email: `external.${pad(index + 1, 4)}@eduscend.school`,
		emailVerified: index % 2 === 0,
		image: null,
		createdAt: SEED_TIMESTAMP,
		updatedAt: SEED_TIMESTAMP
	}));

	return {
		userRows: [...linkedUsers, ...unlinkedUsers, ...externalUsers],
		linkedPeopleCount: linkedPeople.length,
		unlinkedPeopleCount: unlinkedPeople.length,
		extraUserCount: externalUsers.length
	};
}

function createAuthAccounts(userRows: AuthUserSeed[]) {
	const accountRows: AuthAccountSeed[] = [];

	for (let index = 0; index < userRows.length; index += 1) {
		const authUser = userRows[index];
		const tokenSeed = createHash(`${authUser.id}:token:${index}`).toString(36).padStart(16, '0');
		const createdAt = new Date(SEED_TIMESTAMP.getTime() + index * 1000);
		const expiresAt = new Date(createdAt.getTime() + 1000 * 60 * 60 * 24 * 30);

		accountRows.push({
			id: `account-${pad(index + 1, 5)}`,
			accountId: authUser.id,
			providerId: 'credential',
			userId: authUser.id,
			accessToken: null,
			refreshToken: null,
			idToken: null,
			accessTokenExpiresAt: null,
			refreshTokenExpiresAt: null,
			scope: null,
			password: currentPassword,
			createdAt,
			updatedAt: createdAt
		});

	}

	return accountRows;
}

function createClasses(teacherIds: string[], studentIds: string[]) {
	const classSeeds: ClassSeed[] = [];
	let studentCursor = 0;

	for (const grade of gradeLevels) {
		for (const section of sectionLetters) {
			const title = `${grade}-${section} (${ACADEMIC_YEAR})`;
			const size = studentCountForClass(grade, section);
			const teacherAssignments = [0, 1, 2, 3, 4].map((offset) => teacherIds[(classSeeds.length + offset * 42) % teacherIds.length]);
			classSeeds.push({
				id: `class-${grade}-${section.toLowerCase()}-${ACADEMIC_YEAR}`,
				title,
				description: `Grade ${grade} Section ${section} cohort for the ${ACADEMIC_YEAR} academic year.`,
				tags: JSON.stringify([
					`grade-${grade}`,
					`section-${section.toLowerCase()}`,
					`year-${ACADEMIC_YEAR}`,
					'attendance',
					'exams'
				]),
				visible: true,
				createdAt: SEED_TIMESTAMP,
				updatedAt: SEED_TIMESTAMP,
				updatedBy: 'seed',
				grade,
				section,
				teacherIds: teacherAssignments,
				studentIds: studentIds.slice(studentCursor, studentCursor + size),
				paperIds: []
			});
			studentCursor += size;
		}
	}

	if (studentCursor !== studentIds.length) {
		throw new Error(`Expected to place ${studentIds.length} students, but assigned ${studentCursor}.`);
	}

	return classSeeds;
}

function createSubjects(): SubjectSeed[] {
	return [
		{ id: 'subject-sinhala', title: 'Sinhala Language', description: 'Core Sinhala language paper.' },
		{ id: 'subject-english', title: 'English Language', description: 'Core English language paper.' },
		{ id: 'subject-mathematics', title: 'Mathematics', description: 'Arithmetic, algebra, and geometry.' },
		{ id: 'subject-science', title: 'Science', description: 'General science and practical understanding.' },
		{ id: 'subject-history', title: 'History', description: 'National and world history coverage.' },
		{ id: 'subject-geography', title: 'Geography', description: 'Maps, climate, and environmental studies.' },
		{ id: 'subject-buddhism', title: 'Buddhism', description: 'Ethics and Buddhist studies.' },
		{ id: 'subject-ict', title: 'Information & Communication Technology', description: 'Computer literacy and digital skills.' },
		{ id: 'subject-pe', title: 'Health & Physical Education', description: 'Physical education and wellbeing.' },
		{ id: 'subject-art', title: 'Art', description: 'Creative arts and practical appreciation.' },
		{ id: 'subject-tamil', title: 'Tamil Language', description: 'Tamil language and literacy.' }
	];
}

function createExamsAndPapers(classSeeds: ClassSeed[]) {
	const subjectRows = createSubjects();
	const subjectByTitle = new Map(subjectRows.map((subject) => [subject.title, subject]));
	const examsRows: ExamSeed[] = [];
	const papersRows: PaperSeed[] = [];
	const paperIdsByClassId = new Map<string, number[]>();
	let paperId = 1;

	for (const classSeed of classSeeds) {
		const exam = {
			id: classSeed.grade * 100 + sectionLetters.indexOf(classSeed.section) + 1,
			title: `Term 1 Exam - ${classSeed.title}`,
			description: `Common first-term assessment for ${classSeed.title}.`,
			tags: JSON.stringify([
				`grade-${classSeed.grade}`,
				`section-${classSeed.section.toLowerCase()}`,
				'term-1',
				`year-${ACADEMIC_YEAR}`
			]),
			visible: true,
			createdAt: SEED_TIMESTAMP
		} satisfies ExamSeed;
		examsRows.push(exam);

		const paperIds: number[] = [];
		for (const subjectTitle of gradeSubjects(classSeed.grade)) {
			const subject = subjectByTitle.get(subjectTitle);
			if (!subject) {
				throw new Error(`Missing subject seed for ${subjectTitle}`);
			}

			paperIds.push(paperId);
			papersRows.push({
				id: paperId,
				examId: exam.id,
				subjectId: subject.id,
				subjectTitle,
				title: `${subjectTitle} Paper`,
				description: `${subjectTitle} paper for ${classSeed.title}.`,
				structure: JSON.stringify({
					totalMarks: 100,
					passMarks: 35,
					durationMinutes: subjectTitle === 'Mathematics' || subjectTitle === 'Science' ? 120 : 90,
					questionCount: subjectTitle === 'Mathematics' || subjectTitle === 'Science' ? 6 : 5,
					note: `Prepared for ${classSeed.title}`
				}),
				createdAt: SEED_TIMESTAMP
			});
			paperId += 1;
		}

		paperIdsByClassId.set(classSeed.id, paperIds);
		classSeed.paperIds = paperIds;
	}

	return { subjectRows, examsRows, papersRows, paperIdsByClassId };
}

function createClassMembership(classSeeds: ClassSeed[]) {
	const rows: Array<Record<string, unknown>> = [];
	let id = 1;

	for (const classSeed of classSeeds) {
		for (const teacherId of classSeed.teacherIds) {
			rows.push({
				id,
				classId: classSeed.id,
				personId: teacherId,
				createdAt: SEED_TIMESTAMP,
				updatedAt: SEED_TIMESTAMP,
				updatedBy: 'seed'
			});
			id += 1;
		}

		for (const studentId of classSeed.studentIds) {
			rows.push({
				id,
				classId: classSeed.id,
				personId: studentId,
				createdAt: SEED_TIMESTAMP,
				updatedAt: SEED_TIMESTAMP,
				updatedBy: 'seed'
			});
			id += 1;
		}
	}

	return rows;
}

function createAttendance(classSeeds: ClassSeed[]) {
	const rows: AttendanceSeed[] = [];
	let id = 1;

	for (let date = new Date(START_DATE); date <= END_DATE; date.setUTCDate(date.getUTCDate() + 1)) {
		const weekday = date.getUTCDay();
		if (weekday === 0 || weekday === 6) continue;

		const dateValue = formatDate(date);
		for (const classSeed of classSeeds) {
			for (const studentId of classSeed.studentIds) {
				const status = attendanceStatusFor(studentId, dateValue, weekday);
				rows.push({
					id,
					personId: studentId,
					date: dateValue,
					status,
					notes: status === 'present' ? null : attendanceNoteFor(status, studentId, dateValue),
					createdAt: SEED_TIMESTAMP,
					updatedAt: SEED_TIMESTAMP,
					updatedBy: 'seed'
				});
				id += 1;
			}
		}
	}

	return rows;
}

function createScores(classSeeds: ClassSeed[], paperIdsByClassId: Map<string, number[]>, papersRows: PaperSeed[]) {
	const rows: ScoreSeed[] = [];
	const papersById = new Map(papersRows.map((paper) => [paper.id, paper]));
	let id = 1;

	for (const classSeed of classSeeds) {
		const paperIds = paperIdsByClassId.get(classSeed.id) ?? [];
		for (const studentId of classSeed.studentIds) {
			const abilityBase = 58 + gradeAbilityOffset(classSeed.grade) * 3 + (createHash(studentId) % 9) - 4;
			for (const paperId of paperIds) {
				const paper = papersById.get(paperId);
				if (!paper) {
					throw new Error(`Missing paper seed for id ${paperId}`);
				}

				const variation = (createHash(`${studentId}:${paperId}`) % 17) - 8;
				const numeric = Math.max(34, Math.min(98, Math.round(abilityBase + subjectDifficulty[paper.subjectTitle] + variation)));
				const grade = scoreToGrade(numeric);
				rows.push({
					id,
					paperId,
					personId: studentId,
					numeric,
					text: grade,
					json: JSON.stringify({
						grade,
						percentage: numeric,
						result: numeric >= 35 ? 'pass' : 'fail'
					}),
					createdAt: SEED_TIMESTAMP,
					updatedAt: SEED_TIMESTAMP,
					updatedBy: 'seed'
				});
				id += 1;
			}
		}
	}

	return rows;
}

async function insertBatches(database: any, table: any, rows: Array<Record<string, unknown>>, batchSize = 500) {
	for (let index = 0; index < rows.length; index += batchSize) {
		await database.insert(table).values(rows.slice(index, index + batchSize));
	}
}

async function main() {
	const { peopleRows, teacherIds, studentIds } = createPeople();
	const { userRows, linkedPeopleCount, unlinkedPeopleCount, extraUserCount } = createAuthUsers(peopleRows);
	const accountRows = createAuthAccounts(userRows);
	const classSeeds = createClasses(teacherIds, studentIds);
	const { subjectRows, examsRows, papersRows, paperIdsByClassId } = createExamsAndPapers(classSeeds);
	const classMembershipRows = createClassMembership(classSeeds);
	const attendanceRows = createAttendance(classSeeds);
	const scoreRows = createScores(classSeeds, paperIdsByClassId, papersRows);
	const classRows = classSeeds.map(({ grade, section, teacherIds: _teacherIds, studentIds: _studentIds, paperIds: _paperIds, ...row }) => row);
	const paperInsertionRows = papersRows.map(({ subjectTitle: _subjectTitle, ...row }) => row);

	await db.transaction(async (tx) => {
		await tx.delete(verification);
		await tx.delete(session);
		await tx.delete(account);
		await tx.delete(scores);
		await tx.delete(papers);
		await tx.delete(exams);
		await tx.delete(attendance);
		await tx.delete(classPerson);
		await tx.delete(classes);
		await tx.delete(subjects);
		await tx.delete(people);
		await tx.delete(user);

		await insertBatches(tx, user, userRows, 500);
		await insertBatches(tx, account, accountRows, 500);
		await insertBatches(tx, people, peopleRows, 1000);
		await tx.insert(classes).values(classRows);
		await insertBatches(tx, classPerson, classMembershipRows, 500);
		await tx.insert(subjects).values(subjectRows);
		await tx.insert(exams).values(examsRows);
		await tx.insert(papers).values(paperInsertionRows);
		await insertBatches(tx, attendance, attendanceRows, 2000);
		await insertBatches(tx, scores, scoreRows, 2000);
	});

	console.log(`Seeded ${peopleRows.length} people, ${userRows.length} auth users, ${accountRows.length} auth accounts, ${linkedPeopleCount} linked auth users, ${unlinkedPeopleCount} unlinked people with auth users, ${extraUserCount} extra auth users, ${classSeeds.length} classes, ${attendanceRows.length} attendance rows, and ${scoreRows.length} score rows.`);
}

main().catch((error) => {
	console.error('Seed failed');
	console.error(error);
	throw error;
});