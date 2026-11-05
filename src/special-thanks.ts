import { Supporter } from "./types";

/**
 * People thanked on the About screen in the App's Settings.
 *
 * Update this list via PR + deploy to change it without an App release.
 */
const SPECIAL_THANKS: Supporter[] = [
    'Bill Thornton',
    '@BotBlake',
    '@Chaphasilor',
    'Erik Balchunas',
    'Lyssa VanDomelen',
    'James Harvey',
    'Niels van Velzen',
    '@PBD3D',
    'Ritesh Shukla',
    'Thalia Fields',
    '@skalthoff',
    '@skribe',
].map((fullName) => ({ fullName }));

export default SPECIAL_THANKS;
