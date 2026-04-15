# ModernCRM — Oktoja

Lead generation + CRM sistema, pritaikyta Web development / Bug fixing paslaugų pardavimui.

## 🧱 Architektūra

```
┌──────────────────────────────────────────────────────────────┐
│  Frontend (React + Vite)                                     │
│  crm.oktoja.lt                                               │
└──────────┬───────────────────────────────────────────────────┘
           │ REST + WebSocket (realtime)
┌──────────▼───────────────────────────────────────────────────┐
│  PocketBase (single-binary backend)                          │
│  • 12 kolekcijų: leads, clients, tech_stack, outreach, ...   │
│  • JS hooks: lead scoring, push, tracking pixel              │
│  • Admin UI: /_/                                             │
└──────────▲───────────────────────────────────────────────────┘
           │
┌──────────┴───────────────────────────────────────────────────┐
│  n8n (automation)                                            │
│  n8n.oktoja.lt                                               │
│  • Lead Discovery (Google Maps → Wappalyzer → PocketBase)    │
│  • AI Outreach (Claude Haiku → SMTP → tracking)              │
│  • Follow-ups, nurture sekos                                 │
└──────────────────────────────────────────────────────────────┘
```

## 📦 Projekto struktūra

```
.
├── backend/
│   ├── docker-compose.yml            ← PocketBase + n8n
│   ├── .env.example                  ← kopijuokite į .env ir paredaguokite
│   ├── pocketbase/
│   │   ├── pb_migrations/            ← 12 kolekcijų schema
│   │   └── pb_hooks/                 ← lead scoring, push, tracking
│   └── n8n/
│       └── workflows/                ← importuokite į n8n UI
│           ├── 01_lead_discovery.json
│           └── 02_ai_outreach.json
├── frontend/                         ← naujas dark UI (Linear style)
│   ├── src/
│   │   ├── pages/  (Dashboard, Leads, LeadDetail, Clients, ...)
│   │   ├── lib/pb.js                 ← PocketBase klientas
│   │   ├── styles.css                ← violetinių/mėlynų akcentų tema
│   │   └── App.jsx
│   └── vite.config.js
├── deploy/
│   ├── install.sh                    ← vienos komandos serverio setup
│   ├── nginx-crm.oktoja.lt.conf      ← nginx konfigūracija
│   └── nginx-n8n.oktoja.lt.conf
├── src/                              ← (senas) ManoKRM legacy frontend
└── README.md                         ← šis failas
```

## 🚀 Diegimas į serverį

### 1) Vienas žingsnis

Prisijunkite prie serverio kaip root ir paleiskite vieną komandą:

```bash
ssh root@88.198.130.213

curl -sSL https://raw.githubusercontent.com/bigt41gopeay/bigt41gopeay/claude/create-crm-system-5MIl6/deploy/install.sh | bash
```

Skriptas:
1. Įdiegia Docker + Node.js + nginx (jei jų nėra)
2. Klonuoja repo į `/opt/moderncrm`
3. Paleidžia PocketBase + n8n per `docker compose`
4. Sukonfigūruoja nginx (`crm.oktoja.lt` ir `n8n.oktoja.lt`)
5. Sukompiliuoja naują frontend ir įkelia į `/var/www/crm.oktoja.lt`
6. Nustato `crmuser:www-data` savininką ir `775` teises
7. **Netrina** esamų failų — tik prideda/atnaujina

### 2) HTTPS sertifikatai

```bash
apt install -y certbot python3-certbot-nginx
certbot --nginx -d crm.oktoja.lt -d n8n.oktoja.lt
```

### 3) Pirmas prisijungimas

1. **PocketBase admin:** `https://crm.oktoja.lt/_/` — sukurkite admin paskyrą
2. Sukurkite vartotoją: Collections → `users` → New record (email + password)
3. Prisijunkite su tuo vartotoju: `https://crm.oktoja.lt/`
4. **n8n:** `https://n8n.oktoja.lt/` — login iš `.env` (admin / `N8N_PASSWORD`)

### 4) API raktų konfigūracija

```bash
nano /opt/moderncrm/backend/.env
```

Užpildykite:
- `OPENAI_API_KEY` / `ANTHROPIC_API_KEY` — AI personalizacijai
- `SMTP_*` — el. laiškų siuntimui
- `APIFY_TOKEN` — Google Maps scraping
- `WAPPALYZER_API_KEY` — tech stack aptikimui
- `ONESIGNAL_APP_ID` + `ONESIGNAL_API_KEY` — push į iOS

Po pakeitimų:
```bash
cd /opt/moderncrm/backend && docker compose --env-file .env restart
```

### 5) n8n workflow importas

1. Atidarykite `https://n8n.oktoja.lt/`
2. Workflows → Import from File
3. Įkelkite `/opt/moderncrm/backend/n8n/workflows/01_lead_discovery.json`
4. Pakartokite su `02_ai_outreach.json`
5. Aktyvuokite workflow'us (toggle viršuje)

## 🔄 Atnaujinimai ateityje

```bash
ssh root@88.198.130.213
sudo bash /opt/moderncrm/deploy/install.sh
```

Skriptas daro `git pull`, perbuild'ina frontend, restartuoja Docker. **Nieko neištrina** iš `/var/www/crm.oktoja.lt`.

## 📱 iOS programėlė (FlutterFlow)

- FlutterFlow naujas projektas → Dark mode default
- Custom Code: `pocketbase: ^0.18.0`
- API Base URL: `https://crm.oktoja.lt`
- Realtime subscription per `pb.collection('leads').subscribe('*', ...)`
- Push notifications: OneSignal integracija → PocketBase hook siunčia pranešimus

## 🔒 Saugumas

- **SSH:** naudokite raktus, ne slaptažodžius
- **nginx** proxy'ina `/api/`, `/_/`, `/p/` į PocketBase — viskas kita static
- **n8n** basic auth — privalomai pakeiskite default password `.env` faile

## 🆘 Diagnostika

```bash
# Docker containerių statusas
cd /opt/moderncrm/backend && docker compose ps

# PocketBase logai
docker compose logs -f pocketbase

# n8n logai
docker compose logs -f n8n

# nginx
nginx -t && systemctl status nginx

# frontend build
cd /opt/moderncrm/frontend && npm run build
```

## 📚 Dokumentacija

- PocketBase: https://pocketbase.io/docs/
- n8n: https://docs.n8n.io/
- FlutterFlow: https://docs.flutterflow.io/

---

**Šaka:** `claude/create-crm-system-5MIl6`
**Legacy ManoKRM:** paliktas `src/` direktorijoje kaip referencija. Naujas frontend — `frontend/` kataloge.
