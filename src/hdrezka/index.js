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
        return await extractStreams(tmdbId, mediaType, season, episode);
    } catch (error) {
        console.error('[HDRezka] getStreams failed:', error.message);
        return [];
    }
}
