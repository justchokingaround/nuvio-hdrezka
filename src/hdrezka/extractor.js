/**
 * HDRezka scraping logic.
 *
 * The flow is:
 *   1. Search by title  →  find candidate pages (URL + ID + year)
 *   2. Fetch the page   →  extract the post ID and a translator ID
 *   3. POST to the CDN  →  get an obfuscated URL string
 *   4. Deobfuscate      →  parse `[quality]url,[quality]url` format
 *
 * The obfuscation is not real encryption — it's just base64-encoded
 * "trash" substrings (combinations of `@#$!^`) inserted into the payload.
 * See `deobfuscateStreams` for the decode step.
 *
 * The page and CDN endpoints are gated by Anubis proof-of-work. The search
 * endpoint is not. We solve the Anubis challenge on the first page hit
 * and cache the verification cookie for the rest of the session.
 */

import { BASE_URL, fetchText, postForm, fetchJson, generateFavs } from './http.js';
import { searchHdrezka } from './search.js';
import {
    parseAnubisChallenge,
    solveChallenge,
    submitChallenge,
} from './anubis.js';

/**
 * Fetch a page, transparently solving Anubis on the first attempt.
 * Returns the actual page HTML or throws.
 */
async function fetchPage(url) {
    const html = await fetchText(url);
    const challenge = parseAnubisChallenge(html);
    if (!challenge) return html;
    console.log(`[HDRezka] Anubis challenge (difficulty=${challenge.difficulty})`);
    const t0 = Date.now();
    const solution = await solveChallenge(challenge);
    await submitChallenge(solution, url, t0);
    return await fetchText(url);
}

/**
 * Pull the post ID and a translator ID out of a page HTML.
 *
 * HDRezka inlines a JS call like:
 *   sof.tv.initCDNMoviesEvents(<id>, <translator_id>, ...)
 *   sof.tv.initCDNSeriesEvents(<id>, <translator_id>, ...)
 * The first integer is the post ID; the second is the translator ID.
 *
 * Falls back to the `#translators-list` element if the JS call is missing.
 * Translator ID 238 is special — "Original + subtitles" — and is preferred
 * when present.
 */
export function extractTranslatorAndId(html, mediaType) {
    // Preferred: <input id="post_id" value="...">
    const postIdMatch = html.match(/<input[^>]*id="post_id"[^>]*value="(\d+)"/)
        || html.match(/data-id="(\d+)"/);
    const postId = postIdMatch ? postIdMatch[1] : null;

    // Preferred: original-with-subs translator
    if (html.includes('data-translator_id="238"')) {
        return { postId, translatorId: '238' };
    }

    // Fallback: regex the initCDN*Events call
    const fn = mediaType === 'tv' ? 'initCDNSeriesEvents' : 'initCDNMoviesEvents';
    const re = new RegExp(`sof\\.tv\\.${fn}\\(\\s*(\\d+)\\s*,\\s*(\\d+)`);
    const m = html.match(re);
    if (m) {
        return { postId: m[1], translatorId: m[2] };
    }

    // Last resort: pick the first translator in the list
    const listMatch = html.match(/data-translator_id="(\d+)"/);
    if (listMatch) {
        return { postId, translatorId: listMatch[1] };
    }

    return { postId, translatorId: null };
}

/**
 * The string HDRezka returns in `url` is a base64 payload with two layers
 * of obfuscation:
 *   1. The string is split by `//_//`. We join those pieces back.
 *   2. It contains base64-encoded "trash" substrings — base64 of 2- or
 *      3-character strings drawn from `@#$!^`. We strip those.
 *   3. The remainder is a base64-encoded payload of the form
 *      `[quality]url,[quality]url` (or ` or `-joined alternates).
 */
export function deobfuscateStreams(obfuscated) {
    if (!obfuscated) return [];

    // Strip the leading `#h` marker and rejoin around `//_//`.
    let stripped = obfuscated.replace('#h', '').split('//_//').join('');

    // Build the set of base64-encoded trash strings.
    const trashChars = ['@', '#', '!', '^', '$'];
    const trashSet = new Set();
    for (let len = 2; len <= 3; len++) {
        const buckets = Array.from({ length: len }, () => trashChars);
        // cartesian product
        let combos = [''];
        for (const bucket of buckets) {
            const next = [];
            for (const prefix of combos) {
                for (const c of bucket) {
                    next.push(prefix + c);
                }
            }
            combos = next;
        }
        for (const combo of combos) {
            trashSet.add(encodeBase64(combo));
        }
    }

    // Strip each trash substring. Replace longest first so we don't
    // accidentally eat a prefix of a longer one.
    const sortedTrash = Array.from(trashSet).sort((a, b) => b.length - a.length);
    for (const t of sortedTrash) {
        stripped = stripped.split(t).join('');
    }

    // The remainder is base64 → UTF-8 `[quality]url,[quality]url[,...]`
    let decoded;
    try {
        decoded = decodeBase64Utf8(stripped);
    } catch {
        decoded = stripped;
    }

    const out = [];
    const re = /\[([^\]]+)\]([^,]+)/g;
    let m;
    while ((m = re.exec(decoded)) !== null) {
        const quality = m[1].trim();
        // A quality entry may be `url1 or url2` — split alternates.
        const urls = m[2].split(/\s+or\s+/);
        for (const url of urls) {
            const trimmed = url.trim();
            if (trimmed.startsWith('http')) {
                out.push({ quality, url: trimmed });
            }
        }
    }
    return out;
}

/**
 * Parse the `subtitle` field of the CDN response.
 * Format (post-deobfuscation): `[lang]url,[lang]url[,...]`
 */
