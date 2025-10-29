
const GITHUB_API_URL = 'https://api.github.com/graphql';

export default async function fetchGitHubSponsors(env: Env): Promise<string[]> {
    const query = `
		query {
			viewer {
				sponsorshipsAsMaintainer(first: 100, includePrivate: true) {
					nodes {
						sponsorEntity {
							... on User { login name }
							... on Organization { login name }
						}
					}
				}
			}
		}
	`;

    // @ts-ignore
    console.info(`Fetching GitHub Sponsors. ${env.GITHUB_SPONSORS_TOKEN ? env.GITHUB_SPONSORS_TOKEN.length : 0} characters in token.`);

    const response = await fetch(GITHUB_API_URL, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'User-Agent': 'Jellify-Patreon-Campaign-List-Worker',
            // @ts-ignore
            'Authorization': `Bearer ${env.GITHUB_SPONSORS_TOKEN}`,
        },
        body: JSON.stringify({ query }),
    });

    if (!response.ok) {
        console.error(`GitHub API error: ${response.status} ${response.statusText}`);
        return [];
    } else {

        console.debug('GitHub API response OK', await response.json());
        
        const json = await response.json() as any
        
        
        const sponsors = json.data?.viewer?.sponsorshipsAsMaintainer?.nodes ?? [];
        
        return sponsors.map((n: any) => n.sponsorEntity?.name || n.sponsorEntity?.login).filter((name: string) => !!name)
    }
}