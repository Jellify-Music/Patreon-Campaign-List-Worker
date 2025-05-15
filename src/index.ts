var env = process.env;

// @ts-ignore :(
import { patreon } from 'patreon'


export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {

		// @ts-ignore :(
		var patreonApi = patreon(env.PATREON_ACCESS_TOKEN)

		return patreonApi('/api/oauth2/v2/campaigns/anultravioletaurora/members')
			.then((response: any) => {
				console.debug(response)
				return new Response(JSON.stringify(response));
			})
			.catch((error: any) => {
				console.error(error)
				return new Response(JSON.stringify(error));
			})		
	},
} satisfies ExportedHandler<Env>;
