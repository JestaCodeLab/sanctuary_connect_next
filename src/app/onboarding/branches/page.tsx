'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import toast from 'react-hot-toast';
import { MapPin, Plus, ArrowLeft, ArrowRight, Lightbulb, Building2, Outdent, X, Check } from 'lucide-react';
import { Button, Input, Card, ProgressBar } from '@/components/ui';
import { MapWithGeofence } from '@/components/ui/MapWithGeofence';
import { branchSchema, BranchFormData } from '@/lib/validations';
import { organizationApi, subscriptionApi } from '@/lib/api';
import { useOnboardingStore } from '@/store/onboardingStore';

const steps = [
  { id: 1, name: 'Identity' },
  { id: 2, name: 'Branches' },
  { id: 3, name: 'Finances' },
  { id: 4, name: 'Plan' },
  { id: 5, name: 'Launch' },
];

const proTips = [
  {
    icon: MapPin,
    title: 'Ideal Radius',
    description: '100 meters is perfect for most sanctuaries. It covers the building while remaining GPS-safe.',
    color: 'text-red-500',
  },
  {
    icon: Building2,
    title: 'Urban Areas',
    description: 'If your church is in a high-rise or dense city center, consider a radius under 200m for better accuracy.',
    color: 'text-blue-500',
  },
  {
    icon: Outdent,
    title: 'Outdoor Events',
    description: 'For festivals or community activities, you can expand the radius to cover the entire event space.',
    color: 'text-green-500',
  },
];

