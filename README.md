# GDGoC Universidad de Huelva — Portal Web & Edge Gateway (`gdguhu.com`)

Bienvenido al repositorio oficial del portal principal de **Google Developer Group on Campus Huelva University (GDGoC UHU)** en [`https://gdguhu.com`](https://gdguhu.com). Este proyecto aloja la portada institucional, la sincronización automática de eventos de Bevy, los enlaces cortos del club, las páginas globales de error y mantenimiento, las tarjetas Open Graph del portal y el **Edge Gateway Multi-Zone** que unifica todas nuestras plataformas bajo un único dominio.

---

## Índice

1. [Ecosistema Multi-Zone bajo `gdguhu.com`](#1-ecosistema-multi-zone-bajo-gdguhucom)
2. [Tecnologías e Integraciones](#2-tecnologías-e-integraciones)
3. [Estructura de Archivos](#3-estructura-de-archivos)
4. [Eventos automáticos de Bevy en la portada](#4-eventos-automáticos-de-bevy-en-la-portada)
5. [Enlaces cortos permanentes y `/evento` dinámico](#5-enlaces-cortos-permanentes-y-evento-dinámico)
6. [Tarjetas Open Graph (`1200×630`)](#6-tarjetas-open-graph-1200630)
7. [Modo mantenimiento multi-estilo y protección ante caídas](#7-modo-mantenimiento-multi-estilo-y-protección-ante-caídas)
8. [Infraestructura, DNS, Correo (`Resend`) y Despliegue](#8-infraestructura-dns-correo-resend-y-despliegue)

---

## 1. Ecosistema Multi-Zone bajo `gdguhu.com`

La plataforma web de GDGoC UHU está dividida en **tres repositorios independientes** desacoplados que conviven de forma transparente bajo el dominio oficial [`https://gdguhu.com`](https://gdguhu.com) mediante arquitectura **Multi-Zone** en el Edge de Vercel:

| Ruta oficial | Repositorio responsable | Cómo se sirve |
| :--- | :--- | :--- |
| **`https://gdguhu.com/`** | **`GDGoC-UHU-Web`** *(este repositorio)* | Portada institucional en estilo oficial Google fijo con candado y próximo evento de Bevy |
| **`https://gdguhu.com/mantenimiento/*`** y **`/404`** | **`GDGoC-UHU-Web`** *(este repositorio)* | Páginas globales de mantenimiento (respetando estilos y candados) y 404 |
| **`https://gdguhu.com/ig`**, **`/linkedin`**, **`/ctf`**, **`/evento`**… | **`GDGoC-UHU-Web`** *(este repositorio)* | Redirecciones `HTTP 307` en `vercel.json` y redirección dinámica a Bevy en `middleware.js` |
| **`https://gdguhu.com/openbadges/*`**, **`/cert/*`**, **`/api/badges/*`**, **`/.well-known/did.json`** | **[`GDGoC-UHU-OpenBadges`](https://github.com/arixlariel/GDGoC-UHU-OpenBadges)** | Proyecto Vercel independiente (`gdgoc-uhu-openbadges`) montado de forma transparente vía `rewrites` en `vercel.json` con namespace propio de assets (`/_astro-ob/*`) |
| **`https://gdguhu.com/cybertrainer/*`** | **[`GDGoC-UHU-CTFd`](https://github.com/arixlariel/GDGoC-UHU-CTFd)** | Reverse proxy HTTPS en `middleware.js` contra la instancia CTFd origen (`origin-ctf.gdguhu.com`), con reescritura de rutas, cookies, CSS, HTML y API JSON |

---

## 2. Tecnologías e Integraciones

- **Vercel (Hosting, Multi-Zone Rewrites y Edge Routing Middleware)**:
  - Despliegue atómico e inmutable sobre la red Edge global de Vercel (proyecto `gdgoc-uhu-web`), con certificados SSL automáticos para `gdguhu.com` y redirección `308` desde `www.gdguhu.com`.
  - **`vercel.json`**: define redirecciones cortas `HTTP 307`, `rewrites` Multi-Zone hacia Open Badges, cabeceras de seguridad (`HSTS`, `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`) y caché inmutable de 1 año para assets estáticos.
  - **`middleware.js`** (`@vercel/functions`): ejecuta el proxy inverso de `/cybertrainer/*`, la redirección en vivo de `/evento` hacia Bevy y el interruptor de modo mantenimiento global/por sección.
  - **Vercel Web Analytics & Speed Insights**: telemetría sin cookies (RGPD-friendly) y medición real de *Core Web Vitals* unificada en el panel de `gdgoc-uhu-web` para todo `gdguhu.com` (portada, Open Badges y Cyber Trainer).
- **Cloudflare (DNS-only + Email Routing + DMARC)**:
  - Gestión autoritativa del dominio `gdguhu.com` en modo *DNS-only* (nube gris apuntando a Vercel y a `origin-ctf.gdguhu.com`), garantizando acceso directo sin interferencias de bloqueos IP compartidos.
  - **Cloudflare Email Routing** activado para reenviar cualquier correo enviado o respondido a `certificados@gdguhu.com` directamente a la bandeja oficial `gdgoc.huelva@gmail.com`.
  - Registro **DMARC** (`_dmarc.gdguhu.com`) publicado en DNS para proteger la reputación del dominio.
- **Resend (Correo transaccional autenticado con `@gdguhu.com`)**:
  - Dominio `gdguhu.com` verificado en la región europea (`eu-west-1`) con registros **DKIM** (`resend._domainkey`), **SPF** (`send.gdguhu.com` MX/TXT) y verificación CNAME en Cloudflare DNS.
  - Utilizado por el flujo automatizado de certificados para emitir correos oficiales desde `certificados@gdguhu.com` con `Reply-To` y copia oculta (`BCC`) a `gdgoc.huelva@gmail.com`.
- **Open Graph (`1200×630` automatizado)**:
  - Generación automática durante cada build de tarjetas sociales PNG `1200×630` optimizadas (< 120 KB) mediante **Satori**, **Resvg (`@resvg/resvg-js`)**, **Plus Jakarta Sans** (`@fontsource`) y **Sharp**, compatibles con LinkedIn, WhatsApp, Telegram, Discord y X.
- **Astro 4 + Tailwind CSS + Bevy API**:
  - Sitio estático ultrarrápido con estilos inlineados, efectos de inclinación 3D delegados, sincronización en build y en vivo con la API pública de Bevy (`chapter_id = 3520`) y `sitemap.xml` unificado Multi-Zone.
- **GitHub Actions (CI/CD, Cron Bevy y Monitor Uptime)**:
  - Compilación, verificación de artefactos y despliegue automático a producción en cada `push` a `main`, además de sincronización programada de Bevy dos veces al día (`00:00` y `15:00 CET`).
  - **Monitorización automática de caídas (`uptime-monitor.yml`)**: comprueba cada 30 minutos la disponibilidad de `/`, `/openbadges/`, `/.well-known/did.json`, `/api/badges/status/revocations.json` y `/cybertrainer/` (con 3 reintentos y anti-spam), avisando por correo mediante **Resend** (`monitor@gdguhu.com` → `gdgoc.huelva@gmail.com`) ante cualquier caída y al recuperarse el servicio.

---

## 3. Estructura de Archivos

```text
Web/
├── .github/
│   └── workflows/
│       ├── deploy.yml                   <-- CI/CD a Vercel + cron diario 00:00 y 15:00 CET
│       └── uptime-monitor.yml           <-- Monitor de disponibilidad cada 30 min con alertas Resend
├── public/
│   ├── favicon.* / apple-touch-icon.png <-- Iconos del portal oficial gdguhu.com
│   ├── robots.txt                       <-- Directivas SEO y referencia al sitemap global
│   └── images/                          <-- Logotipos oficiales optimizados de GDGoC UHU
├── scripts/
│   ├── generate-og-images.mjs           <-- Genera /og/hub.png y /og/cybertrainer.png (1200×630)
│   └── check-uptime.mjs                 <-- Comprobación HTTP con reintentos, anti-spam y alertas Resend
├── src/
│   ├── components/
│   │   ├── Header.astro                 <-- Cabecera unificada con candados y selector de tema
│   │   ├── Footer.astro                 <-- Pie institucional unificado en todo el ecosistema
│   │   └── MaintenanceCard.astro        <-- Tarjeta común para las 3 vistas de mantenimiento
│   ├── config/
│   │   └── site.ts                      <-- Configuración centralizada de rutas, redes y LinkedIn
│   ├── layouts/
│   │   └── BaseLayout.astro             <-- Layout maestro con 5 temas, SEO, Open Graph y print
│   ├── pages/
│   │   ├── index.astro                  <-- Portada principal (https://gdguhu.com/) + evento Bevy
│   │   ├── 404.astro                    <-- Página global 404 con buscador de certificados
│   │   ├── sitemap.xml.ts               <-- Sitemap global (sincronizado con Open Badges)
│   │   └── mantenimiento/
│   │       ├── index.astro              <-- Mantenimiento de portada (estilo Google con candado)
│   │       ├── openbadges.astro         <-- Mantenimiento Open Badges (tema guardado / candado cert)
│   │       └── cybertrainer.astro       <-- Mantenimiento Cyber Trainer (estilo Cyber con candado)
│   └── utils/
│       └── bevyEvents.ts                <-- Cliente y formateador de eventos públicos de Bevy
├── middleware.js                        <-- Edge Middleware (proxy CTFd, /evento, mantenimiento)
├── vercel.json                          <-- Enlaces cortos 307, rewrites Multi-Zone y cabeceras
├── astro.config.mjs                     <-- Configuración Astro estática
└── package.json                         <-- Dependencias y script `npm run build`
```

---

## 4. Eventos automáticos de Bevy en la portada

La portada [`https://gdguhu.com/`](https://gdguhu.com/) muestra automáticamente una tarjeta **«Próximo evento»** siempre que exista un evento futuro publicado en nuestro capítulo oficial de Bevy (`chapter_id = 3520`):

- **Pre-renderizado automático (`00:00` y `15:00 CET`)**: el cron de `.github/workflows/deploy.yml` reconstruye la página dos veces al día para que cargue al instante sin saltos visuales (*Zero CLS*) y con el contenido indexable para buscadores.
- **Refresco en tiempo real en navegador**: tras la carga inicial, un ligero script consulta directamente la API pública de Bevy (`cache: 'no-store'`), actualizando inmediatamente cambios de título, fecha o descripción y ocultando la tarjeta en cuanto el evento finaliza.

---

## 5. Enlaces cortos permanentes y `/evento` dinámico

Todos los enlaces cortos devuelven **HTTP 307 temporal** para que ningún navegador ni lector QR cachee de forma permanente un destino antiguo si algún día cambia un usuario de red social o un enlace de evento:

| Enlace corto | Destino actual | Gestión |
| :--- | :--- | :--- |
| `gdguhu.com/ig` · `gdguhu.com/instagram` | `https://www.instagram.com/gdgoc.huelva/` | Estático en `vercel.json` |
| `gdguhu.com/linkedin` · `gdguhu.com/in` | `https://www.linkedin.com/company/gdgoc-huelva` | Estático en `vercel.json` |
| `gdguhu.com/comunidad` · `gdguhu.com/bevy` | Página oficial de la comunidad en Bevy | Estático en `vercel.json` |
| `gdguhu.com/ctf` · `gdguhu.com/ctfs` · `gdguhu.com/ctfd` | `https://gdguhu.com/cybertrainer/` | Estático en `vercel.json` |
| `gdguhu.com/badges` · `gdguhu.com/certificados` · `gdguhu.com/openbadges` | `https://gdguhu.com/openbadges/` | Estático en `vercel.json` |
| `gdguhu.com/evento` · `gdguhu.com/eventos` | Próximo evento activo en Bevy *(o comunidad si no hay ninguno)* | Dinámico en vivo en `middleware.js` |

---

## 6. Tarjetas Open Graph (`1200×630`)

Cada sección del ecosistema dispone de una tarjeta panorámica **Open Graph `1200×630` PNG** optimizada (< 120 KB) para vistas previas en LinkedIn, WhatsApp, Telegram, Discord y X:

- **`https://gdguhu.com/og/hub.png`** — Portada oficial `gdguhu.com` (generada en este repositorio).
- **`https://gdguhu.com/og/cybertrainer.png`** — Plataforma Cyber Trainer estilo Cyber neón (generada en este repositorio).
- **`https://gdguhu.com/og/openbadges.png`** y **`https://gdguhu.com/og/cert/<ID>.png`** — Portal Open Badges y tarjeta personalizada para cada certificado (generadas en `GDGoC-UHU-OpenBadges` y servidas bajo `gdguhu.com` vía Multi-Zone).

---

## 7. Modo mantenimiento multi-estilo y protección ante caídas

### --- Protección automática de Cyber Trainer
Si el servidor CTFd origen (`origin-ctf.gdguhu.com`) tarda más de 12 segundos, no responde o devuelve `502`/`503`/`504`, `middleware.js` intercepta la respuesta automáticamente y muestra la página de mantenimiento Cyber (`HTTP 503`, `Retry-After: 120`) o una respuesta JSON `503` para llamadas `/cybertrainer/api/*`.

### --- Activación manual desde Vercel (`MAINTENANCE_MODE`)
En **Vercel → Proyecto `gdgoc-uhu-web` → Settings → Environment Variables**, basta configurar la variable `MAINTENANCE_MODE`:

- `all`: pone toda la web en mantenimiento respetando cada estilo y candado.
- `hub`, `openbadges` o `cybertrainer` (o combinados separados por coma, ej. `openbadges,cybertrainer`): pausa únicamente las secciones indicadas.
- `MAINTENANCE_BYPASS_KEY` *(opcional)*: añadiendo `?bypass=<clave>` a la URL, los organizadores pueden seguir navegando la web real mientras el resto ve el mantenimiento.

Comportamiento visual respetado en cada apartado:
- **`/`**: estilo oficial **Google fijo con candado** (`/mantenimiento/`), sin sobrescribir la preferencia del usuario.
- **`/openbadges/*`**: conserva el **tema elegido por el usuario** con el desplegable activo; si el visitante accedía a un certificado concreto (`/openbadges/cert/<ID>/`), bloquea la vista en el estilo exacto de ese certificado con su candado (`/mantenimiento/openbadges/`).
- **`/cybertrainer/*`**: estilo **Cyber neón fijo con candado** (`/mantenimiento/cybertrainer/`).

*(Los assets estáticos, `/.well-known/did.json` y `/api/badges/*` siguen accesibles durante el mantenimiento para no interrumpir validadores externos.)*

---

## 8. Infraestructura, DNS, Correo (`Resend`) y Despliegue

### --- Secretos requeridos en GitHub Actions (`Settings -> Secrets and variables -> Actions`)
- `VERCEL_TOKEN`: token de despliegue de Vercel.
- `VERCEL_ORG_ID`: identificador del equipo/cuenta en Vercel.
- `VERCEL_PROJECT_ID`: identificador del proyecto `gdgoc-uhu-web` en Vercel.
- `RESEND_API_KEY`: clave de API de Resend para enviar alertas de caída y recuperación del monitor de disponibilidad.

### --- Despliegue local o publicación
```bash
git clone https://github.com/arixlariel/GDGoC-UHU-Web.git
npm install
npm run dev
```
Cualquier `push` a la rama `main` compila las tarjetas Open Graph, genera el sitio Astro, verifica `middleware.js` y despliega automáticamente a producción en `https://gdguhu.com/`.
