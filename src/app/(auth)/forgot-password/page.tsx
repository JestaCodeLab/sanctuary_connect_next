'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { Mail, ArrowLeft, KeyRound } from 'lucide-react';
import { Button, Input, Card } from '@/components/ui';
import { forgotPasswordSchema, ForgotPasswordFormData } from '@/lib/validations';
import { authApi } from '@/lib/api';

export default function ForgotPasswordPage() {
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
    getValues,
  } = useForm<ForgotPasswordFormData>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: {
      email: '',
    },
  });

  const onSubmit = async (data: ForgotPasswordFormData) => {
    setIsLoading(true);
    try {
      await authApi.forgotPassword({ email: data.email });
      setIsSubmitted(true);
      toast.success('Recovery link sent!');
    } catch (error: unknown) {
      // Even on error, show success for security
      setIsSubmitted(true);
    } finally {
      setIsLoading(false);
    }
  };

  if (isSubmitted) {
    return (
      <div className="min-h-[calc(100vh-140px)] flex items-center justify-center py-12 px-4">
        <div className="w-full max-w-md animate-slideUp">
          <Card padding="lg" className="text-center">
            {/* Icon */}
            <div className="inline-flex items-center justify-center w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-full mb-6">
              <Mail className="w-8 h-8 text-green-600 dark:text-green-400" />
            </div>

            {/* Title */}
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Check your email</h1>
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              If an account exists for{' '}
              <span className="font-medium text-gray-900 dark:text-gray-100">{getValues('email')}</span>,
              we&apos;ve sent a password reset link.
            </p>

            <p className="text-sm text-gray-500 dark:text-gray-400 mb-6">
              The link will expire in 1 hour. If you don&apos;t see the email, check your spam folder.
            </p>

            {/* Back to Login */}
            <Link href="/login">
              <Button variant="outline" className="w-full">
                <ArrowLeft className="w-4 h-4 mr-2" />
                Back to Login
              </Button>
            </Link>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-140px)] flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md animate-slideUp">
        <Card padding="lg" className="text-center">
          {/* Icon */}
          <div className="inline-flex items-center justify-center w-16 h-16 bg-[#E8F6FB] dark:bg-[#3AAFDC]/20 rounded-full mb-6">
            <KeyRound className="w-8 h-8 text-[#3AAFDC]" />
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Forgot your password?</h1>
          <p className="text-gray-500 dark:text-gray-400 mb-8">
            Enter the email address associated with your Sanctuary Connect account, and we&apos;ll send you a link to reset your password.
          </p>

          {/* Form */}
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5 text-left">
            <Input
              label="Email Address"
              type="email"
              placeholder="e.g. pastor@church.com"
              leftIcon={<Mail className="w-5 h-5" />}
              error={errors.email?.message}
              {...register('email')}
            />

            <Button
              type="submit"
              className="w-full"
              size="lg"
              isLoading={isLoading}
            >
              Send Recovery Link
            </Button>
          </form>

          {/* Back to Login */}
          <Link
            href="/login"
            className="inline-flex items-center gap-1 mt-6 text-sm text-[#3AAFDC] hover:text-[#2D9AC7] font-medium"
          >
            <ArrowLeft className="w-4 h-4" />
            Return to Login
          </Link>
        </Card>

        {/* Contact Admin */}
        <p className="text-center mt-6 text-sm text-gray-500 dark:text-gray-400">
          Don&apos;t have an account?{' '}
          <Link href="#" className="text-[#3AAFDC] hover:text-[#2D9AC7] font-medium">
            Contact your administrator
          </Link>
        </p>
      </div>
    </div>
  );
}
