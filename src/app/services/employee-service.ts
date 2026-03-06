import { Injectable, signal } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class EmployeeService {
  sidebarOpen = signal(false);

  closeSidebar() {
    this.sidebarOpen.set(false);
  }
  toggleSidebar() { this.sidebarOpen.update(v => !v); }
}
