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
  ChurchEvent,
  CreateEventRequest,
  UpdateEventRequest,
  Donation,
  CreateDonationRequest,
  DonationStats,
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
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiError>) => {
    const status = error.response?.status;
    const isAuthError = status === 401 || status === 403;
    const isExpiredToken = error.response?.data?.error === 'Invalid or expired token';

    if (isAuthError && typeof window !== 'undefined') {
      // Clear all auth-related storage
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('auth-storage');

      // Only redirect if not already on auth pages
      const isOnAuthPage = window.location.pathname.startsWith('/login') ||
                           window.location.pathname.startsWith('/register') ||
                           window.location.pathname.startsWith('/forgot-password') ||
                           window.location.pathname.startsWith('/reset-password') ||
                           window.location.pathname.startsWith('/verify-email');

      if (!isOnAuthPage) {
        // Store a flag to show session expired message on login page
        if (isExpiredToken || status === 403) {
          sessionStorage.setItem('sessionExpired', 'true');
        }
        window.location.href = '/login';
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
};

// Members API
export const membersApi = {
  getAll: async (): Promise<Member[]> => {
    const response = await api.get<Member[]>('/api/members');
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
};

// Events API
export const eventsApi = {
  getAll: async (): Promise<ChurchEvent[]> => {
    const response = await api.get<ChurchEvent[]>('/api/events');
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
};

// Health check
export const healthCheck = async (): Promise<{ status: string }> => {
  const response = await api.get<{ status: string }>('/api/health');
  return response.data;
};

export default api;
