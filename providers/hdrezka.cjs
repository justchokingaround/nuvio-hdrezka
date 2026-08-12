var __defProp = Object.defineProperty;
var __defProps = Object.defineProperties;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropDescs = Object.getOwnPropertyDescriptors;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getOwnPropSymbols = Object.getOwnPropertySymbols;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __propIsEnum = Object.prototype.propertyIsEnumerable;
var __defNormalProp = (obj, key, value) => key in obj ? __defProp(obj, key, { enumerable: true, configurable: true, writable: true, value }) : obj[key] = value;
var __spreadValues = (a, b) => {
  for (var prop in b || (b = {}))
    if (__hasOwnProp.call(b, prop))
      __defNormalProp(a, prop, b[prop]);
  if (__getOwnPropSymbols)
    for (var prop of __getOwnPropSymbols(b)) {
      if (__propIsEnum.call(b, prop))
        __defNormalProp(a, prop, b[prop]);
    }
  return a;
};
var __spreadProps = (a, b) => __defProps(a, __getOwnPropDescs(b));
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toCommonJS = (mod) => __copyProps(__defProp({}, "__esModule", { value: true }), mod);
var __async = (__this, __arguments, generator) => {
  return new Promise((resolve, reject) => {
    var fulfilled = (value) => {
      try {
        step(generator.next(value));
      } catch (e) {
        reject(e);
      }
    };
    var rejected = (value) => {
      try {
        step(generator.throw(value));
      } catch (e) {
        reject(e);
      }
    };
    var step = (x) => x.done ? resolve(x.value) : Promise.resolve(x.value).then(fulfilled, rejected);
    step((generator = generator.apply(__this, __arguments)).next());
  });
};

// src/hdrezka/index.js
var hdrezka_exports = {};
__export(hdrezka_exports, {
  getStreams: () => getStreams2
});
module.exports = __toCommonJS(hdrezka_exports);

// src/hdrezka/http.js
var BASE_URL = "https://hdrezka.website";
var HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
  "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
  "Accept-Language": "en-US,en;q=0.5",
  "Connection": "keep-alive"
};
var cookieJar = /* @__PURE__ */ new Map();
function jarGet(host) {
  return cookieJar.get(host) || {};
}
function jarSet(host, cookies) {
  if (!cookies || cookies.length === 0) return;
  const existing = jarGet(host);
  for (const pair of cookies) {
    const eq = pair.indexOf("=");
    if (eq < 0) continue;
    const name = pair.slice(0, eq).trim();
    const value = pair.slice(eq + 1).trim();
    if (value === "") {
      delete existing[name];
    } else {
      existing[name] = value;
    }
  }
  cookieJar.set(host, existing);
}
function jarCookieHeader(host) {
  const cookies = jarGet(host);
  const pairs = Object.entries(cookies).map(([k, v]) => `${k}=${v}`);
  return pairs.length > 0 ? pairs.join("; ") : void 0;
}
function hostFromUrl(url) {
  try {
    return new URL(url).host;
  } catch (e) {
    return "";
  }
}
function randomHex(length) {
  let s = "";
  for (let i = 0; i < length; i++) {
    s += Math.floor(Math.random() * 16).toString(16);
  }
  return s;
}
function generateFavs() {
  return [
    randomHex(8),
    randomHex(4),
    randomHex(4),
    randomHex(4),
    randomHex(12)
  ].join("-");
}
function readSetCookies(response) {
  var _a, _b;
  const out = [];
  const list = ((_b = (_a = response.headers).getSetCookie) == null ? void 0 : _b.call(_a)) || [];
  for (const c of list) {
    out.push(c.split(";")[0]);
  }
  if (out.length === 0) {
    const header = response.headers.get("set-cookie");
    if (header) {
      for (const c of header.split(/,(?=[^;]+=[^;]+)/)) {
        out.push(c.split(";")[0]);
      }
    }
  }
  return out;
}
function fetchText(_0) {
  return __async(this, arguments, function* (url, options = {}) {
    const host = hostFromUrl(url);
    const cookieHeader = jarCookieHeader(host);
    const headers = __spreadValues(__spreadValues(__spreadValues({}, HEADERS), cookieHeader ? { Cookie: cookieHeader } : {}), options.headers || {});
    const response = yield fetch(url, __spreadValues({
      headers,
      redirect: options.followRedirects === false ? "manual" : "follow"
    }, options));
    if (host) {
      jarSet(host, readSetCookies(response));
    }
    if (options.expectRedirect && response.status >= 300 && response.status < 400) {
      return response;
    }
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText} for ${url}`);
    }
    return yield response.text();
  });
}
function postForm(_0, _1) {
  return __async(this, arguments, function* (path, fields, options = {}) {
    const url = path.startsWith("http") ? path : `${BASE_URL}${path}`;
    const body = new URLSearchParams();
    for (const [k, v] of Object.entries(fields)) {
      body.append(k, String(v));
    }
    const host = hostFromUrl(url);
    const cookieHeader = jarCookieHeader(host);
    const response = yield fetch(url, __spreadValues({
      method: "POST",
      headers: __spreadValues(__spreadValues(__spreadProps(__spreadValues({}, HEADERS), {
        "Content-Type": "application/x-www-form-urlencoded",
        "X-Requested-With": "XMLHttpRequest"
      }), cookieHeader ? { Cookie: cookieHeader } : {}), options.headers || {}),
      body: body.toString(),
      redirect: "follow"
    }, options));
    if (host) {
      jarSet(host, readSetCookies(response));
    }
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} ${response.statusText} for POST ${url}`);
    }
    return yield response.json();
  });
}

