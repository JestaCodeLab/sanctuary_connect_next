// User types
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: 'admin' | 'pastor' | 'staff' | 'member';
  status: 'active' | 'inactive' | 'suspended';
  verified: boolean;
  createdAt: string;
  updatedAt: string;
}

// Auth types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface LoginResponse {
  message: string;
  user: User;
  token: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  phone?: string;
}

export interface RegisterResponse {
  message: string;
  email: string;
  requiresVerification: boolean;
  verificationExpires: string;
}

export interface VerifyEmailRequest {
  email: string;
  code: string;
}

export interface VerifyEmailResponse {
  message: string;
  user: User;
  token: string;
}

export interface ForgotPasswordRequest {
  email: string;
}

export interface ResetPasswordRequest {
  token: string;
  newPassword: string;
}

export interface ResetPasswordResponse {
  message: string;
  user: User;
  token: string;
}

// Organization types
export interface Organization {
  _id: string;
  churchName: string;
  legalName?: string;
  logoUrl?: string;
  structure: 'single' | 'multi';
  currency: string;
  paymentGateway?: string;
  adminId: string;
  subscriptionId?: string;
  onboardingComplete: boolean;
  onboardingStep: number;
  createdAt: string;
  updatedAt: string;
}

export interface CreateOrganizationRequest {
  churchName: string;
  legalName?: string;
  logoUrl?: string;
  structure?: 'single' | 'multi';
  currency?: string;
  paymentGateway?: string;
}

export interface UpdateOrganizationRequest {
  churchName?: string;
  legalName?: string;
  logoUrl?: string;
  structure?: 'single' | 'multi';
  currency?: string;
  paymentGateway?: string;
  onboardingComplete?: boolean;
  onboardingStep?: number;
}

export interface CreateOrganizationResponse extends Organization {
  token: string;
}

// Branch types
export interface Branch {
  _id: string;
  organizationId: string;
  name: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  latitude?: number;
  longitude?: number;
  geofenceRadius: number;
  isHeadOffice: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateBranchRequest {
  organizationId: string;
  name: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  latitude?: number;
  longitude?: number;
  radius?: number;
  isHeadOffice?: boolean;
}

// Fund Bucket types
export interface FundBucket {
  _id: string;
  organizationId: string;
  name: string;
  description?: string;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface CreateFundBucketRequest {
  organizationId: string;
  name: string;
  description?: string;
  enabled?: boolean;
}

// API Error type
export interface ApiError {
  error: string;
  message?: string;
}

// Subscription types
export type SubscriptionPlan = 'seed' | 'growth' | 'ascend';
export type BillingCycle = 'monthly' | 'annual';

export interface PlanDetails {
  id: SubscriptionPlan;
  name: string;
  price: number;
  currency: string;
  description: string;
  features: { text: string; included: boolean }[];
  isPopular?: boolean;
}

export interface SubscriptionState {
  plan: SubscriptionPlan | null;
  billingCycle: BillingCycle;
  paymentMethod: 'card' | 'momo' | null;
}

// Member types
export interface Member {
  _id: string;
  userId: {
    _id: string;
    email: string;
    firstName: string;
    lastName: string;
    phone?: string;
  };
  dateOfBirth?: string;
  gender?: string;
  maritalStatus?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  baptismDate?: string;
  membershipDate?: string;
  memberStatus: 'active' | 'inactive' | 'visiting' | 'transferred';
  createdAt: string;
  updatedAt: string;
}

export interface CreateMemberRequest {
  userId: string;
  dateOfBirth?: string;
  gender?: string;
  maritalStatus?: string;
  address?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  country?: string;
  baptismDate?: string;
  membershipDate?: string;
}

// Event types (named ChurchEvent to avoid DOM Event collision)
export interface ChurchEvent {
  _id: string;
  title: string;
  description?: string;
  eventType?: string;
  startDate: string;
  endDate: string;
  location?: string;
  organizerId?: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  maxCapacity?: number;
  status: 'scheduled' | 'ongoing' | 'completed' | 'cancelled';
  createdAt: string;
  updatedAt: string;
}

export interface CreateEventRequest {
  title: string;
  description?: string;
  eventType?: string;
  startDate: string;
  endDate: string;
  location?: string;
  organizerId?: string;
  maxCapacity?: number;
}

export interface UpdateEventRequest {
  title?: string;
  description?: string;
  eventType?: string;
  startDate?: string;
  endDate?: string;
  location?: string;
  maxCapacity?: number;
  status?: 'scheduled' | 'ongoing' | 'completed' | 'cancelled';
}

// Donation types
export interface Donation {
  _id: string;
  donorId?: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  amount: number;
  donationType?: string;
  donationDate: string;
  paymentMethod?: string;
  transactionId?: string;
  notes?: string;
  fundBucketId?: {
    _id: string;
    name: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface CreateDonationRequest {
  donorId?: string;
  amount: number;
  donationType?: string;
  donationDate: string;
  paymentMethod?: string;
  transactionId?: string;
  notes?: string;
  fundBucketId?: string;
}

export interface DonationStats {
  totalDonations: number;
  totalAmount: number;
  averageDonation: number;
  largestDonation: number;
  donationType: string;
  month: string;
}

// Frontend-only types (no backend yet)
export interface AttendanceRecord {
  _id: string;
  eventTitle: string;
  date: string;
  totalPresent: number;
  totalAbsent: number;
}

export interface Message {
  _id: string;
  subject: string;
  body: string;
  recipientType: 'all' | 'branch' | 'group' | 'individual';
  recipientCount: number;
  channel: 'email' | 'sms' | 'in-app';
  status: 'draft' | 'sent' | 'scheduled';
  sentAt?: string;
  scheduledAt?: string;
  createdAt: string;
}

export interface PrayerRequest {
  _id: string;
  title: string;
  description: string;
  category: 'health' | 'family' | 'financial' | 'spiritual' | 'other';
  status: 'active' | 'answered' | 'closed';
  isAnonymous: boolean;
  authorName?: string;
  prayerCount: number;
  createdAt: string;
}

// Onboarding state
export interface OnboardingState {
  currentStep: number;
  identity: {
    churchName: string;
    legalName: string;
    logoUrl: string | null;
    structure: 'single' | 'multi';
  };
  branches: Branch[];
  finances: {
    paymentGateway: string | null;
    fundBuckets: string[];
  };
  subscription: SubscriptionState;
  organizationId: string | null;
}
