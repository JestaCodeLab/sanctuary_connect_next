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
  const [selectedStructure, setSelectedStructure] = useState<'single' | 'multi'>(identity.structure);
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
      structure: identity.structure || 'single',
    },
  });

  const churchName = watch('churchName');

  const onSubmit = async (data: OrganizationIdentityFormData) => {
    setIsLoading(true);
    try {
      // Save to store
      setIdentity({
        churchName: data.churchName,
        legalName: data.legalName || data.churchName,
        structure: selectedStructure,
        logoUrl: logoUrl,
      });

      const orgData = {
        churchName: data.churchName,
        legalName: data.legalName,
        structure: selectedStructure,
        logoUrl: logoUrl || undefined,
      };

      if (organizationId) {
        // Update existing organization (user is resuming onboarding)
        await organizationApi.update(organizationId, {
          ...orgData,
          onboardingStep: 2,
        });
      } else {
        // Create new organization
        const response = await organizationApi.create(orgData);

        // Save the new token with admin role
        if (response.token && user) {
          const updatedUser = { ...user, role: 'admin' as const };
          setUser(updatedUser, response.token);
          localStorage.setItem('token', response.token);
        }

        setOrganizationId(response._id);

        // Update onboarding step to 2 (branches)
        await organizationApi.update(response._id, { onboardingStep: 2 });
      }

      toast.success('Church identity saved!');
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

            {/* Organization Structure */}
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
                Organization Structure
              </label>
              <div className="grid grid-cols-2 gap-4">
                <button
                  type="button"
                  onClick={() => setSelectedStructure('single')}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    selectedStructure === 'single'
                      ? 'border-[#3AAFDC] bg-[#E8F6FB] dark:bg-[#3AAFDC]/20'
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      selectedStructure === 'single' ? 'border-[#3AAFDC]' : 'border-gray-300 dark:border-gray-500'
                    }`}>
                      {selectedStructure === 'single' && (
                        <div className="w-2.5 h-2.5 rounded-full bg-[#3AAFDC]" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-[#3AAFDC]" />
                        <span className="font-medium text-gray-900 dark:text-gray-100">Single Location</span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">One main campus for all activities.</p>
                    </div>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedStructure('multi')}
                  className={`p-4 rounded-xl border-2 text-left transition-all ${
                    selectedStructure === 'multi'
                      ? 'border-[#3AAFDC] bg-[#E8F6FB] dark:bg-[#3AAFDC]/20'
                      : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      selectedStructure === 'multi' ? 'border-[#3AAFDC]' : 'border-gray-300 dark:border-gray-500'
                    }`}>
                      {selectedStructure === 'multi' && (
                        <div className="w-2.5 h-2.5 rounded-full bg-[#3AAFDC]" />
                      )}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <Building2 className="w-4 h-4 text-gray-400 dark:text-gray-500" />
                        <span className="font-medium text-gray-900 dark:text-gray-100">Multi-Branch</span>
                      </div>
                      <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Multiple campuses under one name.</p>
                    </div>
                  </div>
                </button>
              </div>
            </div>

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
