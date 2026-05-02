import { describe, expect, it, vi } from 'vitest';

const getSession = vi.hoisted(() => vi.fn());
const resolveHandler = vi.hoisted(() => vi.fn(() => new Response('handled')));
const selectGet = vi.hoisted(() => vi.fn().mockResolvedValue({ id: 'person-1', role: 'teacher' }));
const selectMock = vi.hoisted(() => vi.fn(() => ({
	from: () => ({
		where: () => ({
			limit: () => ({ get: selectGet })
		})
	})
})));

vi.mock('$lib/server/auth', () => ({
	auth: {
		api: {
			getSession
		}
	}
}));

vi.mock('better-auth/svelte-kit', () => ({
	svelteKitHandler: resolveHandler
}));

vi.mock('$lib/server/db', () => ({
	db: {
		select: selectMock
	}
}));

import { handle } from '../src/hooks.server';

function createEvent(pathname: string) {
	const request = new Request(`http://localhost${pathname}`);
	return {
		request,
		url: new URL(request.url),
		locals: {}
	} as any;
}

describe('handle hook', () => {
	it('redirects unauthenticated users away from protected routes', async () => {
		getSession.mockResolvedValueOnce(null);

		await expect(handle({ event: createEvent('/dashboard'), resolve: vi.fn() })).rejects.toMatchObject({
			status: 302,
			location: '/auth/signin'
		});
	});

	it('redirects signed-in users away from auth pages', async () => {
		getSession.mockResolvedValueOnce({ session: { id: 'session-1' }, user: { id: 'user-1' } });

		await expect(handle({ event: createEvent('/auth/signin'), resolve: vi.fn() })).rejects.toMatchObject({
			status: 302,
			location: '/dashboard'
		});
	});

	it('loads session data and delegates to the SvelteKit handler', async () => {
		getSession.mockResolvedValueOnce({ session: { id: 'session-1' }, user: { id: 'user-1' } });
		const result = await handle({
			event: createEvent('/dashboard'),
			resolve: vi.fn()
		});

		expect(result).toBeInstanceOf(Response);
		expect(await result.text()).toBe('handled');
		expect(selectMock).toHaveBeenCalledTimes(1);
		expect(selectGet).toHaveBeenCalledTimes(1);
		expect(resolveHandler).toHaveBeenCalledTimes(1);
	});
});
