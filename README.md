# Notification Delivery System 🚀

An enterprise-grade, high-performance notification delivery engine built for massive scale. Create email and push notification campaigns, process them across a distributed worker pool, and monitor real-time delivery progress for 100,000+ users effortlessly.

Design rationale and in-depth architecture are detailed in [ARCHITECTURE.md](ARCHITECTURE.md).

## 🧠 What is this project?

This system solves the complex problem of reliable, asynchronous notification delivery. It accepts campaign requests via a REST API, expands those campaigns into individual jobs, and robustly processes them using a background worker cluster.

**Key Features:**
- **Zero-Config Setup**: Fully dockerized. Everything from database migrations to data seeding happens automatically on boot.
- **Resilient Background Processing**: Using Redis + BullMQ for durable, retry-able job processing.
- **Auto-Seeding**: A built-in seeder that instantly populates the database with 100,000 mock users.
- **Idempotency & Concurrency Limits**: Bulletproof distributed locking ensures no user receives the same notification twice.
- **Real-Time Monitoring**: A blazing fast Next.js frontend with TanStack Query polling the progress in real-time.

---

## 🛠️ Tech Stack

- **Frontend:** Next.js (App Router), TypeScript, Tailwind CSS, TanStack Query, React Hook Form + Zod, Lucide.
- **Backend API:** Node.js, Express 5, TypeScript, Prisma ORM, Zod, Pino.
- **Worker Node:** Standalone Node.js process using BullMQ for parallelized job execution.
- **Databases:** PostgreSQL 16 (Primary Data Source of Truth) + Redis 7 (Message Broker).
- **Orchestration:** Docker & Docker Compose (Containerization & Networking).

---

## 🚀 Installation & Usage Guide (Step-by-Step)

We've engineered the setup to be completely friction-free. You **do not** need Node.js, PostgreSQL, or Redis installed on your local machine—Docker handles everything.

### Step 1: Prerequisites

