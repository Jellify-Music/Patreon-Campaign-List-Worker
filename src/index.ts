import { PatreonCreatorClient, QueryBuilder, Type } from 'patreon-api.ts'
import { Supporter } from './types';
import fetchGitHubSponsors from './github';

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {

		let githubSupporters: Supporter[] = [];
		
		try {
			githubSupporters = await fetchGitHubSponsors(env);
			console.debug(`GitHub Sponsors:`, JSON.stringify(githubSupporters));
		} catch (error) {
			console.error('Failed to fetch GitHub Sponsors', error);
		}

		const client = new PatreonCreatorClient({
			oauth: {
				// @ts-ignore
				clientId: env.PATREON_CLIENT_ID,
				// @ts-ignore
				clientSecret: env.PATREON_CLIENT_SECRET,
				token: {
					// @ts-ignore
					access_token: env.PATREON_ACCESS_TOKEN,
					// @ts-ignore
					refresh_token: env.PATREON_REFRESH_TOKEN,
				}
			},
			rest: {
				includeAllQueries: true
			}
		})

		const membersQuery = QueryBuilder.campaignMembers
			.addRelationships(['user', 'currently_entitled_tiers', 'campaign'])
			.includeAll()
			.includeAllRelationships()

		// @ts-ignore
		return client.fetchCampaignMembers(env.PATREON_CAMPAIGN_ID, membersQuery)
			.then(response => {
				console.debug(response.data)

				const activePremiumPatrons = response.data.filter((patron) => {
					return patron.attributes.patron_status === 'active_patron'
				})

				return new Response(JSON.stringify(activePremiumPatrons.map((patron) => {
					return {
						fullName: patron.attributes.full_name
					} as Supporter
				}).concat(githubSupporters)));
			})
			.catch((error) => {
				console.error(error)
				return new Response(JSON.stringify([]));
			})
	},
} satisfies ExportedHandler<Env>;
