/**
 * Nuvio Provider entry point.
 *
 * Nuvio calls `getStreams(tmdbId, mediaType, season, episode)` with a TMDB
 * ID and expects back an array of stream descriptors.
 *
 * Note: when this gets bundled for Nuvio, the build script transpiles
 * async/await into generator functions for Hermes compatibility. For local
 * Node testing, async/await works as-is.
 */

import { getStreams as extractStreams } from './extractor.js';

export async function getStreams(tmdbId, mediaType, season, episode) {
    try {
        console.log(`[HDRezka] ${mediaType} ${tmdbId} S${season ?? '-'}E${episode ?? '-'}`);
        const streams = await extractStreams(tmdbId, mediaType, season, episode);
        if (streams.length > 0) return streams;
        // Diagnostic: show what Nuvio passed so we can tell if the Test Provider
        // sends real tmdbIds or if the scrape simply returned no results.
        return [
            {
                name: 'HDRezka-DIAG',
                title: `DIAG tmdb=${tmdbId || 'empty'} type=${mediaType || 'empty'} S${season ?? '-'}E${episode ?? '-'}`,
                url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
                quality: 'diagnostic',
            },
        ];
    } catch (error) {
        const msg = `${error.message || error}`.replace(/\s+/g, ' ').trim();
        console.error('[HDRezka] getStreams failed:', msg);
        return [
            {
                name: `HDRezka-ERR: ${msg.slice(0, 70)}`,
                title: `ERR: ${msg}`,
                url: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
                quality: `${mediaType} ${tmdbId} S${season ?? '-'}E${episode ?? '-'}`,
            },
        ];
    }
}
