/**
 * Stremio addon wrapper around the HDRezka provider.
 *
 * Exposes a `getInterface` for Stremio plus a `handler` for Vercel
 * serverless deployment.
 *
 * The bundled HDRezka provider (built from src/ via build.cjs) is
 * required in. We assume it's at ./providers/hdrezka.cjs.
 */

const { addonBuilder } = require('stremio-addon-sdk');
const { getStreams } = require('./providers/hdrezka.cjs');

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

const addonInterface = builder.getInterface();

/**
 * Manual node server entry for local / home-network use.
 *
 * For Stremio on a TV that is on the same network as this computer,
 * start this and add the LAN URL to Stremio:
 *   http://<this-computer-ip>:7000/manifest.json
 *
 * For remote access use a free tunnel such as ngrok or cloudflared
 * and add the tunnel URL plus /manifest.json.
 */
if (require.main === module) {
    const { serveHTTP } = require('stremio-addon-sdk');
    const os = require('os');
    const port = process.env.PORT || 7000;

    // Find a non-internal IPv4 address to show the user.
    const ifaces = os.networkInterfaces();
    const lan = Object.values(ifaces)
        .flat()
        .find((iface) => iface && iface.family === 'IPv4' && !iface.internal);

    serveHTTP(addonInterface, { port }).then(() => {
        console.log('\n--- Stremio addon running ---');
        console.log(`Local:    http://127.0.0.1:${port}/manifest.json`);
        if (lan) {
            console.log(`Same-LAN: http://${lan.address}:${port}/manifest.json`);
        }
        console.log('-----------------------------\n');
    });
}

module.exports = addonInterface;
