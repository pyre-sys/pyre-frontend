import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable, timer } from 'rxjs';

export type ToastType = 'success' | 'error';

@Injectable({
  providedIn: 'root',
})
export class ToastService {
  private message$ = new BehaviorSubject<string>('');
  private visible$ = new BehaviorSubject<boolean>(false);
  private type$ = new BehaviorSubject<ToastType>('success');

  getMessage(): Observable<string> {
    return this.message$.asObservable();
  }

  getVisible(): Observable<boolean> {
    return this.visible$.asObservable();
  }

  getType(): Observable<ToastType> {
    return this.type$.asObservable();
  }

  show(message: string, type: ToastType = 'success', duration = 3000) {
    this.message$.next(message);
    this.type$.next(type);
    this.visible$.next(true);

    // hide after duration
    timer(duration).subscribe(() => this.visible$.next(false));
  }

  hide() {
    this.visible$.next(false);
  }
}
