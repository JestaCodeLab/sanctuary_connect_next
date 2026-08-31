/**
 * Custom Role Permission Keys - client mirror of api/src/config/permissions.js
 * Used for the role-creation checklist UI and permission-gated nav filtering.
 */

export interface PermissionDefinition {
  key: string;
  name: string;
}

export interface PermissionModule {
  key: string;
  name: string;
  permissions: PermissionDefinition[];
}

export const PERMISSION_MODULES: PermissionModule[] = [
  {
    key: 'members',
    name: 'Members',
    permissions: [
      { key: 'members.view', name: 'View member directory' },
      { key: 'members.manage', name: 'Create, edit, delete members' },
    ],
  },
  {
    key: 'events',
    name: 'Events',
    permissions: [
      { key: 'events.view', name: 'View events' },
      { key: 'events.manage', name: 'Create, edit, delete events' },
    ],
  },
  {
    key: 'attendance',
    name: 'Attendance',
    permissions: [
      { key: 'attendance.view', name: 'View attendance records' },
      { key: 'attendance.manage', name: 'Record and edit attendance' },
    ],
  },
  {
    key: 'departments',
    name: 'Departments',
    permissions: [
      { key: 'departments.view', name: 'View departments' },
      { key: 'departments.manage', name: 'Create, edit, delete departments and their members' },
    ],
  },
  {
    key: 'donations',
    name: 'Donations',
    permissions: [
      { key: 'donations.view', name: 'View donation records' },
      { key: 'donations.manage', name: 'Record and edit donations' },
    ],
  },
  {
    key: 'finance',
    name: 'Finance',
    permissions: [
      { key: 'finance.view', name: 'View finance reports, transactions, expenses' },
      { key: 'finance.manage', name: 'Manage expenses (incl. approve/reject/delete), funds, offering types' },
    ],
  },
  {
    key: 'communication',
    name: 'Communication',
    permissions: [
      { key: 'communication.manage', name: 'Send messages, SMS, notifications' },
    ],
  },
];

export const ALL_PERMISSION_KEYS: string[] = PERMISSION_MODULES.flatMap(m => m.permissions.map(p => p.key));

export default PERMISSION_MODULES;
