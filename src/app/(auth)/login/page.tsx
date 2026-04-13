'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import Head from 'next/head';
import toast from 'react-hot-toast';
import { Mail, Lock, ArrowRight } from 'lucide-react';
import { Button, Input, Checkbox, Card } from '@/components/ui';
import { loginSchema, LoginFormData } from '@/lib/validations';
import { authApi, organizationApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useOnboardingStore } from '@/store/onboardingStore';

// Map onboarding step to route
const onboardingStepRoutes: Record<number, string> = {
  1: '/onboarding/identity',
  2: '/onboarding/branches',
  3: '/onboarding/finances',
  4: '/onboarding/subscription',
  5: '/onboarding/review',
};

export default function LoginPage() {
  const router = useRouter();
  const { setUser, user, isAuthenticated, token } = useAuthStore();
  const { restoreFromBackend } = useOnboardingStore();
  const [isLoading, setIsLoading] = useState(false);

  // Check for session expiration message
  useEffect(() => {
    const sessionExpired = sessionStorage.getItem('sessionExpired');
    if (sessionExpired) {
      toast.error('Your session has expired. Please log in again.', {
        duration: 5000,
        id: 'session-expired',
      });
      sessionStorage.removeItem('sessionExpired');
    }
  }, []);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginFormData>({
    resolver: zodResolver(loginSchema),
    defaultValues: {
      email: '',
      password: '',
      rememberMe: false,
    },
  });

  // Redirect to dashboard if already authenticated
  useEffect(() => {
    if (isAuthenticated && user && user.id && token) {
      // Immediately redirect without waiting
      const dashboardUrl = user.role === 'superadmin' ? '/superadmin/dashboard' : '/dashboard';
      router.replace(dashboardUrl);
    }
  }, [isAuthenticated, user, token, router]);

  // Don't render form if already authenticated
  if (isAuthenticated && user && user.id && token) {
    return (
      <div className="min-h-[calc(100vh-140px)] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    );
  }

  const onSubmit = async (data: LoginFormData) => {
    setIsLoading(true);
    try {
      const response = await authApi.login({
        email: data.email,
        password: data.password,
      });

      // Store token in localStorage for API interceptor
      localStorage.setItem('token', response.token);

      // Update auth store
      setUser(response.user, response.token);

      // Superadmin has no org — skip org check entirely
      if (response.user.role === 'superadmin') {
        toast.success('Welcome back!');
        router.push('/superadmin/dashboard');
        return;
      }

      // Check if user has an organization with incomplete onboarding
      try {
        const orgData = await organizationApi.getMyOrganization();

        if (!orgData.organization.onboardingComplete) {
          // Restore onboarding state from backend
          restoreFromBackend(orgData);

          // Redirect to the appropriate onboarding step
          const step = orgData.organization.onboardingStep || 1;
          const route = onboardingStepRoutes[step] || '/onboarding/identity';

          toast.success('Welcome back! Continuing your setup...');
          router.push(route);
          return;
        }
      } catch {
        // No organization found - user is new or hasn't started onboarding
        if (response.user.role === 'member') {
          toast.success('Welcome! Let\'s set up your organization.');
          router.push('/onboarding/identity');
          return;
        }
      }

      toast.success('Welcome back!');
      router.push('/dashboard');
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } };
      const message = err.response?.data?.error || 'Login failed. Please try again.';

      if (message.includes('verify your email')) {
        toast.error('Please verify your email first');
        router.push('/verify-email');
      } else {
        toast.error(message);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <Head>
        <title>Login - Sanctuary Connect | Church Management Platform</title>
        <meta name="description" content="Sign in to your Sanctuary Connect account to manage your church, members, events, and donations. Secure access for church administrators and staff." />
        <meta name="keywords" content="church login, sanctuary connect, church management system, church admin login, church software" />
        <meta name="robots" content="noindex, nofollow" />
        <link rel="canonical" href="https://www.sanctuaryconnect.org/login" />
        
        {/* Open Graph */}
        <meta property="og:title" content="Login - Sanctuary Connect" />
        <meta property="og:description" content="Sign in to manage your church with Sanctuary Connect - the all-in-one church management platform." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://www.sanctuaryconnect.org/login" />
        <meta property="og:image" content="https://www.sanctuaryconnect.org/og-login.jpg" />
        
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Login - Sanctuary Connect" />
        <meta name="twitter:description" content="Sign in to manage your church with Sanctuary Connect - the all-in-one church management platform." />
        <meta name="twitter:image" content="https://www.sanctuaryconnect.org/og-login.jpg" />
      </Head>

      <div className="min-h-[calc(100vh-140px)] flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md animate-slideUp">
        
        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Welcome Back, Admin</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Manage your sanctuary and community with ease.
          </p>
        </div>

        {/* Login Form */}
        <Card padding="lg">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* Email */}
            <Input
              label="Email Address"
              type="email"
              placeholder="e.g. admin@sanctuary.org"
              leftIcon={<Mail className="w-5 h-5" />}
              error={errors.email?.message}
              {...register('email')}
            />

            {/* Password */}
            <Input
              label="Password"
              type="password"
              placeholder="••••••••"
              leftIcon={<Lock className="w-5 h-5" />}
              error={errors.password?.message}
              {...register('password')}
            />

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between">
              <Checkbox label="Remember me" {...register('rememberMe')} />
              <Link
                href="/forgot-password"
                className="text-sm text-[#3AAFDC] hover:text-[#2D9AC7] dark:hover:text-[#5BC0E8] font-medium"
              >
                Forgot Password?
              </Link>
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full"
              size="lg"
              isLoading={isLoading}
              rightIcon={<ArrowRight className="w-5 h-5" />}
            >
              Sign In
            </Button>
          </form>
        </Card>

        {/* Register Link */}
        <p className="text-center mt-6 text-sm text-gray-500 dark:text-gray-400">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="text-[#3AAFDC] hover:text-[#2D9AC7] dark:hover:text-[#5BC0E8] font-medium">
            Register
          </Link>
        </p>
      </div>
      </div>
    </>
  );
}