export default function OnboardingBranchesPage() {
  const router = useRouter();
  const { organizationId, identity, branches, addBranch, setStep } = useOnboardingStore();
  const [isLoading, setIsLoading] = useState(false);
  const [isSavingBranch, setIsSavingBranch] = useState(false);
  const [radius, setRadius] = useState(100);
  const [showAddBranch, setShowAddBranch] = useState(false);
  const [newBranchRadius, setNewBranchRadius] = useState(100);
  const [mapLat, setMapLat] = useState(5.6037); // Default: Accra
  const [mapLng, setMapLng] = useState(-0.1871);
  const [selectedLat, setSelectedLat] = useState(5.6037); // User-selected coordinates
  const [selectedLng, setSelectedLng] = useState(-0.1871);
  const [newBranchLat, setNewBranchLat] = useState(5.6037);
  const [newBranchLng, setNewBranchLng] = useState(-0.1871);
  const [maxBranches, setMaxBranches] = useState(1); // Defaults to seed plan limit
  const geocodeTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Head office form
  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<BranchFormData>({
    resolver: zodResolver(branchSchema),
    defaultValues: {
      name: '',
      address: '',
      city: '',
      zipCode: '',
      radius: 100,
      latitude: selectedLat,
      longitude: selectedLng,
      isHeadOffice: true,
    },
  });

  // Watch form values to display on map
  const watchedAddress = watch('address');
  const watchedCity = watch('city');
  const watchedName = watch('name');

  // Additional branch form
  const {
    register: registerBranch,
    handleSubmit: handleSubmitBranch,
    reset: resetBranchForm,
    formState: { errors: branchErrors },
  } = useForm<BranchFormData>({
    resolver: zodResolver(branchSchema),
    defaultValues: {
      name: '',
      address: '',
      city: '',
      zipCode: '',
      radius: 100,
      isHeadOffice: false,
    },
  });

  useEffect(() => {
    const fetchSubscriptionLimits = async () => {
      if (!organizationId) return;
      try {
        const data = await subscriptionApi.get(organizationId);
        const limit = data.plan?.limits?.maxBranches || 1;
        setMaxBranches(limit);
        console.log('📊 Subscription fetched:', { planId: data.plan?.id, maxBranches: limit });
      } catch (error) {
        console.error('Failed to fetch subscription:', error);
        setMaxBranches(1);
      }
    };
    fetchSubscriptionLimits();
  }, [organizationId]);

  useEffect(() => {
    if (!organizationId) {
      router.push('/onboarding/identity');
    }
    setStep(2);
  }, [organizationId, router, setStep]);

  // Geocode address when it changes (debounced)
  useEffect(() => {
    if (geocodeTimeoutRef.current) {
      clearTimeout(geocodeTimeoutRef.current);
    }

    console.log('🗺️ Geocoding trigger:', { watchedAddress, watchedCity });
    
    // Only geocode if we have address
    if (watchedAddress) {
      geocodeTimeoutRef.current = setTimeout(async () => {
        try {
          // Build query: address + city (if different) + country
          let query = watchedAddress;
          
          // Add city if it's different from address (avoid duplicates)
          if (watchedCity && !watchedAddress.includes(watchedCity)) {
            query += `, ${watchedCity}`;
          }
          
          // Always add Ghana as the country for better results
          query += ', Ghana';
          
          console.log('🌐 Calling Nominatim API for:', query);
          
          const response = await fetch(
            `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(query)}&limit=1&countrycodes=gh`,
            {
              headers: {
                'User-Agent': 'SanctuaryConnect-App',
              },
            }
          );

          if (!response.ok) {
            throw new Error(`HTTP ${response.status}: ${response.statusText}`);
          }
          
          let results = await response.json();
          console.log('📍 Geocoding results:', results);
          
          // If no results for full address, try just the city
          if (!results || results.length === 0) {
            console.log('⚠️ No results for full address, trying city only:', watchedCity);
            
            if (watchedCity) {
              const cityQuery = `${watchedCity}, Ghana`;
              const cityResponse = await fetch(
                `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(cityQuery)}&limit=1&countrycodes=gh`,
                {
                  headers: {
                    'User-Agent': 'SanctuaryConnect-App',
                  },
                }
              );
              
              if (cityResponse.ok) {
                results = await cityResponse.json();
                console.log('📍 City geocoding results:', results);
              }
            }
          }
          
          if (results && results.length > 0) {
            const { lat, lon } = results[0];
            const latitude = parseFloat(lat);
            const longitude = parseFloat(lon);
            
            console.log('✅ Found location:', { latitude, longitude, address: results[0].display_name });
            
            setMapLat(latitude);
            setMapLng(longitude);
            
            toast.success(`Located: ${results[0].display_name.split(',')[0]}`);
          } else {
            console.log('⚠️ No geocoding results found for:', query);
            toast.error('Address not found in Ghana. Using city location.');
            
            // Default to Accra if everything fails
            setMapLat(5.6037);
            setMapLng(-0.1871);
          }
        } catch (error) {
          console.error('❌ Geocoding error:', error);
          toast.error('Error finding location. Using default.');
          // Keep default location on error
        }
      }, 800); // Wait 800ms after user stops typing
    }

    return () => {
      if (geocodeTimeoutRef.current) {
        clearTimeout(geocodeTimeoutRef.current);
      }
    };
  }, [watchedAddress, watchedCity]);

  // Save head office and proceed
  const onSubmit = async (data: BranchFormData) => {
    if (!organizationId) return;

    // Check if head office already exists
    const hasHeadOffice = branches.some(b => b.isHeadOffice);
    if (hasHeadOffice) {
      // Update onboarding step before navigating
      await organizationApi.update(organizationId, { onboardingStep: 3 });
      router.push('/onboarding/finances');
      return;
    }

    setIsLoading(true);
    try {
      console.log('📍 Saving head office with coordinates:', { lat: selectedLat, lng: selectedLng, radius });
      
      const branch = await organizationApi.createBranch(organizationId, {
        ...data,
        latitude: selectedLat,
        longitude: selectedLng,
        radius,
        isHeadOffice: true,
      });

      addBranch(branch);

      // Update onboarding step in backend
      await organizationApi.update(organizationId, { onboardingStep: 3 });

      toast.success('Head office saved!');
      router.push('/onboarding/finances');
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error || 'Failed to save branch.');
    } finally {
      setIsLoading(false);
    }
  };

  // Save additional branch
  const onSubmitBranch = async (data: BranchFormData) => {
    if (!organizationId) return;

    setIsSavingBranch(true);
    try {
      console.log('📍 Adding branch with coordinates:', { lat: newBranchLat, lng: newBranchLng, radius: newBranchRadius });
      
      const branch = await organizationApi.createBranch(organizationId, {
        ...data,
        latitude: newBranchLat,
        longitude: newBranchLng,
        radius: newBranchRadius,
        isHeadOffice: false,
      });

      addBranch(branch);
      toast.success('Branch added!');
      resetBranchForm();
      setShowAddBranch(false);
      setNewBranchRadius(100);
      setNewBranchLat(5.6037);
      setNewBranchLng(-0.1871);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { error?: string } } };
      toast.error(err.response?.data?.error || 'Failed to add branch.');
    } finally {
      setIsSavingBranch(false);
    }
  };

  if (!organizationId) {
    return null;
  }

  return (
    <div>
      {/* Progress Steps */}
      <div className="mb-8">
        <div className="flex items-center justify-between mb-4">
          <div>
            <span className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-wide">
              Onboarding Progress
            </span>
            <div className="flex items-center gap-2 mt-1">
              <span className="text-xs text-gray-500 dark:text-gray-400">Step 2 of 5</span>
            </div>
          </div>
          <span className="text-sm text-[#3AAFDC]">40% Complete</span>
        </div>
        <ProgressBar progress={40} size="md" />
        <div className="flex justify-between mt-3">
          {steps.map((step) => (
            <span
              key={step.id}
              className={`text-xs ${step.id === 2 ? 'text-[#3AAFDC] font-medium' : step.id < 2 ? 'text-green-500' : 'text-gray-400 dark:text-gray-500'}`}
            >
              {step.id}. {step.name}
            </span>
          ))}
        </div>
      </div>

      {/* Title */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Where is your organization located?</h1>
        <p className="text-gray-500 dark:text-gray-400 mt-1">
          Register your head office and set your attendance geofence.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Form */}
        <div className="lg:col-span-2">
          <Card padding="lg">
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              {/* Section Header */}
              <div className="flex items-center gap-2 pb-4 border-b dark:border-gray-700">
                <div className="w-2 h-2 rounded-full bg-[#3AAFDC]" />
                <span className="font-medium text-gray-900 dark:text-gray-100">Head Office Details</span>
              </div>

              {/* Main Sanctuary Name */}
              <Input
                label="Main Sanctuary Name"
                placeholder="Grace Community Church"
                error={errors.name?.message}
                {...register('name')}
              />

              {/* Street Address */}
              <Input
                label="Street Address"
                placeholder="412 Ocean Avenue"
                error={errors.address?.message}
                {...register('address')}
              />

              {/* City and Zip */}
              <div className="grid grid-cols-2 gap-4">
                <Input
                  label="City"
                  placeholder="Santa Monica"
                  error={errors.city?.message}
                  {...register('city')}
                />
                <Input
                  label="Zip / Postal Code"
                  placeholder="90401"
                  error={errors.zipCode?.message}
                  {...register('zipCode')}
                />
              </div>

              {/* Interactive Map Placeholder */}
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Interactive Geofence Map - Click to set exact location
                </label>
                <div className="relative h-64 bg-gray-100 dark:bg-gray-700 rounded-xl overflow-hidden">
                  <MapWithGeofence
                    latitude={mapLat}
                    longitude={mapLng}
                    radius={radius}
                    address={`${watchedAddress || 'Location'}, ${watchedCity || 'Accra, Ghana'}`}
                    isInteractive={true}
                    onLocationChange={(lat, lng, reversedAddress) => {
                      setSelectedLat(lat);
                      setSelectedLng(lng);
                      console.log('📍 Head office location selected:', { lat, lng, reversedAddress });
                      
                      // Update form fields if we got a real address (not the fallback "Location Set")
                      if (reversedAddress && reversedAddress !== 'Location Set') {
                        // Update the form address field
                        const addressInput = document.querySelector('input[name="address"]') as HTMLInputElement;
                        if (addressInput) {
                          addressInput.value = reversedAddress;
                          // Trigger form update
                          addressInput.dispatchEvent(new Event('input', { bubbles: true }));
                        }
                      }
                    }}
                  />
                </div>
                <p className="text-xs text-gray-500 mt-2">
                  Selected: {selectedLat.toFixed(6)}, {selectedLng.toFixed(6)}
                </p>
              </div>

              {/* Radius Slider */}
              <div>
                <div className="flex items-center justify-between mb-2">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    Radius (Geofence Distance)
                  </label>
                  <span className="text-sm text-[#3AAFDC] font-medium">{radius} Meters</span>
                </div>
                <input
                  type="range"
                  min="50"
                  max="500"
                  value={radius}
                  onChange={(e) => setRadius(parseInt(e.target.value))}
                  className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-[#3AAFDC]"
                />
                <div className="flex justify-between text-xs text-gray-400 dark:text-gray-500 mt-1">
                  <span>50m</span>
                  <span>500m</span>
                </div>
              </div>

              {/* Upgrade Message for Single-Branch Plans */}
              {maxBranches === 1 && (
                <div className="p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
                  <div className="flex items-start gap-3">
                    <Building2 className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm font-medium text-blue-900 dark:text-blue-100">Want multiple branches?</p>
                      <p className="text-xs text-blue-700 dark:text-blue-200 mt-1">
                        Your current plan supports 1 branch. Upgrade to Growth or Professional plan in Step 4 (Finance) to add more locations.
                      </p>
                    </div>
                  </div>
                </div>
              )}

              {/* Other Branches Section - Only show if plan allows multiple branches */}
              {maxBranches > 1 && (
                <div className="pt-4 border-t dark:border-gray-700">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="font-medium text-gray-900 dark:text-gray-100">Other Branches</h3>
                    {!showAddBranch && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        leftIcon={<Plus className="w-4 h-4" />}
                        onClick={() => setShowAddBranch(true)}
                      >
                        Add Another Branch
                      </Button>
                    )}
                  </div>

                  {/* Added branches list */}
                  {branches.filter(b => !b.isHeadOffice).length > 0 && (
                    <div className="space-y-2 mb-4">
                      {branches.filter(b => !b.isHeadOffice).map((branch) => (
                        <div key={branch._id} className="flex items-center gap-3 p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                          <Check className="w-4 h-4 text-green-500" />
                          <div className="flex-1">
                            <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{branch.name}</span>
                            {branch.city && (
                              <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">• {branch.city}</span>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}

                  {/* Add branch form */}
                  {showAddBranch ? (
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 space-y-4">
                      <div className="flex items-center justify-between">
                        <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">New Branch Details</h4>
                        <button
                          type="button"
                          onClick={() => {
                            setShowAddBranch(false);
                            resetBranchForm();
                          }}
                          className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                        >
                          <X className="w-4 h-4" />
                        </button>
                      </div>

                      <Input
                        label="Branch Name"
                        placeholder="Downtown Campus"
                        error={branchErrors.name?.message}
                        {...registerBranch('name')}
                      />
                      <Input
                        label="Address"
                        placeholder="123 Main Street"
                        error={branchErrors.address?.message}
                        {...registerBranch('address')}
                      />
                      <div className="grid grid-cols-2 gap-4">
                        <Input
                          label="City"
                          placeholder="Los Angeles"
                          error={branchErrors.city?.message}
                          {...registerBranch('city')}
                        />
                        <Input
                          label="Zip Code"
                          placeholder="90001"
                          error={branchErrors.zipCode?.message}
                          {...registerBranch('zipCode')}
                        />
                      </div>

                      {/* Radius for new branch */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">
                            Geofence Radius
                          </label>
                          <span className="text-sm text-[#3AAFDC] font-medium">{newBranchRadius}m</span>
                        </div>
                        <input
                          type="range"
                          min="50"
                          max="500"
                          value={newBranchRadius}
                          onChange={(e) => setNewBranchRadius(parseInt(e.target.value))}
                          className="w-full h-2 bg-gray-200 dark:bg-gray-600 rounded-lg appearance-none cursor-pointer accent-[#3AAFDC]"
                        />
                      </div>

                      <div className="flex justify-end gap-2 pt-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          onClick={() => {
                            setShowAddBranch(false);
                            resetBranchForm();
                          }}
                        >
                          Cancel
                        </Button>
                        <Button
                          type="button"
                          size="sm"
                          isLoading={isSavingBranch}
                          onClick={handleSubmitBranch(onSubmitBranch)}
                        >
                          Add Branch
                        </Button>
                      </div>
                    </div>
                  ) : branches.filter(b => !b.isHeadOffice).length === 0 ? (
                    <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 text-center">
                      <p className="text-sm text-gray-500 dark:text-gray-400">No secondary branches added yet.</p>
                      <p className="text-xs text-gray-400 dark:text-gray-500 mt-1">
                        Click &quot;Add Another Branch&quot; to add more locations.
                      </p>
                    </div>
                  ) : null}
                </div>
              )}

              {/* Actions */}
              <div className="flex justify-between pt-4 border-t dark:border-gray-700">
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => router.push('/onboarding/identity')}
                  leftIcon={<ArrowLeft className="w-4 h-4" />}
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  size="lg"
                  isLoading={isLoading}
                  rightIcon={<ArrowRight className="w-4 h-4" />}
                >
                  Next: Finances
                </Button>
              </div>
            </form>
          </Card>
        </div>

        {/* Pro Tips Sidebar */}
        <div className="lg:col-span-1">
          <Card padding="md">
            <div className="flex items-center gap-2 mb-4">
              <Lightbulb className="w-5 h-5 text-yellow-500" />
              <h3 className="font-medium text-gray-900 dark:text-gray-100">Pro Tips for Geofencing</h3>
            </div>

            <div className="space-y-4">
              {proTips.map((tip, index) => (
                <div key={index} className="flex gap-3">
                  <tip.icon className={`w-5 h-5 ${tip.color} flex-shrink-0 mt-0.5`} />
                  <div>
                    <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">{tip.title}</h4>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{tip.description}</p>
                  </div>
                </div>
              ))}
            </div>

            <div className="mt-6 p-4 bg-[#E8F6FB] dark:bg-[#3AAFDC]/20 rounded-lg">
              <p className="text-sm text-gray-600 dark:text-gray-300">Need help?</p>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Our support team is available 24/7 to help you set up your locations.
              </p>
              <Button
                variant="outline"
                size="sm"
                className="mt-3 w-full"
                onClick={() => toast.error('Support chat coming soon')}
              >
                Chat with Support
              </Button>
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
