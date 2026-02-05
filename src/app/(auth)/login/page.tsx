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
  const { setUser } = useAuthStore();
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
        // Check if user role is 'member' (hasn't created org yet)
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

            {/* Divider */}
            <div className="relative my-6">
              <div className="absolute inset-0 flex items-center">
                <div className="w-full border-t border-gray-200 dark:border-gray-700"></div>
              </div>
              <div className="relative flex justify-center text-sm">
                <span className="px-4 bg-white dark:bg-gray-800 text-gray-500 dark:text-gray-400">Or continue with</span>
              </div>
            </div>

            {/* OAuth Buttons */}
            <div className="grid grid-cols-2 gap-3">
              <Button
                type="button"
                variant="outline"
                className="flex items-center justify-center gap-2"
                onClick={() => toast.error('OAuth coming soon')}
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                Google
              </Button>
              <Button
                type="button"
                variant="outline"
                className="flex items-center justify-center gap-2"
                onClick={() => toast.error('OAuth coming soon')}
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M11.4 24H0V12.6h11.4V24zM24 24H12.6V12.6H24V24zM11.4 11.4H0V0h11.4v11.4zm12.6 0H12.6V0H24v11.4z"
                  />
                </svg>
                Microsoft
              </Button>
            </div>
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
