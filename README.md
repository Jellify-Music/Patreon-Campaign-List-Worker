# Patron Cloudflare Worker

Deployed as a Cloudflare Worker, retrieves a list of Jellify patreon campaign supporters and GitHub Sponsors (of both the token owner and the Jellify-Music organization).

This was created so that Jellify could display a list of paid supporters within the app, all while
keeping tokens secure

## Secrets

| Name | Description |
| --- | --- |
| `GITHUB_SPONSORS_TOKEN` | GitHub token owned by the maintainer's user account, used to read their GitHub Sponsors |
| `GITHUB_ORG_SPONSORS_TOKEN` | GitHub token with the Jellify-Music organization as its resource owner, used to read the organization's GitHub Sponsors. Optional; organization sponsors are skipped when unset |


## Endpoints

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/v1/patrons` | Active Patreon supporters followed by GitHub Sponsors, as `{ fullName: string }[]` |
| `GET` | `/api/v1/special-thanks` | The "Special Thanks" list shown on the App's About screen, as `{ fullName: string, url?: string }[]`, where `url` links to their public profile when known. Edit `src/special-thanks.ts` to update it |
| `GET` | `/` | Legacy alias of `/api/v1/patrons`, kept for backwards compatibility with existing App builds |
