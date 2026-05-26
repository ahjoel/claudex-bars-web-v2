import { Injectable } from '@angular/core';
import { CanActivate, ActivatedRouteSnapshot, RouterStateSnapshot, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';
import { SnackbarService } from '../services/snackbar.service';

@Injectable({ providedIn: 'root' })
export class RoleGuard implements CanActivate {
  constructor(
    private authService: AuthService,
    private snackbar: SnackbarService,
    private router: Router
  ) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): boolean {
    if (!this.authService.isAuthenticated()) {
      this.snackbar.warning('Vous devez être connecté pour accéder à cette page');
      this.router.navigate(['/login'], { queryParams: { returnUrl: state.url } });
      return false;
    }
    const screenPath: string | undefined = route.data['screenPath'];
    if (screenPath) {
      const zone = route.queryParamMap.get('zone');
      const effectivePath = zone ? `${screenPath}/${zone}` : screenPath;
      if (!this.authService.canAccessScreen(effectivePath)) {
        this.snackbar.error('Accès non autorisé à cette page');
        this.router.navigate(['/unauthorized']);
        return false;
      }
    }
    return true;
  }
}
