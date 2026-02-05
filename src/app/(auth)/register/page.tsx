'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import Head from 'next/head';
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
    <>
      <Head>
        <title>Register - Sanctuary Connect | Start Your Free Trial</title>
        <meta name="description" content="Create your free Sanctuary Connect account today. Get started with modern church management software to streamline member management, events, donations, and communication." />
        <meta name="keywords" content="church registration, church software signup, sanctuary connect free trial, church management system, church admin software" />
        <meta name="robots" content="index, follow" />
        <link rel="canonical" href="https://www.sanctuaryconnect.org/register" />
        
        {/* Open Graph */}
        <meta property="og:title" content="Register - Sanctuary Connect | Start Your Free Trial" />
        <meta property="og:description" content="Join hundreds of churches using Sanctuary Connect to manage their ministry with ease. Sign up for free and transform your church management." />
        <meta property="og:type" content="website" />
        <meta property="og:url" content="https://www.sanctuaryconnect.org/register" />
        <meta property="og:image" content="https://www.sanctuaryconnect.org/og-register.jpg" />
        
        {/* Twitter Card */}
        <meta name="twitter:card" content="summary_large_image" />
        <meta name="twitter:title" content="Register - Sanctuary Connect | Start Your Free Trial" />
        <meta name="twitter:description" content="Join hundreds of churches using Sanctuary Connect to manage their ministry with ease." />
        <meta name="twitter:image" content="https://www.sanctuaryconnect.org/og-register.jpg" />
      </Head>

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
    </>
  );
}
