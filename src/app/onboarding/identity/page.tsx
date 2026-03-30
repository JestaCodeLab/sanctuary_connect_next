'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import { Building2, Church, Home, Calendar, Heart, Search, MapPin } from 'lucide-react';
import { Button, Input, Card, ProgressBar, ImageUpload } from '@/components/ui';
import { organizationIdentitySchema, OrganizationIdentityFormData } from '@/lib/validations';
import { organizationApi } from '@/lib/api';
import { useOnboardingStore } from '@/store/onboardingStore';
import { useAuthStore } from '@/store/authStore';

const steps = [
  { id: 1, name: 'Identity' },
  { id: 2, name: 'Branches' },
  { id: 3, name: 'Finances' },
  { id: 4, name: 'Plan' },
  { id: 5, name: 'Launch' },
];

export default function OnboardingIdentityPage() {
  const router = useRouter();
  const { identity, setIdentity, setOrganizationId, organizationId } = useOnboardingStore();
  const { user, setUser } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);
  const [logoUrl, setLogoUrl] = useState<string | null>(identity.logoUrl);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<OrganizationIdentityFormData>({
    resolver: zodResolver(organizationIdentitySchema),
    defaultValues: {
      churchName: identity.churchName || '',
      legalName: identity.legalName || '',
      structure: 'multi',
    },
  });

  const churchName = watch('churchName');

  const onSubmit = async (data: OrganizationIdentityFormData) => {
    // Prevent double-submission
    if (isLoading) {
      console.log('🛑 Submit already in progress, ignoring double-click');
      return;
    }

    setIsLoading(true);
    console.log('📝 Starting onboarding step 1 submission...', { organizationId, hasLogo: !!logoUrl });
    try {
      // Save to store
      setIdentity({
        churchName: data.churchName,
        legalName: data.legalName || data.churchName,
        structure: 'multi',
        logoUrl: logoUrl,
      });

      const orgData = {
        churchName: data.churchName,
        legalName: data.legalName,
        logoUrl: logoUrl || undefined,
      };
      console.log('📦 Organization payload:', orgData);

      if (organizationId) {
        // Update existing organization (user is resuming onboarding)
        console.log('♻️ Updating existing organization:', organizationId);
        await organizationApi.update(organizationId, {
          ...orgData,
          onboardingStep: 2,
        });
        toast.success('Church identity updated!');
      } else {
        // Create new organization
        console.log('✨ Creating new organization...');
        try {
          const response = await organizationApi.create(orgData);
          console.log('✅ Organization created:', response._id);

          // Save the new token with admin role
          if (response.token && user) {
            const updatedUser = { ...user, role: 'admin' as const };
            setUser(updatedUser, response.token);
            localStorage.setItem('token', response.token);
            console.log('🔐 Token updated with admin role');
          }

          setOrganizationId(response._id);

          // Update onboarding step to 2 (branches)
          await organizationApi.update(response._id, { onboardingStep: 2 });
          toast.success('Church identity saved!');
        } catch (createError: unknown) {
          const err = createError as { response?: { data?: { code?: string; error?: string; existingOrganization?: { id: string; churchName: string; onboardingStep: number } } } };
          console.error('❌ Organization creation error:', err.response?.data);
          
          // If org already exists, use the returned org to resume
          if (err.response?.data?.code === 'ORG_ALREADY_EXISTS') {
            const existingOrg = err.response.data.existingOrganization;
            if (existingOrg) {
              console.log('♻️ Organization already exists, resuming from step:', existingOrg.onboardingStep);
              setOrganizationId(existingOrg.id);
              
              // Verify identity details match what's in backend
              const identityMatch = {
                churchName: existingOrg.churchName === data.churchName,
              };
              console.log('✅ Verifying identity match:', identityMatch);
              
              // Update onboarding step to 2 if not already there, and sync any changes
              if (existingOrg.onboardingStep < 2 || !identityMatch.churchName) {
                console.log('📝 Syncing org details to step 2...');
                await organizationApi.update(existingOrg.id, {
                  ...orgData,
                  onboardingStep: 2,
                });
              }
              
              setIsLoading(false);
              console.log('✅ Navigating to branches page...');
              toast.success('Resuming your setup...');
              router.push('/onboarding/branches');
              return;
            }
          }
          
          // Re-throw if not a handled error
          throw createError;
        }
      }

      router.push('/onboarding/branches');
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error || 'Failed to save. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Main Content */}
      <div className="lg:col-span-2">
        {/* Progress Steps */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-2">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Step 1 of 5: Identity</h2>
            <span className="text-sm text-[#3AAFDC]">20% Complete</span>
          </div>
          <ProgressBar progress={20} size="md" />
          <div className="flex justify-between mt-3">
            {steps.map((step) => (
              <span
                key={step.id}
                className={`text-xs ${step.id === 1 ? 'text-[#3AAFDC] font-medium' : 'text-gray-400 dark:text-gray-500'}`}
              >
                {step.id}. {step.name}
              </span>
            ))}
          </div>
        </div>

        {/* Title */}
        <div className="mb-6">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Let&apos;s start with the basics.</h1>
          <p className="text-gray-500 dark:text-gray-400 mt-1">
            Define your church&apos;s identity to personalize the member experience and branding across the platform.
          </p>
        </div>

        {/* Form */}
        <Card padding="lg">
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
            {/* Church Name */}
            <Input
              label="Church Legal Name"
              placeholder="Grace Community Church"
              error={errors.churchName?.message}
              {...register('churchName')}
            />

            {/* Logo Upload */}
            <ImageUpload
              label="Organization Logo"
              description="PNG, JPG or SVG (max. 5MB)"
              value={logoUrl}
              onChange={setLogoUrl}
            />

            {/* Actions */}
            <div className="flex justify-end pt-4">
              <Button
                type="submit"
                size="lg"
                isLoading={isLoading}
              >
                Continue to Branches
              </Button>
            </div>
          </form>
        </Card>
      </div>

      {/* Preview Panel */}
      <div className="lg:col-span-1">
        <div className="sticky top-8">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-2 h-2 rounded-full bg-[#3AAFDC]" />
            <span className="text-sm font-medium text-gray-600 dark:text-gray-400">Quick Preview</span>
          </div>

          {/* Phone Mockup */}
          <div className="bg-gray-900 rounded-3xl p-3 shadow-xl">
            <div className="bg-white rounded-2xl overflow-hidden">
              {/* Phone Header */}
              <div className="bg-[#3AAFDC] p-6 text-center">
                {logoUrl ? (
                  <div className="w-12 h-12 rounded-xl mx-auto mb-3 overflow-hidden bg-white">
                    <img src={logoUrl} alt="Logo" className="w-full h-full object-cover" />
                  </div>
                ) : (
                  <div className="w-12 h-12 bg-white/20 rounded-xl mx-auto mb-3 flex items-center justify-center">
                    <Church className="w-6 h-6 text-white" />
                  </div>
                )}
                <h3 className="text-white font-bold">
                  {churchName || 'Grace Community Church'}
                </h3>
                <p className="text-white/80 text-xs">WELCOME HOME</p>
              </div>

              {/* Phone Content */}
              <div className="p-4 space-y-3">
                <div className="grid grid-cols-2 gap-2">
                  <div className="bg-gray-100 rounded-lg p-3 text-center">
                    <div className="w-8 h-8 bg-gray-200 rounded-lg mx-auto mb-2" />
                    <span className="text-xs text-gray-500">Events</span>
                  </div>
                  <div className="bg-gray-100 rounded-lg p-3 text-center">
                    <div className="w-8 h-8 bg-gray-200 rounded-lg mx-auto mb-2" />
                    <span className="text-xs text-gray-500">Give</span>
                  </div>
                </div>

                {/* Bottom Nav */}
                <div className="flex justify-around pt-3 border-t">
                  <Home className="w-5 h-5 text-gray-400" />
                  <Calendar className="w-5 h-5 text-gray-400" />
                  <Heart className="w-5 h-5 text-gray-400" />
                  <Search className="w-5 h-5 text-gray-400" />
                </div>
              </div>
            </div>
          </div>

          <p className="text-xs text-gray-400 text-center mt-4">
            This is how your church&apos;s branding will appear to members in the Sanctuary mobile app.
          </p>
        </div>
      </div>
    </div>
  );
}
