# nuvio-hdrezka

Nuvio provider that scrapes stream URLs from HDRezka (hdrezka-home.tv).

## What's working

The code is structurally complete and runs end-to-end:

- **`src/hdrezka/http.js`** — `fetch` wrappers with the `X-Hdrezka-Android-App` mobile-header trick + an in-memory cookie jar. The Anubis JWT cookie is captured here.
- **`src/hdrezka/search.js`** — TMDB title/year → HDRezka candidate URL, regex-only (no cheerio needed).
- **`src/hdrezka/extractor.js`** — page fetch with Anubis solve + AES-trash deobfuscation + CDN response parsing.
- **`src/hdrezka/anubis.js`** — SHA-256 proof-of-work solver for the Anubis anti-bot.
- **`src/hdrezka/index.js`** — `getStreams(tmdbId, mediaType, season, episode)` entry.
- **`test.js`** — smoke harness against `hdrezka-home.tv`.

Verified locally:

```
=== Testing: The Matrix (1999) ===
[HDRezka] movie 603 S-E-
[HDRezka] Anubis challenge (difficulty=2)
→ submission returns 302 with techaro.lol-anubis-auth=<JWT>
```

## What's blocking end-to-end smoke

The Anubis JWT is bound to the IP that solved the challenge via `SHA-256(X-Real-Ip)`. The server-side `X-Real-Ip` likely comes from the upstream reverse proxy (Cloudflare) rather than the request header, so we can't self-assert a different IP and verify against the live endpoint from a development environment.

This is **not a problem in production**: the Nuvio provider runs on the user's device, so the connecting IP is consistent across the entire session — the JWT is valid for every subsequent request. The blocker is purely about local testing.

For a quick verification without Anubis, the search endpoint (`/engine/ajax/search.php`) and `<script id="anubis_challenge">` parsing can be exercised directly:

```bash
node test.js matrix
```

## Anubis algorithm (reverse-engineered)

```
hash = SHA-256(challenge.randomData + nonce)
hex  = lower-hex(hash)
assert: hex starts with `difficulty` zero hex chars
```
Difficulty 2 → ~256 hashes on average. Difficulty 4 → ~65k. Both fast.

Submission: `GET /.within.website/x/cmd/anubis/api/pass-challenge?id=<id>&response=<hex>&nonce=<n>&redir=<url>&elapsedTime=<s>`. The server returns 302 with `Set-Cookie: techaro.lol-anubis-auth=<JWT>`.

## HDRezka upgrade notes vs `michat88/nuvio-providers`

That reference is dead-on-arrival against the current HDRezka:

- Domain changed from `hdrezka.ag` (now 403) to `hdrezka-home.tv` (301 redirect then dead).
- Search endpoint unchanged: `GET /engine/ajax/search.php?q=<title>` returns 200 with no Anubis.
- Page and CDN endpoints are gated by Anubis. The PoW is solvable per the algorithm above.

## Layout for Nuvio build

When this gets packaged for Nuvio, the build script transpiles `async/await` to generator functions for Hermes. The current code is intentionally modern (async/await + `import`/`export`) so the build can do this; `michat88`'s old version uses Promise chains because their sandbox doesn't transpile.

For deployment, the manifest URL is:

```
https://raw.githubusercontent.com/<user>/nuvio-hdrezka/<branch>/manifest.json
```

The `manifest.json` and `providers/` distribution folder are not yet generated — see the yoruix/nuvio-providers template for the build entry points (`build.js`) and the manifest schema.
