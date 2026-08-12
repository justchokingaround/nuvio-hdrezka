# nuvio-hdrezka

Nuvio provider that scrapes stream URLs from HDRezka (hdrezka.website).

## Verified locally

```
=== Testing: The Matrix (1999) ===
[HDRezka] movie 603 S-E-
[HDRezka] Anubis challenge (difficulty=2)
[OK] 10 streams in 734ms
      360p ...1080p + subtitles (Русский, Українська, English)

=== Testing: Breaking Bad S1E1 ===
[OK] 14 streams in 928ms
```

## Install in Nuvio

Manifest URL (paste into Nuvio → Settings → Plugins → Add Repository):

```
https://raw.githubusercontent.com/justchokingaround/nuvio-hdrezka/main/manifest.json
```

## Files

- **`src/hdrezka/http.js`** — fetch wrappers + cookie jar.
- **`src/hdrezka/search.js`** — TMDB title/year → HDRezka candidate URL.
- **`src/hdrezka/extractor.js`** — page fetch with Anubis solve + AES-trash deobfuscation + CDN response parsing.
- **`src/hdrezka/anubis.js`** — SHA-256 proof-of-work solver for the Anubis anti-bot.
- **`src/hdrezka/index.js`** — `getStreams(tmdbId, mediaType, season, episode)` entry.
- **`providers/hdrezka.js`** — built output (esbuild bundle, async/await transpiled to generators for Hermes).
- **`manifest.json`** — Nuvio plugin manifest.
- **`build.cjs`** — bundle script. Run `npm run build` after editing `src/`.

## Anubis algorithm (reverse-engineered)

```
hash = SHA-256(challenge.randomData + nonce)
hex  = lower-hex(hash)
assert: hex starts with `difficulty` zero hex chars
```
Difficulty 2 → ~256 hashes on average. Difficulty 4 → ~65k. Both fast.

Submission: `GET /.within.website/x/cmd/anubis/api/pass-challenge?id=<id>&response=<hex>&nonce=<n>&redir=<url>&elapsedTime=<s>`. The server returns 302 with `Set-Cookie: techaro.lol-anubis-auth=<JWT>`.

## Notes vs `michat88/nuvio-providers`

That reference is dead-on-arrival against the current HDRezka:

- Domain changed (twice). `hdrezka.ag` → 403, `hdrezka-home.tv` → 403 on search with Android-app headers. The active one is **hdrezka.website**.
- `X-Hdrezka-Android-App` headers that the old reference used to bypass anti-bot now trigger 403 on hdrezka.website. The current provider doesn't send them.
- Search endpoint still works without Anubis: `GET /engine/ajax/search.php?q=<title>` returns 200.
- Page and CDN endpoints are gated by Anubis. The PoW is solvable per the algorithm above.
