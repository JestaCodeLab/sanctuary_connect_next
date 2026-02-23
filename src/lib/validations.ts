import { z } from 'zod';

// Password validation schema with detailed requirements
export const passwordSchema = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  .regex(/[0-9]/, 'Password must contain at least one number')
  .regex(/[!@#$%^&*(),.?":{}|<>]/, 'Password must contain at least one special character');

// Login schema
export const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
  branchId: z.string().optional(),
  rememberMe: z.boolean().optional(),
});

export type LoginFormData = z.infer<typeof loginSchema>;

// Registration schema
export const registerSchema = z.object({
  firstName: z.string().min(1, 'First name is required').max(50, 'First name is too long'),
  lastName: z.string().min(1, 'Last name is required').max(50, 'Last name is too long'),
  email: z.string().email('Please enter a valid email address'),
  phone: z.string().optional(),
  password: passwordSchema,
});

export type RegisterFormData = z.infer<typeof registerSchema>;

// Email verification schema
export const verifyEmailSchema = z.object({
  code: z.string().length(6, 'Verification code must be 6 digits'),
});

export type VerifyEmailFormData = z.infer<typeof verifyEmailSchema>;

// Forgot password schema
export const forgotPasswordSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
});

export type ForgotPasswordFormData = z.infer<typeof forgotPasswordSchema>;

