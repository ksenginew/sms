export const testUsers = {
	admin: {
		id: 'person-admin',
		userId: 'auth-user-0001',
		name: 'Admin User',
		email: 'admin.0001@eduscend.school',
		role: 'admin' as const
	},
	teacher: {
		id: 'person-teacher',
		userId: 'auth-user-0051',
		name: 'Teacher User',
		email: 'teacher.0051@eduscend.school',
		role: 'teacher' as const
	},
	student: {
		id: 'person-student',
		userId: 'auth-user-0251',
		name: 'Student User',
		email: 'student.0251@eduscend.school',
		role: 'student' as const
	},
	unlinkedStudent: {
		id: 'person-unlinked-student',
		userId: 'auth-user-1001',
		name: 'Unlinked Student',
		email: 'student.1001@eduscend.school',
		role: 'student' as const
	},
	external: null
};

export function createLocals(person: typeof testUsers.admin | typeof testUsers.teacher | typeof testUsers.student | typeof testUsers.unlinkedStudent | null, overrides: Record<string, unknown> = {}) {
	return {
		session: overrides.session ?? { id: 'session-1' },
		user: overrides.user ?? (person ? { id: person.userId } : { id: 'external-user' }),
		person: person ?? undefined,
		...overrides
	} as any;
}

export function createFormRequest(values: Record<string, string>) {
	const formData = new FormData();
	for (const [key, value] of Object.entries(values)) {
		formData.set(key, value);
	}

	return {
		formData: async () => formData
	} as any;
}

export function createUrl(pathname: string, search = '') {
	return new URL(`http://localhost${pathname}${search}`);
}