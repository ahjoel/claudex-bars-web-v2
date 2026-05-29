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
  templateUrl: './sidebar.component.html'
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
