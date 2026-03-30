import axios, { AxiosError, InternalAxiosRequestConfig } from 'axios';
import type {
  LoginRequest,
  LoginResponse,
  RegisterRequest,
  RegisterResponse,
  VerifyEmailRequest,
  VerifyEmailResponse,
  ForgotPasswordRequest,
  ResetPasswordRequest,
  ResetPasswordResponse,
  CreateOrganizationRequest,
  CreateOrganizationResponse,
  UpdateOrganizationRequest,
  Organization,
  CreateBranchRequest,
  Branch,
  CreateFundBucketRequest,
  FundBucket,
  ApiError,
  Member,
  CreateMemberRequest,
  UpdateMemberRequest,
  BirthdayResponse,
  ChurchEvent,
  EventOccurrence,
  CreateEventRequest,
  UpdateEventRequest,
  Donation,
  CreateDonationRequest,
  DonationStats,
  AttendanceRecord,
  CreateAttendanceRequest,
  AttendanceStats,
  Message,
  CreateMessageRequest,
  PrayerRequest,
  CreatePrayerRequestRequest,
  Department,
  CreateDepartmentRequest,
  Expense,
  CreateExpenseRequest,
  FinanceOverview,
  UserWithBranches,
  SmsCredit,
  SmsCreditTransaction,
  SmsLog,
  SendSingleSmsRequest,
  SendBulkSmsRequest,
  SendToMembersRequest,
  SendToDepartmentRequest,
  SendToBranchRequest,
  SendToAllMembersRequest,
  SmsAnalytics,
  SmsCostCalculation,
  AvailableMembersResponse,
} from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

// Create axios instance
export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token && config.headers) {
        config.headers.Authorization = `Bearer ${token}`;
      }
      // Add branch context header
      try {
        const branchStorage = localStorage.getItem('branch-storage');
        if (branchStorage) {
          const { state } = JSON.parse(branchStorage);
          if (state?.selectedBranchId) {
            config.headers['X-Branch-Id'] = state.selectedBranchId;
          }
        }
      } catch {
        // Ignore parse errors
      }
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<any>) => {
    const status = error.response?.status;
    const errorCode = error.response?.data?.code;
    
    // Only treat 401 as auth failure - 403 is usually "feature not available" 
    const isAuthError = status === 401;
    const isExpiredToken = error.response?.data?.error === 'Invalid or expired token';

    if (isAuthError && typeof window !== 'undefined') {
      // Log the failing request for debugging
      console.error('[API Interceptor] Auth error (401) detected:', {
        status,
        url: error.config?.url,
        method: error.config?.method,
        errorMessage: error.response?.data?.error || error.message,
      });
      sessionStorage.setItem('lastApiError', JSON.stringify({
        status,
        url: error.config?.url,
        method: error.config?.method,
        errorMessage: error.response?.data?.error || error.message,
        timestamp: new Date().toISOString(),
      }));

      // Clear all auth-related storage
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('auth-storage');
      localStorage.removeItem('branch-storage');

      // Only redirect if not already on auth pages
      const isOnAuthPage = window.location.pathname.startsWith('/login') ||
                           window.location.pathname.startsWith('/register') ||
                           window.location.pathname.startsWith('/forgot-password') ||
                           window.location.pathname.startsWith('/reset-password') ||
                           window.location.pathname.startsWith('/verify-email');

      if (!isOnAuthPage) {
        // Store a flag to show session expired message on login page
        if (isExpiredToken) {
          sessionStorage.setItem('sessionExpired', 'true');
        }
        console.error('[API Interceptor] Redirecting to /login due to 401 auth error');
        window.location.href = '/login';
      }
    } else if (status === 403) {
      // 403 can be feature-gated access or subscription issues
      const code = error.response?.data?.code;
      const featureKey = error.response?.data?.featureKey || 'unknown';
      const errorMessage = error.response?.data?.error || 'Access Denied';
      
      console.warn('[API Interceptor] Access denied (403):', {
        url: error.config?.url,
        code,
        featureKey,
        errorMessage,
        fullResponse: error.response?.data,
      });
      
      if (typeof window !== 'undefined') {
        const isOnBlockedPage = window.location.pathname.startsWith('/feature-blocked');
        const isOnOnboarding = window.location.pathname.startsWith('/onboarding');
        
        // If NO_SUB (no subscription), redirect to subscription onboarding
        if (code === 'NO_SUB' && !isOnOnboarding) {
          console.warn('[API Interceptor] No subscription found - redirecting to onboarding/subscription');
          window.location.href = '/onboarding/subscription';
        }
        // Handle INSUFFICIENT_SMS_CREDITS specifically
        else if (code === 'INSUFFICIENT_SMS_CREDITS' && !isOnBlockedPage) {
          console.warn('[API Interceptor] Insufficient SMS credits:', {
            currentBalance: error.response?.data?.currentBalance,
            required: error.response?.data?.required,
            shortfall: error.response?.data?.shortfall,
          });
          // Store SMS credit error info for display
          sessionStorage.setItem('smsCreditsError', JSON.stringify(error.response?.data));
          // Could redirect to a SMS purchase page instead, or show in-page error
          // For now, store as featureKey 'sms_credits' to show upgrade path
          sessionStorage.setItem('featureBlockedFeatureKey', 'sms_credits');
          window.location.href = '/feature-blocked';
        }
        // Otherwise, redirect to feature-blocked page (for FEATURE_GATED or other 403s)
        else if (!isOnBlockedPage && code !== 'NO_SUB') {
          // Store only the feature key in sessionStorage
          sessionStorage.setItem('featureBlockedFeatureKey', featureKey);
          window.location.href = '/feature-blocked';
        }
      }
    }
    
    return Promise.reject(error);
  }
);