- Ensure you have [Git](https://git-scm.com/) installed.
- Ensure you have [Docker Desktop](https://www.docker.com/products/docker-desktop/) installed and running on your machine.

---

## 🔑 Environment Variables

A [`.env.example`](.env.example) file is included in the project root with all variables pre-filled. **When running via Docker Compose you do not need to create any `.env` file** — all variables are injected directly by `docker-compose.yml`.

If you want to run the backend locally (outside Docker), copy the example:
```bash
cp .env.example backend/.env
```

| Variable | Default | Description |
| --- | --- | --- |
| `DATABASE_URL` | `postgresql://postgres:1234@localhost:5432/notifications` | PostgreSQL connection string |
| `REDIS_URL` | `redis://localhost:6379` | Redis connection string |
| `PORT` | `5000` | Port the Express API listens on |
| `CORS_ORIGIN` | `http://localhost:3000` | Allowed CORS origin |
| `SEED_USER_COUNT` | `100000` | Number of mock users to seed on first boot |
| `RECIPIENT_BATCH_SIZE` | `1000` | Users processed per campaign expansion batch |
| `NOTIFICATION_WORKER_CONCURRENCY` | `20` | Parallel notification jobs per worker process |
| `MAX_NOTIFICATION_RETRIES` | `3` | Max delivery attempts per notification |
| `PROCESSING_TIMEOUT_SECONDS` | `300` | Seconds before a stuck job is auto-recovered |
| `RECONCILE_INTERVAL_SECONDS` | `5` | How often the maintenance job ticks |
| `NEXT_PUBLIC_API_BASE_URL` | `http://localhost:5000/api` | *(Frontend only)* Base URL for all API calls |

---

### Step 2: Boot the System

Open your terminal in the root of the project and run:
```bash
docker-compose up -d
```
This single command builds all images (on first run), creates the containers, and starts everything in the background.

### Step 3: Wait for Auto-Setup (Migrations + Seeding)

You do **not** need to run any manual database commands. The boot sequence is fully automated:

1. **postgres** starts first and waits until it is healthy (Port `5432`).
2. **redis** starts and waits until it is healthy (Port `6379`).
3. **backend** starts only after both databases are healthy. It then runs, in order:
   - `npm run migrate` — applies all Prisma schema migrations.
   - `npm run seed` — populates the database with **100,000 mock users** (safe to re-run; duplicates are skipped automatically).
   - `npm run dev` — starts the Express API on Port `5000`.
4. **worker** starts after the backend and begins draining the BullMQ job queues.
5. **frontend** compiles and starts the Next.js UI on Port `3000`.

*The initial build and seeding may take 1–3 minutes. You can watch the backend's progress with:*
```bash
docker-compose logs -f backend
```
*Look for `Seeded 100000 new users` to confirm seeding is complete and the API is ready.*

### Step 4: Access & Use the Application

Once seeding is finished:

1. **Open the Dashboard**: Navigate to [http://localhost:3000](http://localhost:3000) in your browser.
2. **Backend API**: Available at [http://localhost:5000/api](http://localhost:5000/api).
3. **Create a Campaign**: Use the UI to enter a title, message, and select a channel (Email or Push), then submit.
4. **Monitor Progress**: Watch real-time updates as the worker processes notifications. The progress bar shows successful and failed deliveries as they happen.
5. **Analyze Failures**: Filter the notifications view by **Failed** status to inspect the retry mechanism and simulated failure details.

### Step 5: Stopping the System

When you are done, stop and remove the containers:
```bash
docker-compose down
```

> **Important:** This preserves your database data (the 100k seeded users, any campaigns you created, etc.) because the PostgreSQL volume is kept intact.

### Step 6: Re-starting the System (Next Time)

To start the system again after you've stopped it, just run the same command:
```bash
docker-compose up -d
```
Since the database volume still has your data, seeding will detect the existing users and skip them (`0 new users`). The API and worker will be ready in seconds.

> **Want a completely fresh start?** If you want to wipe all data and re-seed from scratch, tear down the volumes first:
> ```bash
> docker-compose down -v
> docker-compose up -d
> ```
> The `-v` flag deletes the database and Redis volumes, so the next boot will re-create and re-seed everything.

---

## 🛑 Managing the Containers

| Command | What it does |
| --- | --- |
| `docker-compose logs -f` | Stream live logs from all containers |
| `docker-compose logs -f backend` | Stream logs from only the backend |
| `docker-compose ps` | Show the status of all running containers |
| `docker-compose stop` | Pause containers without removing them (data is preserved) |
| `docker-compose start` | Resume paused containers |
| `docker-compose down` | Stop and remove containers (data volumes are **kept**) |
| `docker-compose down -v` | Stop and remove containers **and** delete all data volumes (full reset) |

---

## 🗄️ Inspecting the Database

The database is completely managed by Docker, but you can inspect the 100,000 auto-seeded users using any external DB client (like **pgAdmin** or **DBeaver**).

Use these exact credentials to connect:
- **Host**: `localhost`
- **Port**: `5432`
- **Database Name**: `notifications` *(Important: Ensure you are connecting to this specific database, not the default "postgres" database!)*
- **Username**: `postgres`
- **Password**: `1234`

*In pgAdmin: Right-click "Servers" -> "Register Server". Enter the connection details above. To see your users, navigate to `notifications -> Schemas -> public -> Tables -> users`.*

---

## ⚙️ Mock Providers & Retry Logic

`MockEmailProvider` and `MockPushProvider` simulate network conditions and failures deterministically to demonstrate our robust retry logic:
- `userId % 50 === 0` → Always fails. Attempts 3 times, then gets marked as `FAILED` (2,000 out of 100,000 users).
- `userId % 10 === 0` → Fails twice, but gracefully succeeds on attempt 3 (8,000 users).
- Everyone else succeeds on attempt 1.

*Tip: In the frontend, filter the notifications page by status **Failed** to see the `lastError` and retry counts.*

---

## 📡 REST API Reference

| Method | Path | Description |
| --- | --- | --- |
| `POST` | `/api/campaigns` | Create campaign + recipients, queue it. `202 Accepted`. Body: `title, message, channel (EMAIL\|PUSH), scheduledAt (ISO), userIds?` |
| `GET` | `/api/campaigns` | Paginated list (`page, limit, status, channel`) + per-status counts |
| `GET` | `/api/campaigns/:id` | Campaign details |
| `GET` | `/api/campaigns/:id/progress` | `status, totalRecipients, completedCount, failedCount, processing, pending` |
| `POST` | `/api/campaigns/:id/process` | Start now (promotes the delayed job). Idempotent. `202`, or `409` if already finished |
| `GET` | `/api/users` | Paginated users (`page, limit, search`) |
| `GET` | `/api/notifications` | Keyset-paginated visible notifications (`userId, campaignId, status, channel, cursor, limit≤100`) → `{ items, nextCursor }` |
| `PATCH` | `/api/notifications/:id/hide` | Sets `isVisible = false` (history is kept) |
| `GET` | `/health` | API, PostgreSQL and Redis status (`503` if a dependency is down) |

Errors strictly follow `{ "error": { "message": string, "details"?: [...] } }` with standard HTTP status codes (`400`, `404`, `409`, `500`).