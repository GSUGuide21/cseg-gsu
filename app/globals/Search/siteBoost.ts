/**
 * How the site's search ranks kinds against each other when they match as well: the site's
 * own pages lifted a little above other things with the same words (an outside link, a
 * building whose description mentions it), the club's events and news a little, and links
 * that leave the site a little lower. Shared by the full-screen search and the search page.
 */
export const SITE_BOOST: Readonly<Record<string, number>> = { Page: 4, Event: 1.5, Post: 1, Resource: -1 }
