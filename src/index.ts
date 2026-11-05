import { Supporter } from './types';
import fetchGitHubSponsors from './github';
import fetchPatreonSupporters from './patreon';
import SPECIAL_THANKS from './special-thanks';

const API_V1_PREFIX = '/api/v1';

async function fetchPatrons(env: Env): Promise<Supporter[]> {
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

	return [
		...patreonSupporters,
		...githubSupporters,
	]
}

function json(body: unknown, init?: ResponseInit): Response {
	return new Response(JSON.stringify(body), {
		...init,
		headers: { 'Content-Type': 'application/json', ...init?.headers },
	});
}

async function handleApiV1(request: Request, env: Env, path: string): Promise<Response> {
	switch (path) {
		case '/patrons':
			if (request.method !== 'GET') {
				return json({ error: 'Method Not Allowed' }, { status: 405, headers: { Allow: 'GET' } });
			}
			return json(await fetchPatrons(env));
		case '/special-thanks':
			if (request.method !== 'GET') {
				return json({ error: 'Method Not Allowed' }, { status: 405, headers: { Allow: 'GET' } });
			}
			return json(SPECIAL_THANKS);
		default:
			return json({ error: 'Not Found' }, { status: 404 });
	}
}

export default {
	async fetch(request: Request, env: Env, __: ExecutionContext): Promise<Response> {
		const { pathname } = new URL(request.url);

		if (pathname === API_V1_PREFIX || pathname.startsWith(`${API_V1_PREFIX}/`)) {
			return handleApiV1(request, env, pathname.slice(API_V1_PREFIX.length).replace(/\/+$/, ''));
		}

		// Legacy behavior: any other path returns the patrons list, so existing App builds keep working
		return json(await fetchPatrons(env));
	},
} satisfies ExportedHandler<Env>;
