# Showplayer

## Deployment

- **Site**: Vercel (`.github/workflows/vercel-deploy.yml`, runs on push to `main`).
- **Database**: Postgres on Neon (`DATABASE_URL`). Apply schema changes with `pnpm db:migrate`.
- **Daily job**: GitHub Actions (`.github/workflows/daily-cron.yml`). Runs `pnpm cron` every day at 09:00 UTC.
  Start it by hand or run a single step from the Actions tab ("Run workflow"); cancel a run from the same page.
  Locally: `set -a; source .env; set +a; SKIP_ENV_VALIDATION=1 pnpm cron [job] [tmdbListLimit]`.
- Video playback uses third-party embed players only (Videasy, Vidfast, Vidjoy, Vidlink). Source scraping and
  the video proxy were removed; the last commit that had them is tagged `last-with-scraping`.

## future functionalities

- add recommendations section to player page
- comments functionality for details page and each episode
- add share functionality
- allow users to sync friends from social media (instagram, etc.)