// Auth API
export const authApi = {
  register: async (data: RegisterRequest): Promise<RegisterResponse> => {
    const response = await api.post<RegisterResponse>('/api/auth/register', data);
    return response.data;
  },

  login: async (data: LoginRequest): Promise<LoginResponse> => {
    const response = await api.post<LoginResponse>('/api/auth/login', data);
    return response.data;
  },

  verifyEmail: async (data: VerifyEmailRequest): Promise<VerifyEmailResponse> => {
    const response = await api.post<VerifyEmailResponse>('/api/auth/verify-email', data);
    return response.data;
  },

  resendVerification: async (email: string): Promise<{ message: string }> => {
    const response = await api.post<{ message: string }>('/api/auth/resend-verification', { email });
    return response.data;
  },

  forgotPassword: async (data: ForgotPasswordRequest): Promise<{ message: string }> => {
    const response = await api.post<{ message: string }>('/api/auth/forgot-password', data);
    return response.data;
  },

  resetPassword: async (data: ResetPasswordRequest): Promise<ResetPasswordResponse> => {
    const response = await api.post<ResetPasswordResponse>('/api/auth/reset-password', data);
    return response.data;
  },
};

// My Organization response type (includes related data for restoring onboarding state)
export interface MyOrganizationResponse {
  organization: Organization;
  branches: Branch[];
  fundBuckets: FundBucket[];
}

// Organization API
export const organizationApi = {
  create: async (data: CreateOrganizationRequest): Promise<CreateOrganizationResponse> => {
    const response = await api.post<CreateOrganizationResponse>('/api/organizations', data);
    return response.data;
  },

  // Get current user's organization with related data
  getMyOrganization: async (): Promise<MyOrganizationResponse> => {
    const response = await api.get<MyOrganizationResponse>('/api/organizations/me');
    return response.data;
  },

  get: async (id: string): Promise<Organization> => {
    const response = await api.get<Organization>(`/api/organizations/${id}`);
    return response.data;
  },

  update: async (id: string, data: UpdateOrganizationRequest): Promise<Organization> => {
    const response = await api.put<Organization>(`/api/organizations/${id}`, data);
    return response.data;
  },

  // Branches
  createBranch: async (organizationId: string, data: Omit<CreateBranchRequest, 'organizationId'>): Promise<Branch> => {
    const response = await api.post<Branch>(`/api/organizations/${organizationId}/branches`, {
      ...data,
      organizationId,
    });
    return response.data;
  },

  getBranches: async (organizationId: string): Promise<Branch[]> => {
    const response = await api.get<Branch[]>(`/api/organizations/${organizationId}/branches`);
    return response.data;
  },

  updateBranch: async (organizationId: string, branchId: string, data: Partial<Omit<CreateBranchRequest, 'organizationId'>>): Promise<Branch> => {
    const response = await api.put<Branch>(`/api/organizations/${organizationId}/branches/${branchId}`, data);
    return response.data;
  },

  // Fund Buckets
  createFundBucket: async (organizationId: string, data: Omit<CreateFundBucketRequest, 'organizationId'>): Promise<FundBucket> => {
    const response = await api.post<FundBucket>(`/api/organizations/${organizationId}/fund-buckets`, {
      ...data,
      organizationId,
    });
    return response.data;
  },

  getFundBuckets: async (organizationId: string): Promise<FundBucket[]> => {
    const response = await api.get<FundBucket[]>(`/api/organizations/${organizationId}/fund-buckets`);
    return response.data;
  },
};

