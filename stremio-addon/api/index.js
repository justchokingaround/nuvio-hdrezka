/**
 * Vercel serverless entry for the Stremio addon.
 *
 * Routes:
 *   GET /manifest.json                       → addon manifest
 *   GET /stream/{type}/{id}.json             → stream list
 *
 * The id encodes TMDB: "tmdb:603" or "tmdb:1396:1:1".
 */

const addon = require('../addon.js');

const CORS = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': '*',
};

function setCors(res) {
    for (const [k, v] of Object.entries(CORS)) res.setHeader(k, v);
}

module.exports = async function handler(req, res) {
    setCors(res);

    if (req.method === 'OPTIONS') {
        res.statusCode = 204;
        return res.end();
    }

    const url = req.url || '/';
    const path = url.split('?')[0];

    if (path === '/manifest.json' || path === '/') {
        res.setHeader('Content-Type', 'application/json; charset=utf-8');
        return res.end(JSON.stringify(addon.manifest));
    }

    const streamMatch = path.match(/^\/stream\/(movie|series)\/(.+)\.json$/);
    if (streamMatch) {
        const [, type, id] = streamMatch;
        try {
            const result = await addon.get('stream', type, id, {});
            res.setHeader('Content-Type', 'application/json; charset=utf-8');
            return res.end(JSON.stringify(result));
        } catch (err) {
            res.statusCode = 500;
            res.setHeader('Content-Type', 'application/json');
            return res.end(JSON.stringify({ error: err.message || 'handler error' }));
        }
    }

    res.statusCode = 404;
    res.setHeader('Content-Type', 'application/json');
    return res.end(JSON.stringify({ error: 'Not found' }));
};
