import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { DatePipe } from '@angular/common';
import {
  ApiService,
  Task,
  TaskStatus,
  User,
  ROLE_LABELS,
  Role,
} from '../api.service';

interface LeadTaskGroup {
  lead: User;
  tasks: Task[];
}

type ManagerTab = 'tasks' | 'teams' | 'users';
type LeadTab = 'tasks' | 'team';

interface PeopleGroup {
  role: Role;
  label: string;
  users: User[];
}

const ROLE_GROUP_LABELS: Record<Role, string> = {
  manager: 'Managers',
  team_lead: 'Team Leads',
  employee: 'Employees',
};

@Component({
  selector: 'app-dashboard',
  imports: [ReactiveFormsModule, DatePipe],
  templateUrl: './dashboard.html',
  styleUrl: './dashboard.css',
})
export class Dashboard implements OnInit, OnDestroy {
  private fb = inject(FormBuilder);
  api = inject(ApiService);

  roleLabels = ROLE_LABELS;
  tasks = signal<Task[]>([]);
  allUsers = signal<User[]>([]);
  teamLeads = signal<User[]>([]);
  teamMembers = signal<User[]>([]);
  assignableUsers = signal<User[]>([]);
  filter = signal<TaskStatus | ''>('');
  loading = signal(false);
  errorMsg = signal('');
  showForm = signal(false);
  editingId = signal<string | null>(null);
  saving = signal(false);
  managerTab = signal<ManagerTab>('teams');
  leadTab = signal<LeadTab>('tasks');
  expandedLeadId = signal<string | null>(null);
  expandedMemberId = signal<string | null>(null);
  expandedRole = signal<Role | null>(null);
  memberFilter = signal<string>('');

  form = this.fb.group({
    title: ['', [Validators.required, Validators.minLength(3)]],
    description: [''],
    status: ['pending' as TaskStatus],
    assignedTo: [''],
  });

  isManager = computed(() => this.api.role() === 'manager');
  isTeamLead = computed(() => this.api.role() === 'team_lead');
  isEmployee = computed(() => this.api.role() === 'employee');
  hasSidebar = computed(() => this.isManager() || this.isTeamLead());

  pendingCount = computed(() => this.tasks().filter((t) => t.status === 'pending').length);
  completedCount = computed(() => this.tasks().filter((t) => t.status === 'completed').length);
  completionRate = computed(() => {
    const total = this.tasks().length;
    return total ? Math.round((this.completedCount() / total) * 100) : 0;
  });
  canAssign = computed(() => !this.isEmployee());
  canDelete = computed(() => !this.isEmployee());

  hasMemberTasks = computed(() => this.memberTaskGroups().some((g) => g.tasks.length > 0));

  memberTaskGroups = computed(() => {
    const filter = this.memberFilter();
    const members = this.teamMembers();
    const tasks = this.tasks();

    return members
      .filter((m) => !filter || m._id === filter)
      .map((member) => ({
        member,
        tasks: tasks.filter((t) => t.assignedTo._id === member._id),
      }));
  });

  peopleGroups = computed((): PeopleGroup[] => {
    const users = this.isManager() ? this.allUsers() : this.teamMembers();
    const roles: Role[] = ['manager', 'team_lead', 'employee'];
    return roles
      .map((role) => ({
        role,
        label: ROLE_GROUP_LABELS[role],
        users: users.filter((u) => u.role === role),
      }))
      .filter((g) => g.users.length > 0);
  });

  leadGroups = computed<LeadTaskGroup[]>(() => {
    const leads = this.teamLeads();
    const tasks = this.tasks();
    const users = this.allUsers();

    const employeeToLead = new Map<string, string>();
    users
      .filter((u) => u.role === 'employee' && u.manager)
      .forEach((u) => employeeToLead.set(u._id, u.manager!));

    return leads.map((lead) => ({
      lead,
      tasks: tasks.filter((t) => {
        const assigneeId = t.assignedTo._id;
        return assigneeId === lead._id || employeeToLead.get(assigneeId) === lead._id;
      }),
    }));
  });

  activeTabLabel = computed(() => {
    if (this.isManager()) {
      const labels: Record<ManagerTab, string> = {
        tasks: 'Task Board',
        teams: 'Team Overview',
        users: 'People Directory',
      };
      return labels[this.managerTab()];
    }
    if (this.isTeamLead()) {
      return this.leadTab() === 'tasks' ? 'Task Board' : 'My Team';
    }
    return 'My Tasks';
  });

