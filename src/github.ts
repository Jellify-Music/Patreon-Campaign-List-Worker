import { Supporter } from "./types";

const GITHUB_API_URL = 'https://api.github.com/graphql';

const GITHUB_ORGANIZATION = 'Jellify-Music';

const SPONSORS_FRAGMENT = `
	fragment Sponsors on Sponsorable {
		sponsorshipsAsMaintainer(first: 100, includePrivate: true) {
			nodes {
				sponsorEntity {
					... on User { login name }
					... on Organization { login name }
				}
			}
		}
	}
`;

/**
 * Fetches the sponsorship nodes of a single sponsorable, using a token scoped to it
 */
async function fetchSponsorships(token: string, query: string, sponsorable: 'viewer' | 'organization'): Promise<any[]> {
    let response: Response;

    try {
        response = await fetch(GITHUB_API_URL, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'User-Agent': 'Jellify-Patreon-Campaign-List-Worker',
                'Authorization': `Bearer ${token}`,
            },
            body: JSON.stringify({ query: `${SPONSORS_FRAGMENT}\n${query}` }),
        });
    } catch (error) {
        // Don't let one sponsorable's failure drop the other's sponsors
        console.error(`GitHub API request failed (${sponsorable})`, error);
        return [];
    }

    if (!response.ok) {
        console.error(`GitHub API error (${sponsorable}): ${response.status} ${response.statusText}`);
        return [];
    }

    const json = await response.json() as any

    console.debug(`GitHub API response OK (${sponsorable}): ${JSON.stringify(json)}`);

    return json.data?.[sponsorable]?.sponsorshipsAsMaintainer?.nodes ?? [];
}

export default async function fetchGitHubSponsors(env: Env): Promise<Supporter[]> {
    // Fine-grained tokens are scoped to either a user or an organization, so each needs its own
    const [viewerSponsors, organizationSponsors] = await Promise.all([
        fetchSponsorships(env.GITHUB_SPONSORS_TOKEN, 'query { viewer { ...Sponsors } }', 'viewer'),
        env.GITHUB_ORG_SPONSORS_TOKEN
            ? fetchSponsorships(
                env.GITHUB_ORG_SPONSORS_TOKEN,
                `query { organization(login: "${GITHUB_ORGANIZATION}") { ...Sponsors } }`,
                'organization',
            )
            : Promise.resolve([]),
    ]);

    // Someone sponsoring both the token owner and the organization should only appear once
    const seen = new Set<string>();

    return [...viewerSponsors, ...organizationSponsors]
        .filter((sponsor: any) => sponsor != null && sponsor.sponsorEntity)
        .filter((n: any) => {
            const login = n.sponsorEntity.login;
            if (seen.has(login)) return false;
            seen.add(login);
            return true;
        })
        .map((n: any) => {
        return {
            fullName: n.sponsorEntity?.name || n.sponsorEntity?.login
        } as Supporter
    })
}
