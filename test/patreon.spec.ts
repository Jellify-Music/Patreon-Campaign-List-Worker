import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
	paginateCampaignMembersMock: vi.fn(),
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

import fetchPatreonSupporters from '../src/patreon';

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
	GITHUB_TOKEN: 'github-token',
} as unknown as Env;

describe('fetchPatreonSupporters', () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	it('returns only active patrons', async () => {
		mocks.paginateCampaignMembersMock.mockReturnValue(makePages({
			data: [
				{ attributes: { patron_status: 'active_patron', full_name: 'Alice' } },
				{ attributes: { patron_status: 'declined_patron', full_name: 'Bob' } },
				{ attributes: { patron_status: 'former_patron', full_name: 'Carol' } },
			],
		}));

		const result = await fetchPatreonSupporters(baseEnv);

		expect(result).toEqual([{ fullName: 'Alice' }]);
	});

	it('maps full_name to fullName', async () => {
		mocks.paginateCampaignMembersMock.mockReturnValue(makePages({
			data: [
				{ attributes: { patron_status: 'active_patron', full_name: 'John Doe' } },
			],
		}));

		const result = await fetchPatreonSupporters(baseEnv);

		expect(result[0]).toEqual({ fullName: 'John Doe' });
	});

	it('returns multiple active patrons across multiple pages', async () => {
		mocks.paginateCampaignMembersMock.mockReturnValue(makePages(
			{ data: [{ attributes: { patron_status: 'active_patron', full_name: 'Alice' } }] },
			{ data: [{ attributes: { patron_status: 'active_patron', full_name: 'Dave' } }] },
		));

		const result = await fetchPatreonSupporters(baseEnv);

		expect(result).toEqual([{ fullName: 'Alice' }, { fullName: 'Dave' }]);
	});

	it('returns empty array when all patrons are inactive', async () => {
		mocks.paginateCampaignMembersMock.mockReturnValue(makePages({
			data: [
				{ attributes: { patron_status: 'declined_patron', full_name: 'Bob' } },
				{ attributes: { patron_status: 'former_patron', full_name: 'Carol' } },
			],
		}));

		const result = await fetchPatreonSupporters(baseEnv);

		expect(result).toEqual([]);
	});

	it('returns empty array when data is empty', async () => {
		mocks.paginateCampaignMembersMock.mockReturnValue(makePages({ data: [] }));

		const result = await fetchPatreonSupporters(baseEnv);

		expect(result).toEqual([]);
	});

	it('calls paginateCampaignMembers with campaign ID from env', async () => {
		mocks.paginateCampaignMembersMock.mockReturnValue(makePages({ data: [] }));

		await fetchPatreonSupporters(baseEnv);

		expect(mocks.paginateCampaignMembersMock).toHaveBeenCalledWith('patreon-campaign-id', expect.anything());
	});

	it('propagates errors from paginateCampaignMembers', async () => {
		mocks.paginateCampaignMembersMock.mockReturnValue((async function* () {
			throw new Error('API error');
		})());

		await expect(fetchPatreonSupporters(baseEnv)).rejects.toThrow('API error');
	});
});
