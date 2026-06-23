import { Component, OnInit, inject, signal } from '@angular/core';
import { ReactiveFormsModule, FormBuilder, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { ApiService, Role, User, ROLE_LABELS } from '../api.service';

@Component({
  selector: 'app-register',
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './register.html',
})
export class Register implements OnInit {
  private fb = inject(FormBuilder);
  private api = inject(ApiService);
  private router = inject(Router);

  loading = signal(false);
  errorMsg = signal('');
  roleLabels = ROLE_LABELS;
  managers = signal<User[]>([]);
  leads = signal<User[]>([]);

  form = this.fb.group({
    username: ['', [Validators.required, Validators.minLength(3)]],
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(6)]],
    role: ['employee' as Role, Validators.required],
    managerId: [''],
  });

  ngOnInit() {
    this.api.getPublicUsers().subscribe({
      next: (users) => {
        this.managers.set(users.filter((u) => u.role === 'manager'));
        this.leads.set(users.filter((u) => u.role === 'team_lead'));
      },
    });
  }

  get role(): Role {
    return this.form.controls.role.value as Role;
  }

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    this.loading.set(true);
    this.errorMsg.set('');

    const v = this.form.getRawValue();
    this.api
      .register({
        username: v.username!,
        email: v.email!,
        password: v.password!,
        role: v.role as Role,
        managerId: v.managerId || undefined,
      })
      .subscribe({
        next: () => this.router.navigate(['/dashboard']),
        error: (err) => {
          this.errorMsg.set(err?.error?.message || 'Registration failed');
          this.loading.set(false);
        },
      });
  }
}
