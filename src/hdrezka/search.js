/**
 * HDRezka search.
 *
 * The search endpoint returns HTML (not JSON) where each result is wrapped:
 *   <a href="<url>"><span class="enty"><title></span> (<year>)</a>
 *
 * We parse it with regex; the HTML is small and well-structured, so we
 * don't need cheerio for this step.
 */

import { BASE_URL, fetchText } from './http.js';

/**
 * Search HDRezka for `title` and return a list of candidate results.
 * Each result: { id, url, title, year, type: 'movie' | 'tv' }.
 * Sorted by best match (year + type match preferred).
 */
export async function searchHdrezka(title, year, mediaType) {
    const url = `${BASE_URL}/engine/ajax/search.php?q=${encodeURIComponent(title)}`;
    const html = await fetchText(url);

    const candidates = [];
    // Each result entry:
    //   <a href="<url>"><span class="enty">Title</span> Original (2024)</a>
    const re =
        /<a href="([^"]+)"><span class="enty">([^<]+)<\/span>[^<]*?\(([^)]+)\)/g;
    let m;
    while ((m = re.exec(html)) !== null) {
        const itemUrl = m[1];
        const itemTitle = m[2].trim();
        const itemYearRaw = m[3].trim();

        // Extract a 4-digit year from the parenthetical.
        const yearMatch = itemYearRaw.match(/(\d{4})/);
        const itemYear = yearMatch ? parseInt(yearMatch[1], 10) : null;
        const itemType = itemUrl.includes('/series/')
            ? 'tv'
            : itemUrl.includes('/films/')
              ? 'movie'
              : null;

        const idMatch = itemUrl.match(/\/(\d+)-[^/]+\.html$/);
        candidates.push({
            id: idMatch ? idMatch[1] : null,
            url: itemUrl,
            title: itemTitle,
            year: itemYear,
            type: itemType,
        });
    }

    return rankCandidates(candidates, { title, year, mediaType });
}

/**
 * Score each candidate and return descending. Exact year + type match wins.
 * Falls back to the first result if nothing matches perfectly.
 */
function rankCandidates(candidates, { title, year, mediaType }) {
    if (candidates.length === 0) return [];

    const norm = (s) => (s || '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');

    const targetType = mediaType === 'tv' ? 'tv' : 'movie';
    const scored = candidates.map((c) => {
        let score = 0;
        if (c.type === targetType) score += 10;
        if (year && c.year === year) score += 20;
        if (norm(c.title) === norm(title)) score += 30;
        else if (norm(c.title).includes(norm(title))) score += 5;
        return { c, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored.map((s) => s.c);
}
