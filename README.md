# TaskFlow — MEAN Stack Task Management Application

A full-stack task management application built with the **MEAN stack** (MongoDB, Express, Angular, Node.js). It meets the machine-test requirements: JWT authentication, three-role authorization (Manager / Team Lead / Employee), task CRUD with status filtering, form validation, responsive UI, and **real-time updates via Socket.io**.

---

## Features

### Authentication (Express + JWT + MongoDB)
- Register with `username`, `email`, and `password`.
- Login returns a JWT; the token is stored in the browser and sent on every API request.
- All task routes are protected — only authenticated users can access them.

### Role-based Authorization
Three roles with a supervisor hierarchy (`Manager → Team Lead → Employee`):

| Role | Capabilities |
| --- | --- |
| **Manager** | See **all** users and tasks. Create, modify, and **reassign** tasks to anyone (including self). Lands on **Teams** view showing team leads and their tasks. |
| **Team Lead** | See, modify, and assign tasks for **team members** or self. Tasks are grouped by member in an accordion. |
| **Employee** | Create and modify **own** tasks only. New tasks auto-assign to self. Cannot delete tasks. |

### Task Management (MongoDB + Express)
- Mongoose schema: `title`, `description`, `status` (`pending` / `completed`), `createdAt`, `updatedAt`, `assignedTo`, `createdBy`.
- Full CRUD with role-based scoping on read, update, and delete.

### Frontend (Angular)
- Responsive dashboard with sidebar navigation, stats strip, and accordion-based organization.
- Register and login with **reactive form validation**.
- View, add, edit, and delete tasks (delete hidden for employees).
- Toggle task complete via checkbox; **filter by status** (All / Pending / Done).
- Role-aware **Assign to** dropdown in the task modal.
- **You** badge on tasks assigned to the logged-in user (Manager / Team Lead views).

### Real-time Updates (Bonus)
- Socket.io broadcasts `task:created`, `task:updated`, and `task:deleted` events.
- Connected clients refresh their task list automatically (e.g. employee edits appear for Manager / Team Lead).

---

## Project Structure

```
Task Manager/
├── README.md
├── backend/
│   ├── index.js              # Express entry, CORS, health, Socket.io, DB, routes
│   ├── seed.js               # npm run seed — demo users + sample tasks
│   ├── .env.example
│   └── src/
│       ├── config/
│       │   ├── db.config.js      # MongoDB (Atlas/local) or in-memory fallback
│       │   └── socket.config.js
│       ├── controllers/
│       │   ├── auth.controller.js
│       │   ├── user.controller.js
│       │   └── task.controller.js
│       ├── helpers/
│       │   └── scope.helper.js   # Role-based scope (who can see/assign/edit)
│       ├── middlewares/
│       │   ├── auth.middleware.js
│       │   ├── io.middleware.js
│       │   └── error.middleware.js
│       ├── models/
│       │   ├── user.model.js
│       │   └── task.model.js
│       └── routes.js
│
└── frontend/
    └── src/app/
        ├── api.service.ts    # API URLs, auth, tasks, Socket.io
        ├── auth.ts           # Route guards + JWT interceptor
        ├── app.ts / app.html # Top navbar shell
        ├── login/
        ├── register/
        └── dashboard/        # Role-aware task UI
```

### Backend convention
- Each controller defines an `express.Router()`, mounts routes inline, and uses `app.use("/", apiRouter)`.
- Live updates are emitted via `req.io` (attached by `io.middleware.js`).
- Shared authorization logic lives in `helpers/scope.helper.js`.

### Frontend convention
- **`api.service.ts`** — single service for auth, HTTP, and sockets.
- **`auth.ts`** — guest/auth guards and JWT interceptor (401 → logout).
- **`dashboard/`** — Manager, Team Lead, and Employee views driven by role.

---

## Prerequisites

- **Node.js** 20.19+ or 22.12+ (tested on Node 22).
- **npm** 10+.
- MongoDB is **optional** for local dev (in-memory fallback available).

---

## Getting Started

### 1. Backend

```bash
cd backend
npm install
```

Copy environment file:

```bash
# macOS / Linux
cp .env.example .env

# Windows
copy .env.example .env
```

Start the API:

```bash
npm start
# or with auto-reload:
npm run dev
```

API: **http://localhost:5000**  
Health: **GET http://localhost:5000/api/health** → `{ "status": "ok" }`

#### Database options

| Option | Setup |
| --- | --- |
| **In-memory (zero config)** | Leave `MONGO_URI` empty in `.env`. Data is lost on restart. |
| **Local MongoDB** | `MONGO_URI=mongodb://127.0.0.1:27017/task_manager` |
| **MongoDB Atlas** | `MONGO_URI=mongodb+srv://<user>:<pass>@<cluster>.mongodb.net/<dbname>` |