  ngOnInit() {
    this.loadTasks();
    this.loadRoleData();
    if (this.canAssign()) {
      this.api.getAssignableUsers().subscribe((users) => this.assignableUsers.set(users));
    }
    this.api.connectSocket(() => this.loadTasks(true));
  }

  ngOnDestroy() {
    this.api.disconnectSocket();
  }

  setManagerTab(tab: ManagerTab) {
    this.managerTab.set(tab);
  }

  setLeadTab(tab: LeadTab) {
    this.leadTab.set(tab);
  }

  setMemberFilter(memberId: string) {
    this.memberFilter.set(memberId);
  }

  toggleLeadPanel(leadId: string) {
    this.expandedLeadId.set(this.expandedLeadId() === leadId ? null : leadId);
  }

  toggleMemberPanel(memberId: string) {
    this.expandedMemberId.set(this.expandedMemberId() === memberId ? null : memberId);
  }

  toggleRolePanel(role: Role) {
    this.expandedRole.set(this.expandedRole() === role ? null : role);
  }

  loadRoleData() {
    if (this.isManager()) {
      this.api.getUsers().subscribe((users) => {
        this.allUsers.set(users);
        this.expandedRole.set('team_lead');
      });
      this.api.getTeamLeads().subscribe((leads) => {
        this.teamLeads.set(leads);
        if (leads.length > 0) this.expandedLeadId.set(leads[0]._id);
      });
    }
    if (this.isTeamLead()) {
      this.api.getUsers().subscribe((users) => {
        this.teamMembers.set(users);
        const first = users.find((u) => u.role === 'employee') ?? users[0];
        if (first) this.expandedMemberId.set(first._id);
      });
    }
  }

  loadTasks(quiet = false) {
    if (!quiet) this.loading.set(true);
    this.api.getTasks(this.filter()).subscribe({
      next: (tasks) => {
        this.tasks.set(tasks);
        this.loading.set(false);
      },
      error: (err) => {
        this.errorMsg.set(err?.error?.message || 'Failed to load tasks');
        this.loading.set(false);
      },
    });
  }

  setFilter(value: TaskStatus | '') {
    this.filter.set(value);
    this.loadTasks();
  }

  openCreate() {
    this.editingId.set(null);
    this.form.reset({ title: '', description: '', status: 'pending', assignedTo: '' });
    this.showForm.set(true);
  }

  openEdit(task: Task) {
    this.editingId.set(task._id);
    this.form.reset({
      title: task.title,
      description: task.description,
      status: task.status,
      assignedTo: task.assignedTo._id,
    });
    this.showForm.set(true);
  }

  closeForm() {
    this.showForm.set(false);
    this.editingId.set(null);
  }

  save() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.saving.set(true);
    const v = this.form.getRawValue();
    const payload = {
      title: v.title!,
      description: v.description || '',
      status: v.status as TaskStatus,
      ...(this.canAssign() && v.assignedTo ? { assignedTo: v.assignedTo } : {}),
    };

    const id = this.editingId();
    const call = id ? this.api.updateTask(id, payload) : this.api.createTask(payload);

    call.subscribe({
      next: () => {
        this.saving.set(false);
        this.closeForm();
        this.loadTasks(true);
      },
      error: (err) => {
        this.errorMsg.set(err?.error?.message || 'Failed to save task');
        this.saving.set(false);
      },
    });
  }

  toggleStatus(task: Task) {
    const next: TaskStatus = task.status === 'pending' ? 'completed' : 'pending';
    this.api.updateTask(task._id, { status: next }).subscribe({
      next: () => this.loadTasks(true),
      error: (err) => this.errorMsg.set(err?.error?.message || 'Failed to update task'),
    });
  }

  remove(task: Task) {
    if (!this.canDelete()) return;
    if (!confirm(`Delete task "${task.title}"?`)) return;
    this.api.deleteTask(task._id).subscribe({
      next: () => this.loadTasks(true),
      error: (err) => this.errorMsg.set(err?.error?.message || 'Failed to delete task'),
    });
  }

  reassignTask(task: Task, userId: string) {
    if (!userId || userId === task.assignedTo._id) return;
    this.api.updateTask(task._id, { assignedTo: userId }).subscribe({
      next: () => this.loadTasks(true),
      error: (err) => this.errorMsg.set(err?.error?.message || 'Failed to reassign task'),
    });
  }

  initials(name: string) {
    return name
      .split(' ')
      .map((w) => w[0])
      .join('')
      .slice(0, 2)
      .toUpperCase();
  }

  roleClass(role: Role) {
    return `role-${role.replace('_', '-')}`;
  }
}
