import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface SnackbarMessage {
  id: string;
  message: string;
  type: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
}

@Injectable({ providedIn: 'root' })
export class SnackbarService {
  private messagesSubject = new BehaviorSubject<SnackbarMessage[]>([]);
  public messages$ = this.messagesSubject.asObservable();

  success(message: string, duration = 3000): void { this.show(message, 'success', duration); }
  error(message: string, duration = 5000): void { this.show(message, 'error', duration); }
  warning(message: string, duration = 4000): void { this.show(message, 'warning', duration); }
  info(message: string, duration = 3000): void { this.show(message, 'info', duration); }

  private show(message: string, type: SnackbarMessage['type'], duration: number): void {
    const id = `${Date.now()}-${Math.random()}`;
    const msg: SnackbarMessage = { id, message: message || this.defaultMsg(type), type, duration };
    this.messagesSubject.next([...this.messagesSubject.value, msg]);
    if (duration > 0) setTimeout(() => this.remove(id), duration);
  }

  private defaultMsg(type: string): string {
    const d: Record<string, string> = { success: 'Succès!', error: 'Erreur', warning: 'Avertissement', info: 'Information' };
    return d[type] || 'Notification';
  }

  remove(id: string): void {
    this.messagesSubject.next(this.messagesSubject.value.filter(m => m.id !== id));
  }

  clear(): void { this.messagesSubject.next([]); }
}
