/**
 * Standalone test for the HDRezka provider.
 *
 * Usage:
 *   node test.js            # default movie
 *   node test.js movie 603  # arbitrary TMDB movie ID
 *   node test.js tv 1396 1 1   # Breaking Bad S1E1
 */

import { getStreams } from './src/hdrezka/index.js';

const args = process.argv.slice(2);

const tests = {
    matrix: { kind: 'movie', tmdbId: '603', label: 'The Matrix (1999)' },
    inception: { kind: 'movie', tmdbId: '27205', label: 'Inception (2010)' },
    parasite: { kind: 'movie', tmdbId: '496243', label: 'Parasite (2019)' },
    breakingBad: { kind: 'tv', tmdbId: '1396', season: 1, episode: 1, label: 'Breaking Bad S1E1' },
    office: { kind: 'tv', tmdbId: '2316', season: 1, episode: 1, label: 'The Office S1E1' },
};

async function main() {
    let test;
    if (args.length === 0) {
        test = tests.matrix;
    } else if (tests[args[0]]) {
        test = tests[args[0]];
    } else {
        // Allow: `node test.js movie 603`
        const [kind, tmdbId, season, episode] = args;
        test = {
            kind,
            tmdbId,
            season: season ? parseInt(season, 10) : undefined,
            episode: episode ? parseInt(episode, 10) : undefined,
            label: `${kind} ${tmdbId}${season ? ` S${season}` : ''}${episode ? `E${episode}` : ''}`,
        };
    }

    console.log(`\n=== Testing: ${test.label} ===\n`);
    const t0 = Date.now();
    const streams = await getStreams(test.tmdbId, test.kind, test.season, test.episode);
    const elapsed = Date.now() - t0;

    if (streams.length === 0) {
        console.log(`[FAIL] No streams returned (${elapsed}ms)`);
        process.exit(1);
    }

    console.log(`[OK] ${streams.length} streams in ${elapsed}ms\n`);
    for (const s of streams) {
        console.log(`  ${s.quality.padStart(8)}  ${s.title}`);
        console.log(`             ${s.url}`);
        if (s.subtitles) {
            console.log(`             subs: ${s.subtitles.map((sub) => sub.language).join(', ')}`);
        }
    }
}

main().catch((e) => {
    console.error(e);
    process.exit(1);
});
