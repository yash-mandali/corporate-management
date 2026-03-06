// src/app/shared/models/sidebar-menu.model.ts
export interface MenuItem {
    label: string;
    icon: string; // You can use Font Awesome, Material Icons, or SVG
    route: string;
    roles: string[]; // Roles allowed to see this item
    children?: MenuItem[];
}

export const SIDEBAR_MENU: MenuItem[] = [
    {
        label: 'Dashboard',
        icon: 'dashboard',
        route: '/dashboard',
        roles: ['Admin', 'Employee']
    },
    {
        label: 'Employee',
        icon: 'people',
        route: '/employees',
        roles: ['Admin', 'HR']
    },
    {
        label: 'Leave',
        icon: 'event_available',
        route: '/leave',
        roles: ['Admin', 'HR', 'Manager', 'Employee'],
        children: [
            {
                label: 'Apply Leave',
                icon: 'edit',
                route: '/leave/apply',
                roles: ['Admin', 'Employee']
            },
            {
                label: 'Leave Approval',
                icon: 'approval',
                route: '/leave/approval',
                roles: ['Admin', 'HR', 'Manager']
            }
        ]
    },
    {
        label: 'Attendance',
        icon: 'access_time',
        route: '/attendance',
        roles: ['Admin', 'HR', 'Manager', 'Employee']
    },
    {
        label: 'Team Attendance',
        icon: 'groups',
        route: '/attendance/team',
        roles: ['Admin', 'Manager']
    },
    {
        label: 'Payroll',
        icon: 'payments',
        route: '/payroll',
        roles: ['Admin', 'HR']
    },
    {
        label: 'Recruitment',
        icon: 'person_add',
        route: '/recruitment',
        roles: ['Admin', 'HR']
    },
    {
        label: 'Performance',
        icon: 'star',
        route: '/performance',
        roles: ['Admin', 'Manager']
    },
    {
        label: 'Timesheet',
        icon: 'assignment',
        route: '/timesheet',
        roles: ['Admin', 'Manager', 'Employee']
    },
    {
        label: 'My Profile',
        icon: 'person',
        route: '/profile',
        roles: ['Admin', 'HR', 'Manager', 'Employee']
    }
];