import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';

@Component({
  selector: 'app-unauthorized',
  standalone: true,
  imports: [CommonModule, RouterModule],
  template: `
    <div style="min-height:100vh;display:flex;align-items:center;justify-content:center;background:#f8f9fa;">
      <div class="text-center p-4">
        <div style="font-size:5rem;color:#dc3545;margin-bottom:1rem;">
          <i class="fas fa-shield-alt"></i>
        </div>
        <h1 style="font-size:2rem;font-weight:800;color:#1a1a2e;">Accès refusé</h1>
        <p class="text-muted mb-4">Vous n'avez pas les permissions nécessaires pour accéder à cette page.</p>
        <a routerLink="/dashboard" class="btn btn-primary">
          <i class="fas fa-home me-2"></i>Retour au tableau de bord
        </a>
      </div>
    </div>
  `
})
export class UnauthorizedComponent {}
