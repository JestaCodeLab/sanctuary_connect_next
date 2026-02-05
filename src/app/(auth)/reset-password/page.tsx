'use client';

import { useState, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { Lock, ArrowLeft, CheckCircle } from 'lucide-react';
import { Button, Input, Card, PasswordStrength } from '@/components/ui';
import { resetPasswordSchema, ResetPasswordFormData } from '@/lib/validations';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

function ResetPasswordContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');
  const { setUser } = useAuthStore();

  const [isLoading, setIsLoading] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [password, setPassword] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<ResetPasswordFormData>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: {
      password: '',
      confirmPassword: '',
    },
  });

  // Redirect if no token
  useEffect(() => {
    if (!token) {
      toast.error('Invalid or missing reset token');
      router.push('/forgot-password');
    }
  }, [token, router]);

  const onSubmit = async (data: ResetPasswordFormData) => {
    if (!token) return;

    setIsLoading(true);
    try {
      const response = await authApi.resetPassword({
        token,
        newPassword: data.password,
      });

      // Store token
      localStorage.setItem('token', response.token);

      // Update auth store
      setUser(response.user, response.token);

      setIsSuccess(true);
      toast.success('Password reset successfully!');

      // Redirect after delay
      setTimeout(() => {
        router.push('/dashboard');
      }, 2000);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } };
      const message = err.response?.data?.error || 'Failed to reset password. The link may have expired.';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="min-h-[calc(100vh-140px)] flex items-center justify-center py-12 px-4">
        <div className="w-full max-w-md animate-slideUp">
          <Card padding="lg" className="text-center">
            {/* Icon */}
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full mb-6">
              <CheckCircle className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>

            {/* Title */}
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Password Reset!</h1>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              Your password has been successfully reset. You&apos;ll be redirected to your dashboard shortly.
            </p>

            <Link href="/dashboard">
              <Button className="w-full">
                Go to Dashboard
              </Button>
            </Link>
          </Card>
        </div>
      </div>
    );
  }

  if (!token) {
    return null;
  }

  return (
    <div className="min-h-[calc(100vh-140px)] flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md animate-slideUp">
        <Card padding="lg" className="text-center">
          {/* Title */}
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Reset Your Password</h1>
          <p className="text-gray-500 dark:text-gray-400 mb-8">
            Choose a strong password to secure your Sanctuary Connect account.
          </p>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 text-left">
            {/* New Password */}
            <div className="space-y-3">
              <Input
                label="New Password"
                type="password"
                placeholder="••••••••"
                leftIcon={<Lock className="w-5 h-5" />}
                error={errors.password?.message}
                {...register('password', {
                  onChange: (e) => setPassword(e.target.value),
                })}
              />
            </div>

            {/* Confirm Password */}
            <Input
              label="Confirm New Password"
              type="password"
              placeholder="••••••••"
              leftIcon={<Lock className="w-5 h-5" />}
              error={errors.confirmPassword?.message}
              {...register('confirmPassword')}
            />

            {/* Password Strength */}
            <PasswordStrength password={password} showRequirements={true} />

            <Button
              type="submit"
              className="w-full"
              size="lg"
              isLoading={isLoading}
            >
              Update Password
            </Button>
          </form>

          {/* Back to Login */}
          <Link
            href="/login"
            className="inline-flex items-center gap-1 mt-6 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
          >
            <ArrowLeft className="w-4 h-4" />
            Return to login
          </Link>
        </Card>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense fallback={
      <div className="min-h-[calc(100vh-140px)] flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#3AAFDC]"></div>
      </div>
    }>
      <ResetPasswordContent />
    </Suspense>
  );
}
