import { PatreonCreatorClient } from 'patreon-api.ts'

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
			}
		})

		return client.fetchCampaignMembers('anultravioletaurora')
			.then(response => {
				console.debug(response.data)
				return new Response(JSON.stringify(response.data));
			})
			.catch((error) => {
				console.error(error)
				return new Response(JSON.stringify(error));
			})
	},
} satisfies ExportedHandler<Env>;
