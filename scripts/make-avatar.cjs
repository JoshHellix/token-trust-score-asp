// Minimal PNG generator (no deps) — draws a 256x256 TokenGuard avatar.
const zlib = require("zlib");
const fs = require("fs");

const W = 256, H = 256;
const px = Buffer.alloc(W * H * 3);

function set(x, y, r, g, b) {
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    const i = (y * W + x) * 3;
    px[i] = r; px[i + 1] = g; px[i + 2] = b;
}

// Background gradient (dark blue)
for (let y = 0; y < H; y++) {
    for (let x = 0; x < W; x++) {
        const t = (x + y) / (W + H);
        set(x, y, 11 + t * 20, 31 + t * 30, 58 + t * 60);
    }
}

// Cyan ring (circle radius 78 at center 128,128)
const cx = 128, cy = 128, R = 78;
for (let a = 0; a < 360; a += 0.5) {
    const rad = (a * Math.PI) / 180;
    for (let w = -5; w <= 5; w++) {
        const r = R + w;
        const x = Math.round(cx + r * Math.cos(rad));
        const y = Math.round(cy + r * Math.sin(rad));
        set(x, y, 34, 211, 238);
    }
}

// Checkmark (cyan)
function line(x0, y0, x1, y1) {
    const dx = Math.abs(x1 - x0), dy = Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1, sy = y0 < y1 ? 1 : -1;
    let err = dx - dy;
    while (true) {
        for (let w = -4; w <= 4; w++) {
            const nx = Math.round(x0 + (y1 - y0 === 0 ? 0 : w * sy));
            const ny = Math.round(y0 + (x1 - x0 === 0 ? 0 : w * sx));
            set(nx, ny, 34, 211, 238);
        }
        if (x0 === x1 && y0 === y1) break;
        const e2 = 2 * err;
        if (e2 > -dy) { err -= dy; x0 += sx; }
        if (e2 < dx) { err += dx; y0 += sy; }
    }
}
line(92, 130, 118, 156);
line(118, 156, 168, 100);

// PNG encoding
function crc32(buf) {
    let c, crc = 0xffffffff;
    for (let i = 0; i < buf.length; i++) {
        c = (crc ^ buf[i]) & 0xff;
        for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
        crc = (crc >>> 8) ^ c;
    }
    return (crc ^ 0xffffffff) >>> 0;
}
function chunk(type, data) {
    const len = Buffer.alloc(4); len.writeUInt32BE(data.length, 0);
    const t = Buffer.from(type, "ascii");
    const crc = Buffer.alloc(4); crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
    return Buffer.concat([len, t, data, crc]);
}
const sig = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);
const ihdr = Buffer.alloc(13);
ihdr.writeUInt32BE(W, 0); ihdr.writeUInt32BE(H, 4);
ihdr[8] = 8; ihdr[9] = 2; // 8-bit, RGB
const raw = Buffer.alloc(H * (W * 3 + 1));
for (let y = 0; y < H; y++) {
    raw[y * (W * 3 + 1)] = 0; // filter none
    px.copy(raw, y * (W * 3 + 1) + 1, y * W * 3, (y + 1) * W * 3);
}
const idat = zlib.deflateSync(raw);
const png = Buffer.concat([sig, chunk("IHDR", ihdr), chunk("IDAT", idat), chunk("IEND", Buffer.alloc(0))]);
fs.writeFileSync("c:\\Users\\dell\\Projects\\okx-agent\\scripts\\avatar.png", png);
console.log("avatar.png written:", png.length, "bytes");
