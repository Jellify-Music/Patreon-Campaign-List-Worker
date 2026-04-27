import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
	fetchCampaignMembersMock: vi.fn(),
	fetchGitHubSponsorsMock: vi.fn(),
}));

vi.mock('patreon-api.ts', () => {
	const queryBuilder = {
		addRelationships: vi.fn().mockReturnThis(),
		includeAll: vi.fn().mockReturnThis(),
		includeAllRelationships: vi.fn().mockReturnThis(),
	};

	class PatreonCreatorClient {
		fetchCampaignMembers = mocks.fetchCampaignMembersMock;
	}

	return {
		PatreonCreatorClient,
		QueryBuilder: {
			campaignMembers: queryBuilder,
		},
		Type: {},
	};
});

vi.mock('../src/github', () => ({
	default: mocks.fetchGitHubSponsorsMock,
}));

import worker from '../src/index';

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
		mocks.fetchCampaignMembersMock.mockResolvedValue({
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
		});

		const response = await worker.fetch(new Request('https://example.com'), baseEnv, {} as ExecutionContext);

		expect(response.status).toBe(200);
		await expect(response.json()).resolves.toEqual([
			{ fullName: 'Active Patron' },
			{ fullName: 'GH Sponsor' },
		]);
		expect(mocks.fetchGitHubSponsorsMock).toHaveBeenCalledWith(baseEnv);
		expect(mocks.fetchCampaignMembersMock).toHaveBeenCalledTimes(1);
	});

	it('still returns Patreon supporters when GitHub sponsors fetch fails', async () => {
		mocks.fetchGitHubSponsorsMock.mockRejectedValue(new Error('GitHub failed'));
		mocks.fetchCampaignMembersMock.mockResolvedValue({
			data: [
				{
					attributes: {
						patron_status: 'active_patron',
						full_name: 'Active Patron',
					},
				},
			],
		});

		const response = await worker.fetch(new Request('https://example.com'), baseEnv, {} as ExecutionContext);

		expect(response.status).toBe(200);
		await expect(response.json()).resolves.toEqual([{ fullName: 'Active Patron' }]);
	});

	it('returns an empty array when Patreon request fails', async () => {
		mocks.fetchGitHubSponsorsMock.mockResolvedValue([{ fullName: 'GH Sponsor' }]);
		mocks.fetchCampaignMembersMock.mockRejectedValue(new Error('Patreon failed'));

		const response = await worker.fetch(new Request('https://example.com'), baseEnv, {} as ExecutionContext);

		expect(response.status).toBe(200);
		await expect(response.json()).resolves.toEqual([]);
	});
});
