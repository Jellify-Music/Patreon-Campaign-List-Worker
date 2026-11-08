import { beforeEach, describe, expect, it, vi } from 'vitest';

import fetchGitHubSponsors from '../src/github';

const baseEnv = {
	GITHUB_SPONSORS_TOKEN: 'github-token',
} as unknown as Env;

function makeGitHubResponse(nodes: unknown[], orgNodes: unknown[] = [], status = 200): Response {
	return new Response(
		JSON.stringify({
			data: {
				viewer: {
					sponsorshipsAsMaintainer: { nodes },
				},
				organization: {
					sponsorshipsAsMaintainer: { nodes: orgNodes },
				},
			},
		}),
		{ status },
	);
}

describe('fetchGitHubSponsors', () => {
	beforeEach(() => {
		vi.restoreAllMocks();
	});

	it('returns sponsors mapped to Supporter using name', async () => {
		vi.spyOn(globalThis, 'fetch').mockResolvedValue(
			makeGitHubResponse([{ sponsorEntity: { login: 'alice', name: 'Alice Smith' } }]),
		);

		const result = await fetchGitHubSponsors(baseEnv);

		expect(result).toEqual([{ fullName: 'Alice Smith' }]);
	});

	it('falls back to login when name is null', async () => {
		vi.spyOn(globalThis, 'fetch').mockResolvedValue(
			makeGitHubResponse([{ sponsorEntity: { login: 'alice', name: null } }]),
		);

		const result = await fetchGitHubSponsors(baseEnv);

		expect(result).toEqual([{ fullName: 'alice' }]);
	});

	it('returns multiple sponsors', async () => {
		vi.spyOn(globalThis, 'fetch').mockResolvedValue(
			makeGitHubResponse([
				{ sponsorEntity: { login: 'alice', name: 'Alice' } },
				{ sponsorEntity: { login: 'bob', name: 'Bob' } },
			]),
		);

		const result = await fetchGitHubSponsors(baseEnv);

		expect(result).toEqual([{ fullName: 'Alice' }, { fullName: 'Bob' }]);
	});

	it('filters out nodes with null sponsorEntity', async () => {
		vi.spyOn(globalThis, 'fetch').mockResolvedValue(
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
		vi.spyOn(globalThis, 'fetch').mockResolvedValue(
			makeGitHubResponse(
				[{ sponsorEntity: { login: 'alice', name: 'Alice' } }],
				[{ sponsorEntity: { login: 'wenkca', name: null } }],
			),
		);

		const result = await fetchGitHubSponsors(baseEnv);

		expect(result).toEqual([{ fullName: 'Alice' }, { fullName: 'wenkca' }]);
	});

	it('de-duplicates sponsors of both the viewer and the organization', async () => {
		vi.spyOn(globalThis, 'fetch').mockResolvedValue(
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

	it('still returns viewer sponsors when organization is null', async () => {
		vi.spyOn(globalThis, 'fetch').mockResolvedValue(
			new Response(
				JSON.stringify({
					data: {
						viewer: {
							sponsorshipsAsMaintainer: {
								nodes: [{ sponsorEntity: { login: 'alice', name: 'Alice' } }],
							},
						},
						organization: null,
					},
				}),
			),
		);

		const result = await fetchGitHubSponsors(baseEnv);

		expect(result).toEqual([{ fullName: 'Alice' }]);
	});

	it('requests sponsorships of the Jellify-Music organization', async () => {
		const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(makeGitHubResponse([]));

		await fetchGitHubSponsors(baseEnv);

		const body = JSON.parse(fetchSpy.mock.calls[0][1]!.body as string);
		expect(body.query).toContain('organization(login: "Jellify-Music")');
	});

	it('returns empty array when nodes is empty', async () => {
		vi.spyOn(globalThis, 'fetch').mockResolvedValue(makeGitHubResponse([]));

		const result = await fetchGitHubSponsors(baseEnv);

		expect(result).toEqual([]);
	});

	it('returns empty array on non-ok response', async () => {
		vi.spyOn(globalThis, 'fetch').mockResolvedValue(
			new Response('Unauthorized', { status: 401 }),
		);

		const result = await fetchGitHubSponsors(baseEnv);

		expect(result).toEqual([]);
	});

	it('sends Authorization header with GITHUB_TOKEN', async () => {
		const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(makeGitHubResponse([]));

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
		const fetchSpy = vi.spyOn(globalThis, 'fetch').mockResolvedValue(makeGitHubResponse([]));

		await fetchGitHubSponsors(baseEnv);

		expect(fetchSpy).toHaveBeenCalledWith(
			'https://api.github.com/graphql',
			expect.objectContaining({ method: 'POST' }),
		);
	});
});
