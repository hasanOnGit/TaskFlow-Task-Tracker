# TaskFlow

A task manager built with MongoDB, Express, Angular, and Node.js. Users log in with JWT, get a role (Manager, Team Lead, or Employee), and manage tasks with live updates over Socket.io.

**Live app**

| | URL |
| --- | --- |
| Frontend | https://task-flow-task-tracker.vercel.app |
| Backend API | https://taskflow-task-tracker.onrender.com |
| Health check | https://taskflow-task-tracker.onrender.com/api/health |

---

## Test accounts

Run the seed script first (see below), then log in with any of these. Password is the same for all three.

| Role | Email | Password |
| --- | --- | --- |
| Manager | `manager@test.com` | `password123` |
| Team Lead | `lead@test.com` | `password123` |
| Employee | `employee@test.com` | `password123` |

### What to try after login

**Manager** (`manager@test.com`)

1. Lands on **Teams** — expand a team lead to see their tasks and reassign work.
2. Open **All Tasks** for the full list with status filters.
3. Open **People** to browse users by role.
4. Use **+ New Task** to create tasks and assign them to anyone.

**Team Lead** (`lead@test.com`)

1. **Tasks** tab — tasks grouped by team member; filter by member from the dropdown.
2. **Team** tab — list of people you manage.
3. Can assign tasks to yourself or employees on your team.

**Employee** (`employee@test.com`)

1. Single task view (no top tabs).
2. Can create, edit, and mark tasks complete.
3. Delete is hidden — the API returns 403 if attempted.

On all roles, click your **name** in the top bar to see your name and email. **Logout** is on the right (turns red on hover).

---

## Local setup

You need Node.js 20+ and a MongoDB connection string (Atlas or local).

### 1. Clone and install

```bash
git clone https://github.com/hasanOnGit/TaskFlow-Task-Tracker.git
cd TaskFlow-Task-Tracker
```

```bash
cd backend
npm install
copy .env.example .env
```

Edit `backend/.env` and set at least:

```env
MONGO_URI=mongodb+srv://...
JWT_SECRET=your_secret_here
CLIENT_ORIGIN=http://localhost:4200
```

### 2. Seed the database

```bash
cd backend
npm run seed
```

This wipes existing users/tasks in that database and creates the three test accounts plus sample tasks. Safe to run again when you want a clean slate.

### 3. Start the backend

```bash
npm start
```

API runs on http://localhost:5000

### 4. Start the frontend

```bash
cd ../frontend
npm install
npm start
```

Open http://localhost:4200 and log in with one of the test accounts above.

Local API URLs are in `frontend/src/environments/environment.ts`. Production URLs are in `environment.prod.ts`.

---

## Project layout

```
Task Manager/
├── backend/          Express API, JWT, Socket.io
│   ├── index.js
│   ├── seed.js
│   └── src/
│       ├── config/       db, socket, cors
│       ├── controllers/  auth, users, tasks
│       ├── helpers/      role scoping
│       ├── middlewares/
│       └── models/
└── frontend/         Angular 21 app
    └── src/app/
        ├── api.service.ts
        ├── auth.ts
        ├── login/ register/
        └── dashboard/
```

---

## Roles

| Role | Can see | Can assign to | Delete tasks |
| --- | --- | --- | --- |
| Manager | Everyone, all tasks | Anyone | Yes |
| Team Lead | Self + direct reports | Self + team members | Yes |
| Employee | Own tasks | Self only (auto on create) | No |

Hierarchy: Manager → Team Lead → Employee (via `manager` field on the user model).

---

## Deployment

Single repo, two hosts:

| Part | Host | Root directory |
| --- | --- | --- |
| Frontend | Vercel | `frontend` |
| Backend | Render | `backend` |
| Database | MongoDB Atlas | — |

### Render (backend)

- **Build command:** `npm install`
- **Start command:** `node index.js`
- **Environment variables:**

| Variable | Example |
| --- | --- |
| `MONGO_URI` | Atlas connection string |
| `JWT_SECRET` | long random string |
| `CLIENT_ORIGIN` | `https://task-flow-task-tracker.vercel.app` (no trailing slash) |

### Vercel (frontend)

- **Root directory:** `frontend`
- **Build command:** `npm run build`
- **Output directory:** `dist/frontend/browser`

Update `frontend/src/environments/environment.prod.ts` with your Render API URL before deploying.

### CORS notes

`CLIENT_ORIGIN` must match your Vercel URL exactly. The backend also allows `*.vercel.app` preview URLs. If login fails with a CORS error, double-check that env var on Render and redeploy.

---

## API (quick reference)

**Auth** — `/api/auth`

- `POST /register` — create account
- `POST /login` — returns `{ token, user }`
- `GET /me` — current user (auth required)

**Users** — `/api/users` (auth required)

- `GET /` — users visible to your role
- `GET /assignable` — users you can assign tasks to
- `GET /team-leads` — manager only

**Tasks** — `/api/tasks` (auth required)

- `GET /?status=pending|completed` — list tasks
- `POST /` — create
- `PUT /:id` — update / reassign
- `DELETE /:id` — delete (employees blocked)

---

## Tech stack

- **Backend:** Express, Mongoose, JWT, bcryptjs, Socket.io
- **Frontend:** Angular 21, RxJS, socket.io-client
- **Database:** MongoDB Atlas

---

## License

MIT
