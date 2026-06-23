import { Component, HostListener, inject, signal } from '@angular/core';
import { RouterOutlet, RouterLink, Router } from '@angular/router';
import { ApiService, ROLE_LABELS } from './api.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, RouterLink],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  api = inject(ApiService);
  private router = inject(Router);
  roleLabels = ROLE_LABELS;
  menuOpen = signal(false);

  toggleMenu() {
    this.menuOpen.update((open) => !open);
  }

  closeMenu() {
    this.menuOpen.set(false);
  }

  @HostListener('document:click')
  onDocumentClick() {
    this.closeMenu();
  }

  logout() {
    this.closeMenu();
    this.api.logout();
    this.router.navigate(['/login']);
  }
}
