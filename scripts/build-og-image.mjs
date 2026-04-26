// OG 기본 이미지 생성: 1200x630, 다크 캔버스에 logo.svg + 태그라인
// 실행: node scripts/build-og-image.mjs
import sharp from 'sharp';
import fs from 'node:fs/promises';
import path from 'node:path';

const ROOT = path.resolve(process.cwd());
const LOGO_PATH = path.join(ROOT, 'public', 'logo.svg');
const OUT_PATH = path.join(ROOT, 'public', 'og-default.png');

const W = 1200;
const H = 630;
const BG = '#0D0D0D';
const FG = '#F0F0F0';
const SUBTLE = '#A0A0A0';

const logoSvg = await fs.readFile(LOGO_PATH, 'utf8');
// logo.svg 의 path 전체를 추출 (viewBox 0 0 72.49 19.83)
const inner = logoSvg
  .replace(/<\?xml[^?]*\?>/g, '')
  .replace(/<svg[^>]*>/, '')
  .replace(/<\/svg>/, '')
  .replace(/class="cls-1"/g, `fill="${FG}"`)
  .replace(/<style>[\s\S]*?<\/style>/g, '')
  .replace(/<defs>[\s\S]*?<\/defs>/g, '');

const LOGO_W = 520;
const LOGO_H = (LOGO_W * 19.83) / 72.49; // ≈ 142.27
const LOGO_X = (W - LOGO_W) / 2;
const LOGO_Y = (H - LOGO_H) / 2 - 30;

const composite = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}">
  <rect width="${W}" height="${H}" fill="${BG}"/>
  <g transform="translate(${LOGO_X} ${LOGO_Y}) scale(${LOGO_W / 72.49})">
    ${inner}
  </g>
  <text x="${W / 2}" y="${LOGO_Y + LOGO_H + 56}" text-anchor="middle"
    font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif"
    font-size="26" fill="${SUBTLE}" letter-spacing="0.5">
    유튜브 플레이리스트 큐레이션 아카이브
  </text>
</svg>`;

await sharp(Buffer.from(composite))
  .png({ compressionLevel: 9 })
  .toFile(OUT_PATH);

const stat = await fs.stat(OUT_PATH);
console.log(`✓ ${path.relative(ROOT, OUT_PATH)} (${(stat.size / 1024).toFixed(1)} KB, ${W}×${H})`);