// Subscription types
export interface SubscriptionPlanResponse {
  id: string;
  name: string;
  price: number;
  annualPrice: number;
  currency: string;
  description: string;
  features: { key: string; text: string; included: boolean }[];
  limits: {
    maxMembers: number;
    maxBranches: number;
    maxDepartments: number;
    maxEvents: number;
    smsCredits: number;
    donationTransactions: number;
  };
  isPopular?: boolean;
}

export interface CreateSubscriptionRequest {
  organizationId: string;
  planId: string;
  billingCycle: 'monthly' | 'annual';
  paymentMethod?: 'card' | 'momo';
  paymentDetails?: {
    provider?: string;
    reference?: string;
    last4?: string;
  };
  billingAddress?: {
    street?: string;
    city?: string;
    state?: string;
    country?: string;
  };
}

export interface SubscriptionResponse {
  message: string;
  subscription: {
    _id: string;
    organizationId: string;
    planId: string;
    billingCycle: 'monthly' | 'annual';
    status: string;
    currentPeriodStart: string;
    currentPeriodEnd: string;
    paymentMethod?: string;
  };
  plan: SubscriptionPlanResponse;
}

// Subscription API
export const subscriptionApi = {
  getPlans: async (): Promise<SubscriptionPlanResponse[]> => {
    const response = await api.get<SubscriptionPlanResponse[]>('/api/subscriptions/plans');
    return response.data;
  },

  getPlan: async (planId: string): Promise<SubscriptionPlanResponse> => {
    const response = await api.get<SubscriptionPlanResponse>(`/api/subscriptions/plans/${planId}`);
    return response.data;
  },

  create: async (data: CreateSubscriptionRequest): Promise<SubscriptionResponse> => {
    const response = await api.post<SubscriptionResponse>('/api/subscriptions', data);
    return response.data;
  },

  get: async (organizationId: string): Promise<SubscriptionResponse> => {
    const response = await api.get<SubscriptionResponse>(`/api/subscriptions/${organizationId}`);
    return response.data;
  },

  update: async (organizationId: string, data: Partial<CreateSubscriptionRequest>): Promise<SubscriptionResponse> => {
    const response = await api.put<SubscriptionResponse>(`/api/subscriptions/${organizationId}`, data);
    return response.data;
  },

  initializeCheckout: async (data: { organizationId: string; planId: string; billingCycle: string; paymentMethod: string; amount: number }) => {
    const response = await api.post('/api/subscriptions/initialize-checkout', data);
    return response.data;
  },

  initializePayment: async (organizationId: string, data: { planId: string; billingCycle: string }) => {
    const response = await api.post(`/api/subscriptions/${organizationId}/initialize-payment`, data);
    return response.data;
  },

  verifyUpgrade: async (organizationId: string, data: { reference: string; planId: string; billingCycle: string }) => {
    const response = await api.post(`/api/subscriptions/${organizationId}/verify-payment`, data);
    return response.data;
  },

  getLimits: async (organizationId: string) => {
    const response = await api.get<{
      planId: string;
      planName: string;
      limits: {
        maxMembers: number;
        maxBranches: number;
        maxDepartments: number;
        maxEvents: number;
        smsCredits: number;
        donationTransactions: number;
      };
      usage: {
        membersCount: number;
        branchesCount: number;
        smsUsed: number;
        donationTransactions: number;
        departmentsCount?: number;
        eventsCount?: number;
      };
      withinLimits: {
        members: boolean;
        branches: boolean;
        sms: boolean;
        transactions: boolean;
      };
    }>(`/api/subscriptions/${organizationId}/limits`);
    return response.data;
  },
};

// Transactions API
export const transactionsApi = {
  getAll: async (params?: {
    type?: string;
    direction?: string;
    status?: string;
    startDate?: string;
    endDate?: string;
    page?: number;
    limit?: number;
  }) => {
    const queryParams = new URLSearchParams();
    if (params?.type) queryParams.append('type', params.type);
    if (params?.direction) queryParams.append('direction', params.direction);
    if (params?.status) queryParams.append('status', params.status);
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    const queryString = queryParams.toString();
    const url = queryString ? `/api/finance/transactions?${queryString}` : '/api/finance/transactions';
    const response = await api.get(url);
    return response.data;
  },

  getById: async (id: string) => {
    const response = await api.get(`/api/finance/transactions/${id}`);
    return response.data;
  },

  getSummary: async (params?: { type?: string; startDate?: string; endDate?: string }) => {
    const queryParams = new URLSearchParams();
    if (params?.type) queryParams.append('type', params.type);
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);
    const queryString = queryParams.toString();
    const url = queryString ? `/api/finance/transactions/summary?${queryString}` : '/api/finance/transactions/summary';
    const response = await api.get(url);
    return response.data;
  },
};

