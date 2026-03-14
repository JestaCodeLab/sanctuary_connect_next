/**
 * Feature Keys - Defines all available features in the system
 * Used for subscription plans, route protection, and UI gating
 */

export const FEATURE_KEYS = {
  // Core
  MEMBER_DIRECTORY: 'member_directory',
  GROUP_MANAGEMENT: 'group_management',
  ANNUAL_CALENDAR: 'annual_calendar',
  EMAIL_NOTIFICATIONS: 'email_notifications',
  
  // Finance & Giving
  ONLINE_GIVING: 'online_giving',
  FINANCIAL_REPORTING: 'financial_reporting',
  ADVANCED_FINANCIAL_REPORTING: 'advanced_financial_reporting',
  
  // Organization Structure
  DEPARTMENT_MANAGEMENT: 'department_management',
  BRANCHES: 'branches',
  
  // Events
  EVENT_MANAGEMENT: 'event_management',
  EVENT_SHARING: 'event_sharing',
  
  // Tracking & Analytics
  ATTENDANCE_TRACKING: 'attendance_tracking',
  ADVANCED_ANALYTICS: 'advanced_analytics',
  AI_SHEPHERD_ALERTS: 'ai_shepherd_alerts',
  
  // Communication
  SMS_CREDITS: 'sms_credits',
  
  // Organization Management
  GROUP_DUES: 'group_dues',
  ENGAGEMENT_VAULT: 'engagement_vault',
  VENDOR_MANAGEMENT: 'vendor_management',
  
  // Support & Advanced
  PRIORITY_SUPPORT: 'priority_support',
  BIRTHDAY_NOTIFICATIONS: 'birthday_notifications',
  
  // Enterprise
  WHITE_LABEL: 'white_label',
  DEDICATED_SUPPORT: 'dedicated_support',
  SLA: 'sla',
  CUSTOM_INTEGRATIONS: 'custom_integrations',
};

/**
 * Feature to Section mapping - which sidebar section each feature belongs to
 * Used for hiding entire sections when no features are available
 */
export const FEATURE_SECTIONS = {
  [FEATURE_KEYS.DEPARTMENT_MANAGEMENT]: 'departments',
  [FEATURE_KEYS.EVENT_MANAGEMENT]: 'events',
  [FEATURE_KEYS.ATTENDANCE_TRACKING]: 'attendance',
  [FEATURE_KEYS.FINANCIAL_REPORTING]: 'finance',
  [FEATURE_KEYS.ADVANCED_FINANCIAL_REPORTING]: 'finance',
  [FEATURE_KEYS.SMS_CREDITS]: 'communication',
  [FEATURE_KEYS.BRANCHES]: 'branches',
};

export default FEATURE_KEYS;
