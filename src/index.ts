import { Supporter } from './types';
import fetchGitHubSponsors from './github';
import fetchPatreonSupporters from './patreon';

export default {
	async fetch(_: Request, env: Env, __: ExecutionContext): Promise<Response> {

		let githubSupporters: Supporter[] = [];
		let patreonSupporters: Supporter[] = [];
		
		try {
			githubSupporters = await fetchGitHubSponsors(env);
		} catch (error) {
			console.error('Failed to fetch GitHub Sponsors', error);
		}

		try {
			patreonSupporters = await fetchPatreonSupporters(env)
		} catch (error) {
			console.error('Failed to fetch Patreon members', error);
		}

		let response = [
			...patreonSupporters,
			...githubSupporters,
		]

		return new Response(JSON.stringify(response));
	},
} satisfies ExportedHandler<Env>;
