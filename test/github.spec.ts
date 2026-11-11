import { beforeEach, describe, expect, it, vi } from 'vitest';

import fetchGitHubSponsors from '../src/github';

const baseEnv = {
	GITHUB_SPONSORS_TOKEN: 'github-token',
	GITHUB_ORG_SPONSORS_TOKEN: 'github-org-token',
} as unknown as Env;

function makeGitHubResponse(nodes: unknown[], orgNodes: unknown[] = [], status = 200) {
	return async (_: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
		const isOrg = (init?.headers as Record<string, string>).Authorization === 'Bearer github-org-token';
		const data = isOrg
			? { organization: { sponsorshipsAsMaintainer: { nodes: orgNodes } } }
			: { viewer: { sponsorshipsAsMaintainer: { nodes } } };

		return new Response(JSON.stringify({ data }), { status });
	};
}

describe('fetchGitHubSponsors', () => {
	beforeEach(() => {
		vi.restoreAllMocks();
	});

	it('returns sponsors mapped to Supporter using name', async () => {
		vi.spyOn(globalThis, 'fetch').mockImplementation(
			makeGitHubResponse([{ sponsorEntity: { login: 'alice', name: 'Alice Smith' } }]),
		);

		const result = await fetchGitHubSponsors(baseEnv);

		expect(result).toEqual([{ fullName: 'Alice Smith' }]);
	});

	it('falls back to login when name is null', async () => {
		vi.spyOn(globalThis, 'fetch').mockImplementation(
			makeGitHubResponse([{ sponsorEntity: { login: 'alice', name: null } }]),
		);

		const result = await fetchGitHubSponsors(baseEnv);

		expect(result).toEqual([{ fullName: 'alice' }]);
	});

	it('returns multiple sponsors', async () => {
		vi.spyOn(globalThis, 'fetch').mockImplementation(
			makeGitHubResponse([
				{ sponsorEntity: { login: 'alice', name: 'Alice' } },
				{ sponsorEntity: { login: 'bob', name: 'Bob' } },
			]),
		);

		const result = await fetchGitHubSponsors(baseEnv);

		expect(result).toEqual([{ fullName: 'Alice' }, { fullName: 'Bob' }]);
	});

	it('filters out nodes with null sponsorEntity', async () => {
		vi.spyOn(globalThis, 'fetch').mockImplementation(
			makeGitHubResponse([
				null,
				{ sponsorEntity: null },
				{ sponsorEntity: { login: 'bob', name: 'Bob' } },
			]),
		);

		const result = await fetchGitHubSponsors(baseEnv);

		expect(result).toEqual([{ fullName: 'Bob' }]);
	});

	it('includes sponsors of the Jellify-Music organization', async () => {
		vi.spyOn(globalThis, 'fetch').mockImplementation(
			makeGitHubResponse(
				[{ sponsorEntity: { login: 'alice', name: 'Alice' } }],
				[{ sponsorEntity: { login: 'wenkca', name: null } }],
			),
		);

		const result = await fetchGitHubSponsors(baseEnv);

		expect(result).toEqual([{ fullName: 'Alice' }, { fullName: 'wenkca' }]);
	});

	it('de-duplicates sponsors of both the viewer and the organization', async () => {
		vi.spyOn(globalThis, 'fetch').mockImplementation(
			makeGitHubResponse(
				[{ sponsorEntity: { login: 'alice', name: 'Alice' } }],
				[
					{ sponsorEntity: { login: 'alice', name: 'Alice' } },
					{ sponsorEntity: { login: 'bob', name: 'Bob' } },
				],
			),
		);

		const result = await fetchGitHubSponsors(baseEnv);

		expect(result).toEqual([{ fullName: 'Alice' }, { fullName: 'Bob' }]);
	});

	it('still returns viewer sponsors when the organization request fails', async () => {
		vi.spyOn(globalThis, 'fetch').mockImplementation(async (_, init) =>
			(init?.headers as Record<string, string>).Authorization === 'Bearer github-org-token'
				? new Response('Unauthorized', { status: 401 })
				: makeGitHubResponse([{ sponsorEntity: { login: 'alice', name: 'Alice' } }])(_, init),
		);

		const result = await fetchGitHubSponsors(baseEnv);

		expect(result).toEqual([{ fullName: 'Alice' }]);
	});

	it('still returns organization sponsors when the viewer request throws', async () => {
		vi.spyOn(globalThis, 'fetch').mockImplementation(async (_, init) => {
			if ((init?.headers as Record<string, string>).Authorization === 'Bearer github-token') {
				throw new TypeError('Network error');
			}
			return makeGitHubResponse([], [{ sponsorEntity: { login: 'bob', name: 'Bob' } }])(_, init);
		});

		const result = await fetchGitHubSponsors(baseEnv);

		expect(result).toEqual([{ fullName: 'Bob' }]);
	});

	it('returns empty array when the GraphQL response has errors and no data', async () => {
		vi.spyOn(globalThis, 'fetch').mockImplementation(async () =>
			new Response(JSON.stringify({ errors: [{ message: 'Bad credentials' }] }), { status: 200 }),
		);

		const result = await fetchGitHubSponsors(baseEnv);

		expect(result).toEqual([]);
	});

	it('skips the organization request when GITHUB_ORG_SPONSORS_TOKEN is not set', async () => {
		const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(
			makeGitHubResponse([{ sponsorEntity: { login: 'alice', name: 'Alice' } }]),
		);

		const result = await fetchGitHubSponsors({ GITHUB_SPONSORS_TOKEN: 'github-token' } as unknown as Env);

		expect(result).toEqual([{ fullName: 'Alice' }]);
		expect(fetchSpy).toHaveBeenCalledTimes(1);
	});

	it('requests organization sponsorships with GITHUB_ORG_SPONSORS_TOKEN', async () => {
		const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(makeGitHubResponse([]));

		await fetchGitHubSponsors(baseEnv);

		const orgCall = fetchSpy.mock.calls.find(
			([, init]) => (init?.headers as Record<string, string>).Authorization === 'Bearer github-org-token',
		);
		expect(JSON.parse(orgCall![1]!.body as string).query).toContain('organization(login: "Jellify-Music")');
	});

	it('returns empty array when nodes is empty', async () => {
		vi.spyOn(globalThis, 'fetch').mockImplementation(makeGitHubResponse([]));

		const result = await fetchGitHubSponsors(baseEnv);

		expect(result).toEqual([]);
	});

	it('returns empty array on non-ok response', async () => {
		vi.spyOn(globalThis, 'fetch').mockImplementation(async () =>
			new Response('Unauthorized', { status: 401 }),
		);

		const result = await fetchGitHubSponsors(baseEnv);

		expect(result).toEqual([]);
	});

	it('sends Authorization header with GITHUB_TOKEN', async () => {
		const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(makeGitHubResponse([]));

		await fetchGitHubSponsors(baseEnv);

		expect(fetchSpy).toHaveBeenCalledWith(
			'https://api.github.com/graphql',
			expect.objectContaining({
				headers: expect.objectContaining({
					Authorization: 'Bearer github-token',
				}),
			}),
		);
	});

	it('sends POST request to GitHub GraphQL endpoint', async () => {
		const fetchSpy = vi.spyOn(globalThis, 'fetch').mockImplementation(makeGitHubResponse([]));

		await fetchGitHubSponsors(baseEnv);

		expect(fetchSpy).toHaveBeenCalledWith(
			'https://api.github.com/graphql',
			expect.objectContaining({ method: 'POST' }),
		);
	});
});
