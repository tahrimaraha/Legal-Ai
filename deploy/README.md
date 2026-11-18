# Deploying Legal AI to a server (VPS)

Everything runs on **one Linux server** with Docker:

| Service | What it does |
|---|---|
| `web` (Caddy) | Serves the website, gets the HTTPS certificate automatically, forwards `/api` (and video-call WebSockets) to the API |
| `api` (FastAPI) | Backend + AI (hybrid search with E5, legal-area classifier) — runs database migrations on start |
| `db` (PostgreSQL) | Users, lawyers, consultations, messages … |
| `redis` | Rate limits, cooldowns |
| `turn` (coturn) | Relays video calls when phones on mobile data can't connect directly |

You need: a server with **Ubuntu 24.04, 4 GB RAM, 2 CPUs, 40 GB disk** (2 GB RAM works only with swap), and ~30 minutes.

---

## Step 1 — Rent the server

**Free for students:** GitHub Student Developer Pack → DigitalOcean gives **$200 credit** (education.github.com/pack).

1. DigitalOcean → **Create → Droplets**
2. Region: **Singapore** (closest to Bangladesh)
3. Image: **Ubuntu 24.04 (LTS) x64**
4. Size: **Basic → Regular → 4 GB / 2 CPUs** ($24/month — covered by the credit)
5. Authentication: **Password** (simplest) — choose a strong root password and save it
6. Create, then copy the server's **IPv4 address** (e.g. `203.0.113.5`)

(Alternative: Hetzner Cloud CX22, 4 GB, ~€5/month.)

## Step 2 — Open the firewall ports

DigitalOcean → **Networking → Firewalls → Create Firewall**, inbound rules:

| Type | Protocol | Port | Why |
|---|---|---|---|
| SSH | TCP | 22 | you log in |
| HTTP | TCP | 80 | certificate check + redirect to HTTPS |
| HTTPS | TCP | 443 | the website |
| Custom | UDP | 443 | faster HTTPS (HTTP/3) |
| Custom | TCP + UDP | 3478 | video-call relay (TURN) |
| Custom | UDP | 49160-49200 | video-call relay media |

Apply it to your droplet.

## Step 3 — Log in and install Docker

On your Mac, open **Terminal**:

```bash
ssh root@203.0.113.5          # your server IP; type "yes", then the root password
```

Now you are on the server. Copy-paste:

```bash
curl -fsSL https://get.docker.com | sh
# 2 GB swap: protects the server from running out of memory while building
fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
echo '/swapfile none swap sw 0 0' >> /etc/fstab
```

## Step 4 — Download the project

```bash
git clone https://github.com/tahrimaraha/Legal-Ai.git
cd Legal-Ai/deploy
cp .env.example .env
```

## Step 5 — Fill in the settings

Generate three random passwords:

```bash
for k in POSTGRES_PASSWORD JWT_SECRET TURN_PASSWORD; do echo "$k=$(openssl rand -hex 32)"; done
```

Open the settings file:

```bash
nano .env
```

* `SITE_ADDRESS` — your free address: `legalai-` + your IP with dashes + `.sslip.io`
  e.g. IP `203.0.113.5` → `SITE_ADDRESS=legalai-203-0-113-5.sslip.io`
* paste the three generated lines over the empty `POSTGRES_PASSWORD=`, `JWT_SECRET=`, `TURN_PASSWORD=`
* email: the same Gmail values as in `backend/.env` on your Mac (`SMTP_USER`, `SMTP_PASSWORD` = the 16-letter app password, `SMTP_FROM_EMAIL`)

Save: **Ctrl+O**, **Enter**, exit: **Ctrl+X**.

## Step 6 — Start everything

```bash
docker compose up -d --build
```

The first build takes **10–15 minutes** (it downloads the AI libraries). Check:

```bash
docker compose ps                 # all should be "running" / api "healthy" after ~1 minute
docker compose logs -f api        # look for: Running upgrade ... and ml_models_loaded  (Ctrl+C to stop watching)
```

Open **https://legalai-203-0-113-5.sslip.io** (your address) on your phone — the padlock shows real HTTPS.

## Step 7 — Accounts

The new server's database is **empty**. Choose one:

### Option A — copy your current data from your Mac (lawyers, admins, users, consultations)

On your **Mac** (new Terminal window, not the server):

```bash
cd ~/Downloads/legal-ai/backend
docker exec backend-postgres-1 pg_dump -U legalai -d legalai -Fc --no-owner --no-privileges > ~/legalai.dump
scp ~/legalai.dump root@203.0.113.5:/root/
```

(If `docker exec` says the user is unknown, use the user/database names from `DATABASE_URL` in `backend/.env`.)

On the **server**:

```bash
cd ~/Legal-Ai/deploy
docker compose stop api
docker compose exec -T db pg_restore --clean --if-exists --no-owner --no-privileges -U legalai -d legalai < /root/legalai.dump
docker compose start api
rm /root/legalai.dump
```

⚠️ Demo accounts use the password `12345678` — change the admin and lawyer passwords (Settings → Change password) before sharing the site.

### Option B — start fresh with your own admin

```bash
docker compose exec api python -m scripts.create_admin you@gmail.com "Your Name"
```

It asks for the password twice (8+ characters with a letter and a number).

## Step 8 — Test it like a user

* Phone: sign up → the verification email arrives → the link opens your site → sign in
* Forgot password → 6-digit code by email → new password
* AI chat in English and Bangla (answers show **Legal area** and citations)
* Video call: lawyer on Wi-Fi, client on **mobile data** — both should see and hear each other
* Admin: Corpus Manager filters, lawyer approvals

---

## Everyday tasks

**Update after you push new code to GitHub**

```bash
cd ~/Legal-Ai && git pull && cd deploy && docker compose up -d --build
```

**Logs**

```bash
docker compose logs -f api      # backend
docker compose logs -f web      # website / HTTPS certificate
```

**Backup the database** (do this regularly; download the file to your Mac with scp)

```bash
docker compose exec -T db pg_dump -U legalai -d legalai -Fc > ~/backup-$(date +%F).dump
```

**Restart / stop**

```bash
docker compose restart
docker compose down             # stops; data is kept in Docker volumes
```

## Using a real domain later

1. At your domain registrar add an **A record**: `legalai.yourdomain.com → your server IP`
2. On the server: `nano .env` → `SITE_ADDRESS=legalai.yourdomain.com`
3. `docker compose up -d` — Caddy gets the new certificate by itself; email links switch to the new address.

## Troubleshooting

| Problem | Fix |
|---|---|
| Browser says the site can't be reached | Firewall ports 80/443 open? `docker compose ps` all running? |
| Certificate error right after start | Wait 1 minute; `docker compose logs web` shows the certificate request |
| `api` keeps restarting | `docker compose logs api` — usually a typo in `.env` |
| Build stops with "Killed" | Not enough memory: add the swap from Step 3, or use a 4 GB server |
| No emails | Check `SMTP_*` in `.env`, then `docker compose restart api` |
| Video connects on Wi-Fi but not mobile data | Firewall: TCP+UDP 3478 and UDP 49160-49200; `docker compose logs turn` |
