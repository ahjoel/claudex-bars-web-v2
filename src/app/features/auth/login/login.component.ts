import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule, FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { AuthService } from '../../../core/services/auth.service';
import { SnackbarService } from '../../../core/services/snackbar.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  template: `
    <div class="login-page">
      <div class="login-card">
        <!-- Logo / Header -->
        <div class="login-header">
          <div class="login-logo">
            <img src="favicon.svg" alt="logo" width="44" height="44" />
          </div>
          <h1 class="login-title">Claudex Bars</h1>
          <p class="login-subtitle">Système de gestion v2</p>
        </div>

        <!-- Form -->
        <form [formGroup]="loginForm" (ngSubmit)="onSubmit()" class="login-form">
          <div class="mb-3">
            <label class="form-label">Nom d'utilisateur</label>
            <div class="input-group">
              <span class="input-group-text"><i class="fas fa-user text-muted"></i></span>
              <input type="text" class="form-control" formControlName="username" placeholder="Votre identifiant"
                [class.is-invalid]="submitted && f['username'].errors" />
            </div>
            <div class="invalid-feedback d-block" *ngIf="submitted && f['username'].errors">
              Identifiant requis (min. 3 caractères)
            </div>
          </div>

          <div class="mb-4">
            <label class="form-label">Mot de passe</label>
            <div class="input-group">
              <span class="input-group-text"><i class="fas fa-lock text-muted"></i></span>
              <input [type]="showPassword ? 'text' : 'password'" class="form-control" formControlName="password"
                placeholder="Votre mot de passe" [class.is-invalid]="submitted && f['password'].errors" />
              <button type="button" class="input-group-text bg-white" (click)="showPassword = !showPassword" style="min-height:auto;min-width:auto;cursor:pointer;">
                <i [class]="showPassword ? 'fas fa-eye-slash' : 'fas fa-eye'" class="text-muted"></i>
              </button>
            </div>
            <div class="invalid-feedback d-block" *ngIf="submitted && f['password'].errors">
              Mot de passe requis (min. 6 caractères)
            </div>
          </div>

          <button type="submit" class="btn btn-primary w-100" [disabled]="loading">
            <span *ngIf="loading" class="spinner-border spinner-border-sm me-2"></span>
            <i *ngIf="!loading" class="fas fa-sign-in-alt me-2"></i>
            {{ loading ? 'Connexion...' : 'Se connecter' }}
          </button>
        </form>

        <div class="login-footer">
          <span class="text-muted small">&copy; 2026 Claudex Bars v2</span>
        </div>
      </div>
    </div>
  `,
  styles: [`
    .login-page {
      min-height: 100vh;
      background: linear-gradient(135deg, #0d6efd 0%, #004085 60%, #002050 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1rem;
    }
    .login-card {
      background: white;
      border-radius: 16px;
      padding: 2.5rem;
      width: 100%;
      max-width: 420px;
      box-shadow: 0 20px 60px rgba(0,0,0,0.3);
    }
    .login-header {
      text-align: center;
      margin-bottom: 2rem;
    }
    .login-logo {
      width: 80px; height: 80px;
      display: flex; align-items: center; justify-content: center;
      margin: 0 auto 1rem;
      filter: drop-shadow(0 4px 12px rgba(59,130,246,0.45));
    }
    .login-title {
      font-size: 1.6rem;
      font-weight: 800;
      color: #1a1a2e;
      margin: 0;
    }
    .login-subtitle {
      color: #6c757d;
      font-size: 0.9rem;
      margin-top: 0.3rem;
    }
    .login-form { margin-bottom: 1.5rem; }
    .login-footer { text-align: center; padding-top: 1rem; border-top: 1px solid #e9ecef; }
    button[type="submit"] { height: 48px; font-size: 1rem; font-weight: 600; }
  `]
})
export class LoginComponent {
  loginForm: FormGroup;
  loading = false;
  submitted = false;
  showPassword = false;

  constructor(
    private fb: FormBuilder,
    private authService: AuthService,
    private router: Router,
    private snackbar: SnackbarService
  ) {
    this.loginForm = this.fb.group({
      username: ['', [Validators.required, Validators.minLength(3)]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  get f() { return this.loginForm.controls; }

  onSubmit(): void {
    this.submitted = true;
    if (this.loginForm.invalid) {
      this.snackbar.error('Veuillez remplir tous les champs correctement');
      return;
    }
    this.loading = true;
    this.loginForm.disable();

    this.authService.login(this.f['username'].value, this.f['password'].value).subscribe({
      next: () => {
        this.snackbar.success('Connexion réussie!', 2000);
        this.loading = false;
        setTimeout(() => {
          const target = this.authService.getFirstAccessibleScreen();
          this.router.navigate([target]);
        }, 200);
      },
      error: (err) => {
        this.loading = false;
        this.loginForm.enable();
        const msg = err.error?.message || err.error?.description || 'Identifiants invalides. Veuillez réessayer.';
        this.snackbar.error(msg, 5000);
      }
    });
  }
}
