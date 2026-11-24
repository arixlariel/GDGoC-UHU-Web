#!/usr/bin/env node

/**
 * GDGoC UHU — Monitor automático de disponibilidad (Uptime) con alertas por Resend
 *
 * Comprueba periódicamente las rutas críticas de gdguhu.com con reintentos anti-falsos-positivos
 * y envía alertas por correo (y confirmación de recuperación) sin spam mediante estado persistido.
 *
 * Uso:
 *   RESEND_API_KEY=... node scripts/check-uptime.mjs [--test-email]
 */

import fs from 'node:fs';
import path from 'node:path';

const STATE_PATH = path.resolve(process.env.UPTIME_STATE_PATH || '.uptime-state/state.json');
const RESEND_API_KEY = (process.env.RESEND_API_KEY || '').trim();
const ALERT_TO = (process.env.ALERT_TO || 'gdgoc.huelva@gmail.com').trim();
const ALERT_FROM = (process.env.ALERT_FROM || 'GDGoC UHU Monitor <monitor@gdguhu.com>').trim();
const SEND_TEST_EMAIL =
  process.argv.includes('--test-email') || process.env.SEND_TEST_EMAIL === 'true';

const MAX_ATTEMPTS = 3;
const RETRY_DELAY_MS = 8000;
const REMINDER_INTERVAL_MS = 6 * 60 * 60 * 1000; // Recordatorio como máximo cada 6 horas

const CHECKS = [
  {
    id: 'hub',
    name: 'Portal web (gdguhu.com)',
    url: 'https://gdguhu.com/',
    timeoutMs: 12000,
    mustContain: 'GDG on Campus',
  },
  {
    id: 'openbadges',
    name: 'Portal Open Badges (/openbadges/)',
    url: 'https://gdguhu.com/openbadges/',
    timeoutMs: 12000,
    mustContain: 'Open Badges',
  },
  {
    id: 'did',
    name: 'Identidad DID (did.json)',
    url: 'https://gdguhu.com/.well-known/did.json',
    timeoutMs: 12000,
    mustContain: 'did:web:gdguhu.com',
  },
  {
    id: 'revocations',
    name: 'Lista de revocación OB3 (revocations.json)',
    url: 'https://gdguhu.com/api/badges/status/revocations.json',
    timeoutMs: 12000,
    mustContain: 'BitstringStatusListCredential',
  },
  {
    id: 'cybertrainer',
    name: 'Cyber Trainer (/cybertrainer/)',
    url: 'https://gdguhu.com/cybertrainer/',
    timeoutMs: 18000,
    mustContain: 'Cyber',
  },
];

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function loadPrevState() {
  try {
    if (fs.existsSync(STATE_PATH)) {
      const parsed = JSON.parse(fs.readFileSync(STATE_PATH, 'utf-8'));
      if (parsed && typeof parsed === 'object') {
        return {
          status: parsed.status === 'down' ? 'down' : 'up',
          downIds: Array.isArray(parsed.downIds) ? parsed.downIds : [],
          incidentStartedAt: parsed.incidentStartedAt || null,
          lastAlertSentAt: parsed.lastAlertSentAt || null,
        };
      }
    }
  } catch {
    // empezar limpio si el archivo de caché está corrupto
  }
  return { status: 'up', downIds: [], incidentStartedAt: null, lastAlertSentAt: null };
}

function saveState(state) {
  fs.mkdirSync(path.dirname(STATE_PATH), { recursive: true });
  fs.writeFileSync(STATE_PATH, JSON.stringify(state, null, 2) + '\n', 'utf-8');
}

async function checkOnce(target) {
  const started = Date.now();
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), target.timeoutMs);

  try {
    const resp = await fetch(target.url, {
      method: 'GET',
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'User-Agent': 'GDGoC-UHU-UptimeMonitor/1.0 (+https://gdguhu.com)',
        'Cache-Control': 'no-cache',
      },
    });
    const text = await resp.text();
    const latencyMs = Date.now() - started;

    if (resp.status !== 200) {
      return {
        ok: false,
        status: resp.status,
        latencyMs,
        detail: `HTTP ${resp.status} (esperado 200)`,
      };
    }

    if (target.mustContain && !text.includes(target.mustContain)) {
      return {
        ok: false,
        status: resp.status,
        latencyMs,
        detail: `HTTP 200 pero falta contenido esperado ("${target.mustContain}")`,
      };
    }

    return { ok: true, status: resp.status, latencyMs, detail: 'OK' };
  } catch (err) {
    const latencyMs = Date.now() - started;
    const msg = err?.name === 'AbortError' ? `Timeout > ${target.timeoutMs} ms` : String(err?.message || err);
    return { ok: false, status: 0, latencyMs, detail: msg };
  } finally {
    clearTimeout(timer);
  }
}

