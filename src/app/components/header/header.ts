import { Component, computed, HostListener, signal, OnInit, OnDestroy } from '@angular/core';
import { Authservice } from '../../services/Auth-service/authservice';
import { EmployeeService } from '../../services/employee-service';
import { Router, RouterLink } from '@angular/router';
import { CommonModule } from '@angular/common';
import { UserService } from '../../services/user-service/user-service';

@Component({
  selector: 'app-header',
  imports: [CommonModule, RouterLink],
  templateUrl: './header.html',
  styleUrl: './header.css',
})
export class Header implements OnInit, OnDestroy {

  isLoggingOut = false;
  profileOpen = false;
  notifOpen = signal(false);
  userEmail = signal('');
  getUser = signal<any[]>([]);
  userName = signal<string>('');
  userId = signal<any | null>(null);
  notifications = signal<any[]>([]);
  notifLoading = signal(false);
  markingId = signal<number | null>(null);
  markingAll = signal(false);

  // Notifications shown in panel:
  //   • UNREAD  → always visible regardless of date
  //   • READ    → visible only if CreatedAt is TODAY
  // Both groups merged, sorted latest-first, max 10 shown.
  visibleNotifs = computed(() => {
    const todayStr = new Date().toDateString();
    return this.notifications()
      .filter(n => {
        const isRead = n.IsRead ?? n.isRead ?? false;
        if (!isRead) return true;                                      // unread: always show
        const d = new Date(n.CreatedAt ?? n.createdAt).toDateString();
        return d === todayStr;                                         // read: only today
      })
      .sort((a, b) =>
        new Date(b.CreatedAt ?? b.createdAt).getTime() -
        new Date(a.CreatedAt ?? a.createdAt).getTime()
      )
      .slice(0, 10);
  });

  unreadCount = computed(() =>
    this.notifications().filter(n => !(n.IsRead ?? n.isRead ?? false)).length
  );

  currentDate = '';
  private timer?: ReturnType<typeof setInterval>;

  constructor(
    private auth: Authservice,
    public emp: EmployeeService,
    private userService: UserService,
    private router: Router
  ) { }

  ngOnInit() {
    const id = this.auth.getUserId();
    if (id) {
      this.userId.set(id);
      this.updateDate();
      this.timer = setInterval(() => this.updateDate(), 60_000);
      this.userEmail.set(this.auth.getEmail());
      this.getUsersdata();
      this.loadNotifications();
    }
  }

  ngOnDestroy() { clearInterval(this.timer); }

  private updateDate() {
    this.currentDate = new Date().toLocaleDateString('en-IN', {
      day: 'numeric', month: 'short', year: 'numeric'
    });
  }

  getUsersdata() {
    this.userService.getUserById(this.userId()).subscribe({
      next: (res: any) => { this.getUser.set(res); this.userName.set(res.userName); },
      error: err => console.error('getUsers error:', err)
    });
  }

  // GET /api/notifications/:userId — loads all, filter done in computed
  loadNotifications() {
    const id = this.userId();
    if (!id) return;
    this.notifLoading.set(true);
    this.userService.getNotifications(id).subscribe({
      next: (res: any) => {
        const list = Array.isArray(res) ? res : res?.data ?? [];
        this.notifications.set(list);
        this.notifLoading.set(false);
      },
      error: () => this.notifLoading.set(false)
    });
  }

  toggleNotif(event: MouseEvent) {
    event.stopPropagation();
    const next = !this.notifOpen();
    this.notifOpen.set(next);
    if (next) {
      this.profileOpen = false;
      this.loadNotifications(); // refresh on open
    }
  }

  // POST /api/notification/read — mark single as read, hide it optimistically
  markAsRead(notif: any, event: MouseEvent) {
    event.stopPropagation();
    const isRead = notif.IsRead ?? notif.isRead ?? false;
    if (isRead) return;
    const notifId = notif.NotificationId ?? notif.notificationId;
    this.markingId.set(notifId);
    this.userService.markAsRead(notifId, this.userId()).subscribe({
      next: () => {
        // Mark as read → read items disappear tomorrow if not today
        this.notifications.update(list =>
          list.map(n => {
            const nId = n.NotificationId ?? n.notificationId;
            return nId === notifId ? { ...n, IsRead: true, isRead: true } : n;
          })
        );
        this.markingId.set(null);
      },
      error: () => this.markingId.set(null)
    });
  }

  // PUT /api/notification/markAllAsRead?UserId= — mark all read at once
  markAllRead() {
    if (this.markingAll()) return;
    this.markingAll.set(true);
    this.userService.markAllAsRead(this.userId()).subscribe({
      next: () => {
        // All disappear from the list
        this.notifications.update(list =>
          list.map(n => ({ ...n, IsRead: true, isRead: true }))
        );
        this.markingAll.set(false);
      },
      error: () => this.markingAll.set(false)
    });
  }

  notifIcon(type: string): string {
    const m: Record<string, string> = {
      Job: 'briefcase', Leave: 'calendar-minus', Attendance: 'calendar-check',
      Payroll: 'money-bill-wave', Task: 'tasks', Alert: 'exclamation-triangle', System: 'cog',
    };
    return m[type] ?? 'bell';
  }

  notifIconColor(type: string): string {
    const m: Record<string, string> = {
      Job: '#09637e', Leave: '#d68910', Attendance: '#27ae60',
      Payroll: '#8e44ad', Task: '#2980b9', Alert: '#c0392b', System: '#5a8a94',
    };
    return m[type] ?? '#09637e';
  }

  timeAgo(dateStr: string): string {
    if (!dateStr) return '';
    const diff = Date.now() - new Date(dateStr).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return 'Just now';
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent) {
    const target = event.target as HTMLElement;
    if (!target.closest('.profile-wrap')) this.profileOpen = false;
    if (!target.closest('.notif-wrap')) this.notifOpen.set(false);
  }

  getInitials = computed(() => {
    const name = this.userName();
    return name ? name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) : '?';
  });

  logout() {
    this.profileOpen = false;
    this.isLoggingOut = true;
    setTimeout(() => {
      this.auth.Logout();
      this.router.navigate(['/login']);
      this.isLoggingOut = false;
    }, 1500);
  }
}