// Members API
export const membersApi = {
  getAll: async (params?: { search?: string; startDate?: string; endDate?: string }): Promise<Member[]> => {
    const queryParams = new URLSearchParams();
    if (params?.search) queryParams.append('search', params.search);
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);
    
    const queryString = queryParams.toString();
    const url = queryString ? `/api/members?${queryString}` : '/api/members';
    const response = await api.get<Member[]>(url);
    return response.data;
  },
  getById: async (id: string): Promise<Member> => {
    const response = await api.get<Member>(`/api/members/${id}`);
    return response.data;
  },
  create: async (data: CreateMemberRequest): Promise<Member> => {
    const response = await api.post<Member>('/api/members', data);
    return response.data;
  },
  update: async (id: string, data: UpdateMemberRequest): Promise<Member> => {
    const response = await api.put<Member>(`/api/members/${id}`, data);
    return response.data;
  },
  delete: async (id: string): Promise<{ message: string }> => {
    const response = await api.delete<{ message: string }>(`/api/members/${id}`);
    return response.data;
  },
  getBirthdays: async (days: number = 7): Promise<BirthdayResponse> => {
    const response = await api.get<BirthdayResponse>(`/api/members/birthdays/upcoming?days=${days}`);
    return response.data;
  },
  exportMembers: async (params: { format?: 'csv' | 'pdf'; startDate?: string; endDate?: string; period?: 'monthly' | 'custom' }): Promise<{ downloadUrl: string }> => {
    const queryParams = new URLSearchParams();
    if (params.format) queryParams.append('format', params.format);
    if (params.startDate) queryParams.append('startDate', params.startDate);
    if (params.endDate) queryParams.append('endDate', params.endDate);
    if (params.period) queryParams.append('period', params.period);

    const queryString = queryParams.toString();
    const url = `/api/members/export${queryString ? `?${queryString}` : ''}`;

    const response = await api.get<{ downloadUrl: string }>(url);
    return response.data;
  },
  importMembers: async (data: { members: Record<string, unknown>[]; branchId?: string }): Promise<{ message: string; success: number; failed: number; errors: string[] }> => {
    const response = await api.post('/api/members/import', data);
    return response.data;
  },
  getImportTemplate: async (): Promise<Blob> => {
    const response = await api.get('/api/members/import/template', { responseType: 'blob' });
    return response.data;
  },
};

// Events API
export const eventsApi = {
  getAll: async (params?: { startDate?: string; endDate?: string; status?: string }): Promise<ChurchEvent[]> => {
    const queryParams = new URLSearchParams();
    if (params?.startDate) queryParams.append('startDate', params.startDate);
    if (params?.endDate) queryParams.append('endDate', params.endDate);
    if (params?.status) queryParams.append('status', params.status);
    
    const queryString = queryParams.toString();
    const url = queryString ? `/api/events?${queryString}` : '/api/events';
    
    const response = await api.get<ChurchEvent[]>(url);
    return response.data;
  },
  getById: async (id: string): Promise<ChurchEvent> => {
    const response = await api.get<ChurchEvent>(`/api/events/${id}`);
    return response.data;
  },
  create: async (data: CreateEventRequest): Promise<ChurchEvent> => {
    const response = await api.post<ChurchEvent>('/api/events', data);
    return response.data;
  },
  update: async (id: string, data: UpdateEventRequest): Promise<ChurchEvent> => {
    const response = await api.put<ChurchEvent>(`/api/events/${id}`, data);
    return response.data;
  },
  delete: async (id: string): Promise<{ message: string }> => {
    const response = await api.delete<{ message: string }>(`/api/events/${id}`);
    return response.data;
  },
  generateShareLink: async (id: string): Promise<{ shareUrl: string; shareToken: string }> => {
    const response = await api.post<{ shareUrl: string; shareToken: string }>(`/api/events/${id}/share`);
    return response.data;
  },
  getPublicEvent: async (shareToken: string): Promise<ChurchEvent> => {
    const response = await api.get<ChurchEvent>(`/api/events/public/${shareToken}`);
    return response.data;
  },
  shareByEmail: async (id: string, data: { memberIds: string[]; message?: string }): Promise<{ message: string }> => {
    const response = await api.post<{ message: string }>(`/api/events/${id}/share/email`, data);
    return response.data;
  },
  getOccurrences: async (id: string, rangeDays: number = 30): Promise<EventOccurrence[]> => {
    const response = await api.get<EventOccurrence[]>(`/api/events/${id}/occurrences?range=${rangeDays}`);
    return response.data;
  },
  generateQRCode: async (id: string): Promise<{ token: string; dataUrl: string; expiresAt: string; checkInUrl?: string; occurrenceDate?: string }> => {
    const response = await api.post<{ token: string; dataUrl: string; expiresAt: string; checkInUrl?: string; occurrenceDate?: string }>(`/api/events/${id}/qr-code`);
    return response.data;
  },
  getQRCode: async (id: string): Promise<{ token: string; dataUrl: string; expiresAt: string; checkInUrl?: string; occurrenceDate?: string }> => {
    const response = await api.get<{ token: string; dataUrl: string; expiresAt: string; checkInUrl?: string; occurrenceDate?: string }>(`/api/events/${id}/qr-code`);
    return response.data;
  },
};

