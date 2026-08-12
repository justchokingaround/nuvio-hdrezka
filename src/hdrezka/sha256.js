/**
 * Pure-JavaScript SHA-256 implementation.
 *
 * Nuvio's Hermes runtime does not provide crypto.subtle, so this module
 * has no external dependencies and works in Node, browsers, and React Native.
 */

const K = new Uint32Array([
    0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1,
    0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
    0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786,
    0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
    0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147,
    0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
    0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b,
    0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
    0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a,
    0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
    0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2,
]);

function rotr(x, n) {
    return (x >>> n) | (x << (32 - n));
}

function ch(x, y, z) {
    return (x & y) ^ (~x & z);
}

function maj(x, y, z) {
    return (x & y) ^ (x & z) ^ (y & z);
}

function ep0(x) {
    return rotr(x, 2) ^ rotr(x, 13) ^ rotr(x, 22);
}

function ep1(x) {
    return rotr(x, 6) ^ rotr(x, 11) ^ rotr(x, 25);
}

function sig0(x) {
    return rotr(x, 7) ^ rotr(x, 18) ^ (x >>> 3);
}

function sig1(x) {
    return rotr(x, 17) ^ rotr(x, 19) ^ (x >>> 10);
}

function utf8ToBytes(str) {
    const out = [];
    for (let i = 0; i < str.length; i++) {
        let c = str.charCodeAt(i);
        if (c < 0x80) {
            out.push(c);
        } else if (c < 0x800) {
            out.push(0xc0 | (c >> 6), 0x80 | (c & 0x3f));
        } else if (c < 0xd800 || c >= 0xe000) {
            out.push(
                0xe0 | (c >> 12),
                0x80 | ((c >> 6) & 0x3f),
                0x80 | (c & 0x3f),
            );
        } else {
            // surrogate pair
            c = 0x10000 + (((c & 0x3ff) << 10) | (str.charCodeAt(++i) & 0x3ff));
            out.push(
                0xf0 | (c >> 18),
                0x80 | ((c >> 12) & 0x3f),
                0x80 | ((c >> 6) & 0x3f),
                0x80 | (c & 0x3f),
            );
        }
    }
    return new Uint8Array(out);
}

export function sha256(message) {
    const msg = typeof message === 'string' ? utf8ToBytes(message) : message;
    const len = msg.length * 8;

    // Padding: message || 0x80 || zeros || 64-bit bit-length
    const totalBits = len + 65;
    const paddedLen = ((Math.ceil(totalBits / 512) * 512) / 8);
    const padded = new Uint8Array(paddedLen);
    padded.set(msg);
    padded[msg.length] = 0x80;

    const view = new DataView(padded.buffer);
    view.setUint32(paddedLen - 8, Math.floor(len / 0x100000000), false);
    view.setUint32(paddedLen - 4, len, false);

    const H = new Int32Array([
        0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a,
        0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19,
    ]);

    const W = new Uint32Array(64);
    const chunk = new Uint8Array(64);

    for (let offset = 0; offset < paddedLen; offset += 64) {
        chunk.set(padded.subarray(offset, offset + 64));

        for (let i = 0; i < 16; i++) {
            W[i] =
                (chunk[i * 4] << 24) |
                (chunk[i * 4 + 1] << 16) |
                (chunk[i * 4 + 2] << 8) |
                chunk[i * 4 + 3];
        }

        for (let i = 16; i < 64; i++) {
            W[i] = (sig1(W[i - 2]) + W[i - 7] + sig0(W[i - 15]) + W[i - 16]) | 0;
        }

        let a = H[0];
        let b = H[1];
        let c = H[2];
        let d = H[3];
        let e = H[4];
        let f = H[5];
        let g = H[6];
        let h = H[7];

        for (let i = 0; i < 64; i++) {
            const T1 = (h + ep1(e) + ch(e, f, g) + K[i] + W[i]) | 0;
            const T2 = (ep0(a) + maj(a, b, c)) | 0;
            h = g;
            g = f;
            f = e;
            e = (d + T1) | 0;
            d = c;
            c = b;
            b = a;
            a = (T1 + T2) | 0;
        }

        H[0] = (H[0] + a) | 0;
        H[1] = (H[1] + b) | 0;
        H[2] = (H[2] + c) | 0;
        H[3] = (H[3] + d) | 0;
        H[4] = (H[4] + e) | 0;
        H[5] = (H[5] + f) | 0;
        H[6] = (H[6] + g) | 0;
        H[7] = (H[7] + h) | 0;
    }

    const hash = new Uint8Array(32);
    for (let i = 0; i < 8; i++) {
        hash[i * 4] = (H[i] >>> 24) & 0xff;
        hash[i * 4 + 1] = (H[i] >>> 16) & 0xff;
        hash[i * 4 + 2] = (H[i] >>> 8) & 0xff;
        hash[i * 4 + 3] = H[i] & 0xff;
    }

    return hash;
}

export function sha256Hex(message) {
    const bytes = sha256(message);
    let hex = '';
    for (let i = 0; i < bytes.length; i++) {
        hex += bytes[i].toString(16).padStart(2, '0');
    }
    return hex;
}
