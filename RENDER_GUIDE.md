# Free deployment on Render (+ Neon database + Brevo email)

One free Render web service runs the website and the API. Data lives in Neon (free Postgres); emails go through
Brevo's HTTPS API (Render's free plan blocks normal email ports).

**Free plan limits:** 512 MB RAM — the legal-area classifier runs, AI search is keyword mode (the E5 model needs
~1.5 GB). The service **sleeps after 15 minutes** without visitors; the next visit takes ~1 minute to wake.
Uploaded files are cleared when it restarts (accounts and data in Neon stay).

## 1. Create the service

1. Go to **https://render.com** → **Get Started** → **GitHub** (sign in with GitHub).
2. **New +** → **Web Service** → **Public Git Repository** → paste
   `https://github.com/tahrimaraha/Legal-Ai` → **Connect**.
3. Fill in:

   | Field | Value |
   |---|---|
   | Name | `legal-ai` |
   | Region | **Singapore** |
   | Branch | `main` |
   | Root Directory | *(leave empty)* |
   | Language / Runtime | **Python 3** |
   | Build Command | `cd frontend && npm ci --no-audit --no-fund && npx vite build && cd ../backend && pip install -r requirements-render.txt` |
   | Start Command | `sh render-start.sh` |
   | Instance Type | **Free** |

4. **Environment Variables** → **Add Environment Variable** for each:

   | Key | Value |
   |---|---|
   | `DATABASE_URL` | your Neon connection string |
   | `JWT_SECRET` | click **Generate** (or `openssl rand -hex 32`) |
   | `BREVO_API_KEY` | your `xkeysib-…` key |
   | `SMTP_FROM_EMAIL` | the Gmail you verified in Brevo |
   | `EMAIL_PROVIDER` | `brevo` |
   | `APP_ENV` | `production` |
   | `DEBUG` | `false` |
   | `REFRESH_COOKIE_SECURE` | `true` |
   | `ML_MODELS_ENABLED` | `true` |
   | `PYTHON_VERSION` | `3.11.9` |
   | `NODE_VERSION` | `20.18.0` |

5. **Advanced** → Health Check Path: `/api/v1/corpus/stats`
6. **Deploy Web Service**. The first build takes ~5–8 minutes; watch **Logs** until **Your service is live**.
7. Open the address at the top, e.g. **https://legal-ai-xxxx.onrender.com**.

## 2. Test

* Sign in as admin / lawyer with your existing accounts (data was copied to Neon)
* AI chat in Bangla and English · Find Lawyers · consultation booking
* Sign up with a real email → verification email (check Spam) · Forgot password → 6-digit code
* Video meeting between phone and laptop

## Good to know

* Open the site a minute before presenting (it may be asleep).
* New code pushed to GitHub deploys automatically.
* If logs show the service ran **out of memory**, set `ML_MODELS_ENABLED` to `false` (keyword search still works).
