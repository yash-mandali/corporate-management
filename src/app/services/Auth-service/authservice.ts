import { Injectable, signal } from '@angular/core';
import { jwtDecode } from 'jwt-decode';

@Injectable({
  providedIn: 'root',
})
export class Authservice {
  private _loggedIn = signal<boolean | null>(this.hastoken());

  private hastoken(): boolean {
    return !!localStorage.getItem('token')
  }

  loggedInSignal() {
    return this._loggedIn;
  }

  isLoggedIn() {
    return this._loggedIn();
  }

  getToken() {
    return localStorage.getItem('token')
  }

  setToken(token: string) {
    localStorage.setItem('token', token);
    this._loggedIn.set(true);
  }

  setUserId(UserId: string) {
    localStorage.setItem('userId', UserId);
    this._loggedIn.set(true);
  }


  Logout() {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    localStorage.removeItem('userId');
    this._loggedIn.set(false);
  }

  getRole(): string | null {
    const token = this.getToken();
    if (!token) return null;

    const decode: any = jwtDecode(token);

    return (decode.role || decode['http://schemas.microsoft.com/ws/2008/06/identity/claims/role'])
  }

  getEmail() {
    const token = this.getToken();
    if (!token) return null;
    const decode: any = jwtDecode(token);
    return (decode.email || decode['http://schemas.xmlsoap.org/ws/2005/05/identity/claims/emailaddress'])
  }

  getUserId() {
    return localStorage.getItem('userId')
  }
}
