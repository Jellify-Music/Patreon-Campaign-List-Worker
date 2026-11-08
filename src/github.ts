import { Supporter } from "./types";

const GITHUB_API_URL = 'https://api.github.com/graphql';

const GITHUB_ORGANIZATION = 'Jellify-Music';

export default async function fetchGitHubSponsors(env: Env): Promise<Supporter[]> {
    // Sponsors of the token owner and of the Jellify-Music organization
    const query = `
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

		query {
			viewer { ...Sponsors }
			organization(login: "${GITHUB_ORGANIZATION}") { ...Sponsors }
		}
	`;

    const response = await fetch(GITHUB_API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Jellify-Patreon-Campaign-List-Worker',
            'Authorization': `Bearer ${env.GITHUB_SPONSORS_TOKEN}`,
        },
        body: JSON.stringify({ query }),
    });

    if (!response.ok) {
        console.error(`GitHub API error: ${response.status} ${response.statusText}`);
        return [];
    } else {
        const json = await response.json() as any
        
        console.debug(`GitHub API response OK: ${JSON.stringify(json)}`);
        
        const sponsors = [
            ...(json.data?.viewer?.sponsorshipsAsMaintainer?.nodes ?? []),
            ...(json.data?.organization?.sponsorshipsAsMaintainer?.nodes ?? []),
        ];

        // Someone sponsoring both the token owner and the organization should only appear once
        const seen = new Set<string>();

        return sponsors
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
}