async function checkWithRetries(target) {
  let lastResult = null;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt += 1) {
    lastResult = await checkOnce(target);
    if (lastResult.ok) {
      return { ...target, ...lastResult, attempts: attempt };
    }
    if (attempt < MAX_ATTEMPTS) {
      await sleep(RETRY_DELAY_MS);
    }
  }
  return { ...target, ...lastResult, attempts: MAX_ATTEMPTS };
}

function formatDuration(startIso, endDate) {
  if (!startIso) return 'desconocida';
  const diffSec = Math.max(0, Math.round((endDate.getTime() - new Date(startIso).getTime()) / 1000));
  const hours = Math.floor(diffSec / 3600);
  const mins = Math.floor((diffSec % 3600) / 60);
  if (hours > 0) return `${hours}h ${mins}m`;
  if (mins > 0) return `${mins} min`;
  return `${diffSec} s`;
}

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function buildEmailHtml({ kind, results, checkedAtMadrid, durationText }) {
  const accent = kind === 'down' ? '#EA4335' : kind === 'recovered' ? '#34A853' : '#4285F4';
  const heading =
    kind === 'down'
      ? '⚠️ Alerta de caída detectada en gdguhu.com'
      : kind === 'recovered'
        ? '✅ Servicios de gdguhu.com recuperados'
        : 'ℹ️ Informe de prueba · Monitor gdguhu.com';
  const subtitle =
    kind === 'down'
      ? 'Uno o más servicios críticos fallaron tras 3 comprobaciones consecutivas.'
      : kind === 'recovered'
        ? `Todos los servicios vuelven a responder HTTP 200 (duración aproximada del incidente: ${escapeHtml(durationText)}).`
        : 'Comprobación manual solicitada desde GitHub Actions.';

  const rows = results
    .map((r) => {
      const badgeColor = r.ok ? '#137333' : '#C5221F';
      const badgeBg = r.ok ? '#E6F4EA' : '#FCE8E6';
      const label = r.ok ? `OK (${r.status})` : 'CAÍDO';
      return `
        <tr>
          <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;font-weight:600;color:#202124;">
            ${escapeHtml(r.name)}<br>
            <span style="font-weight:400;font-size:12px;color:#5f6368;">${escapeHtml(r.url)}</span>
          </td>
          <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;text-align:center;">
            <span style="display:inline-block;padding:3px 10px;border-radius:999px;font-size:12px;font-weight:700;background:${badgeBg};color:${badgeColor};">${escapeHtml(label)}</span>
          </td>
          <td style="padding:10px 12px;border-bottom:1px solid #e2e8f0;font-size:12px;color:#475569;font-family:monospace;">
            ${r.latencyMs} ms · ${escapeHtml(r.detail)}
          </td>
        </tr>`;
    })
    .join('');

  return `
<!doctype html>
<html lang="es">
<body style="margin:0;padding:24px;background:#f8fafc;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;color:#202124;">
  <div style="max-width:640px;margin:0 auto;background:#ffffff;border:1px solid #dadce0;border-radius:16px;overflow:hidden;">
    <div style="height:6px;background:${accent};"></div>
    <div style="padding:24px;">
      <h1 style="margin:0 0 8px;font-size:20px;color:#202124;">${heading}</h1>
      <p style="margin:0 0 18px;font-size:14px;color:#475569;line-height:1.5;">${subtitle}</p>
      <table style="width:100%;border-collapse:collapse;font-size:13px;">
        <thead>
          <tr style="background:#f8f9fa;text-align:left;">
            <th style="padding:8px 12px;border-bottom:1px solid #dadce0;color:#5f6368;">Servicio</th>
            <th style="padding:8px 12px;border-bottom:1px solid #dadce0;color:#5f6368;text-align:center;">Estado</th>
            <th style="padding:8px 12px;border-bottom:1px solid #dadce0;color:#5f6368;">Detalle</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      <p style="margin:18px 0 0;font-size:12px;color:#5f6368;">
        Comprobado el ${escapeHtml(checkedAtMadrid)} (hora de España) · GitHub Actions Uptime Monitor · GDGoC UHU
      </p>
    </div>
  </div>
</body>
</html>`;
}

