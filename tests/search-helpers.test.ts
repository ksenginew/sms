import { describe, expect, it, vi } from 'vitest';

vi.mock('$lib/server/db', () => ({ db: {} }));

import { readIntParam, toSafeFtsQuery } from '../src/routes/api/search/+server';

describe('search helpers', () => {
	it('parses numeric params with a fallback', () => {
		expect(readIntParam(null, 12)).toBe(12);
		expect(readIntParam('24', 12)).toBe(24);
		expect(readIntParam('invalid', 12)).toBe(12);
	});

	it('turns raw search text into a safe FTS query', () => {
		expect(toSafeFtsQuery('  class  title  ')).toBe('"class" AND "title"');
		expect(toSafeFtsQuery('a "quoted" term')).toBe('"a" AND """quoted""" AND "term"');
	});
});
