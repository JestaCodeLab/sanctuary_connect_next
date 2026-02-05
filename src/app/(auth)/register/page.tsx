'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import toast from 'react-hot-toast';
import { User, Mail, Phone, Lock, ArrowRight } from 'lucide-react';
import { Button, Input, Card, ProgressBar, PasswordStrength } from '@/components/ui';
import { registerSchema, RegisterFormData } from '@/lib/validations';
import { authApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';

export default function RegisterPage() {
  const router = useRouter();
  const { setPendingEmail } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [password, setPassword] = useState('');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RegisterFormData>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      password: '',
    },
  });

  const onSubmit = async (data: RegisterFormData) => {
    setIsLoading(true);
    try {
      await authApi.register({
        email: data.email,
        password: data.password,
        firstName: data.firstName,
        lastName: data.lastName,
        phone: data.phone,
      });

      // Store email for verification page
      setPendingEmail(data.email);

      toast.success('Registration successful! Please verify your email.');
      router.push('/verify-email');
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } };
      const message = err.response?.data?.error || 'Registration failed. Please try again.';
      toast.error(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-140px)] flex items-center justify-center py-12 px-4">
      <div className="w-full max-w-xl animate-slideUp">
        {/* Title */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Admin Account Registration</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Join hundreds of churches managing their ministry with ease.
          </p>
        </div>

        {/* Progress Indicator */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <div>
              <span className="text-xs font-medium text-[#3AAFDC] uppercase tracking-wide">
                Step 1 of 2
              </span>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">Admin Details</h3>
            </div>
            <span className="text-sm text-gray-500 dark:text-gray-400">50% Complete</span>
          </div>
          <ProgressBar progress={50} />
          <p className="text-xs text-gray-400 dark:text-gray-500 mt-2 flex items-center gap-1">
            <ArrowRight className="w-3 h-3" /> Next: Church Info
          </p>
        </div>

        {/* Registration Form */}
        <Card padding="lg">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            {/* First Name and Last Name - Side by side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="First Name"
                type="text"
                placeholder="John"
                leftIcon={<User className="w-5 h-5" />}
                error={errors.firstName?.message}
                {...register('firstName')}
              />
              <Input
                label="Last Name"
                type="text"
                placeholder="Doe"
                error={errors.lastName?.message}
                {...register('lastName')}
              />
            </div>

            {/* Email and Phone - Side by side */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Input
                label="Work Email"
                type="email"
                placeholder="email@church.org"
                leftIcon={<Mail className="w-5 h-5" />}
                error={errors.email?.message}
                {...register('email')}
              />
              <Input
                label="Phone Number"
                type="tel"
                placeholder="+233 XX XXX XXXX"
                leftIcon={<Phone className="w-5 h-5" />}
                error={errors.phone?.message}
                {...register('phone')}
              />
            </div>

            {/* Password */}
            <div className="space-y-3">
              <Input
                label="Create Password"
                type="password"
                placeholder="••••••••••••"
                leftIcon={<Lock className="w-5 h-5" />}
                error={errors.password?.message}
                {...register('password', {
                  onChange: (e) => setPassword(e.target.value),
                })}
              />
              <PasswordStrength password={password} />
            </div>

            {/* Submit Button */}
            <Button
              type="submit"
              className="w-full"
              size="lg"
              isLoading={isLoading}
              rightIcon={<ArrowRight className="w-5 h-5" />}
            >
              Continue to Church Info
            </Button>
          </form>
        </Card>

        {/* Already have account */}
        <p className="text-center mt-4 text-sm text-gray-500 dark:text-gray-400">
          Already have an account?{' '}
          <Link href="/login" className="text-[#3AAFDC] hover:text-[#2D9AC7] font-medium">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
}
