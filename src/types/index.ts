// User types
export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  phone?: string;
  role: 'superadmin' | 'admin' | 'pastor' | 'staff' | 'member';
  status: 'active' | 'inactive' | 'suspended';
  verified: boolean;
  organizationId?: string;
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
  suburb?: string;
  region?: string;
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
  suburb?: string;
  region?: string;
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
  userId?: string;
  organizationId?: string;
  branchId?: string | { _id: string; name: string };
  departments?: Array<string | { _id: string; name: string }>;
  firstName: string;
  lastName: string;
  email?: string;
  phone: string;
  dateOfBirth?: string;
  gender?: string;
  maritalStatus?: string;
  address?: string;
  city?: string;
  suburb?: string;
  region?: string;
  zipCode?: string;
  country?: string;
  baptismDate?: string;
  membershipDate?: string;
  memberStatus: 'active' | 'inactive' | 'visiting' | 'transferred';
  familyMembers?: Array<{
    memberId: string;
    relationship: 'mother' | 'father' | 'spouse' | 'child' | 'sibling' | 'grandparent' | 'other';
  }>;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface MemberWithBirthday extends Member {
  age: number;
  daysUntilBirthday: number;
}

export interface BirthdayResponse {
  today: MemberWithBirthday[];
  upcoming: MemberWithBirthday[];
}

export interface CreateMemberRequest {
  branchId?: string;
  departments?: string[];
  firstName: string;
  lastName: string;
  email?: string;
  phone: string;
  dateOfBirth?: string;
  gender?: string;
  maritalStatus?: string;
  address?: string;
  city?: string;
  suburb?: string;
  region?: string;
  zipCode?: string;
  country?: string;
  baptismDate?: string;
  membershipDate?: string;
  memberStatus?: string;
  familyMembers?: Array<{memberId: string; relationship: 'mother' | 'father' | 'spouse' | 'child' | 'sibling' | 'grandparent' | 'other'}>;
  notes?: string;
}

export interface UpdateMemberRequest {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  dateOfBirth?: string;
  gender?: string;
  maritalStatus?: string;
  address?: string;
  city?: string;
  suburb?: string;
  region?: string;
  zipCode?: string;
  country?: string;
  baptismDate?: string;
  membershipDate?: string;
  memberStatus?: string;
  departments?: string[];
  familyMembers?: Array<{memberId: string; relationship: 'mother' | 'father' | 'spouse' | 'child' | 'sibling' | 'grandparent' | 'other'}>;
  notes?: string;
}

