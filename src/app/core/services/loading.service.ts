import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class LoadingService {
  private isLoadingSubject = new BehaviorSubject<boolean>(false);
  public isLoading$ = this.isLoadingSubject.asObservable();
  private requestCount = 0;

  show(): void {
    this.requestCount++;
    this.isLoadingSubject.next(true);
  }

  hide(): void {
    this.requestCount = Math.max(0, this.requestCount - 1);
    if (this.requestCount === 0) {
      this.isLoadingSubject.next(false);
    }
  }

  isLoading(): boolean {
    return this.isLoadingSubject.value;
  }

  getLoadingState$(): Observable<boolean> {
    return this.isLoading$;
  }
}
