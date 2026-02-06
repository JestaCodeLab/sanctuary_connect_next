'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { Mail, ArrowLeft, CheckCircle } from 'lucide-react';
import { Button, Card, OTPInput } from '@/components/ui';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

export default function VerifyEmailPage() {
  const router = useRouter();
  const { pendingEmail, clearPendingEmail, setUser } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [code, setCode] = useState('');
  const [error, setError] = useState('');
  const [resendCooldown, setResendCooldown] = useState(0);
  const [showSuccess, setShowSuccess] = useState(false);
  const isNavigatingRef = useRef(false); // Track if we're navigating after successful verification

  // Redirect if no pending email (but not if we just verified and are navigating)
  useEffect(() => {
    if (!pendingEmail && !isNavigatingRef.current) {
      router.push('/login');
    }
  }, [pendingEmail, router]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown > 0) {
      const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
      return () => clearTimeout(timer);
    }
  }, [resendCooldown]);

  const handleVerify = async () => {
    if (code.length !== 6) {
      setError('Please enter the complete 6-digit code');
      return;
    }

    setIsLoading(true);
    setError('');

    try {
      const response = await authApi.verifyEmail({
        email: pendingEmail!,
        code,
      });

      // Store token
      localStorage.setItem('token', response.token);

      // Update auth store
      setUser(response.user, response.token);

      toast.success('Email verified successfully!');

      // Mark that we're navigating to prevent the useEffect redirect
      isNavigatingRef.current = true;

      // Clear pending email and navigate
      clearPendingEmail();
      router.push('/onboarding/identity');
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } };
      const message = err.response?.data?.error || 'Verification failed. Please try again.';
      setError(message);
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;

    try {
      await authApi.resendVerification(pendingEmail!);
      setResendCooldown(45);
      setShowSuccess(true);
      setTimeout(() => setShowSuccess(false), 3000);
      toast.success('Verification code sent!');
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error || 'Failed to resend code');
    }
  };

  if (!pendingEmail) {
    return null;
  }

  return (
    <div className="min-h-[calc(100vh-140px)] flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-md animate-slideUp">
        {/* Success Toast Banner */}
        {showSuccess && (
          <div className="mb-4 p-4 bg-white dark:bg-gray-800 border border-green-200 dark:border-green-800 rounded-xl flex items-center gap-3 shadow-sm animate-fadeIn">
            <CheckCircle className="w-5 h-5 text-green-500" />
            <div>
              <p className="font-medium text-gray-900 dark:text-gray-100">Success!</p>
              <p className="text-sm text-gray-500 dark:text-gray-400">Verification code sent to your email.</p>
            </div>
            <button
              onClick={() => setShowSuccess(false)}
              className="ml-auto text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Main Card */}
        <Card padding="lg" className="text-center">
          {/* Icon */}
          <div className="inline-flex items-center justify-center w-16 h-16 bg-[#E8F6FB] dark:bg-[#3AAFDC]/20 rounded-full mb-6">
            <Mail className="w-8 h-8 text-[#3AAFDC]" />
          </div>

          {/* Title */}
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">Verify your email</h1>
          <p className="text-gray-500 dark:text-gray-400 mb-8">
            Please enter the 6-digit verification code we sent to{' '}
            <span className="font-medium text-gray-900 dark:text-gray-100">{pendingEmail}</span>. The code is valid for 10 minutes.
          </p>

          {/* OTP Input */}
          <div className="mb-6">
            <OTPInput
              value={code}
              onChange={setCode}
              error={error}
              disabled={isLoading}
            />
          </div>

          {/* Verify Button */}
          <Button
            onClick={handleVerify}
            className="w-full"
            size="lg"
            isLoading={isLoading}
            disabled={code.length !== 6}
          >
            Verify & Continue
          </Button>

          {/* Resend Link */}
          <p className="mt-4 text-sm text-gray-500 dark:text-gray-400">
            Didn&apos;t receive the code?{' '}
            {resendCooldown > 0 ? (
              <span className="text-[#3AAFDC]">
                Resend in 0:{resendCooldown.toString().padStart(2, '0')}
              </span>
            ) : (
              <button
                onClick={handleResend}
                className="text-[#3AAFDC] hover:text-[#2D9AC7] font-medium"
              >
                Resend
              </button>
            )}
          </p>

          {/* Back to Login */}
          <Link
            href="/login"
            className="inline-flex items-center gap-1 mt-4 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Login
          </Link>
        </Card>
      </div>
    </div>
  );
}