// Donations API
export const donationsApi = {
  getAll: async (): Promise<Donation[]> => {
    const response = await api.get<Donation[]>('/api/donations');
    return response.data;
  },
  getById: async (id: string): Promise<Donation> => {
    const response = await api.get<Donation>(`/api/donations/${id}`);
    return response.data;
  },
  create: async (data: CreateDonationRequest): Promise<Donation> => {
    const response = await api.post<Donation>('/api/donations', data);
    return response.data;
  },
  update: async (id: string, data: Partial<CreateDonationRequest>): Promise<Donation> => {
    const response = await api.put<Donation>(`/api/donations/${id}`, data);
    return response.data;
  },
  getStats: async (): Promise<DonationStats[]> => {
    const response = await api.get<DonationStats[]>('/api/donations/stats/summary');
    return response.data;
  },
  sendReceipt: async (id: string, channel: 'email' | 'sms'): Promise<{ message: string }> => {
    const response = await api.post<{ message: string }>(`/api/donations/${id}/receipt`, { channel });
    return response.data;
  },
};

// Attendance API
export const attendanceApi = {
  getAll: async (): Promise<AttendanceRecord[]> => {
    const response = await api.get<AttendanceRecord[]>('/api/attendance');
    return response.data;
  },
  getById: async (id: string): Promise<AttendanceRecord> => {
    const response = await api.get<AttendanceRecord>(`/api/attendance/${id}`);
    return response.data;
  },
  create: async (data: CreateAttendanceRequest): Promise<AttendanceRecord> => {
    const response = await api.post<AttendanceRecord>('/api/attendance', data);
    return response.data;
  },
  update: async (id: string, data: Partial<CreateAttendanceRequest>): Promise<AttendanceRecord> => {
    const response = await api.put<AttendanceRecord>(`/api/attendance/${id}`, data);
    return response.data;
  },
  delete: async (id: string): Promise<{ message: string }> => {
    const response = await api.delete<{ message: string }>(`/api/attendance/${id}`);
    return response.data;
  },
  getStats: async (): Promise<AttendanceStats> => {
    const response = await api.get<AttendanceStats>('/api/attendance/stats/summary');
    return response.data;
  },
  checkInWithQR: async (data: { token: string; memberId?: string; userId?: string; name?: string; email?: string; phone?: string }): Promise<{ message: string; record: any }> => {
    const response = await api.post<{ message: string; record: any }>('/api/attendance/check-in/qr', data);
    return response.data;
  },
  getEventAttendanceRecords: async (eventId: string, occurrenceDate?: string): Promise<{ records: any[]; stats: any }> => {
    const params = new URLSearchParams();
    if (occurrenceDate) params.append('occurrenceDate', occurrenceDate);
    const qs = params.toString();
    const response = await api.get<{ records: any[]; stats: any }>(`/api/attendance/event/${eventId}/records${qs ? `?${qs}` : ''}`);
    return response.data;
  },
  manualCheckIn: async (data: { eventId: string; memberId?: string; userId?: string; name?: string; email?: string; phone?: string; notes?: string; occurrenceDate?: string }): Promise<{ message: string; record: any }> => {
    const response = await api.post<{ message: string; record: any }>('/api/attendance/check-in/manual', data);
    return response.data;
  },
  deleteRecord: async (id: string): Promise<{ message: string }> => {
    const response = await api.delete<{ message: string }>(`/api/attendance/record/${id}`);
    return response.data;
  },
  exportEventAttendance: async (eventId: string, format: 'csv' | 'pdf' = 'csv', occurrenceDate?: string): Promise<{ downloadUrl: string }> => {
    const params = new URLSearchParams({ format });
    if (occurrenceDate) params.append('occurrenceDate', occurrenceDate);
    const response = await api.get<{ downloadUrl: string }>(`/api/attendance/event/${eventId}/export?${params.toString()}`);
    return response.data;
  },
};