// src/hdrezka/search.js
function searchHdrezka(title, year, mediaType) {
  return __async(this, null, function* () {
    const url = `${BASE_URL}/engine/ajax/search.php?q=${encodeURIComponent(title)}`;
    const html = yield fetchText(url);
    const candidates = [];
    const re = /<a href="([^"]+)"><span class="enty">([^<]+)<\/span>[^<]*?\(([^)]+)\)/g;
    let m;
    while ((m = re.exec(html)) !== null) {
      const itemUrl = m[1];
      const itemTitle = m[2].trim();
      const itemYearRaw = m[3].trim();
      const yearMatch = itemYearRaw.match(/(\d{4})/);
      const itemYear = yearMatch ? parseInt(yearMatch[1], 10) : null;
      const itemType = itemUrl.includes("/series/") ? "tv" : itemUrl.includes("/films/") ? "movie" : null;
      const idMatch = itemUrl.match(/\/(\d+)-[^/]+\.html$/);
      candidates.push({
        id: idMatch ? idMatch[1] : null,
        url: itemUrl,
        title: itemTitle,
        year: itemYear,
        type: itemType
      });
    }
    return rankCandidates(candidates, { title, year, mediaType });
  });
}
function rankCandidates(candidates, { title, year, mediaType }) {
  if (candidates.length === 0) return [];
  const norm = (s) => (s || "").toLowerCase().replace(/[^\p{L}\p{N}]+/gu, "");
  const targetType = mediaType === "tv" ? "tv" : "movie";
  const scored = candidates.map((c) => {
    let score = 0;
    if (c.type === targetType) score += 10;
    if (year && c.year === year) score += 20;
    if (norm(c.title) === norm(title)) score += 30;
    else if (norm(c.title).includes(norm(title))) score += 5;
    return { c, score };
  });
  scored.sort((a, b) => b.score - a.score);
  return scored.map((s) => s.c);
}

// src/hdrezka/anubis.js
var ANUBIS_BASE = "/.within.website/x/cmd/anubis";
var PASS_PATH = `${ANUBIS_BASE}/api/pass-challenge`;
function sha256Hex(str) {
  return __async(this, null, function* () {
    const bytes = new TextEncoder().encode(str);
    const hashBuf = yield crypto.subtle.digest("SHA-256", bytes);
    const bytes2 = new Uint8Array(hashBuf);
    let hex = "";
    for (let i = 0; i < bytes2.length; i++) {
      hex += bytes2[i].toString(16).padStart(2, "0");
    }
    return hex;
  });
}
function parseAnubisChallenge(html) {
  const match = html.match(
    /<script id="anubis_challenge" type="application\/json">([\s\S]+?)<\/script>/
  );
  const obj = JSON.parse(match[1]);
  return obj.challenge;
}
function solveChallenge(challenge) {
  return __async(this, null, function* () {
    const difficulty = challenge.difficulty;
    const target = "0".repeat(difficulty);
    const base = challenge.randomData;
    let nonce = 0;
    while (true) {
      const hash = yield sha256Hex(base + nonce.toString());
      if (hash.startsWith(target)) {
        return {
          id: challenge.id,
          nonce: nonce.toString(),
          response: hash,
          difficulty
        };
      }
      nonce++;
    }
  });
}
function submitChallenge(_0, _1, _2) {
  return __async(this, arguments, function* ({ id, nonce, response, difficulty }, redirUrl, t0) {
    var _a, _b, _c;
    const elapsedTime = ((Date.now() - t0) / 1e3).toFixed(3);
    const params = new URLSearchParams({
      id,
      nonce,
      response,
      redir: redirUrl,
      elapsedTime
    });
    const url = `${BASE_URL}${PASS_PATH}?${params.toString()}`;
    const host = hostFromUrl(redirUrl);
    const testCookieValue = (_a = cookieJar.get(host)) == null ? void 0 : _a["techaro.lol-anubis-cookie-verification"];
    const testCookie = testCookieValue ? `techaro.lol-anubis-cookie-verification=${testCookieValue}` : null;
    const headers = __spreadValues(__spreadValues({}, HEADERS), testCookie ? { Cookie: testCookie } : {});
    const res = yield fetch(url, {
      method: "GET",
      headers,
      redirect: "manual"
    });
    const setCookies = ((_c = (_b = res.headers).getSetCookie) == null ? void 0 : _c.call(_b)) || [];
    if (setCookies.length === 0) {
      const header = res.headers.get("set-cookie");
      if (header) setCookies.push(header);
    }
    const verify = setCookies.find((c) => c.includes("anubis-auth="));
    const cookie = verify.split(";")[0];
    jarSet(hostFromUrl(redirUrl), [cookie]);
    return cookie;
  });
}

