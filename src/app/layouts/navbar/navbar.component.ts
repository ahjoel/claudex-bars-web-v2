import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router } from '@angular/router';
import { AuthService } from '../../core/services/auth.service';
import { LayoutService } from '../../core/services/layout.service';

@Component({
  selector: 'app-navbar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './navbar.component.html',
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