// Messages API
export const messagesApi = {
  getAll: async (): Promise<Message[]> => {
    const response = await api.get<Message[]>('/api/messages');
    return response.data;
  },
  getById: async (id: string): Promise<Message> => {
    const response = await api.get<Message>(`/api/messages/${id}`);
    return response.data;
  },
  create: async (data: CreateMessageRequest): Promise<Message> => {
    const response = await api.post<Message>('/api/messages', data);
    return response.data;
  },
  update: async (id: string, data: Partial<CreateMessageRequest>): Promise<Message> => {
    const response = await api.put<Message>(`/api/messages/${id}`, data);
    return response.data;
  },
  delete: async (id: string): Promise<{ message: string }> => {
    const response = await api.delete<{ message: string }>(`/api/messages/${id}`);
    return response.data;
  },
};

// Prayer Requests API
export const prayerRequestsApi = {
  getAll: async (): Promise<PrayerRequest[]> => {
    const response = await api.get<PrayerRequest[]>('/api/prayer-requests');
    return response.data;
  },
  getById: async (id: string): Promise<PrayerRequest> => {
    const response = await api.get<PrayerRequest>(`/api/prayer-requests/${id}`);
    return response.data;
  },
  create: async (data: CreatePrayerRequestRequest): Promise<PrayerRequest> => {
    const response = await api.post<PrayerRequest>('/api/prayer-requests', data);
    return response.data;
  },
  pray: async (id: string): Promise<PrayerRequest> => {
    const response = await api.post<PrayerRequest>(`/api/prayer-requests/${id}/pray`);
    return response.data;
  },
  markAsAnswered: async (id: string): Promise<PrayerRequest> => {
    const response = await api.patch<PrayerRequest>(`/api/prayer-requests/${id}/answered`);
    return response.data;
  },
  delete: async (id: string): Promise<{ message: string }> => {
    const response = await api.delete<{ message: string }>(`/api/prayer-requests/${id}`);
    return response.data;
  },
};

// Departments API
export const departmentsApi = {
  getAll: async (): Promise<Department[]> => {
    const response = await api.get<Department[]>('/api/departments');
    return response.data;
  },
  getById: async (id: string): Promise<Department> => {
    const response = await api.get<Department>(`/api/departments/${id}`);
    return response.data;
  },
  create: async (data: CreateDepartmentRequest): Promise<Department> => {
    const response = await api.post<Department>('/api/departments', data);
    return response.data;
  },
  update: async (id: string, data: Partial<CreateDepartmentRequest>): Promise<Department> => {
    const response = await api.put<Department>(`/api/departments/${id}`, data);
    return response.data;
  },
  delete: async (id: string): Promise<{ message: string }> => {
    const response = await api.delete<{ message: string }>(`/api/departments/${id}`);
    return response.data;
  },
  addMember: async (id: string, memberId: string): Promise<Department> => {
    const response = await api.post<Department>(`/api/departments/${id}/members`, { memberId });
    return response.data;
  },
  removeMember: async (id: string, memberId: string): Promise<Department> => {
    const response = await api.delete<Department>(`/api/departments/${id}/members/${memberId}`);
    return response.data;
  },
};

// Expenses API
export const expensesApi = {
  getAll: async (): Promise<Expense[]> => {
    const response = await api.get<Expense[]>('/api/expenses');
    return response.data;
  },
  getById: async (id: string): Promise<Expense> => {
    const response = await api.get<Expense>(`/api/expenses/${id}`);
    return response.data;
  },
  create: async (data: CreateExpenseRequest): Promise<Expense> => {
    const response = await api.post<Expense>('/api/expenses', data);
    return response.data;
  },
  update: async (id: string, data: Partial<CreateExpenseRequest>): Promise<Expense> => {
    const response = await api.put<Expense>(`/api/expenses/${id}`, data);
    return response.data;
  },
  delete: async (id: string): Promise<{ message: string }> => {
    const response = await api.delete<{ message: string }>(`/api/expenses/${id}`);
    return response.data;
  },
};

