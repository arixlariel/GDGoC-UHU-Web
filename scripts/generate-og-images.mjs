#!/usr/bin/env node
/**
 * Generador automático de tarjetas Open Graph (1200x630 PNG optimizado < 120 KB para WhatsApp/LinkedIn):
 *  - Portada oficial gdguhu.com -> public/og/hub.png
 *  - Plataforma CTF Cyber Trainer -> public/og/cybertrainer.png
 *
 * Usa Satori + @resvg/resvg-js + @fontsource/plus-jakarta-sans + sharp (100 % offline y determinista).
 */

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import satori from 'satori';
import { Resvg } from '@resvg/resvg-js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, '..');
const publicDir = path.join(rootDir, 'public');
const ogDir = path.join(publicDir, 'og');

const OG_WIDTH = 1200;
const OG_HEIGHT = 630;

function h(type, props, ...children) {
  const flat = children.flat().filter((c) => c !== null && c !== undefined && c !== false);
  return {
    type,
    props: {
      ...(props || {}),
      ...(flat.length === 1 ? { children: flat[0] } : flat.length > 1 ? { children: flat } : {}),
    },
  };
}

function loadFonts() {
  const fontDir = path.join(rootDir, 'node_modules', '@fontsource', 'plus-jakarta-sans', 'files');
  return [400, 600, 700, 800].map((weight) => ({
    name: 'Plus Jakarta Sans',
    data: fs.readFileSync(path.join(fontDir, `plus-jakarta-sans-latin-${weight}-normal.woff`)),
    weight,
    style: 'normal',
  }));
}

let sharpModule = null;
async function loadSharp() {
  if (sharpModule !== null) return sharpModule;
  try {
    const mod = await import('sharp');
    sharpModule = mod.default || mod;
  } catch {
    sharpModule = false;
  }
  return sharpModule;
}

async function logoToDataUri(absPath) {
  if (!fs.existsSync(absPath)) return null;
  const sharp = await loadSharp();
  let buf;
  let mime = 'image/png';
  if (sharp) {
    buf = await sharp(absPath)
      .resize(512, 512, { fit: 'inside', withoutEnlargement: true })
      .png({ compressionLevel: 8 })
      .toBuffer();
  } else {
    buf = fs.readFileSync(absPath);
    mime = /\.jpe?g$/i.test(absPath) ? 'image/jpeg' : 'image/png';
  }
  return `data:${mime};base64,${buf.toString('base64')}`;
}

async function renderOptimizedPng(vnode, fonts, outPath) {
  const svg = await satori(vnode, { width: OG_WIDTH, height: OG_HEIGHT, fonts });
  const resvg = new Resvg(svg, { fitTo: { mode: 'width', value: OG_WIDTH } });
  let pngBuffer = resvg.render().asPng();
  const sharp = await loadSharp();
  if (sharp) {
    pngBuffer = await sharp(pngBuffer)
      .png({ palette: true, quality: 92, compressionLevel: 9, effort: 9 })
      .toBuffer();
  }
  fs.writeFileSync(outPath, pngBuffer);
}

