# nuvio-hdrezka

HDRezka streams for Nuvio **and** Stremio.

- **Nuvio**: on-device provider plugin (mobile/Apple TV via Nuvio).
- **Stremio**: serverless addon for TV or desktop clients that don’t speak Nuvio.

Active mirror: **hdrezka.website**.

## Verified locally

```
=== Nuvio plugin: The Matrix (1999) ===
[HDRezka] movie 603 S-E-
[HDRezka] Anubis challenge (difficulty=2)
[OK] 10 streams in 734ms
      360p ...1080p + subtitles (Русский, Українська, English)

=== Nuvio plugin: Breaking Bad S1E1 ===
[OK] 14 streams in 928ms
```

```
=== Stremio addon: /stream/movie/tmdb:603.json ===
10 streams returned
=== Stremio addon: /stream/series/tmdb:1396:1:1.json ===
14 streams returned
```

## Install as Nuvio plugin

Paste this URL into **Nuvio → Settings → Plugins → Add Repository**: And enable **HDRezka**.

```
https://raw.githubusercontent.com/justchokingaround/nuvio-hdrezka/main/manifest.json
```

## Install as Stremio addon (TV / desktop / web)

Pick one:

### 1. One-click deploy to Vercel (free)

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https%3A%2F%2Fgithub.com%2Fjustchokingaround%2Fnuvio-hdrezka&root-directory=stremio-addon)

1. Sign in with GitHub/Vercel.
2. Set **Root Directory** to `stremio-addon`.
3. Deploy.
4. Copy the deployment URL, e.g. `https://nuvio-hdrezka-xyz.vercel.app/`.
5. In Stremio, go to **Addons → Add Addon URL** and paste:
   ```
   https://nuvio-hdrezka-xyz.vercel.app/manifest.json
   ```

### 2. Deploy from this machine

```bash
cd stremio-addon
npx vercel login     # opens browser
cp ../providers/hdrezka.cjs providers/hdrezka.cjs
npx vercel --prod
```

## Files

| Path | What |
|---|---|
| `src/hdrezka/http.js` | fetch wrappers + in-memory cookie jar |
| `src/hdrezka/search.js` | TMDB title/year → HDRezka candidate page |
| `src/hdrezka/extractor.js` | page fetch, Anubis solve, AES/JS deobfuscation, CDN POST |
| `src/hdrezka/anubis.js` | SHA-256 proof-of-work solver |
| `src/hdrezka/index.js` | `getStreams(tmdbId, mediaType, season, episode)` entry |
| `providers/hdrezka.cjs` | Hermes-compatible CommonJS bundle for Nuvio |
| `manifest.json` | Nuvio plugin manifest |
| `build.cjs` | bundle script (`npm run build`) |
| `stremio-addon/addon.js` | Stremio addon interface wrapper |
| `stremio-addon/api/index.js` | Vercel serverless request handler |
| `stremio-addon/vercel.json` | Vercel routing |

## Anubis algorithm

```
hash = SHA-256(challenge.randomData + nonce)
hex  = lower-hex(hash)
assert: hex starts with `difficulty` zero hex chars
```

Submission: `GET /.within.website/x/cmd/anubis/api/pass-challenge?id=<id>&response=<hex>&nonce=<n>&redir=<url>&elapsedTime=<s>`. Server returns `302` with `Set-Cookie: techaro.lol-anubis-auth=<JWT>`.

## Why the old reference didn’t work

`michat88/nuvio-providers` was built for a different HDRezka mirror:

- Dead domains: `hdrezka.ag`, `hdrezka-home.tv`.
- `X-Hdrezka-Android-App` bypass headers now trigger `403` on `hdrezka.website`.
- Search endpoint still works without Anubis, so the main work is solving Anubis for page/CDN access.
