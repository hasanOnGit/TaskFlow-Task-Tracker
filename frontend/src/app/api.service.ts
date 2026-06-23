import { Injectable, NgZone, computed, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { io, Socket } from 'socket.io-client';
import { map, tap } from 'rxjs';
import { environment } from '../environments/environment';

export const API_BASE = environment.apiBase;
export const SOCKET_URL = environment.socketUrl;

export type Role = 'manager' | 'team_lead' | 'employee';
export type TaskStatus = 'pending' | 'completed';

export interface User {
  _id: string;
  username: string;
  email: string;
  role: Role;
  manager?: string | null;
}

export interface Task {
  _id: string;
  title: string;
  description: string;
  status: TaskStatus;
  assignedTo: User;
  createdBy: User;
  createdAt: string;
  updatedAt: string;
}

export const ROLE_LABELS: Record<Role, string> = {
  manager: 'Manager',
  team_lead: 'Team Lead',
  employee: 'Employee',
};

const TOKEN_KEY = 'tm_token';
const USER_KEY = 'tm_user';

@Injectable({ providedIn: 'root' })
export class ApiService {
  private socket: Socket | null = null;

  private _user = signal<User | null>(this.readUser());
  private _token = signal<string | null>(localStorage.getItem(TOKEN_KEY));

  user = this._user.asReadonly();
  isLoggedIn = computed(() => !!this._token());
  role = computed(() => this._user()?.role ?? null);

  constructor(
    private http: HttpClient,
    private zone: NgZone
  ) {}

  get token(): string | null {
    return this._token();
  }

  login(email: string, password: string) {
    return this.http
      .post<{ token: string; user: User }>(`${API_BASE}/auth/login`, { email, password })
      .pipe(tap((res) => this.saveSession(res)));
  }

  register(data: {
    username: string;
    email: string;
    password: string;
    role?: Role;
    managerId?: string;
  }) {
    return this.http
      .post<{ token: string; user: User }>(`${API_BASE}/auth/register`, data)
      .pipe(tap((res) => this.saveSession(res)));
  }

  logout() {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    this._token.set(null);
    this._user.set(null);
    this.disconnectSocket();
  }

  getPublicUsers() {
    return this.http
      .get<{ users: User[] }>(`${API_BASE}/auth/public-users`)
      .pipe(map((r) => r.users));
  }

  getTasks(status?: TaskStatus | '') {
    let params = new HttpParams();
    if (status) params = params.set('status', status);
    return this.http
      .get<{ tasks: Task[] }>(`${API_BASE}/tasks`, { params })
      .pipe(map((r) => r.tasks));
  }

  createTask(data: {
    title: string;
    description?: string;
    status?: TaskStatus;
    assignedTo?: string;
  }) {
    return this.http
      .post<{ task: Task }>(`${API_BASE}/tasks`, data)
      .pipe(map((r) => r.task));
  }

  updateTask(
    id: string,
    data: Partial<{ title: string; description: string; status: TaskStatus; assignedTo: string }>
  ) {
    return this.http
      .put<{ task: Task }>(`${API_BASE}/tasks/${id}`, data)
      .pipe(map((r) => r.task));
  }

  deleteTask(id: string) {
    return this.http.delete(`${API_BASE}/tasks/${id}`);
  }

  getAssignableUsers() {
    return this.http
      .get<{ users: User[] }>(`${API_BASE}/users/assignable`)
      .pipe(map((r) => r.users));
  }

  getUsers() {
    return this.http
      .get<{ users: User[] }>(`${API_BASE}/users`)
      .pipe(map((r) => r.users));
  }

  getTeamLeads() {
    return this.http
      .get<{ users: User[] }>(`${API_BASE}/users/team-leads`)
      .pipe(map((r) => r.users));
  }

  connectSocket(onChange: () => void) {
    if (this.socket) return;

    this.socket = io(SOCKET_URL, {
      auth: { token: this.token },
      transports: ['websocket', 'polling'],
    });

    const refresh = () => this.zone.run(onChange);
    this.socket.on('task:created', refresh);
    this.socket.on('task:updated', refresh);
    this.socket.on('task:deleted', refresh);
  }

  disconnectSocket() {
    this.socket?.disconnect();
    this.socket = null;
  }

  private saveSession(res: { token: string; user: User }) {
    localStorage.setItem(TOKEN_KEY, res.token);
    localStorage.setItem(USER_KEY, JSON.stringify(res.user));
    this._token.set(res.token);
    this._user.set(res.user);
  }

  private readUser(): User | null {
    const raw = localStorage.getItem(USER_KEY);
    return raw ? JSON.parse(raw) : null;
  }
}
