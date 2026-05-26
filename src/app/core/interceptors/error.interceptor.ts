import { Injectable } from '@angular/core';
import { HttpRequest, HttpHandler, HttpEvent, HttpInterceptor, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { SnackbarService } from '../services/snackbar.service';
import { AuthService } from '../services/auth.service';
import { Router } from '@angular/router';

@Injectable()
export class ErrorInterceptor implements HttpInterceptor {
  constructor(
    private snackbar: SnackbarService,
    private authService: AuthService,
    private router: Router
  ) {}

  intercept(request: HttpRequest<unknown>, next: HttpHandler): Observable<HttpEvent<unknown>> {
    return next.handle(request).pipe(
      catchError((error: HttpErrorResponse) => {
        this.handleError(error);
        return throwError(() => error);
      })
    );
  }

  private handleError(error: HttpErrorResponse): void {
    const backendMsg = error.error?.message || error.error?.description || error.error?.header?.message || '';
    let message = backendMsg;

    if (error.status === 0) {
      message = 'Erreur de connexion. Le serveur est indisponible.';
      this.snackbar.error(message, 6000);
    } else if (error.status === 401) {
      message = message || 'Session expirée. Veuillez vous reconnecter.';
      this.snackbar.error(message, 5000);
      this.authService.logout();
      this.router.navigate(['/login']);
    } else if (error.status === 403) {
      message = message || 'Accès refusé.';
      this.snackbar.error(message, 5000);
    } else if (error.status === 404) {
      message = message || 'Ressource non trouvée.';
      this.snackbar.warning(message);
    } else if (error.status >= 500) {
      message = message || 'Erreur serveur. Veuillez réessayer.';
      this.snackbar.error(message);
    } else if (error.status >= 400) {
      message = message || 'Erreur de requête.';
      this.snackbar.warning(message);
    }
  }
}
