# Corporate Management System — HRMS Portal

A full-featured **HR Management System** built with **Angular 21** and a **.NET backend**. Supports four distinct roles — Employee, Manager, HR, and Admin — each with their own dashboard, workflows, and access controls.

---

## Preview

> Clean SaaS dashboard with a dark teal sidebar, white card layouts, and a modern enterprise aesthetic.

**Design language:** Teal-dominant (`#09637e`), card-based, desktop-first with full mobile responsiveness.

---

## Features

### All Roles
- JWT-based authentication (login, logout)
- Forgot password with 6-digit email OTP flow
- Role-based route protection (Employee / Manager / HR / Admin)
- Real-time notification bell with auto-polling
- My Profile page

### Employee
- Dashboard with live check-in / check-out timer and auto-checkout at 9 PM
- Leave requests — apply, edit, withdraw with full validation (no weekends, no past dates, half-day support)
- Leave balance cards per leave type
- Attendance history with monthly navigation and stats
- Timesheet — weekly view, add/edit/delete entries, submit drafts, export to Excel
- Salary & Payroll — view payslips, apply for jobs, track applications

### Manager
- Team dashboard with attendance ring chart
- Team attendance — day-by-day view with export
- Leave approvals (first-level) with approve / reject
- Timesheet approvals with rejection reason modal
- Team leave balance overview
- Team salary & payroll view
- Team member profiles with enriched stats

### HR
- Organization-wide dashboard with check-in/check-out
- Employee management — add, edit, delete, assign managers
- Leave approvals (second-level, after manager approval)
- All attendance with export to Excel
- Payroll — salary structures, generate payroll, mark as paid, download payslips
- Recruitment — create/publish/hold/close jobs, manage candidates, update application status

### Admin
- System-wide dashboard
- Full user management (all roles)
- Leave type configuration (add, delete, update default balances)
- All attendance management
- Full payroll management (no lock restrictions)
- Recruitment management

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Angular 21 (standalone components) |
| Language | TypeScript 5.9 |
| State | Angular Signals |
| Routing | Angular Router with lazy loading |
| HTTP | Angular HttpClient |
| Auth | JWT via `jwt-decode` v4 |
| Notifications | Custom `ToastService` + `ngx-toastr` |
| Testing | Vitest 4 |
| Build | `@angular/build` (Vite-based) |
| Package Manager | npm 10.9 |
| Backend | .NET Web API (separate repo) |
| Database | SQL Server |

---

## Project Structure

```
src/app/
├── Admin_Pages/          # Admin-only pages
├── components/           # Shared UI (login, signup, header, sidebar)
├── environments/         # API base URL config
├── guards/               # authGuard, guestGuard, roleGuard
├── hr_pages/             # HR-only pages
├── Layout/               # DashboardLayout shell
├── manager_pages/        # Manager-only pages
├── pages/                # Employee-facing pages
├── services/             # All injectable services
├── shared/               # Custom toast component
├── app.config.ts
├── app.routes.ts
└── app.ts
```

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm 10+
- Angular CLI 21 (`npm install -g @angular/cli`)
- .NET backend running at `https://localhost:44346`

### Installation

```bash
# Clone the repository
git clone https://github.com/your-username/corporate-management.git
cd corporate-management

# Install dependencies
npm install
```

### Configuration

Update the API base URL in `src/app/environments/environment.ts`:

```typescript
export const environment = {
  production: false,
  ApiUrl: 'https://localhost:44346/api',  // change to your backend URL
};
```

### Run Development Server

```bash
npm start
# or
ng serve
```

Open `http://localhost:4200` in your browser.

### Build for Production

```bash
npm run build
```

Output is in `dist/corporate-management/`.

### Run Tests

```bash
npm test
```

---

## Role-Based Access

| Role | Landing Route | Key Capabilities |
|---|---|---|
| Employee | `/dashboard/dashboardpage` | Check-in/out, leaves, timesheet, payroll, jobs |
| Manager | `/dashboard/managerdashboard` | Team management, leave & timesheet approvals |
| HR | `/dashboard/hrdashboard` | Employee management, second-level approvals, payroll, recruitment |
| Admin | `/dashboard/admindashboard` | Full system access, user management, leave config |

Unauthorized access redirects users to their own role's dashboard instead of showing an error.

---

## Design System

The UI follows a consistent teal-dominant design language:

- **Primary color:** `#09637e` (deep teal)
- **Background:** `#ebf4f6` (light teal-grey)
- **Cards:** White, `border-radius: 12px`, subtle teal border
- **Sidebar:** Dark teal `#09637e`, 240px fixed
- **Font:** Nunito (dashboard), Plus Jakarta Sans (auth forms)
- **Buttons:** Teal gradient with hover lift effect
- **Modals:** Teal gradient header, backdrop blur overlay
- **Badges:** Color-coded with dot indicator (green/amber/red/blue)

---

## API Overview

Backend base URL: `https://localhost:44346/api`

| Domain | Key Endpoints |
|---|---|
| Auth | `/User/Login`, `/User/Logout`, `/User/changePassword` |
| Users | `/User/getAllUsers`, `/User/AddUser`, `/User/assign-manager` |
| Leave | `/Leave/ApplyLeave`, `/Leave/ManagerApproveLeave`, `/Leave/HrApproveLeave` |
| Attendance | `/Attendance/CheckIn`, `/Attendance/CheckOut`, `/Attendance/ExportAttendanceReport` |
| Timesheet | `/Timesheet/AddTimesheetEntry`, `/Timesheet/ManagerApproveT`, `/Timesheet/ExportTimesheetReport` |
| Payroll | `/Payroll/generatePayroll`, `/Payroll/markPayrollAsPaid` |
| Recruitment | `/Recruitment/createJob`, `/Recruitment/publishJob`, `/Recruitment/applyJob` |

---

## Scripts

| Command | Description |
|---|---|
| `npm start` | Start dev server at `localhost:4200` |
| `npm run build` | Production build |
| `npm run watch` | Dev build with watch mode |
| `npm test` | Run unit tests with Vitest |

---

## License

This project is for educational and portfolio purposes.
