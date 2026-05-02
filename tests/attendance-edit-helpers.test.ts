import { describe, expect, it, vi } from 'vitest';

vi.mock('$lib/server/db', () => ({ db: {} }));

import { formatDateLabel, getDatabaseErrorMessage, parseDateInput, toDateInput } from '../src/routes/dashboard/attendance/[class]/edit/+page.server';

describe('attendance edit helpers', () => {
	it('formats and parses date inputs consistently', () => {
		expect(toDateInput(new Date('2026-05-02T10:00:00.000Z'))).toBe('2026-05-02');
		expect(formatDateLabel('2026-05-02')).toBe('02 May 2026');
		expect(parseDateInput('2026-05-02')).toBeInstanceOf(Date);
		expect(parseDateInput('2026-5-2')).toBeNull();
		expect(parseDateInput(null)).toBeNull();
	});

	it('maps database errors to friendly messages', () => {
		expect(getDatabaseErrorMessage({ message: 'FOREIGN KEY constraint failed' })).toBe('Invalid reference: Class or student not found.');
		expect(getDatabaseErrorMessage({ message: 'NOT NULL constraint failed' })).toBe('Required field is missing.');
		expect(getDatabaseErrorMessage({ message: 'UNIQUE constraint failed' })).toBe('This record already exists.');
		expect(getDatabaseErrorMessage({ message: 'something else' })).toBe('Database error. Please try again.');
	});
});
