/**
 * Anubis proof-of-work solver.
 *
 * Anubis is an open-source anti-bot (https://github.com/TecharoHQ/anubis). It
 * gates certain endpoints on HDRezka's new domain (`hdrezka-home.tv`) with
 * a SHA-256 challenge: find a nonce such that
 *     SHA-256(challenge.randomData + nonce).hex()
 * starts with `difficulty` zero hex characters.
 *
 * Format reverse-engineered from the minified main.mjs shipped by Anubis:
 *     GET /.within.website/x/cmd/anubis/api/pass-challenge
 *         ?id=<challenge_id>
 *         &response=<hex_sha256>
 *         &nonce=<nonce>
 *         &redir=<original_url>
 *         &elapsedTime=<seconds>
 * The server validates the PoW, sets an `*anubis-cookie-verification` cookie
 * via 302 redirect, and bounces to `redir`.
 */

import { HEADERS, BASE_URL, jarSet, hostFromUrl, cookieJar } from './http.js';

const ANUBIS_BASE = '/.within.website/x/cmd/anubis';
const PASS_PATH = `${ANUBIS_BASE}/api/pass-challenge`;

// SHA-256 of an arbitrary string, returned as lowercase hex.
// Works in both Node 18+ (global `crypto.subtle`) and Hermes (React Native).
async function sha256Hex(str) {
    const bytes = new TextEncoder().encode(str);
    const hashBuf = await crypto.subtle.digest('SHA-256', bytes);
    const bytes2 = new Uint8Array(hashBuf);
    let hex = '';
    for (let i = 0; i < bytes2.length; i++) {
        hex += bytes2[i].toString(16).padStart(2, '0');
    }
    return hex;
}

/**
 * Parse the challenge JSON embedded in the Anubis challenge page.
 * Returns null if the page is not an Anubis challenge.
 */
export function parseAnubisChallenge(html) {
    const match = html.match(
        /<script id="anubis_challenge" type="application\/json">([\s\S]+?)<\/script>/,
    );
    const obj = JSON.parse(match[1]);
    return obj.challenge;
}

/**
 * Solve the PoW. Find `nonce` such that
 *     SHA-256(challenge.randomData + nonce).hex()
 * starts with `difficulty` zero hex chars.
 */
export async function solveChallenge(challenge) {
    const difficulty = challenge.difficulty;
    const target = '0'.repeat(difficulty);
    const base = challenge.randomData;
    let nonce = 0;
    while (true) {
        const hash = await sha256Hex(base + nonce.toString());
        if (hash.startsWith(target)) {
            return {
                id: challenge.id,
                nonce: nonce.toString(),
                response: hash,
                difficulty,
            };
        }
        nonce++;
    }
}

/**
 * Submit the solution and capture the verification cookie.
 * Returns the cookie string (e.g. "name=value") to send on subsequent requests.
 */
export async function submitChallenge({ id, nonce, response, difficulty }, redirUrl, t0) {
    const elapsedTime = ((Date.now() - t0) / 1000).toFixed(3);
    const params = new URLSearchParams({
        id,
        nonce,
        response,
        redir: redirUrl,
        elapsedTime,
    });
    const url = `${BASE_URL}${PASS_PATH}?${params.toString()}`;

    const host = hostFromUrl(redirUrl);
    const testCookieValue = cookieJar.get(host)?.['techaro.lol-anubis-cookie-verification'];
    const testCookie = testCookieValue ? `techaro.lol-anubis-cookie-verification=${testCookieValue}` : null;
    const headers = {
        ...HEADERS,
        ...(testCookie ? { Cookie: testCookie } : {}),
    };
    const res = await fetch(url, {
        method: 'GET',
        headers,
        redirect: 'manual',
    });
    // The flow is: 302 redirect with Set-Cookie. We need the cookie, not the

    // redirect target.
    const setCookies = res.headers.getSetCookie?.() || [];
    if (setCookies.length === 0) {
        // Fallback: parse a single Set-Cookie header
        const header = res.headers.get('set-cookie');
        if (header) setCookies.push(header);
    }

    const verify = setCookies.find((c) => c.includes('anubis-auth='));
    // Store the cookie in the shared jar so subsequent requests on the
    // same host send it back.
    const cookie = verify.split(';')[0];
    jarSet(hostFromUrl(redirUrl), [cookie]);
    return cookie;
}