#### Seed demo data

Requires a real `MONGO_URI` (not in-memory):

```bash
cd backend
npm run seed
```

Creates three users and sample tasks. **Re-running seed clears all users and tasks.**

| Role | Email | Password |
| --- | --- | --- |
| Manager | `manager@test.com` | `password123` |
| Team Lead | `lead@test.com` | `password123` |
| Employee | `employee@test.com` | `password123` |

### 2. Frontend

```bash
cd frontend
npm install
npm start
```

Open **http://localhost:4200**. The app calls the backend at `http://localhost:5000` (CORS enabled).

---

## Environment Variables (backend `.env`)

| Variable | Description | Default |
| --- | --- | --- |
| `PORT` | API port | `5000` |
| `CLIENT_ORIGIN` | Allowed CORS origin | `http://localhost:4200` |
| `JWT_SECRET` | JWT signing secret | `super_secret_change_me` |
| `JWT_EXPIRES_IN` | Token lifetime | `7d` |
| `MONGO_URI` | MongoDB URI (empty = in-memory) | _empty_ |

> **Do not commit `.env`** — it may contain database credentials. Use `.env.example` as a template.

> For deployment or custom ports, update `API_BASE` and `SOCKET_URL` in `frontend/src/app/api.service.ts`.

---

## API Reference

### Health
| Method | Endpoint | Auth | Description |
| --- | --- | --- | --- |
| GET | `/api/health` | – | Server health check |

### Auth — `/api/auth`
| Method | Endpoint | Auth | Description |
| --- | --- | --- | --- |
| POST | `/register` | – | Register (`username`, `email`, `password`, optional `role`, `managerId`) |
| POST | `/login` | – | Login → `{ token, user }` |
| GET | `/me` | ✅ | Current user |
| GET | `/public-users` | – | Managers & team leads (registration hierarchy) |

### Users — `/api/users` (auth required)
| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/` | Users visible to current role |
| GET | `/assignable` | Users current role can assign tasks to |
| GET | `/team-leads` | Manager only: list team leads |

### Tasks — `/api/tasks` (auth required)
| Method | Endpoint | Description |
| --- | --- | --- |
| GET | `/?status=pending\|completed` | Tasks in role scope (optional filter) |
| POST | `/` | Create task |
| PUT | `/:id` | Update / reassign task |
| DELETE | `/:id` | Delete task (employees blocked) |

---

## Dashboard by Role

### Manager
- **Teams** (default) — accordion per team lead with tasks; inline reassign dropdown + edit.
- **All Tasks** — full task table with status filters; **You** badge on self-assigned tasks.
- **People** — accordion grouped by role (Managers, Team Leads, Employees).

### Team Lead
- **Tasks** — accordion per team member; member filter dropdown; **You** badge on own section.
- **Team** — team members listed by role.

### Employee
- Single task list with create, edit, complete toggle, and status filters (no delete).

---

## How It Works

1. User registers or logs in → JWT stored → attached to every HTTP request.
2. Dashboard loads tasks scoped by role via `scope.helper.js`.
3. Create / edit / delete hits the API → permissions checked → MongoDB updated → Socket.io event emitted.
4. All connected clients refresh their task list on socket events.

---

## Tech Stack

| Layer | Technologies |
| --- | --- |
| **Backend** | Node.js, Express (CommonJS), Mongoose, JWT, bcryptjs, Socket.io, mongodb-memory-server |
| **Frontend** | Angular 21 (standalone, signals), RxJS, socket.io-client |
| **Database** | MongoDB (Atlas / local / in-memory) |

---

## Deployment (Optional Bonus)

1. Create a **MongoDB Atlas** cluster and set `MONGO_URI` on the host.
2. Deploy the backend (Render, Railway, Heroku, AWS, etc.) with env vars from `.env.example`.
3. Build the frontend: `cd frontend && npm run build` → serve `dist/frontend`.
4. Set `API_BASE` and `SOCKET_URL` in `api.service.ts` to your production API URL.
5. Set `CLIENT_ORIGIN` on the backend to your frontend URL.

---

## Machine Test Checklist

| Requirement | Status |
| --- | --- |
| MEAN stack | ✅ |
| Register / Login + JWT | ✅ |
| Protected task routes | ✅ |
| 3 roles with correct permissions | ✅ |
| Manager sees team leads + tasks on login | ✅ |
| Task CRUD + status filter | ✅ |
| Angular forms + validation | ✅ |
| Responsive UI | ✅ |
| Real-time WebSocket updates | ✅ |
| README with local setup | ✅ |
| Cloud deployment | ❌ Not deployed |

---

## License

MIT