async function sendResendEmail({ subject, html, text }) {
  if (!RESEND_API_KEY) {
    console.warn('⚠️ RESEND_API_KEY no configurada; no se envió correo de alerta.');
    return false;
  }

  const resp = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: ALERT_FROM,
      to: [ALERT_TO],
      reply_to: ALERT_TO,
      subject,
      html,
      text,
    }),
  });

  if (!resp.ok) {
    const errText = await resp.text();
    throw new Error(`Resend HTTP ${resp.status}: ${errText.slice(0, 300)}`);
  }

  const data = await resp.json();
  console.log(`📧 Correo enviado vía Resend a ${ALERT_TO} (id=${data.id || 'ok'})`);
  return true;
}

async function main() {
  const now = new Date();
  const nowIso = now.toISOString();
  const checkedAtMadrid = now.toLocaleString('es-ES', { timeZone: 'Europe/Madrid' });
  const prev = loadPrevState();

  const results = await Promise.all(CHECKS.map((target) => checkWithRetries(target)));

  console.log(`🔎 Comprobación Uptime gdguhu.com (${checkedAtMadrid}):`);
  for (const r of results) {
    const icon = r.ok ? '✅' : '❌';
    console.log(`  ${icon} ${r.name}: ${r.detail} (${r.latencyMs} ms, intentos=${r.attempts})`);
  }

  const failed = results.filter((r) => !r.ok);
  const downIds = failed.map((r) => r.id).sort();
  const plainSummary = results
    .map((r) => `- ${r.name} (${r.url}): ${r.ok ? `OK ${r.status}` : `CAÍDO — ${r.detail}`} (${r.latencyMs} ms)`)
    .join('\n');

  if (failed.length > 0) {
    const sameDownSet =
      prev.status === 'down' &&
      prev.downIds.length === downIds.length &&
      prev.downIds.every((id, i) => id === downIds[i]);

    const msSinceLastAlert = prev.lastAlertSentAt
      ? now.getTime() - new Date(prev.lastAlertSentAt).getTime()
      : Infinity;

    const shouldNotify = !sameDownSet || msSinceLastAlert >= REMINDER_INTERVAL_MS || SEND_TEST_EMAIL;
    const incidentStartedAt = prev.status === 'down' && prev.incidentStartedAt ? prev.incidentStartedAt : nowIso;
    let lastAlertSentAt = prev.lastAlertSentAt;

    if (shouldNotify) {
      const names = failed.map((f) => f.id).join(', ');
      await sendResendEmail({
        subject: `[GDGoC UHU] ⚠️ Caída detectada en gdguhu.com (${names})`,
        html: buildEmailHtml({ kind: 'down', results, checkedAtMadrid, durationText: '' }),
        text: `Alerta de caída en gdguhu.com (${checkedAtMadrid}):\n\n${plainSummary}\n`,
      });
      lastAlertSentAt = nowIso;
    } else {
      console.log('ℹ️ Alerta ya enviada anteriormente para esta misma incidencia (evitando spam).');
    }

    saveState({
      status: 'down',
      downIds,
      incidentStartedAt,
      lastAlertSentAt,
    });

    process.exit(1);
  }

  // Todos los servicios están UP
  if (prev.status === 'down') {
    const durationText = formatDuration(prev.incidentStartedAt, now);
    await sendResendEmail({
      subject: '[GDGoC UHU] ✅ Servicios de gdguhu.com recuperados',
      html: buildEmailHtml({ kind: 'recovered', results, checkedAtMadrid, durationText }),
      text: `Todos los servicios de gdguhu.com vuelven a estar operativos (${checkedAtMadrid}).\nDuración aproximada: ${durationText}\n\n${plainSummary}\n`,
    });
  } else if (SEND_TEST_EMAIL) {
    await sendResendEmail({
      subject: '[GDGoC UHU] ℹ️ Prueba de monitorización — Todo operativo',
      html: buildEmailHtml({ kind: 'test', results, checkedAtMadrid, durationText: '' }),
      text: `Prueba manual del monitor de gdguhu.com (${checkedAtMadrid}):\n\n${plainSummary}\n`,
    });
  }

  saveState({
    status: 'up',
    downIds: [],
    incidentStartedAt: null,
    lastAlertSentAt: null,
  });

  console.log('✨ Todos los servicios de gdguhu.com operativos.');
}

main().catch((err) => {
  console.error(`❌ Error ejecutando monitor Uptime: ${err.message}`);
  process.exit(1);
});
