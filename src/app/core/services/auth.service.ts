import { Injectable, NgZone } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';
import { SCREENS_BY_ROLE, ROLES } from '../../configs/roles.config';

export interface AuthUser {
  id: number;
  username: string;
  email: string;
  firstname?: string;
  lastname?: string;
  profile?: string;
  zone?: string;
  screens?: string[];
  roles?: string[];
  permissions?: string[];
}

export interface AuthResponse {
  status?: number;
  message?: string;
  data: {
    token: string;
    user: AuthUser;
  };
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private apiUrl = environment.apiUrl;
  private currentUserSubject = new BehaviorSubject<AuthUser | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();
  private isAuthSubject = new BehaviorSubject<boolean>(false);
  public isAuthenticated$ = this.isAuthSubject.asObservable();
  private expiryTimer: any = null;

  constructor(private http: HttpClient, private router: Router, private ngZone: NgZone) {
    this.loadFromStorage();
  }

  private getTokenExpiry(token: string): number | null {
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      return typeof payload.exp === 'number' ? payload.exp * 1000 : null;
    } catch {
      return null;
    }
  }

  private scheduleAutoLogout(token: string): void {
    if (this.expiryTimer) clearTimeout(this.expiryTimer);
    const expiry = this.getTokenExpiry(token);
    if (!expiry) return;
    const delay = expiry - Date.now();
    if (delay <= 0) { this.logout(); return; }
    this.ngZone.runOutsideAngular(() => {
      this.expiryTimer = setTimeout(() => {
        this.ngZone.run(() => {
          this.logout();
          this.router.navigate(['/login']);
        });
      }, delay);
    });
  }

  private loadFromStorage(): void {
    const storedToken = localStorage.getItem('authToken');
    const storedUser  = storedToken ? localStorage.getItem('currentUser') : null;
    if (!storedToken || !storedUser) return;
    const expiry = this.getTokenExpiry(storedToken);
    if (expiry && Date.now() >= expiry) { this.clearStorage(); return; }
    try {
      const user = JSON.parse(storedUser);
      this.currentUserSubject.next(user);
      this.isAuthSubject.next(true);
      this.scheduleAutoLogout(storedToken);
    } catch {
      this.clearStorage();
    }
  }

  login(username: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/auth/in`, { username, password }).pipe(
      tap(res => {
        if (res.data?.token) {
          localStorage.setItem('authToken', res.data.token);
          localStorage.setItem('currentUser', JSON.stringify(res.data.user));
          this.currentUserSubject.next(res.data.user);
          this.isAuthSubject.next(true);
          this.scheduleAutoLogout(res.data.token);
        }
      })
    );
  }

  logout(): void {
    if (this.expiryTimer) { clearTimeout(this.expiryTimer); this.expiryTimer = null; }
    localStorage.clear();
    sessionStorage.clear();
    document.cookie.split(';').forEach(c => {
      const name = c.split('=')[0].trim();
      if (name) document.cookie = `${name}=;expires=Thu, 01 Jan 1970 00:00:00 GMT;path=/`;
    });
    this.currentUserSubject.next(null);
    this.isAuthSubject.next(false);
  }

  getToken(): string | null {
    return localStorage.getItem('authToken');
  }

  isAuthenticated(): boolean {
    return !!this.getToken() && this.isAuthSubject.value;
  }

  getCurrentUser(): AuthUser | null {
    return this.currentUserSubject.value;
  }

  isSuperAdmin(): boolean {
    return this.getCurrentUser()?.profile === ROLES.SUPER_ADMIN;
  }

  hasRole(role: string): boolean {
    return this.getCurrentUser()?.profile === role;
  }

  hasAnyRole(roles: string[]): boolean {
    const profile = this.getCurrentUser()?.profile;
    return !!profile && roles.includes(profile);
  }

  getZone(): string | null {
    return this.getCurrentUser()?.zone ?? null;
  }

  private getEffectiveScreens(): string[] {
    const user = this.getCurrentUser();
    if (!user) return [];
    if (user.screens?.length) return user.screens;
    const profile = user.profile ?? '';
    return SCREENS_BY_ROLE[profile] ?? [];
  }

  canAccessScreen(path: string): boolean {
    const user = this.getCurrentUser();
    if (!user) return false;
    if (user.profile === ROLES.SUPER_ADMIN) return true;
    const screens = this.getEffectiveScreens();
    if (!screens.length) return false;
    const cleanPath = path.split('?')[0];
    return screens.includes(cleanPath) || screens.includes(path);
  }

  getFirstAccessibleScreen(): string {
    if (this.isSuperAdmin()) return '/dashboard';
    const screens = this.getEffectiveScreens();
    return screens.length > 0 ? screens[0] : '/unauthorized';
  }

  private clearStorage(): void {
    localStorage.removeItem('authToken');
    localStorage.removeItem('currentUser');
  }
}
