import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NavbarComponent } from '../navbar/navbar.component';
import { SidebarComponent } from '../sidebar/sidebar.component';

@Component({
  selector: 'app-main-layout',
  standalone: true,
  imports: [CommonModule, RouterModule, NavbarComponent, SidebarComponent],
  template: `
    <app-navbar></app-navbar>
    <div class="layout-body">
      <app-sidebar></app-sidebar>
      <main class="main-content">
        <router-outlet></router-outlet>
      </main>
    </div>
    <footer class="layout-footer">
      <span>&copy; 2026 Claudex Bars v2. Tous droits réservés.</span>
    </footer>
  `
})
export class MainLayoutComponent {}