// Finance API
export const financeApi = {
  getOverview: async (): Promise<FinanceOverview> => {
    const response = await api.get<FinanceOverview>('/api/finance/overview');
    return response.data;
  },
  getReport: async (startDate?: string, endDate?: string) => {
    const response = await api.get('/api/finance/reports', {
      params: { startDate, endDate },
    });
    return response.data;
  },
};

// User Branch Assignment API
export const userBranchApi = {
  getMyBranches: async (): Promise<Branch[]> => {
    const response = await api.get<Branch[]>('/api/users/me/branches');
    return response.data;
  },
  getOrgUsers: async (orgId: string): Promise<UserWithBranches[]> => {
    const response = await api.get<UserWithBranches[]>(`/api/organizations/${orgId}/users`);
    return response.data;
  },
  assignBranches: async (orgId: string, userId: string, branchIds: string[]): Promise<{ message: string }> => {
    const response = await api.post<{ message: string }>(`/api/organizations/${orgId}/users/${userId}/branches`, { branchIds });
    return response.data;
  },
  removeBranch: async (orgId: string, userId: string, branchId: string): Promise<{ message: string }> => {
    const response = await api.delete<{ message: string }>(`/api/organizations/${orgId}/users/${userId}/branches/${branchId}`);
    return response.data;
  },
};