export function parseSubtitles(obfuscated) {
    if (!obfuscated) return [];
    // Subtitles have the same `//_//` + trash pattern, so reuse the
    // deobfuscator.
    const stripped = obfuscated.replace('#h', '').split('//_//').join('');
    let decoded;
    try {
        decoded = decodeBase64Utf8(stripped);
    } catch {
        decoded = stripped;
    }

    const out = [];
    const re = /\[([^\]]+)\](https?:\/\/\S+?)(?=,\[|$)/g;
    let m;
    while ((m = re.exec(decoded)) !== null) {
        out.push({ language: m[1].trim(), url: m[2] });
    }
    return out;
}

/**
 * The translateName field from the CDN response is a JSON-encoded array of
 * `{translator_id, translator_name, premium}` objects. We accept this and
 * prefer the lowest-id non-premium translator when the user has not pinned
 * one.
 */
export function parseTranslatorsMeta(rawJson) {
    if (!rawJson) return null;
    try {
        const parsed = JSON.parse(rawJson);
        if (!Array.isArray(parsed)) return null;
        return parsed.map((t) => ({
            id: t.translator_id,
            name: t.translator_name,
            premium: !!t.premium,
        }));
    } catch {
        return null;
    }
}

/**
 * Main entry: given a TMDB ID and media type, return a list of stream URLs.
 *
 * Pipes:
 *   TMDB (title, year) → searchHdrezka → page → translator_id → POST streams
 *
 * For TV shows we also accept season/episode.
 */
export async function getStreams(tmdbId, mediaType, season, episode) {
    // 1. TMDB lookup so we know what to search for.
    const tmdb = await fetchTmdb(tmdbId, mediaType);
    const title = tmdb.title;
    const year = tmdb.year;
    if (!title) return [];

    // 2. Search HDRezka. Pick the best match by title + year + type.
    const candidates = await searchHdrezka(title, year, mediaType);
    if (candidates.length === 0) return [];

    const best = candidates[0];
    const pageUrl = best.url.startsWith('http')
        ? best.url
        : `${BASE_URL}${best.url.startsWith('/') ? '' : '/'}${best.url}`;

    // 3. Load the page to harvest the translator ID.
    const html = await fetchPage(pageUrl);
    const { translatorId } = extractTranslatorAndId(html, mediaType);
    if (!translatorId) return [];

    // 4. POST to the CDN endpoint. Pass the post ID if we could find one,
    //    otherwise fall back to the candidate ID we found in search.
    const postId = best.id || extractTranslatorAndId(html, mediaType).postId;
    const favs = generateFavs();

    const form = {
        id: postId,
        translator_id: translatorId,
        favs,
        action: mediaType === 'tv' ? 'get_stream' : 'get_movie',
    };
    if (mediaType === 'tv') {
        form.season = season;
        form.episode = episode;
    }

    let cdn;
    try {
        cdn = await postForm('/ajax/get_cdn_series/', form);
    } catch (e) {
        console.error('[HDRezka] CDN POST failed:', e.message);
        return [];
    }

    if (!cdn.success || !cdn.url) return [];

    const streams = deobfuscateStreams(cdn.url);
    const subs = parseSubtitles(cdn.subtitle);

    // Filter out null URLs (premium-only qualities) and tag with subs.
    const cleanSubs = subs.map((s) => ({
        id: s.url,
        language: s.language,
        url: s.url,
        type: 'vtt',
        hasCorsRestrictions: false,
    }));

    return streams
        .filter((s) => s.url && s.url !== 'null')
        .map((s) => ({
            name: 'HDRezka',
            title: formatStreamTitle(title, year, mediaType, season, episode, s.quality),
            url: s.url,
            quality: s.quality,
            headers: {
                Referer: pageUrl,
                'User-Agent':
                    'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            },
            subtitles: cleanSubs.length > 0 ? cleanSubs : undefined,
            type: 'direct',
        }));
}

function formatStreamTitle(title, year, mediaType, season, episode, quality) {
    const base = `${title}${year ? ` (${year})` : ''} ${quality}`;
    if (mediaType === 'tv') {
        return `${base} S${season}E${episode}`;
    }
    return base;
}

/**
 * Fetch basic metadata (title, year) from TMDB.
 * We use a public dev key here. Replace with your own in production.
 */
async function fetchTmdb(tmdbId, mediaType) {
    const apiKey = '439c478a771f35c05022f9feabcca01c'; // public dev key
    const path = mediaType === 'tv' ? 'tv' : 'movie';
    const url = `https://api.themoviedb.org/3/${path}/${tmdbId}?api_key=${apiKey}`;
    try {
        const data = await fetch(url).then((r) => {
            if (!r.ok) throw new Error(`TMDB ${r.status}`);
            return r.json();
        });
        const title = mediaType === 'tv' ? data.name : data.title;
        const date = mediaType === 'tv' ? data.first_air_date : data.release_date;
        const year = date ? parseInt(date.substring(0, 4), 10) : null;
        return { title, year };
    } catch (e) {
        console.error('[HDRezka] TMDB lookup failed:', e.message);
        return { title: null, year: null };
    }
}

// ---- Base64 helpers (Hermes-compatible via atob/btoa) -----------------------

function encodeBase64(str) {
    if (typeof btoa !== 'undefined') {
        return btoa(str);
    }
    // Node fallback
    return Buffer.from(str, 'utf-8').toString('base64');
}

function decodeBase64Utf8(str) {
    let raw;
    if (typeof atob !== 'undefined') {
        raw = atob(str);
    } else {
        raw = Buffer.from(str, 'base64').toString('binary');
    }
    // Decode UTF-8 bytes. Nuvio Hermes has TextDecoder.
    if (typeof TextDecoder !== 'undefined') {
        const bytes = new Uint8Array(raw.length);
        for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
        return new TextDecoder('utf-8').decode(bytes);
    }
    return raw;
}
