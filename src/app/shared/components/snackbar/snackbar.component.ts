import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { SnackbarService, SnackbarMessage } from '../../../core/services/snackbar.service';

@Component({
  selector: 'app-snackbar',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './snackbar.component.html',
  styles: [`
    .snackbar-container {
      position: fixed;
      bottom: 1.5rem;
      right: 1.5rem;
      z-index: 10000;
      display: flex;
      flex-direction: column;
      gap: 0.5rem;
      max-width: 380px;
    }
    .snackbar-item {
      display: flex;
      align-items: center;
      padding: 0.85rem 1rem;
      border-radius: 8px;
      color: white;
      font-size: 0.9rem;
      font-weight: 500;
      box-shadow: 0 4px 12px rgba(0,0,0,0.2);
      animation: slideIn 0.3s ease;
      min-height: auto;
      min-width: auto;
    }
    .snackbar-success { background-color: #198754; }
    .snackbar-error { background-color: #dc3545; }
    .snackbar-warning { background-color: #856404; background-color: #ffc107; color: #000 !important; }
    .snackbar-info { background-color: #0d6efd; }
    .snackbar-close {
      margin-left: auto;
      background: none;
      border: none;
      color: inherit;
      cursor: pointer;
      padding: 0 0 0 0.75rem;
      font-size: 0.8rem;
      opacity: 0.8;
      min-height: auto;
      min-width: auto;
      &:hover { opacity: 1; }
    }
    @keyframes slideIn {
      from { transform: translateX(100%); opacity: 0; }
      to { transform: translateX(0); opacity: 1; }
    }
  `]
})
export class SnackbarComponent {
  constructor(public snackbar: SnackbarService) {}

  getIcon(type: string): string {
    const icons: Record<string, string> = {
      success: 'fas fa-check-circle',
      error: 'fas fa-exclamation-circle',
      warning: 'fas fa-exclamation-triangle',
      info: 'fas fa-info-circle'
    };
    return icons[type] || 'fas fa-info-circle';
  }
}
