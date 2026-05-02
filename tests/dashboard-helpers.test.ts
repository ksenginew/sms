import { describe, expect, it, vi } from 'vitest';

vi.mock('$lib/server/db', () => ({ db: {} }));

import { summarizeByStatus, toDateInput } from '../src/routes/dashboard/+page.server';

describe('dashboard helpers', () => {
	it('formats dates as yyyy-mm-dd', () => {
		expect(toDateInput(new Date('2026-05-02T15:30:00.000Z'))).toBe('2026-05-02');
	});

	it('summarizes attendance rows by status', () => {
		const summary = summarizeByStatus([
			{ status: 'present' },
			{ status: 'present' },
			{ status: 'absent' },
			{ status: 'late' }
		] as any);

		expect(summary).toMatchObject({
			total: 4,
			present: 2,
			absent: 1,
			late: 1,
			excused: 0,
			percentage: 50
		});
	});
});