// Event types (named ChurchEvent to avoid DOM Event collision)
export interface ChurchEvent {
  _id: string;
  organizationId?: string;
  branchId?: string;
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
  shareToken?: string;
  isPublic?: boolean;
  isRecurring?: boolean;
  recurrencePattern?: 'weekly' | 'biweekly' | 'monthly';
  recurrenceDay?: number;
  recurrenceEndDate?: string;
  qrCode?: {
    token: string;
    dataUrl: string;
    expiresAt: string;
    occurrenceDate?: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface EventOccurrence {
  startDate: string;
  endDate: string;
  attendeeCount: number;
}

export interface CreateEventRequest {
  branchId?: string;
  title: string;
  description?: string;
  eventType?: string;
  startDate: string;
  endDate: string;
  location?: string;
  organizerId?: string;
  maxCapacity?: number;
  isRecurring?: boolean;
  recurrencePattern?: 'weekly' | 'biweekly' | 'monthly';
  recurrenceDay?: number;
  recurrenceEndDate?: string;
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
  organizationId?: string;
  branchId?: string;
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
  branchId?: string;
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

// Attendance types
export interface AttendanceRecord {
  _id: string;
  organizationId?: string;
  branchId?: string;
  eventId: {
    _id: string;
    title: string;
    eventType?: string;
  };
  date: string;
  totalPresent: number;
  totalAbsent: number;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateAttendanceRequest {
  branchId?: string;
  eventId: string;
  date: string;
  totalPresent: number;
  totalAbsent: number;
  notes?: string;
}

export interface AttendanceStats {
  totalCheckIns: number;
  qrCheckIns: number;
  manualCheckIns: number;
  guestCheckIns: number;
  eventsWithCheckIns: number;
  recentCheckIns: number;
  lastCheckInTime: string | null;
}

// Message types
export interface Message {
  _id: string;
  organizationId?: string;
  branchId?: string;
  subject: string;
  body: string;
  recipientType: 'all' | 'branch' | 'group' | 'individual';
  recipientCount: number;
  channel: 'email' | 'sms' | 'in-app';
  status: 'draft' | 'sent' | 'scheduled';
  sentAt?: string;
  scheduledAt?: string;
  authorId?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateMessageRequest {
  branchId?: string;
  subject: string;
  body: string;
  recipientType: 'all' | 'branch' | 'group' | 'individual';
  channel: 'email' | 'sms' | 'in-app';
  status?: 'draft' | 'sent' | 'scheduled';
  scheduledAt?: string;
}

// Prayer Request types
export interface PrayerRequest {
  _id: string;
  organizationId?: string;
  branchId?: string;
  title: string;
  description: string;
  category: 'health' | 'family' | 'financial' | 'spiritual' | 'other';
  status: 'active' | 'answered';
  isAnonymous: boolean;
  authorName?: string;
  prayerCount: number;
  prayedByUsers?: string[];
  createdAt: string;
  updatedAt: string;
}

export interface CreatePrayerRequestRequest {
  branchId?: string;
  title: string;
  description: string;
  category: 'health' | 'family' | 'financial' | 'spiritual' | 'other';
  isAnonymous?: boolean;
}

// Department types
export interface Department {
  _id: string;
  organizationId: string;
  branchId: {
    _id: string;
    name: string;
  };
  name: string;
  description?: string;
  leaderId?: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  members: Member[];
  createdAt: string;
  updatedAt: string;
}

export interface CreateDepartmentRequest {
  organizationId: string;
  branchId: string;
  name: string;
  description?: string;
  leaderId?: string;
}

// Expense types
export interface Expense {
  _id: string;
  organizationId: string;
  branchId?: string;
  amount: number;
  category: string;
  description?: string;
  date: string;
  vendor?: string;
  receiptUrl?: string;
  approvedBy?: {
    _id: string;
    firstName: string;
    lastName: string;
  };
  paymentMethod?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateExpenseRequest {
  branchId?: string;
  amount: number;
  category: string;
  description?: string;
  date: string;
  vendor?: string;
  receiptUrl?: string;
  paymentMethod?: string;
}

// Finance types
export interface FinanceOverview {
  totalIncome: number;
  totalExpenses: number;
  netBalance: number;
  monthlyTrends: {
    month: string;
    income: number;
    expenses: number;
  }[];
  incomeByMethod?: {
    method: string;
    total: number;
    count: number;
  }[];
  monthly?: {
    income: number;
    expenses: number;
    net: number;
  };
  ytd?: {
    income: number;
    expenses: number;
    net: number;
  };
}

// User Branch Assignment types
export interface UserBranchAssignment {
  _id: string;
  userId: string;
  branchId: string | Branch;
  organizationId: string;
  createdAt: string;
}

export interface UserWithBranches {
  _id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  status: string;
  branches: Branch[];
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

// SMS Types
export interface SmsRecipient {
  phoneNumber: string;
  name?: string;
  memberId?: string;
  status: 'pending' | 'submitted' | 'delivered' | 'failed' | 'undelivered';
  sentAt?: string;
  deliveredAt?: string;
  failureReason?: string;
  hubtelMessageId?: string;
  deliveryReport?: string;
}

export interface SmsLog {
  _id: string;
  merchantId: string;
  sentBy: {
    _id: string;
    firstName: string;
    lastName: string;
    email: string;
  };
  messageType: 'single' | 'bulk' | 'scheduled';
  category: 'welcome' | 'event_reminder' | 'event_confirmation' | 'birthday' | 'anniversary' | 
    'first_timer_followup' | 'announcement' | 'invitation' | 'thank_you' | 'general' | 
    'event' | 'reminder' | 'emergency' | 'other';
  recipients: SmsRecipient[];
  message: string;
  senderID: string;
  templateUsed?: string;
  creditsUsed: number;
  overallStatus: 'pending' | 'processing' | 'submitted' | 'delivered' | 'failed' | 'partial';
  totalRecipients: number;
  successfulDeliveries: number;
  failedDeliveries: number;
  pendingDeliveries: number;
  targetGroup?: 'individual' | 'department' | 'branch' | 'all_members' | 'custom';
  targetGroupDetails?: {
    departmentId?: string;
    branchId?: string;
  };
  scheduledFor?: string;
  metadata?: Record<string, any>;
  isPersonalized: boolean;
  errors?: Array<{
    message: string;
    code?: string;
    timestamp: string;
    response?: string;
  }>;
  createdAt: string;
  updatedAt: string;
  stats?: {
    total: number;
    delivered: number;
    failed: number;
    pending: number;
    deliveryRate: string;
  };
}

export interface SmsCredit {
  balance: number;
  totalPurchased: number;
  totalUsed: number;
  lastPurchase?: {
    amount: number;
    date: string;
    transactionId: string;
  };
  autoRecharge?: {
    enabled: boolean;
    threshold: number;
    amount: number;
  };
}

export interface SmsCreditTransaction {
  type: 'purchase' | 'usage' | 'refund' | 'bonus';
  amount: number;
  balance: number;
  description?: string;
  reference?: string;
  createdAt: string;
}

export interface SendSingleSmsRequest {
  phone: string;
  message: string;
  category?: string;
  metadata?: Record<string, any>;
}

export interface SendBulkSmsRequest {
  phones: string[];
  message: string;
  category?: string;
  metadata?: Record<string, any>;
}

export interface SendToMembersRequest {
  memberIds: string[];
  message: string;
  category?: string;
}

export interface SendToDepartmentRequest {
  departmentId: string;
  message: string;
  category?: string;
}

export interface SendToBranchRequest {
  branchId: string;
  message: string;
  category?: string;
}

export interface SendToAllMembersRequest {
  message: string;
  category?: string;
}

export interface SmsAnalytics {
  totalSent: number;
  totalDelivered: number;
  totalFailed: number;
  totalCreditsUsed: number;
  totalCampaigns: number;
  deliveryRate: string;
  byCategory: Record<string, {
    count: number;
    sent: number;
    delivered: number;
    credits: number;
  }>;
  byType: Record<string, {
    count: number;
    sent: number;
    delivered: number;
  }>;
  timeline: any[];
}

export interface SmsCostCalculation {
  creditsNeeded: number;
  messageLength: number;
  segments: number;
  recipientCount: number;
  creditsPerRecipient: number;
}

export interface AvailableMembersResponse {
  members: Array<{
    _id: string;
    firstName: string;
    lastName: string;
    phone: string;
    email?: string;
    department?: {
      _id: string;
      name: string;
    };
  }>;
  count: number;
}

export interface Invitation {
  _id: string;
  email: string;
  role: 'admin';
  status: 'pending' | 'accepted' | 'revoked';
  expiresAt: string;
  invitedBy: { _id: string; firstName: string; lastName: string; email: string } | null;
  createdAt: string;
}


