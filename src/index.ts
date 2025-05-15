import { PatreonCreatorClient, QueryBuilder, Type } from 'patreon-api.ts'

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {

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

		const membersQuery = QueryBuilder.campaignMembers.addRelationships(['user']).addRelationshipAttributes('user', ['full_name'])
		const tiersQuery = QueryBuilder.campaign.addRelationships(['tiers']).addRelationshipAttributes('tiers', ['amount_cents'])

		// @ts-ignore
		return client.fetchCampaign(env.PATREON_CAMPAIGN_ID, tiersQuery)
			.then(response => {
				console.debug(response.data)

				const tiers = response.data.relationships.tiers.data

				// @ts-ignore
				return client.fetchCampaignMembers(env.PATREON_CAMPAIGN_ID, membersQuery)
					.then(response => {
						console.debug(response.data)
						return new Response(JSON.stringify(response.data) + JSON.stringify(tiers));
					})
					.catch((error) => {
						console.error(error)
						return new Response(JSON.stringify(error));
					})
				
				// if (!tiers) return new Response(JSON.stringify({ error: 'No tiers found' }))

				// // @ts-ignore
				// return client.fetchCampaignMembers(env.PATREON_CAMPAIGN_ID, membersQuery)
				// 	.then(response => {
				// 		console.debug(response.data)
				// 		return new Response(JSON.stringify(response.data));
				// 	})
				// 	.catch((error) => {
				// 		console.error(error)
				// 		return new Response(JSON.stringify(error));
				// 	})
			})
			.catch((error) => {
				console.error(error)
				return new Response(JSON.stringify(error));
			})
	},
} satisfies ExportedHandler<Env>;
