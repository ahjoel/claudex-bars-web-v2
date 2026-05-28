import { Injectable } from '@angular/core';
import { HttpRequest, HttpHandler, HttpEvent, HttpInterceptor, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';
import * as CryptoJS from 'crypto-js';
import { environment } from '../../environments/environment';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  private hmacSecret = environment.hmacSecret;
  private apiUrl = environment.apiUrl;

  constructor(private router: Router) {}

  intercept(request: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    if (!request.url.startsWith(this.apiUrl)) return next.handle(request);

    const body = request.body || {};
    const timestamp = Math.floor(Date.now() / 1000).toString();
    const message = `${timestamp}:${JSON.stringify(body)}`;
    const hmac = CryptoJS.HmacSHA256(message, this.hmacSecret).toString();
    const signature = `${timestamp}.${hmac}`;

    let headers = request.headers
      .set('Content-Type', 'application/json')
      .set('x-hmac-signature', signature);

    const isLoginEndpoint = request.url.includes('sign/in');
    if (!isLoginEndpoint) {
      const token = localStorage.getItem('authToken');
      if (token) headers = headers.set('access-token', token);
    }

    const cloned = request.clone({ headers });

    return next.handle(cloned).pipe(
      catchError((err: HttpErrorResponse) => {
        if (err.status === 401) {
          localStorage.clear();
          this.router.navigate(['/login']);
        }
        return throwError(() => err);
      })
    );
  }
}