// Reset password schema
export const resetPasswordSchema = z
  .object({
    password: passwordSchema,
    confirmPassword: z.string().min(1, 'Please confirm your password'),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

export type ResetPasswordFormData = z.infer<typeof resetPasswordSchema>;

// Organization identity schema
export const organizationIdentitySchema = z.object({
  churchName: z.string().min(1, 'Church name is required').max(100, 'Church name is too long'),
  legalName: z.string().optional(),
  structure: z.enum(['single', 'multi']),
});

export type OrganizationIdentityFormData = z.infer<typeof organizationIdentitySchema>;

// Branch schema
export const branchSchema = z.object({
  name: z.string().min(1, 'Branch name is required').max(100, 'Branch name is too long'),
  address: z.string().optional(),
  city: z.string().optional(),
  suburb: z.string().optional(),
  region: z.string().optional(),
  zipCode: z.string().optional(),
  latitude: z.number().optional(),
  longitude: z.number().optional(),
  radius: z.number().min(50).max(1000).optional(),
  isHeadOffice: z.boolean().optional(),
});

export type BranchFormData = z.infer<typeof branchSchema>;

// Fund bucket schema
export const fundBucketSchema = z.object({
  name: z.string().min(1, 'Fund name is required').max(50, 'Fund name is too long'),
  description: z.string().optional(),
  enabled: z.boolean().optional(),
});

export type FundBucketFormData = z.infer<typeof fundBucketSchema>;

// Member schema
export const memberSchema = z.object({
  branchId: z.string().optional(),
  firstName: z.string().min(1, 'First name is required'),
  lastName: z.string().min(1, 'Last name is required'),
  email: z.string().email('Valid email is required'),
  phone: z.string().optional(),
  dateOfBirth: z.string().optional(),
  gender: z.string().optional(),
  maritalStatus: z.string().optional(),
  address: z.string().optional(),
  city: z.string().optional(),
  suburb: z.string().optional(),
  region: z.string().optional(),
  zipCode: z.string().optional(),
  country: z.string().optional(),
  baptismDate: z.string().optional(),
  membershipDate: z.string().optional(),
  memberStatus: z.enum(['active', 'inactive', 'visiting', 'transferred']).optional(),
  familyName: z.string().optional(),
  familyRelationship: z.enum(['head', 'spouse', 'child', 'other']).optional(),
  familyMembers: z.array(z.string()).optional(),
  notes: z.string().max(2000, 'Notes must be under 2000 characters').optional(),
});

export type MemberFormData = z.infer<typeof memberSchema>;

// Event schema
export const eventSchema = z.object({
  branchId: z.string().optional(),
  title: z.string().min(1, 'Event title is required').max(100, 'Title is too long'),
  description: z.string().optional(),
  eventType: z.string().optional(),
  startDate: z.string().min(1, 'Start date is required'),
  endDate: z.string().min(1, 'End date is required'),
  location: z.string().optional(),
  maxCapacity: z.preprocess(
    (val) => (val === '' || val === undefined || val === null ? undefined : Number(val)),
    z.number().min(1).optional()
  ),
});

export type EventFormData = z.infer<typeof eventSchema>;

// Donation schema
export const donationSchema = z.object({
  branchId: z.string().optional(),
  amount: z.preprocess(
    (val) => (val === '' || val === undefined || val === null ? 0 : Number(val)),
    z.number().min(0.01, 'Amount must be greater than 0')
  ),
  donationType: z.string().optional(),
  donationDate: z.string().min(1, 'Date is required'),
  paymentMethod: z.string().optional(),
  transactionId: z.string().optional(),
  notes: z.string().optional(),
  fundBucketId: z.string().optional(),
});

export type DonationFormData = z.infer<typeof donationSchema>;

// Prayer Request schema
export const prayerRequestSchema = z.object({
  branchId: z.string().optional(),
  title: z.string().min(1, 'Title is required').max(100, 'Title is too long'),
  description: z.string().min(1, 'Description is required').max(500, 'Description is too long'),
  category: z.enum(['health', 'family', 'financial', 'spiritual', 'other']),
  isAnonymous: z.boolean().optional(),
});

export type PrayerRequestFormData = z.infer<typeof prayerRequestSchema>;

// Message schema
export const messageSchema = z.object({
  branchId: z.string().optional(),
  subject: z.string().min(1, 'Subject is required').max(150, 'Subject is too long'),
  body: z.string().min(1, 'Message body is required'),
  recipientType: z.enum(['all', 'branch', 'group', 'individual']),
  channel: z.enum(['email', 'sms', 'in-app']),
});

export type MessageFormData = z.infer<typeof messageSchema>;

// Attendance schema
export const attendanceSchema = z.object({
  branchId: z.string().optional(),
  eventId: z.string().min(1, 'Event is required'),
  date: z.string().min(1, 'Date is required'),
  totalPresent: z.preprocess(
    (val) => (val === '' || val === undefined || val === null ? 0 : Number(val)),
    z.number().min(0, 'Must be 0 or greater')
  ),
  totalAbsent: z.preprocess(
    (val) => (val === '' || val === undefined || val === null ? 0 : Number(val)),
    z.number().min(0, 'Must be 0 or greater')
  ),
  notes: z.string().optional(),
});

export type AttendanceFormData = z.infer<typeof attendanceSchema>;

// Department schema
export const departmentSchema = z.object({
  name: z.string().min(1, 'Department name is required').max(100, 'Name is too long'),
  description: z.string().max(500, 'Description is too long').optional(),
  branchId: z.string().min(1, 'Branch is required'),
  leaderId: z.string().optional(),
});

export type DepartmentFormData = z.infer<typeof departmentSchema>;

// Expense schema
export const expenseSchema = z.object({
  branchId: z.string().optional(),
  amount: z.preprocess(
    (val) => (val === '' || val === undefined || val === null ? 0 : Number(val)),
    z.number().min(0.01, 'Amount must be greater than 0')
  ),
  category: z.string().min(1, 'Category is required'),
  description: z.string().optional(),
  date: z.string().min(1, 'Date is required'),
  vendor: z.string().optional(),
  receiptUrl: z.string().optional(),
  paymentMethod: z.string().optional(),
});

export type ExpenseFormData = z.infer<typeof expenseSchema>;

// Password strength checker
export const getPasswordStrength = (password: string): {
  score: number;
  label: 'Weak' | 'Fair' | 'Good' | 'Strong';
  color: string;
} => {
  let score = 0;

  if (password.length >= 8) score += 1;
  if (password.length >= 12) score += 1;
  if (/[a-z]/.test(password)) score += 1;
  if (/[A-Z]/.test(password)) score += 1;
  if (/[0-9]/.test(password)) score += 1;
  if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 1;

  if (score <= 2) {
    return { score, label: 'Weak', color: '#EF4444' };
  } else if (score <= 3) {
    return { score, label: 'Fair', color: '#F59E0B' };
  } else if (score <= 4) {
    return { score, label: 'Good', color: '#3AAFDC' };
  } else {
    return { score, label: 'Strong', color: '#10B981' };
  }
};

// Password requirements checker
export const checkPasswordRequirements = (password: string): {
  minLength: boolean;
  hasNumber: boolean;
  hasSpecial: boolean;
} => ({
  minLength: password.length >= 8,
  hasNumber: /[0-9]/.test(password),
  hasSpecial: /[!@#$%^&*(),.?":{}|<>]/.test(password),
});
