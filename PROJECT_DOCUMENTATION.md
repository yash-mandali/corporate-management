# Corporate Management System — Project Documentation

## Table of Contents

1. [Project Overview](#1-project-overview)
2. [Tech Stack](#2-tech-stack)
3. [Project Structure](#3-project-structure)
4. [Architecture](#4-architecture)
5. [Routing & Navigation](#5-routing--navigation)
6. [Authentication & Authorization](#6-authentication--authorization)
7. [Role System](#7-role-system)
8. [Modules & Features](#8-modules--features)
   - [Employee Module](#81-employee-module)
   - [Manager Module](#82-manager-module)
   - [HR Module](#83-hr-module)
   - [Admin Module](#84-admin-module)
9. [Services](#9-services)
10. [Shared Components](#10-shared-components)
11. [Guards](#11-guards)
12. [API Endpoints Reference](#12-api-endpoints-reference)
13. [Environment Configuration](#13-environment-configuration)
14. [Build & Run](#14-build--run)

---

## 1. Project Overview

**Corporate Management System** is a multi-role Angular 21 SPA (Single Page Application) for managing corporate HR operations. It supports four distinct user roles — Employee, Manager, HR, and Admin — each with their own dashboard and feature set.

Core capabilities:
- Authentication with JWT (login, logout, forgot password with OTP)
- Attendance tracking (check-in / check-out with live timer)
- Leave management with multi-level approval workflow
- Timesheet logging and approval
- Payroll and salary structure management
- Recruitment and job application management
- User and employee management
- Real-time notifications

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Framework | Angular 21 (standalone components) |
| Language | TypeScript 5.9 |
| Styling | Plain CSS (per-component) |
| HTTP | Angular HttpClient |
| Routing | Angular Router (lazy-loaded routes) |
| State | Angular Signals |
| Auth | JWT (`jwt-decode` v4) |
| Notifications | `ngx-toastr` v20 + custom ToastService |
| Testing | Vitest 4 |
| Build | `@angular/build` (Vite-based) |
| Package Manager | npm 10.9 |

---

## 3. Project Structure

```
src/
└── app/
    ├── Admin_Pages/              # Admin-only pages
    │   ├── admin-attendance-management/
    │   ├── admin-dashboard/
    │   ├── admin-leave-management/
    │   ├── admin-payroll-page/
    │   ├── admin-recruitment-page/
    │   └── admin-user-management/
    │
    ├── components/               # Shared UI components
    │   ├── backbtn/
    │   ├── header/
    │   ├── login/
    │   ├── sidebar/
    │   └── signup/
    │
    ├── environments/
    │   └── environment.ts        # API base URL config
    │
    ├── guards/
    │   ├── auth-guard.ts         # Protects authenticated routes
    │   ├── guest-guard/          # Redirects logged-in users away from login/signup
    │   └── role-guard/           # Role-based access control
    │
    ├── hr_pages/                 # HR-only pages
    │   ├── hr-attendance/
    │   ├── hr-dashboard/
    │   ├── hr-employees/
    │   ├── hr-leave/
    │   ├── hr-payroll/
    │   └── hr_recruitment/
    │
    ├── Layout/
    │   └── dashboard-layout/     # Shell layout (sidebar + header + router-outlet)
    │
    ├── manager_pages/            # Manager-only pages
    │   ├── manager-salarypayroll-page/
    │   ├── managerattendance/
    │   ├── managerdashboard/
    │   ├── managerleavepage/
    │   ├── managerteamspage/
    │   ├── managertimesheet/
    │   └── teamperformance/
    │
    ├── pages/                    # Employee-facing pages
    │   ├── apply-leave/
    │   ├── attendance-page/
    │   ├── dashboard/
    │   ├── myprofile/
    │   ├── notfound/
    │   ├── payroll-recruitment-page/
    │   └── timesheetpage/
    │
    ├── services/                 # All injectable services
    │   ├── Auth-service/
    │   ├── attendance-service.ts
    │   ├── employee-service.ts
    │   ├── leave-service/
    │   ├── payroll-service/
    │   ├── recruitment-service/
    │   ├── timesheet-service/
    │   ├── toast-service/
    │   └── user-service/
    │
    ├── shared/
    │   └── toast/                # Custom toast UI component
    │
    ├── app.config.ts             # App-level providers
    ├── app.routes.ts             # All route definitions
    └── app.ts                    # Root component
```

---

## 4. Architecture

The app uses **Angular standalone components** throughout — no NgModules.

### Layout Shell

All authenticated pages are rendered inside `DashboardLayout`, which composes:
- `<app-sidebar>` — role-aware navigation menu
- `<app-header>` — user info, notifications, logout
- `<router-outlet>` — lazy-loaded page content

### State Management

Angular **Signals** are used for all reactive state (no NgRx or BehaviorSubjects). Each component manages its own local state via `signal()` and `computed()`.

### Data Flow

```
Component → Service (HttpClient) → .NET API → SQL Server
```

All HTTP calls go through typed service classes. Components subscribe directly and update signals on response.

---

## 5. Routing & Navigation

All routes live in `app.routes.ts`. The structure is:

```
/                         → redirects to /login
/login                    → Login (guestGuard)
/signup                   → Signup (guestGuard)
/dashboard                → redirects to /dashboard/dashboardpage
/dashboard/*              → DashboardLayout shell (authGuard)
  /dashboardpage          → Employee dashboard       [Employee]
  /leavepage              → Apply leave              [Employee]
  /attendance             → Attendance history        [Employee]
  /timesheet              → Timesheet                [Employee]
  /salarypayroll          → Salary & payroll          [Employee]
  /myprofile              → My profile               [All roles]
  /managerdashboard       → Manager dashboard        [Manager]
  /managerattendance      → Team attendance          [Manager]
  /managerleave           → Team leave approvals     [Manager]
  /managertimesheet       → Team timesheets          [Manager]
  /managersalarypayroll   → Team payroll             [Manager]
  /managerteams           → Team members             [Manager]
  /teamperformance        → Team performance         [Manager]
  /hrdashboard            → HR dashboard             [HR]
  /hremployees            → Employee management      [HR]
  /hrleave                → Leave approvals          [HR]
  /hrattendance           → All attendance           [HR]
  /hrpayroll              → Payroll management       [HR]
  /hrRecruitment          → Recruitment              [HR]
  /admindashboard         → Admin dashboard          [Admin]
  /usermanagement         → User management          [Admin]
  /leavemanagement        → Leave type config        [Admin]
  /attendancemanagement   → All attendance           [Admin]
  /payrollmanagement      → Payroll management       [Admin]
  /recruitmentmanagement  → Recruitment management   [Admin]
/**                       → 404 Not Found
```

All child routes use **lazy loading** via `loadComponent()`.

---

## 6. Authentication & Authorization

### Login Flow

1. User submits email + password via reactive form
2. `UserService.login()` posts to `/api/User/Login`
3. On success: JWT token and userId are stored in `localStorage`
4. `Authservice.setToken()` updates the `_loggedIn` signal
5. `LeaveService.InitillizeLeaveBalanceApi()` is called to seed leave balances
6. User is redirected to their role-specific dashboard

### Forgot Password Flow

Three-step modal on the login page:
1. Enter email → OTP sent via `/api/User/SendForgotPasswordOtp`
2. Enter 6-digit OTP → verified via `/api/User/VerifyForgotPasswordOtp`
3. Set new password → submitted via `/api/User/changePassword`

### Logout

- Calls `/api/User/Logout` with userId
- Clears `token`, `role`, `userId` from `localStorage`
- Navigates to `/login`

### Token Storage

| Key | Value |
|---|---|
| `token` | JWT access token |
| `userId` | Logged-in user's ID |

Role is decoded from the JWT on demand using `jwt-decode` — it is never stored separately in localStorage.

---

## 7. Role System

Four roles are supported. Role is extracted from the JWT claim:
- `role`
- or `http://schemas.microsoft.com/ws/2008/06/identity/claims/role`

| Role | Default Landing Route |
|---|---|
| `Employee` | `/dashboard/dashboardpage` |
| `Manager` | `/dashboard/managerdashboard` |
| `HR` | `/dashboard/hrdashboard` |
| `Admin` | `/dashboard/admindashboard` |

The `roleGuard` reads the expected roles from `route.data.roles` and redirects unauthorized users to their own dashboard instead of showing an error.

---

## 8. Modules & Features

### 8.1 Employee Module

**Dashboard** (`/dashboard/dashboardpage`)
- Greeting with time-of-day awareness
- Live check-in / check-out with elapsed timer
- Auto checkout scheduled at 9:00 PM
- Leave summary (total, pending, approved, rejected)
- Attendance rate and stats
- Timesheet weekly summary (hours logged, progress toward 40h)
- Recent leaves and timesheets

**Apply Leave** (`/dashboard/leavepage`)
- View all personal leave requests with filter tabs (All / Pending / Approved / Rejected / Withdrawn)
- Paginated table (5 per page) with smart page number display
- Leave balance cards per leave type with usage progress bar
- Apply leave modal with full validation:
  - No past dates
  - No weekends
  - Half Day forces same from/to date
  - Max 2-month range
- Edit pending leave requests
- Withdraw pending/approved leaves

**Attendance** (`/dashboard/attendance`)
- Monthly calendar navigation (cannot go beyond current month)
- Stats: present, absent, late, total hours, attendance rate
- Filterable table by status (All / Present / Absent / Late)
- Paginated (10 per page)
- Click a row to view record details

**Timesheet** (`/dashboard/timesheet`)
- Weekly view with day-by-day bar chart
- Add / edit / delete timesheet entries (project, task, start/end time, work type)
- Submit individual entries or all drafts at once
- Status filter (Draft / Submitted / Approved / Rejected)
- Export to Excel with date range, status, and work type filters
- Validation: end time must be after start, max 12 hours per entry

**Salary & Payroll** (`/dashboard/salarypayroll`)
- View personal payroll history

**My Profile** (`/dashboard/myprofile`)
- Available to all roles

---

### 8.2 Manager Module

**Dashboard** (`/dashboard/managerdashboard`)
- Team overview and summary stats

**Team** (`/dashboard/managerteams`)
- View all team members

**Attendance** (`/dashboard/managerattendance`)
- View attendance records for the manager's team

**Leave** (`/dashboard/managerleave`)
- View team leave requests
- Approve or reject pending leaves (first-level approval)

**Timesheet** (`/dashboard/managertimesheet`)
- View team timesheet entries
- Approve or reject submitted timesheets with optional rejection reason

**Salary & Payroll** (`/dashboard/managersalarypayroll`)
- View team salary structures and payroll

---

### 8.3 HR Module

**Dashboard** (`/dashboard/hrdashboard`)
- Organization-wide HR metrics

**Employees** (`/dashboard/hremployees`)
- View all employees, managers, and HR users
- Add new users (HR/Admin-level user creation)
- Assign managers to employees

**Leave** (`/dashboard/hrleave`)
- View all leaves across the organization
- Second-level approval: approve or reject manager-approved leaves

**Attendance** (`/dashboard/hrattendance`)
- View all attendance records
- Export attendance report to Excel (by date range, user, department)

**Payroll** (`/dashboard/hrpayroll`)
- View and manage salary structures
- Generate payroll for individual employees or all at once
- Mark payroll as paid

**Recruitment** (`/dashboard/hrRecruitment`)
- Create, edit, publish, put on hold, or close job postings
- View candidates per job
- Update application status (shortlist, interview, offer, reject, etc.)

---

### 8.4 Admin Module

**Dashboard** (`/dashboard/admindashboard`)
- System-wide overview

**User Management** (`/dashboard/usermanagement`)
- View all users across all roles
- Add, update, delete users
- Assign managers

**Leave Management** (`/dashboard/leavemanagement`)
- Configure leave types (add, delete)
- Update default leave balances per type

**Attendance Management** (`/dashboard/attendancemanagement`)
- View all attendance records across the organization

**Payroll Management** (`/dashboard/payrollmanagement`)
- Full payroll control: salary structures, payroll generation, deletion

**Recruitment Management** (`/dashboard/recruitmentmanagement`)
- Full recruitment pipeline management

---

## 9. Services

### `Authservice`
Manages authentication state using Angular Signals.

| Method | Description |
|---|---|
| `isLoggedIn()` | Returns current login state (signal) |
| `setToken(token)` | Stores JWT and sets logged-in state |
| `setUserId(id)` | Stores userId in localStorage |
| `Logout()` | Clears all auth data |
| `getRole()` | Decodes role from JWT |
| `getEmail()` | Decodes email from JWT |
| `getUserId()` | Returns userId from localStorage |

---

### `UserService`
Handles all user-related API calls.

Key operations: login, logout, signup, add/update/delete user, get users by role, assign manager, notifications (get, mark as read, mark all as read), forgot password (send OTP, verify OTP, change password).

---

### `LeaveService`
Handles the full leave lifecycle.

Key operations: apply, update, withdraw, get my leaves, get all leaves, get team leaves, manager approve/reject, HR approve/reject, auto-reject, leave balance, leave types (add/delete/update balance).

---

### `AttendanceService`
Handles check-in/check-out and attendance records.

Key operations: check-in, check-out, auto checkout, get by user ID, get all (admin), get team (manager), export report to Excel blob.

---

### `TimesheetService`
Handles timesheet entry lifecycle.

Key operations: add/update/delete entry, get by user/ID, submit, manager approve/reject, HR approve/reject, export report to Excel blob.

---

### `PayrollService`
Handles salary structures and payroll generation.

Key operations: get/create/update/delete salary structure, get payroll by user/month/ID, generate payroll (individual or all), delete payroll, mark as paid.

---

### `RecruitmentService`
Handles job postings and applications.

Key operations: get/create/update/delete job, publish/hold/close job, apply for job (FormData), get candidates by job, update application status.

---

### `EmployeeService`
Lightweight service for sidebar open/close state using a Signal.

---

### `ToastService`
Custom in-app notification service (does not depend on ngx-toastr).

| Method | Description |
|---|---|
| `success(title, message?, duration?)` | Shows a green success toast |
| `error(title, message?, duration?)` | Shows a red error toast |
| `warning(title, message?, duration?)` | Shows an amber warning toast |
| `info(title, message?, duration?)` | Shows a blue info toast |
| `dismiss(id)` | Manually dismisses a toast |
| `pauseTimer(id)` | Pauses the auto-dismiss timer (on hover) |
| `resumeTimer(id)` | Resumes the timer |

Toasts auto-dismiss after 1500ms by default, with an animated progress bar.

---

## 10. Shared Components

### `Header`
- Displays current date, user initials, and username
- Notification bell with unread count badge
- Notifications panel: shows unread + today's read notifications (max 10)
- Auto-polls notifications every 10 seconds
- Marks all as read when the notification panel is closed
- Profile dropdown with logout

### `Sidebar`
- Role-aware menu computed from the logged-in user's role
- Active route highlighting via `routerLinkActive`
- Logout with 1.5s delay animation

### `DashboardLayout`
- Shell that wraps `<app-sidebar>`, `<app-header>`, and `<router-outlet>`
- Sidebar open/close state managed via `EmployeeService`

### `BackBtn`
- Reusable back navigation button component

### `Toast` (shared/toast)
- Renders the toast stack from `ToastService`
- Supports slide-in/slide-out animations and progress bar

---

## 11. Guards

### `authGuard`
- Checks for a `token` in localStorage
- Redirects to `/login` if not present

### `guestGuard`
- Checks `Authservice.isLoggedIn()`
- Redirects already-logged-in users to `/dashboard` (prevents accessing login/signup)

### `roleGuard`
- Reads `route.data.roles` (array of allowed roles)
- Checks the user's decoded JWT role
- If unauthorized, redirects to the user's own role-appropriate dashboard instead of blocking with an error

---

## 12. API Endpoints Reference

Base URL: `https://localhost:44346/api`

### User
| Method | Endpoint | Description |
|---|---|---|
| POST | `/User/Login` | Login |
| POST | `/User/Logout` | Logout |
| POST | `/User/AddUser` | Self-signup |
| POST | `/User/HrAdminAddUser` | HR/Admin add user |
| PUT | `/User/UpdateUser` | Update user |
| DELETE | `/User/DeleteUser` | Delete user |
| GET | `/User/getUserById` | Get user by ID |
| GET | `/User/getAllUsers` | Get all users |
| GET | `/User/getAllEmployee` | Get all employees |
| GET | `/User/getAllManagers` | Get all managers |
| GET | `/User/getAllEmployeeManager` | Get employees + managers |
| GET | `/User/getAllEmployeeManagerHr` | Get employees + managers + HR |
| GET | `/User/getManagerTeam` | Get manager's team |
| GET | `/User/getEmployeeByDepartment` | Filter by department |
| POST | `/User/assign-manager` | Assign manager to employee |
| GET | `/user/getUsersNotifications` | Get notifications |
| POST | `/user/MarkAsReadNotifications` | Mark one as read |
| PUT | `/user/MarkAllasRead` | Mark all as read |
| POST | `/User/SendForgotPasswordOtp` | Send OTP to email |
| POST | `/User/VerifyForgotPasswordOtp` | Verify OTP |
| POST | `/User/changePassword` | Change password |

### Leave
| Method | Endpoint | Description |
|---|---|---|
| POST | `/Leave/ApplyLeave` | Apply for leave |
| PUT | `/Leave/updateLeave/:id` | Update leave request |
| PUT | `/Leave/withdrawLeave/:id` | Withdraw leave |
| GET | `/Leave/getMyLeaves` | Get own leaves |
| GET | `/Leave/GetAllLeaves` | Get all leaves (Admin/HR) |
| GET | `/Leave/managerTeam-AllLeaves` | Get team leaves (Manager) |
| GET | `/Leave/GetAllPendingLeaves` | All pending leaves |
| GET | `/Leave/managerteam-pendingleaves` | Team pending leaves |
| GET | `/Leave/GetManagerApprovedLeaves` | Manager-approved (for HR) |
| PUT | `/Leave/ManagerApproveLeave` | Manager approves |
| PUT | `/Leave/ManagerRejectLeave` | Manager rejects |
| PUT | `/Leave/HrApproveLeave` | HR approves |
| PUT | `/Leave/HrRejectLeave` | HR rejects |
| PUT | `/Leave/AutoRejectLeave` | Auto-reject expired |
| POST | `/Leave/initializeUsersLeaveBalance` | Seed leave balances |
| GET | `/Leave/getUserLeaveBalance` | Get user's balance |
| GET | `/Leave/getLeaveTypes` | Get all leave types |
| PUT | `/Leave/updateLeaveBalance` | Update default balance (Admin) |
| POST | `/Leave/AddLeaveType` | Add leave type (Admin) |
| DELETE | `/Leave/deleteLeavetype` | Delete leave type (Admin) |

### Attendance
| Method | Endpoint | Description |
|---|---|---|
| POST | `/Attendance/CheckIn` | Check in |
| PUT | `/Attendance/CheckOut` | Check out |
| PUT | `/Attendance/AutoCheckout` | Auto checkout |
| GET | `/Attendance/getByUserId` | Get by user |
| GET | `/Attendance/getByAttendanceId` | Get by attendance ID |
| GET | `/Attendance/GetAllAttendance` | All attendance (Admin) |
| GET | `/Attendance/GetTeamAllAttendance` | Team attendance (Manager) |
| GET | `/Attendance/ExportAttendanceReport` | Export Excel report |

### Timesheet
| Method | Endpoint | Description |
|---|---|---|
| POST | `/Timesheet/AddTimesheetEntry` | Add entry |
| PUT | `/Timesheet/updateTimesheetEntry` | Update entry |
| DELETE | `/Timesheet/DeleteTimesheet` | Delete entry |
| POST | `/Timesheet/submitTimesheet` | Submit entry |
| GET | `/Timesheet/getTimesheetEntryById` | Get by ID |
| GET | `/Timesheet/getTimesheetEntryByUserId` | Get by user |
| GET | `/Timesheet/GetAlltimesheets` | All timesheets (HR/Admin) |
| GET | `/Timesheet/manager-GetAlltimesheets` | Team timesheets (Manager) |
| PUT | `/Timesheet/ManagerApproveT` | Manager approves |
| PUT | `/Timesheet/ManagerRejectT` | Manager rejects |
| PUT | `/Timesheet/HrApproveT` | HR approves |
| PUT | `/Timesheet/HRejectT` | HR rejects |
| GET | `/Timesheet/ExportTimesheetReport` | Export Excel report |

### Payroll
| Method | Endpoint | Description |
|---|---|---|
| GET | `/Payroll/GetAllSalaryStructure` | All salary structures |
| GET | `/Payroll/GetSalaryStructureByUserId` | By user |
| POST | `/Payroll/createSalaryStructure` | Create structure |
| PUT | `/Payroll/updateSalaryStructure` | Update structure |
| DELETE | `/Payroll/deleteSalaryStructure` | Delete structure |
| GET | `/Payroll/getAllPayrollByMonth` | Payroll by month |
| GET | `/Payroll/getPayrollbyUserId` | Payroll by user |
| GET | `/Payroll/getPayrollbyPayrollId` | Payroll by ID |
| POST | `/Payroll/generatePayroll` | Generate for one user |
| POST | `/Payroll/generate-All-Payroll` | Generate for all |
| DELETE | `/Payroll/deletePayroll` | Delete payroll |
| POST | `/Payroll/markPayrollAsPaid` | Mark as paid |

### Recruitment
| Method | Endpoint | Description |
|---|---|---|
| GET | `/Recruitment/getAllJobs` | All jobs |
| GET | `/Recruitment/getJobById` | Job by ID |
| POST | `/Recruitment/createJob` | Create job |
| PUT | `/Recruitment/updateJob` | Update job |
| DELETE | `/Recruitment/deleteJob` | Delete job |
| POST | `/Recruitment/publishJob` | Publish job |
| POST | `/Recruitment/OnHold` | Put job on hold |
| POST | `/Recruitment/closeJob` | Close job |
| POST | `/Recruitment/applyJob` | Apply (FormData) |
| GET | `/Recruitment/getCandidatesByJobId` | Candidates for job |
| PUT | `/Recruitment/updateJobApplicationStatus` | Update application status |

---

## 13. Environment Configuration

`src/app/environments/environment.ts`

```typescript
export const environment = {
  production: false,
  ApiUrl: 'https://localhost:44346/api',
};
```

For production builds, create `environment.prod.ts` with `production: true` and the live API URL.

---

## 14. Build & Run

### Install dependencies
```bash
npm install
```

### Start development server
```bash
npm start
# or
ng serve
```
App runs at `http://localhost:4200`

### Production build
```bash
npm run build
```
Output goes to `dist/corporate-management/`

### Run tests
```bash
npm test
```
Uses Vitest as the test runner.

### Watch mode (dev build)
```bash
npm run watch
```

---

*Last updated: May 2026*