// src/hdrezka/extractor.js
function fetchPage(url) {
  return __async(this, null, function* () {
    const html = yield fetchText(url);
    const challenge = parseAnubisChallenge(html);
    if (!challenge) return html;
    console.log(`[HDRezka] Anubis challenge (difficulty=${challenge.difficulty})`);
    const t0 = Date.now();
    const solution = yield solveChallenge(challenge);
    yield submitChallenge(solution, url, t0);
    return yield fetchText(url);
  });
}
function extractTranslatorAndId(html, mediaType) {
  const postIdMatch = html.match(/<input[^>]*id="post_id"[^>]*value="(\d+)"/) || html.match(/data-id="(\d+)"/);
  const postId = postIdMatch ? postIdMatch[1] : null;
  if (html.includes('data-translator_id="238"')) {
    return { postId, translatorId: "238" };
  }
  const fn = mediaType === "tv" ? "initCDNSeriesEvents" : "initCDNMoviesEvents";
  const re = new RegExp(`sof\\.tv\\.${fn}\\(\\s*(\\d+)\\s*,\\s*(\\d+)`);
  const m = html.match(re);
  if (m) {
    return { postId: m[1], translatorId: m[2] };
  }
  const listMatch = html.match(/data-translator_id="(\d+)"/);
  if (listMatch) {
    return { postId, translatorId: listMatch[1] };
  }
  return { postId, translatorId: null };
}
function deobfuscateStreams(obfuscated) {
  if (!obfuscated) return [];
  let stripped = obfuscated.replace("#h", "").split("//_//").join("");
  const trashChars = ["@", "#", "!", "^", "$"];
  const trashSet = /* @__PURE__ */ new Set();
  for (let len = 2; len <= 3; len++) {
    const buckets = Array.from({ length: len }, () => trashChars);
    let combos = [""];
    for (const bucket of buckets) {
      const next = [];
      for (const prefix of combos) {
        for (const c of bucket) {
          next.push(prefix + c);
        }
      }
      combos = next;
    }
    for (const combo of combos) {
      trashSet.add(encodeBase64(combo));
    }
  }
  const sortedTrash = Array.from(trashSet).sort((a, b) => b.length - a.length);
  for (const t of sortedTrash) {
    stripped = stripped.split(t).join("");
  }
  let decoded;
  try {
    decoded = decodeBase64Utf8(stripped);
  } catch (e) {
    decoded = stripped;
  }
  const out = [];
  const re = /\[([^\]]+)\]([^,]+)/g;
  let m;
  while ((m = re.exec(decoded)) !== null) {
    const quality = m[1].trim();
    const urls = m[2].split(/\s+or\s+/);
    for (const url of urls) {
      const trimmed = url.trim();
      if (trimmed.startsWith("http")) {
        out.push({ quality, url: trimmed });
      }
    }
  }
  return out;
}
function parseSubtitles(obfuscated) {
  if (!obfuscated) return [];
  const stripped = obfuscated.replace("#h", "").split("//_//").join("");
  let decoded;
  try {
    decoded = decodeBase64Utf8(stripped);
  } catch (e) {
    decoded = stripped;
  }
  const out = [];
  const re = /\[([^\]]+)\](https?:\/\/\S+?)(?=,\[|$)/g;
  let m;
  while ((m = re.exec(decoded)) !== null) {
    out.push({ language: m[1].trim(), url: m[2] });
  }
  return out;
}
function getStreams(tmdbId, mediaType, season, episode) {
  return __async(this, null, function* () {
    const tmdb = yield fetchTmdb(tmdbId, mediaType);
    const title = tmdb.title;
    const year = tmdb.year;
    if (!title) return [];
    const candidates = yield searchHdrezka(title, year, mediaType);
    if (candidates.length === 0) return [];
    const best = candidates[0];
    const pageUrl = best.url.startsWith("http") ? best.url : `${BASE_URL}${best.url.startsWith("/") ? "" : "/"}${best.url}`;
    const html = yield fetchPage(pageUrl);
    const { translatorId } = extractTranslatorAndId(html, mediaType);
    if (!translatorId) return [];
    const postId = best.id || extractTranslatorAndId(html, mediaType).postId;
    const favs = generateFavs();
    const form = {
      id: postId,
      translator_id: translatorId,
      favs,
      action: mediaType === "tv" ? "get_stream" : "get_movie"
    };
    if (mediaType === "tv") {
      form.season = season;
      form.episode = episode;
    }
    let cdn;
    try {
      cdn = yield postForm("/ajax/get_cdn_series/", form);
    } catch (e) {
      console.error("[HDRezka] CDN POST failed:", e.message);
      return [];
    }
    if (!cdn.success || !cdn.url) return [];
    const streams = deobfuscateStreams(cdn.url);
    const subs = parseSubtitles(cdn.subtitle);
    const cleanSubs = subs.map((s) => ({
      id: s.url,
      language: s.language,
      url: s.url,
      type: "vtt",
      hasCorsRestrictions: false
    }));
    return streams.filter((s) => s.url && s.url !== "null").map((s) => ({
      name: "HDRezka",
      title: formatStreamTitle(title, year, mediaType, season, episode, s.quality),
      url: s.url,
      quality: s.quality,
      headers: {
        Referer: pageUrl,
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36"
      },
      subtitles: cleanSubs.length > 0 ? cleanSubs : void 0,
      type: "direct"
    }));
  });
}
function formatStreamTitle(title, year, mediaType, season, episode, quality) {
  const base = `${title}${year ? ` (${year})` : ""} ${quality}`;
  if (mediaType === "tv") {
    return `${base} S${season}E${episode}`;
  }
  return base;
}
function fetchTmdb(tmdbId, mediaType) {
  return __async(this, null, function* () {
    const apiKey = "439c478a771f35c05022f9feabcca01c";
    const path = mediaType === "tv" ? "tv" : "movie";
    const url = `https://api.themoviedb.org/3/${path}/${tmdbId}?api_key=${apiKey}`;
    try {
      const data = yield fetch(url).then((r) => {
        if (!r.ok) throw new Error(`TMDB ${r.status}`);
        return r.json();
      });
      const title = mediaType === "tv" ? data.name : data.title;
      const date = mediaType === "tv" ? data.first_air_date : data.release_date;
      const year = date ? parseInt(date.substring(0, 4), 10) : null;
      return { title, year };
    } catch (e) {
      console.error("[HDRezka] TMDB lookup failed:", e.message);
      return { title: null, year: null };
    }
  });
}
function encodeBase64(str) {
  if (typeof btoa !== "undefined") {
    return btoa(str);
  }
  return Buffer.from(str, "utf-8").toString("base64");
}
function decodeBase64Utf8(str) {
  let raw;
  if (typeof atob !== "undefined") {
    raw = atob(str);
  } else {
    raw = Buffer.from(str, "base64").toString("binary");
  }
  if (typeof TextDecoder !== "undefined") {
    const bytes = new Uint8Array(raw.length);
    for (let i = 0; i < raw.length; i++) bytes[i] = raw.charCodeAt(i);
    return new TextDecoder("utf-8").decode(bytes);
  }
  return raw;
}

// src/hdrezka/index.js
function getStreams2(tmdbId, mediaType, season, episode) {
  return __async(this, null, function* () {
    try {
      console.log(`[HDRezka] ${mediaType} ${tmdbId} S${season != null ? season : "-"}E${episode != null ? episode : "-"}`);
      return yield getStreams(tmdbId, mediaType, season, episode);
    } catch (error) {
      console.error("[HDRezka] getStreams failed:", error.message);
      return [];
    }
  });
}
