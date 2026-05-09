import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
	paginateCampaignMembersMock: vi.fn(),
	fetchGitHubSponsorsMock: vi.fn(),
}));

vi.mock('patreon-api.ts', () => {
	const queryBuilder = {
		addRelationships: vi.fn().mockReturnThis(),
		includeAll: vi.fn().mockReturnThis(),
		includeAllRelationships: vi.fn().mockReturnThis(),
	};

	class PatreonCreatorClient {
		paginateCampaignMembers = mocks.paginateCampaignMembersMock;
	}

	return {
		PatreonCreatorClient,
		QueryBuilder: {
			campaignMembers: queryBuilder,
		},
	};
});

vi.mock('../src/github', () => ({
	default: mocks.fetchGitHubSponsorsMock,
}));

import worker from '../src/index';

function makePages(...pages: { data: unknown[] }[]) {
	return (async function* () {
		for (const page of pages) yield page;
	})();
}

const baseEnv = {
	PATREON_CLIENT_ID: 'patreon-client-id',
	PATREON_CLIENT_SECRET: 'patreon-client-secret',
	PATREON_ACCESS_TOKEN: 'patreon-access-token',
	PATREON_REFRESH_TOKEN: 'patreon-refresh-token',
	PATREON_CAMPAIGN_ID: 'patreon-campaign-id',
	GITHUB_SPONSORS_TOKEN: 'github-token',
} as unknown as Env;

describe('supporters list worker', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('returns active Patreon supporters plus GitHub sponsors', async () => {
		mocks.fetchGitHubSponsorsMock.mockResolvedValue([{ fullName: 'GH Sponsor' }]);
		mocks.paginateCampaignMembersMock.mockReturnValue(makePages({
			data: [
				{
					attributes: {
						patron_status: 'active_patron',
						full_name: 'Active Patron',
					},
				},
				{
					attributes: {
						patron_status: 'declined_patron',
						full_name: 'Declined Patron',
					},
				},
			],
		}));

		const response = await worker.fetch(new Request('https://example.com'), baseEnv, {} as ExecutionContext);

		expect(response.status).toBe(200);
		await expect(response.json()).resolves.toEqual([
			{ fullName: 'Active Patron' },
			{ fullName: 'GH Sponsor' },
		]);
		expect(mocks.fetchGitHubSponsorsMock).toHaveBeenCalledWith(baseEnv);
		expect(mocks.paginateCampaignMembersMock).toHaveBeenCalledTimes(1);
	});

	it('still returns Patreon supporters when GitHub sponsors fetch fails', async () => {
		mocks.fetchGitHubSponsorsMock.mockRejectedValue(new Error('GitHub failed'));
		mocks.paginateCampaignMembersMock.mockReturnValue(makePages({
			data: [
				{
					attributes: {
						patron_status: 'active_patron',
						full_name: 'Active Patron',
					},
				},
			],
		}));

		const response = await worker.fetch(new Request('https://example.com'), baseEnv, {} as ExecutionContext);

		expect(response.status).toBe(200);
		await expect(response.json()).resolves.toEqual([{ fullName: 'Active Patron' }]);
	});

	it('still returns GitHub sponsors when Patreon request fails', async () => {
		mocks.fetchGitHubSponsorsMock.mockResolvedValue([{ fullName: 'GH Sponsor' }]);
		mocks.paginateCampaignMembersMock.mockReturnValue((async function* () {
			throw new Error('Patreon failed');
		})());

		const response = await worker.fetch(new Request('https://example.com'), baseEnv, {} as ExecutionContext);

		expect(response.status).toBe(200);
		await expect(response.json()).resolves.toEqual([{ fullName: 'GH Sponsor' }]);
	});

	it('returns empty array when both fetches fail', async () => {
		mocks.fetchGitHubSponsorsMock.mockRejectedValue(new Error('GitHub failed'));
		mocks.paginateCampaignMembersMock.mockReturnValue((async function* () {
			throw new Error('Patreon failed');
		})());

		const response = await worker.fetch(new Request('https://example.com'), baseEnv, {} as ExecutionContext);

		expect(response.status).toBe(200);
		await expect(response.json()).resolves.toEqual([]);
	});

	it('returns only GitHub sponsors when Patreon returns no active patrons', async () => {
		mocks.fetchGitHubSponsorsMock.mockResolvedValue([{ fullName: 'GH Sponsor' }]);
		mocks.paginateCampaignMembersMock.mockReturnValue(makePages({ data: [] }));

		const response = await worker.fetch(new Request('https://example.com'), baseEnv, {} as ExecutionContext);

		expect(response.status).toBe(200);
		await expect(response.json()).resolves.toEqual([{ fullName: 'GH Sponsor' }]);
	});

	it('orders Patreon supporters before GitHub sponsors', async () => {
		mocks.fetchGitHubSponsorsMock.mockResolvedValue([{ fullName: 'GH Sponsor 1' }, { fullName: 'GH Sponsor 2' }]);
		mocks.paginateCampaignMembersMock.mockReturnValue(makePages({
			data: [
				{ attributes: { patron_status: 'active_patron', full_name: 'Patron 1' } },
				{ attributes: { patron_status: 'active_patron', full_name: 'Patron 2' } },
			],
		}));

		const response = await worker.fetch(new Request('https://example.com'), baseEnv, {} as ExecutionContext);

		await expect(response.json()).resolves.toEqual([
			{ fullName: 'Patron 1' },
			{ fullName: 'Patron 2' },
			{ fullName: 'GH Sponsor 1' },
			{ fullName: 'GH Sponsor 2' },
		]);
	});

	it('passes env to GitHub sponsors fetcher', async () => {
		mocks.fetchGitHubSponsorsMock.mockResolvedValue([]);
		mocks.paginateCampaignMembersMock.mockReturnValue(makePages({ data: [] }));

		await worker.fetch(new Request('https://example.com'), baseEnv, {} as ExecutionContext);

		expect(mocks.fetchGitHubSponsorsMock).toHaveBeenCalledWith(baseEnv);
	});
});
