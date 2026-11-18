# Free deployment: Hugging Face Spaces + Neon + Brevo (no credit card)

| Part | Service (free) | What you need |
|---|---|---|
| Website + backend + AI | Hugging Face Space (Docker, 2 CPU / 16 GB RAM) | the 2 files in this folder |
| Database | Neon Postgres (0.5 GB) | a connection string |
| Email | Brevo (300 emails/day, HTTPS API) | an API key — Hugging Face blocks normal email (SMTP) ports |

Time: about 40 minutes, most of it waiting for the first build.

---

## 1. Neon — the database

1. Go to **neon.tech** → **Sign up** → *Continue with GitHub*.
2. Create a project: name `legalai`, Postgres version **16** (or the default), region **AWS Asia Pacific (Singapore)**.
3. On the project dashboard click **Connect**.
   * Turn **Connection pooling OFF** (the host must NOT contain `-pooler`).
   * Copy the connection string. It looks like
     `postgresql://neondb_owner:XXXX@ep-cool-name-123456.ap-southeast-1.aws.neon.tech/neondb?sslmode=require&channel_binding=require`
4. Keep it private — it is the database password.

### 1b. Copy your current data into Neon (lawyers, admins, users)

On your **Mac** (Docker running, your local database container up), in Terminal — paste your Neon string between the single quotes:

```bash
docker exec backend-postgres-1 sh -c "pg_dump -U legalai -d legalai -Fc --no-owner --no-privileges | pg_restore --clean --if-exists --no-owner --no-privileges -d 'PASTE_NEON_CONNECTION_STRING_HERE'"
```

Check it worked:

```bash
docker exec backend-postgres-1 psql 'PASTE_NEON_CONNECTION_STRING_HERE' -c "select role, count(*) from users group by role"
```

You should see your CITIZEN / LAWYER / ADMIN counts. (Skip 1b to start with an empty database — then create an admin in step 4.)

## 2. Brevo — sending emails

1. Go to **brevo.com** → **Sign up free** (no card) and confirm your email.
2. **Add the sender**: top-right menu → **Senders, Domains & Dedicated IPs** → **Senders** → **Add a sender**
   * From name: `LEGAL AI` · From email: your Gmail (e.g. tahrima.jahan.raha@gmail.com)
   * Brevo emails a code to that Gmail → enter it to verify.
3. **API key**: top-right menu → **SMTP & API** → **API Keys** → **Generate a new API key** → name `legal-ai` → copy it (starts with `xkeysib-`).

## 3. Hugging Face — the website

1. Go to **huggingface.co** → **Sign up** and verify your email.
2. **New Space** (huggingface.co/new-space):
   * Space name: `legal-ai`
   * SDK: **Docker** → template **Blank**
   * Hardware: **CPU basic · FREE**
   * Visibility: **Public**
   * **Create Space**
3. **Settings → Variables and secrets** (do this before adding the files):

   | Type | Name | Value |
   |---|---|---|
   | Secret | `DATABASE_URL` | your Neon connection string |
   | Secret | `JWT_SECRET` | a long random string (Mac Terminal: `openssl rand -hex 32`) |
   | Secret | `BREVO_API_KEY` | the `xkeysib-…` key |
   | Variable | `SMTP_FROM_EMAIL` | the Gmail you verified in Brevo |
   | Secret (optional) | `GEMINI_API_KEY` | only if you use Gemini |

4. **Files → + Add file → Create a new file**
   * File name `Dockerfile` → paste the contents of `hf-space/Dockerfile` from GitHub → **Commit**.
   * Open the existing `README.md` → **Edit** → replace everything with `hf-space/README.md` → **Commit**.
5. The Space starts **Building** (10–15 min the first time; click **Logs** to watch).
   When it says **Running**, open the app at its own address:
   **https://YOUR-USERNAME-legal-ai.hf.space**
   (Use this direct link — not the huggingface.co/spaces/… page — so sign-in cookies, camera and microphone work.)

## 4. Admin account (only if you skipped step 1b)

Run this on your Mac — it creates the admin directly in Neon (asks for the password twice):

```bash
cd ~/Downloads/legal-ai/backend
DATABASE_URL='PASTE_NEON_CONNECTION_STRING_HERE' .venv/bin/python -m scripts.create_admin you@gmail.com "Your Name"
```

## 5. Test

* Sign up with a real email → verification email arrives (check Spam the first time) → sign in
* Forgot password → 6-digit code → new password
* AI chat (Bangla + English), Find Lawyers, consultation booking
* Video meeting between two devices

## Good to know

* **Sleeps after 48 h without visitors**; the next visit wakes it (~1–2 min). Open it once before your presentation.
* **Uploaded files** (documents, avatars) are erased when the Space restarts; accounts and data in Neon stay.
* **Update after new code is pushed to GitHub**: Space → Settings → **Factory rebuild**.
* **Video calls** use direct connections (STUN). On most Wi-Fi/4G pairs this works; on strict mobile networks a call may not connect. A free TURN relay can be added later (Space variables `MEETING_TURN_URLS`, `MEETING_TURN_USERNAME`, `MEETING_TURN_CREDENTIAL`).
* Demo accounts copied from your Mac use the password `12345678` — change them before sharing publicly.
