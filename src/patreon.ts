import { PatreonCreatorClient, QueryBuilder } from 'patreon-api.ts'
import { Supporter } from "./types";

const membersQuery = QueryBuilder.campaignMembers
    .addRelationships(['user', 'currently_entitled_tiers', 'campaign'])
    .includeAll()
    .includeAllRelationships()

export default async function fetchPatreonSupporters(env: Env) : Promise<Supporter[]> {

    const client = new PatreonCreatorClient({
        oauth: {
            clientId: env.PATREON_CLIENT_ID,
            clientSecret: env.PATREON_CLIENT_SECRET,
            token: {
                access_token: env.PATREON_ACCESS_TOKEN,
                refresh_token: env.PATREON_REFRESH_TOKEN,
            }
        },
        rest: {
            includeAllQueries: true
        }
    })

    const patrons = []

    for await (const { data } of client.paginateCampaignMembers(env.PATREON_CAMPAIGN_ID, membersQuery)) {
        patrons.push(...data)
    }

    return patrons
    .filter((patron) => patron.attributes.patron_status === 'active_patron')
    .map((patron) => {
        return {
            fullName: patron.attributes.full_name
        } as Supporter
    })
}
