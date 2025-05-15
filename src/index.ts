var env = process.env;

// @ts-ignore :(
import { patreon } from 'patreon'

var patreonApi = patreon(env.PATREON_ACCESS_TOKEN)

var redirectUrl = "https://localhost:8080/callback"

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {

		return patreonApi('/api/oauth2/v2/campaigns/anultravioletaurora/members')
			.then((response: any) => {
				return new Response(JSON.stringify(response));
			})
			.catch((error: any) => {
				return new Response(JSON.stringify(error));
			})		
	},
} satisfies ExportedHandler<Env>;
