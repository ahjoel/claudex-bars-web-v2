import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { LayoutService } from '../../core/services/layout.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule],
  template: `
    <nav class="navbar-custom d-flex align-items-center justify-content-between w-100 no-print">
      <div class="d-flex align-items-center gap-3">
        <button class="btn btn-link text-white p-0 d-lg-none" (click)="layoutService.toggleSidebar()" style="min-height:auto;min-width:auto;">
          <i class="fas fa-bars fa-lg"></i>
        </button>
        <a class="navbar-brand">
          <i class="fas fa-wine-glass-alt me-1"></i>
          Claudex Bars v2
        </a>
      </div>

      <div class="d-flex align-items-center gap-3">
        <div class="user-menu-container position-relative">
          <button class="btn d-flex align-items-center gap-2 text-white" (click)="toggleUserMenu()" style="min-height:auto;border:1px solid rgba(255,255,255,0.3);border-radius:8px;padding:0.4rem 0.75rem;">
            <div class="avatar-circle">{{ getInitials() }}</div>
            <div class="d-none d-sm-block text-start">
              <div class="small fw-bold lh-1">{{ username }}</div>
              <div class="small opacity-75" style="font-size:0.75rem;">{{ profile }}</div>
            </div>
            <i class="fas fa-chevron-down small opacity-75"></i>
          </button>

          <div class="user-dropdown" *ngIf="userMenuOpen">
            <div class="dropdown-header">
              <div class="fw-bold">{{ username }}</div>
              <div class="small text-muted">{{ profile }}</div>
            </div>
            <div class="dropdown-divider"></div>
            <button class="dropdown-item text-danger" (click)="logout()">
              <i class="fas fa-sign-out-alt me-2"></i> Déconnexion
            </button>
          </div>
        </div>
      </div>
    </nav>
  `,
  styles: [`
    .avatar-circle {
      width: 32px; height: 32px;
      background: rgba(255,255,255,0.25);
      border-radius: 50%;
      display: flex; align-items: center; justify-content: center;
      font-weight: 700; font-size: 0.85rem;
      min-height: auto; min-width: auto;
    }
    .user-dropdown {
      position: absolute; right: 0; top: calc(100% + 8px);
      background: white; border-radius: 8px;
      box-shadow: 0 8px 25px rgba(0,0,0,0.15);
      min-width: 200px; z-index: 1000;
      border: 1px solid #e9ecef;
    }
    .dropdown-header { padding: 0.75rem 1rem; }
    .dropdown-divider { margin: 0; border-top: 1px solid #e9ecef; }
    .dropdown-item {
      padding: 0.65rem 1rem; display: flex; align-items: center;
      cursor: pointer; background: none; border: none; width: 100%;
      font-size: 0.9rem; min-height: auto; min-width: auto;
      &:hover { background: #f8f9fa; }
    }
  `]
})
export class NavbarComponent implements OnInit {
  userMenuOpen = false;
  username = '';
  profile = '';

  constructor(
    private authService: AuthService,
    private router: Router,
    public layoutService: LayoutService
  ) {}

  ngOnInit(): void {
    this.loadUser();
    this.authService.currentUser$.subscribe(() => this.loadUser());
  }

  private loadUser(): void {
    const user = this.authService.getCurrentUser();
    this.username = user?.username || 'Utilisateur';
    this.profile = user?.profile || 'user';
  }

  toggleUserMenu(): void { this.userMenuOpen = !this.userMenuOpen; }

  @HostListener('document:click', ['$event'])
  onClickOutside(event: Event): void {
    if (!(event.target as HTMLElement).closest('.user-menu-container')) {
      this.userMenuOpen = false;
    }
  }

  logout(): void {
    this.authService.logout();
    this.router.navigate(['/login']);
  }

  getInitials(): string { return this.username.charAt(0).toUpperCase(); }
}
