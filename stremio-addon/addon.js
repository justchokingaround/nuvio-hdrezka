/**
 * Stremio addon wrapper around the HDRezka provider.
 *
 * Exposes a `getInterface` for Stremio plus a `handler` for Vercel
 * serverless deployment.
 *
 * The bundled HDRezka provider (built from src/ via build.cjs) is
 * required in. We assume it's at ../providers/hdrezka.js.
 */

const { addonBuilder } = require('stremio-addon-sdk');
const { getStreams } = require('../providers/hdrezka.cjs');

const builder = addonBuilder({
    id: 'community.nuvio.hdrezka',
    version: '0.1.0',
    name: 'HDRezka',
    description: 'Streams from HDRezka (hdrezka.website).',
    resources: ['stream'],
    types: ['movie', 'series'],
    idPrefixes: ['tmdb:'],
    catalogs: [],
});

builder.defineStreamHandler(async (args) => {
    const { type, id } = args;
    // id format: "tmdb:603" for movie, "tmdb:1396:1:1" for series.
    const parts = id.split(':');
    const tmdbId = parts[1];
    const season = parts[2] ? parseInt(parts[2], 10) : null;
    const episode = parts[3] ? parseInt(parts[3], 10) : null;
    const mediaType = type === 'series' ? 'tv' : 'movie';

    let streams;
    try {
        streams = await getStreams(tmdbId, mediaType, season, episode);
    } catch (err) {
        console.error('[HDRezka addon] getStreams failed:', err.message);
        return { streams: [] };
    }

    return { streams: streams.map(adaptToStremio) };
});

/**
 * Nuvio stream → Stremio stream shape.
 * Nuvio: { name, title, url, quality, headers, subtitles, type }
 * Stremio: { name, title, url, behaviorHints, subtitles }
 */
function adaptToStremio(s) {
    const out = {
        name: s.name || 'HDRezka',
        title: s.title || s.quality || '',
        url: s.url,
    };
    if (s.headers) {
        out.behaviorHints = {
            ...(out.behaviorHints || {}),
            proxyHeaders: s.headers,
        };
    }
    if (s.subtitles && s.subtitles.length > 0) {
        out.subtitles = s.subtitles.map((sub) => ({
            id: sub.id || sub.url,
            url: sub.url,
            lang: sub.language || 'unknown',
            mimeType: sub.type === 'vtt' ? 'text/vtt' : 'text/srt',
        }));
    }
    return out;
}

module.exports = builder.getInterface();
