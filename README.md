# GDGoC UHU Web (`gdguhu.com`)

Portal web oficial y **Edge Gateway Multi-Zone** del **Google Developer Group on Campus · Universidad de Huelva (GDGoC UHU)**.

## Arquitectura Multi-Zone del ecosistema

| Repositorio | Responsabilidad | Rutas bajo `gdguhu.com` |
| :--- | :--- | :--- |
| **`GDGoC-UHU-Web`** *(este repo)* | Portada institucional, sincronización de eventos Bevy, enlaces cortos, Open Graph del portal, páginas 404 / mantenimiento y Vercel Edge Middleware | `/`, `/404`, `/mantenimiento/*`, `/evento`, `/ig`, `/linkedin`, `/comunidad`, `/ctf`… |
| **[`GDGoC-UHU-OpenBadges`](https://github.com/arixlariel/GDGoC-UHU-OpenBadges)** | Certificados digitales verificables Open Badges 2.0 & 3.0 firmados con Ed25519 (`did:web:gdguhu.com`), generador, tarjetas OG y envío automático de correos vía Resend | `/openbadges/*`, `/cert/*`, `/api/badges/*`, `/.well-known/did.json`, `/og/cert/*` |
| **[`GDGoC-UHU-CTFd`](https://github.com/arixlariel/GDGoC-UHU-CTFd)** | Plataforma de ciberseguridad CTF con tema Cyber neón y sincronización automática con CTFd | `/cybertrainer/*` |

## Características principales

- **Eventos Bevy automáticos:** pre-renderizados dos veces al día (00:00 y 15:00 CET) en GitHub Actions + refresco en tiempo real desde la API pública de Bevy (`chapter_id = 3520`).
- **Enlaces cortos permanentes (`HTTP 307`):** `/ig`, `/instagram`, `/linkedin`, `/in`, `/comunidad`, `/bevy`, `/ctf`, `/ctfs`, `/ctfd`, `/badges`, `/certificados`, `/openbadges` y redirección dinámica `/evento` · `/eventos` al próximo evento activo en Bevy.
- **Modo mantenimiento multi-estilo (`MAINTENANCE_MODE`):** activable desde Vercel (`all`, `hub`, `openbadges`, `cybertrainer`), respetando el tema guardado de cada usuario, los candados de certificados y el estilo Cyber en `/cybertrainer/*`, además de intercepción automática de caídas `502`/`503`/`504` del servidor CTFd origen.
- **Tarjeta Open Graph `1200×630`:** generada automáticamente en cada build con Satori y Resvg (`/og/hub.png`).
