import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class Authservice {
  private _loggedIn = signal<boolean | null>(this.hastoken());

  private hastoken(): boolean {
    return !!localStorage.getItem('token')
  }

  isloggedin() {
    return this._loggedIn();
  }
}