function buildHubCard(logoUri) {
  const stripColors = ['#4285F4', '#EA4335', '#FBBC04', '#34A853'];
  return h(
    'div',
    {
      style: {
        width: 1200,
        height: 630,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundImage: 'linear-gradient(135deg, #4285F4 0%, #EA4335 33%, #FBBC04 66%, #34A853 100%)',
        fontFamily: 'Plus Jakarta Sans',
      },
    },
    h(
      'div',
      {
        style: {
          width: 1168,
          height: 598,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#FFFFFF',
          borderRadius: 26,
          border: '2px solid #DADCE0',
        },
      },
      h(
        'div',
        {
          style: {
            width: 1084,
            height: 526,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          },
        },
        h(
          'div',
          { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' } },
          h(
            'div',
            {
              style: {
                display: 'flex',
                padding: '10px 22px',
                borderRadius: '999px',
                backgroundColor: '#E8F0FE',
                border: '1.5px solid #D2E3FC',
                color: '#1967D2',
                fontSize: '20px',
                fontWeight: 800,
              },
            },
            'Portal Oficial · GDG on Campus'
          ),
          h('div', { style: { display: 'flex', fontSize: '24px', fontWeight: 800, color: '#1967D2' } }, 'gdguhu.com')
        ),
        h(
          'div',
          { style: { display: 'flex', alignItems: 'center', gap: '48px', width: '100%' } },
          logoUri
            ? h(
                'div',
                {
                  style: {
                    display: 'flex',
                    width: '228px',
                    height: '228px',
                    borderRadius: '38px',
                    overflow: 'hidden',
                    border: '2px solid #DADCE0',
                    backgroundColor: '#FFFFFF',
                    flexShrink: 0,
                  },
                },
                h('img', { src: logoUri, width: 228, height: 228, style: { width: '228px', height: '228px', objectFit: 'cover' } })
              )
            : null,
          h(
            'div',
            { style: { display: 'flex', flexDirection: 'column', flex: 1, gap: '16px' } },
            h(
              'div',
              {
                style: {
                  display: 'flex',
                  fontSize: '74px',
                  fontWeight: 800,
                  color: '#202124',
                  lineHeight: 1.06,
                  letterSpacing: '-0.025em',
                },
              },
              'GDGoC UHU'
            ),
            h(
              'div',
              { style: { display: 'flex', fontSize: '30px', fontWeight: 600, color: '#5F6368', lineHeight: 1.34 } },
              'Google Developer Group on Campus · Universidad de Huelva'
            )
          )
        ),
        h(
          'div',
          {
            style: {
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              borderTop: '2px solid #DADCE0',
              paddingTop: '22px',
            },
          },
          h(
            'div',
            { style: { display: 'flex', gap: '14px', alignItems: 'center' } },
            ...['Cyber Trainer', 'Open Badges', 'Eventos y Talleres'].map((label) =>
              h(
                'div',
                {
                  style: {
                    display: 'flex',
                    padding: '9px 20px',
                    borderRadius: '999px',
                    backgroundColor: '#F8F9FA',
                    border: '1.5px solid #DADCE0',
                    color: '#202124',
                    fontSize: '19px',
                    fontWeight: 700,
                  },
                },
                label
              )
            )
          ),
          h(
            'div',
            { style: { display: 'flex', gap: '10px', alignItems: 'center' } },
            ...stripColors.map((col) =>
              h('div', { style: { width: '16px', height: '16px', borderRadius: '999px', backgroundColor: col } })
            )
          )
        )
      )
    )
  );
}

function buildCyberTrainerCard(logoUri) {
  const neonDots = ['#00F0FF', '#FF007F', '#FFE600', '#00FF66'];
  return h(
    'div',
    {
      style: {
        width: 1200,
        height: 630,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundImage: 'linear-gradient(135deg, #00F0FF 0%, #FF007F 42%, #FFE600 72%, #00FF66 100%)',
        fontFamily: 'Plus Jakarta Sans',
      },
    },
    h(
      'div',
      {
        style: {
          width: 1168,
          height: 598,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#070B19',
          backgroundImage: 'linear-gradient(155deg, #091026 0%, #05070F 60%, #0D142E 100%)',
          borderRadius: 26,
          border: '2px solid rgba(0, 240, 255, 0.45)',
        },
      },
      h(
        'div',
        {
          style: {
            width: 1084,
            height: 526,
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
          },
        },
        h(
          'div',
          { style: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', width: '100%' } },
          h(
            'div',
            {
              style: {
                display: 'flex',
                padding: '10px 22px',
                borderRadius: '999px',
                backgroundColor: 'rgba(0, 240, 255, 0.14)',
                border: '1.5px solid rgba(0, 240, 255, 0.5)',
                color: '#00F0FF',
                fontSize: '20px',
                fontWeight: 800,
              },
            },
            'Plataforma CTF · Ciberseguridad'
          ),
          h('div', { style: { display: 'flex', fontSize: '23px', fontWeight: 800, color: '#00F0FF' } }, 'gdguhu.com/cybertrainer')
        ),
        h(
          'div',
          { style: { display: 'flex', alignItems: 'center', gap: '48px', width: '100%' } },
          logoUri
            ? h(
                'div',
                {
                  style: {
                    display: 'flex',
                    width: '224px',
                    height: '224px',
                    borderRadius: '38px',
                    overflow: 'hidden',
                    border: '2.5px solid rgba(0, 240, 255, 0.5)',
                    backgroundColor: '#FFFFFF',
                    flexShrink: 0,
                  },
                },
                h('img', { src: logoUri, width: 224, height: 224, style: { width: '224px', height: '224px', objectFit: 'cover' } })
              )
            : null,
          h(
            'div',
            { style: { display: 'flex', flexDirection: 'column', flex: 1, gap: '16px' } },
            h(
              'div',
              {
                style: {
                  display: 'flex',
                  fontSize: '68px',
                  fontWeight: 800,
                  color: '#F0F9FF',
                  lineHeight: 1.08,
                  letterSpacing: '-0.025em',
                },
              },
              'Cyber Trainer'
            ),
            h(
              'div',
              { style: { display: 'flex', fontSize: '29px', fontWeight: 600, color: '#A8BBD0', lineHeight: 1.35 } },
              'Entrenamiento y competición CTF de GDG on Campus Universidad de Huelva'
            )
          )
        ),
        h(
          'div',
          {
            style: {
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              width: '100%',
              borderTop: '2px solid rgba(0, 240, 255, 0.35)',
              paddingTop: '22px',
            },
          },
          h(
            'div',
            { style: { display: 'flex', gap: '12px', alignItems: 'center' } },
            ...['Web', 'Criptografía', 'Forense', 'Reversing', 'Misc'].map((label) =>
              h(
                'div',
                {
                  style: {
                    display: 'flex',
                    padding: '9px 18px',
                    borderRadius: '999px',
                    backgroundColor: 'rgba(13, 22, 48, 0.92)',
                    border: '1.5px solid rgba(0, 240, 255, 0.4)',
                    color: '#E2F1FF',
                    fontSize: '18px',
                    fontWeight: 700,
                  },
                },
                label
              )
            )
          ),
          h(
            'div',
            { style: { display: 'flex', gap: '10px', alignItems: 'center' } },
            ...neonDots.map((col) =>
              h('div', { style: { width: '16px', height: '16px', borderRadius: '999px', backgroundColor: col } })
            )
          )
        )
      )
    )
  );
}

async function main() {
  fs.mkdirSync(ogDir, { recursive: true });
  const fonts = loadFonts();
  const logoUri = await logoToDataUri(path.join(publicDir, 'images', 'gdgoc-uhu-logo.jpg'));

  await renderOptimizedPng(buildHubCard(logoUri), fonts, path.join(ogDir, 'hub.png'));
  await renderOptimizedPng(buildCyberTrainerCard(logoUri), fonts, path.join(ogDir, 'cybertrainer.png'));
  console.log('[og] Generadas tarjetas Open Graph 1200x630 optimizadas: public/og/hub.png y public/og/cybertrainer.png');
}

main().catch((err) => {
  console.error('[og] Error generando tarjetas Open Graph:', err);
  process.exit(1);
});
