# TaskFlow

A task manager built with MongoDB, Express, Angular, and Node.js. Users log in with JWT, get a role (Manager, Team Lead, or Employee), and manage tasks with live updates over Socket.io.

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

Click your **name** in the top bar to see your name and email. **Logout** is on the right.

---

## Local setup

You need Node.js 20+ and a MongoDB connection string.

### 1. Install backend

```bash
cd backend
npm install
copy .env.example .env
```

Edit `backend/.env`:

```env
MONGO_URI=mongodb+srv://...
JWT_SECRET=your_secret_here
CLIENT_ORIGIN=http://localhost:4200
```

### 2. Seed the database

```bash
npm run seed
```

Creates the three test accounts and sample tasks. Running it again clears users and tasks in that database.

### 3. Start the backend

```bash
npm start
```

API: http://localhost:5000

### 4. Start the frontend

```bash
cd ../frontend
npm install
npm start
```

Open http://localhost:4200 and log in.

---

## Roles

| Role | Can see | Can assign to | Delete tasks |
| --- | --- | --- | --- |
| Manager | Everyone, all tasks | Anyone | Yes |
| Team Lead | Self + direct reports | Self + team members | Yes |
| Employee | Own tasks | Self only (auto on create) | No |

Hierarchy: Manager → Team Lead → Employee.

---

## API

**Auth** — `/api/auth`

- `POST /register` — create account
- `POST /login` — returns `{ token, user }`
- `GET /me` — current user

**Users** — `/api/users`

- `GET /` — users visible to your role
- `GET /assignable` — users you can assign tasks to
- `GET /team-leads` — manager only

**Tasks** — `/api/tasks`

- `GET /?status=pending|completed` — list tasks
- `POST /` — create
- `PUT /:id` — update / reassign
- `DELETE /:id` — delete (employees blocked)

---

## Tech stack

- **Backend:** Express, Mongoose, JWT, bcryptjs, Socket.io
- **Frontend:** Angular, RxJS, socket.io-client
- **Database:** MongoDB

---

## License

MIT
