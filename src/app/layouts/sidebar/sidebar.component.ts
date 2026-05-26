import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule, Router } from '@angular/router';
import { navigationConfig, NavItem, NavSection } from '../../configs/navigation.config';
import { AuthService } from '../../core/services/auth.service';
import { LayoutService } from '../../core/services/layout.service';

@Component({
  selector: 'app-sidebar',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <aside class="sidebar no-print" [class.show]="layoutService.sidebarOpen$ | async">
      <ng-container *ngFor="let section of navigation">
        <div class="sidebar-title" *ngIf="section.title">{{ section.title }}</div>
        <ul class="nav flex-column">
          <li class="nav-item" *ngFor="let item of section.items">
            <!-- Parent with children -->
            <ng-container *ngIf="item.children?.length; else simpleLink">
              <a class="nav-link nav-parent" (click)="toggleMenu(item.title)">
                <i [class]="item.icon || 'fas fa-circle'" class="me-2"></i>
                <span class="flex-grow-1">{{ item.title }}</span>
                <i class="fas fa-chevron-right toggle-icon small" [class.rotated]="isExpanded(item.title)"></i>
              </a>
              <ul class="nav flex-column nav-submenu" *ngIf="isExpanded(item.title)">
                <li class="nav-item" *ngFor="let child of item.children">
                  <a class="nav-link" [routerLink]="child.path" [class.active]="isRouteActive(child.path)" (click)="onMobileNavClick()">
                    <i class="fas fa-chevron-right small me-2 opacity-50"></i>{{ child.title }}
                  </a>
                </li>
              </ul>
            </ng-container>
            <!-- Simple link -->
            <ng-template #simpleLink>
              <a class="nav-link" [routerLink]="item.path" [queryParams]="item.queryParams || null"
                 [class.active]="isRouteActive(item.path, item.queryParams)" (click)="onMobileNavClick()">
                <i [class]="item.icon || 'fas fa-circle'" class="me-2"></i>{{ item.title }}
              </a>
            </ng-template>
          </li>
        </ul>
      </ng-container>
    </aside>
  `
})
export class SidebarComponent implements OnInit {
  navigation: NavSection[] = [];
  expandedItems = new Set<string>();
  currentRoute = '';

  constructor(
    private router: Router,
    private authService: AuthService,
    public layoutService: LayoutService
  ) {
    this.currentRoute = this.router.url;
  }

  ngOnInit(): void {
    this.buildNavigation();
    this.autoExpand();
    this.router.events.subscribe(() => {
      this.currentRoute = this.router.url;
      this.autoExpand();
    });
  }

  private canSee(item: NavItem): boolean {
    if (item.superAdminOnly && !this.authService.isSuperAdmin()) return false;
    if (!item.path) return true;
    const zone = item.queryParams?.['zone'];
    const screenPath = zone ? `${item.path}/${zone}` : item.path;
    return this.authService.canAccessScreen(screenPath);
  }

  private isSectionVisible(section: NavSection): boolean {
    if (section.title !== 'Zone R1' && section.title !== 'Zone RC') return true;
    const profile = this.authService.getCurrentUser()?.profile ?? '';
    if (!['FACTURIER-R1', 'FACTURIER-RC'].includes(profile)) return true;
    const zone = this.authService.getZone();
    if (!zone) return true;
    if (section.title === 'Zone R1') return zone === 'R1';
    if (section.title === 'Zone RC') return zone === 'RC';
    return true;
  }

  private buildNavigation(): void {
    this.navigation = navigationConfig
      .filter(section => this.isSectionVisible(section))
      .map(section => ({
        ...section,
        items: section.items
          .map(item => {
            if (item.children?.length) {
              const visible = item.children.filter(c => this.canSee(c));
              return visible.length ? { ...item, children: visible } : null;
            }
            return this.canSee(item) ? item : null;
          })
          .filter((i): i is NavItem => i !== null)
      }))
      .filter(s => s.items.length > 0);
  }

  private autoExpand(): void {
    const url = this.router.url;
    for (const section of this.navigation) {
      for (const item of section.items) {
        if (item.children?.some(c => c.path && url.startsWith(c.path))) {
          this.expandedItems.add(item.title);
        }
      }
    }
  }

  toggleMenu(title: string): void {
    this.expandedItems.has(title) ? this.expandedItems.delete(title) : this.expandedItems.add(title);
  }

  isExpanded(title: string): boolean { return this.expandedItems.has(title); }

  isRouteActive(path?: string, queryParams?: Record<string, string>): boolean {
    if (!path) return false;
    const [currentPath, currentQuery] = this.currentRoute.split('?');
    if (queryParams && Object.keys(queryParams).length) {
      const currentParams = new URLSearchParams(currentQuery || '');
      const match = Object.entries(queryParams).every(([k, v]) => currentParams.get(k) === v);
      return currentPath === path && match;
    }
    return currentPath === path || currentPath.startsWith(path + '/');
  }

  onMobileNavClick(): void { this.layoutService.closeSidebar(); }
}
