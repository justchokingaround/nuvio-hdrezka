/**
 * HDRezka search.
 *
 * The search endpoint returns HTML (not JSON) where each result is wrapped:
 *   <a href="<url>"><span class="enty"><title></span> (<year>)</a>
 *
 * We parse it with regex; the HTML is small and well-structured, so we
 * don't need cheerio for this step.
 */

import {
    BASE_URL,
    HEADERS,
    fetchText,
    hostFromUrl,
    jarCookieHeader,
    jarSet,
} from './http.js';
import {
    parseAnubisChallenge,
    solveChallenge,
    submitChallenge,
} from './anubis.js';

function readSetCookies(response) {
    const out = [];
    const list = response.headers.getSetCookie?.() || [];
    for (const c of list) out.push(c.split(';')[0]);
    if (out.length === 0) {
        const header = response.headers.get('set-cookie');
        if (header) {
            for (const c of header.split(/,(?=[^;]+=[^;]+)/)) {
                out.push(c.split(';')[0]);
            }
        }
    }
    return out;
}

/**
 * Fetch the search endpoint, transparently solving an Anubis challenge if
 * the datacenter IP is served one on the first attempt.
 */
async function fetchSearch(url, options = {}) {
    try {
        return await fetchText(url, options);
    } catch (e) {
        if (!e.message.includes('403') && !e.message.includes('405')) throw e;
        const host = hostFromUrl(url);
        const cookieHeader = jarCookieHeader(host);
        const headers = {
            ...HEADERS,
            ...(cookieHeader ? { Cookie: cookieHeader } : {}),
            ...(options.headers || {}),
        };
        const res = await fetch(url, { headers });
        if (host) jarSet(host, readSetCookies(res));
        const text = await res.text();
        const challenge = parseAnubisChallenge(text);
        if (!challenge) throw e;
        console.log(`[HDRezka] Anubis search challenge (difficulty=${challenge.difficulty})`);
        const solution = await solveChallenge(challenge);
        // elapsedTime doesn't matter much for a fallback solve.
        await submitChallenge(solution, url, Date.now());
        return fetchText(url, options);
    }
}

/**
 * Search HDRezka for `title` and `originalTitle` (and with the year appended)
 * and return a list of candidate results.
 *
 * Searching with the year is essential for short/common titles like "Брат", where
 * a plain "Брат" query returns unrelated newer titles.
 *
 * Each result: { id, url, title, year, type: 'movie' | 'tv' }.
 */
export async function searchHdrezka(title, originalTitle, year, mediaType) {
    const seenUrls = new Set();
    const all = [];

    const baseQueries = [
        originalTitle,
        title,
    ].filter(Boolean);

    const queries = [];
    for (const q of baseQueries) {
        queries.push(q);
        if (year) queries.push(`${q} ${year}`);
    }

    for (const query of queries) {
        const url = `${BASE_URL}/engine/ajax/search.php?q=${encodeURIComponent(query)}`;
        let html;
        try {
            html = await fetchSearch(url, {
                headers: {
                    'X-Requested-With': 'XMLHttpRequest',
                    'Referer': `${BASE_URL}/`,
                },
            });
        } catch (e) {
            console.error(`[HDRezka] search failed for "${query}": ${e.message}`);
            continue;
        }

        for (const c of parseSearchHtml(html)) {
            if (!seenUrls.has(c.url)) {
                seenUrls.add(c.url);
                all.push(c);
            }
        }
    }

    return rankCandidates(all, { title, originalTitle, year, mediaType });
}

function parseSearchHtml(html) {
    const candidates = [];
    const re =
        /<a href="([^"]+)"><span class="enty">([^<]+)<\/span>[^<]*?\(([^)]+)\)/g;
    let m;
    while ((m = re.exec(html)) !== null) {
        const itemUrl = m[1];
        const itemTitle = m[2].trim();
        const itemYearRaw = m[3].trim();

        const yearMatch = itemYearRaw.match(/(\d{4})/);
        const itemYear = yearMatch ? parseInt(yearMatch[1], 10) : null;
        const itemType = itemUrl.includes('/series/') || itemUrl.includes('/animation/')
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
    return candidates;
}

function rankCandidates(candidates, { title, originalTitle, year, mediaType }) {
    if (candidates.length === 0) return [];

    const norm = (s) =>
        (s || '').toLowerCase().replace(/[^\p{L}\p{N}]+/gu, '');

    const targetType = mediaType === 'tv' || mediaType === 'anime' ? 'tv' : 'movie';
    const normalizedTargets = [title, originalTitle]
        .filter(Boolean)
        .map(norm)
        .filter(Boolean);

    const scored = candidates.map((c) => {
        let score = 0;
        if (c.type === targetType) score += 10;
        if (year && c.year === year) score += 50;

        const normalizedTitle = norm(c.title);
        for (const t of normalizedTargets) {
            if (normalizedTitle === t) {
                score += 40;
                break;
            }
            if (normalizedTitle.includes(t) || t.includes(normalizedTitle)) {
                score += 8;
            }
        }
        return { c, score };
    });

    scored.sort((a, b) => b.score - a.score);
    return scored.map((s) => s.c);
}