// SMS API
export const smsApi = {
  // Credits management
  getCreditsBalance: async (): Promise<SmsCredit> => {
    const response = await api.get<SmsCredit>('/api/sms/credits/balance');
    return response.data;
  },
  getCreditTransactions: async (page = 1, limit = 20): Promise<{
    transactions: SmsCreditTransaction[];
    pagination: { page: number; limit: number; total: number; pages: number };
  }> => {
    const response = await api.get('/api/sms/credits/transactions', {
      params: { page, limit },
    });
    return response.data;
  },
  purchaseCredits: async (amount: number, transactionId?: string, paymentMethod?: string): Promise<{
    success: boolean;
    message: string;
    balance: number;
  }> => {
    const response = await api.post('/api/sms/credits/purchase', {
      amount,
      transactionId,
      paymentMethod,
    });
    return response.data;
  },

  initializePayment: async (credits: number): Promise<{
    success: boolean;
    reference: string;
    credits: number;
    pricePerCredit: number;
    subtotal: number;
    tax: number;
    total: number;
    currency: string;
    message: string;
  }> => {
    const response = await api.post('/api/sms/credits/initialize-payment', {
      credits,
    });
    return response.data;
  },

  verifyPayment: async (paystackReference: string): Promise<{
    success: boolean;
    message: string;
    credits: number;
    amount: number;
    newBalance: number;
    paystackReference: string;
  }> => {
    const response = await api.post('/api/sms/credits/verify-payment', {
      paystackReference,
    });
    return response.data;
  },

  // Send SMS
  sendSingle: async (data: SendSingleSmsRequest): Promise<{
    success: boolean;
    message: string;
    smsLogId: string;
    creditsUsed: number;
    status: string;
  }> => {
    const response = await api.post('/api/sms/send/single', data);
    return response.data;
  },
  sendBulk: async (data: SendBulkSmsRequest): Promise<{
    success: boolean;
    message: string;
    smsLogId: string;
    recipientCount: number;
    successCount: number;
    failCount: number;
    creditsUsed: number;
    status: string;
  }> => {
    const response = await api.post('/api/sms/send/bulk', data);
    return response.data;
  },
  sendToMembers: async (data: SendToMembersRequest): Promise<{
    success: boolean;
    message: string;
    recipientCount: number;
    successCount: number;
    failCount: number;
    creditsUsed: number;
  }> => {
    const response = await api.post('/api/sms/send/members', data);
    return response.data;
  },
  sendToDepartment: async (data: SendToDepartmentRequest): Promise<{
    success: boolean;
    message: string;
    recipientCount: number;
    successCount: number;
    failCount: number;
    creditsUsed: number;
  }> => {
    const response = await api.post('/api/sms/send/department', data);
    return response.data;
  },
  sendToBranch: async (data: SendToBranchRequest): Promise<{
    success: boolean;
    message: string;
    smsLogId: string;
    recipientCount: number;
    successCount: number;
    failCount: number;
    creditsUsed: number;
  }> => {
    const response = await api.post('/api/sms/send/branch', data);
    return response.data;
  },
  sendToAll: async (data: SendToAllMembersRequest): Promise<{
    success: boolean;
    message: string;
    recipientCount: number;
    successCount: number;
    failCount: number;
    creditsUsed: number;
  }> => {
    const response = await api.post('/api/sms/send/all', data);
    return response.data;
  },

  // SMS logs and analytics
  getSmsLogs: async (params?: {
    page?: number;
    limit?: number;
    status?: string;
    category?: string;
    startDate?: string;
    endDate?: string;
    messageType?: string;
  }): Promise<{
    logs: SmsLog[];
    pagination: { page: number; limit: number; total: number; pages: number };
  }> => {
    const response = await api.get('/api/sms/logs', { params });
    return response.data;
  },
  getSmsLogDetails: async (id: string): Promise<SmsLog> => {
    const response = await api.get<SmsLog>(`/api/sms/logs/${id}`);
    return response.data;
  },
  getAnalytics: async (params?: {
    startDate?: string;
    endDate?: string;
    period?: '7d' | '30d' | '90d';
  }): Promise<SmsAnalytics> => {
    const response = await api.get<SmsAnalytics>('/api/sms/analytics', { params });
    return response.data;
  },

  // Delivery status updates
  updateDeliveryStatus: async (logId: string): Promise<{
    success: boolean;
    message: string;
    totalRecipients: number;
    updatedCount: number;
  }> => {
    const response = await api.post(`/api/sms/logs/${logId}/update-status`);
    return response.data;
  },

  batchUpdateDeliveryStatuses: async (logIds: string[]): Promise<{
    success: boolean;
    message: string;
    totalLogs: number;
    results: any[];
  }> => {
    const response = await api.post('/api/sms/logs/batch-update-status', { logIds });
    return response.data;
  },

  // Utilities
  getAvailableMembers: async (): Promise<AvailableMembersResponse> => {
    const response = await api.get<AvailableMembersResponse>('/api/sms/members/available');
    return response.data;
  },
  calculateCost: async (message: string, recipientCount: number): Promise<SmsCostCalculation> => {
    const response = await api.post<SmsCostCalculation>('/api/sms/calculate-cost', {
      message,
      recipientCount,
    });
    return response.data;
  },

  // SMS Templates
  getTemplates: async (): Promise<Array<{
    _id: string;
    name: string;
    message: string;
    description: string;
    category: string;
    usageCount: number;
    createdAt: string;
    variables?: string[];
  }>> => {
    const response = await api.get('/api/sms/templates');
    return response.data;
  },
  getTemplate: async (id: string): Promise<{
    _id: string;
    name: string;
    message: string;
    description: string;
    category: string;
    variables: string[];
    usageCount: number;
    createdAt: string;
  }> => {
    const response = await api.get(`/api/sms/templates/${id}`);
    return response.data;
  },
  createTemplate: async (data: {
    name: string;
    message: string;
    description?: string;
    category?: string;
  }): Promise<{
    _id: string;
    name: string;
    message: string;
    description: string;
    category: string;
    variables: string[];
  }> => {
    const response = await api.post('/api/sms/templates', data);
    return response.data;
  },
  updateTemplate: async (id: string, data: Partial<{
    name: string;
    message: string;
    description: string;
    category: string;
  }>): Promise<{
    _id: string;
    name: string;
    message: string;
    description: string;
    category: string;
    variables: string[];
  }> => {
    const response = await api.put(`/api/sms/templates/${id}`, data);
    return response.data;
  },
  deleteTemplate: async (id: string): Promise<{ message: string }> => {
    const response = await api.delete(`/api/sms/templates/${id}`);
    return response.data;
  },
  duplicateTemplate: async (id: string): Promise<{
    _id: string;
    name: string;
    message: string;
    description: string;
    category: string;
  }> => {
    const response = await api.post(`/api/sms/templates/${id}/duplicate`);
    return response.data;
  },
};

// Settings API
export const settingsApi = {
  // Birthday settings
  getBirthdaySettings: async (): Promise<{
    birthdayMessageTemplate: string;
    birthdayAutoSendEnabled: boolean;
    churchName: string;
  }> => {
    const response = await api.get('/api/settings/birthday');
    return response.data;
  },
  updateBirthdaySettings: async (data: {
    birthdayMessageTemplate?: string;
    birthdayAutoSendEnabled?: boolean;
  }): Promise<{
    message: string;
    birthdayMessageTemplate: string;
    birthdayAutoSendEnabled: boolean;
  }> => {
    const response = await api.put('/api/settings/birthday', data);
    return response.data;
  },
  resetBirthdayTemplate: async (): Promise<{
    message: string;
    birthdayMessageTemplate: string;
  }> => {
    const response = await api.post('/api/settings/birthday/reset');
    return response.data;
  },
};

// Health check
export const healthCheck = async (): Promise<{ status: string }> => {
  const response = await api.get<{ status: string }>('/api/health');
  return response.data;
};

export default api;
