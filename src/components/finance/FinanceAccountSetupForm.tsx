'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  SelectRoot,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Loader2, AlertCircle, CheckCircle, Upload } from 'lucide-react';

type FormStep = 'basic' | 'owner' | 'bank' | 'review';

interface FormData {
  // Business Info
  businessName: string;
  businessType: string;
  businessRegistration: string;
  businessRegistrationDoc: File | null;
  businessAddress: string;
  taxId: string;
  taxIdDoc: File | null;

  // Owner Info
  ownerFullName: string;
  ownerEmail: string;
  ownerPhone: string;
  ownerIdType: string;
  ownerIdNumber: string;
  ownerIdDoc: File | null;

  // Bank Info
  bankCode: string;
  bankAccountName: string;
  bankAccountNumber: string;
  accountType: string;
}

interface FinanceAccountSetupFormProps {
  onSubmitSuccess?: (data: any) => void;
  organizationId?: string;
}

export function FinanceAccountSetupForm({ onSubmitSuccess, organizationId }: FinanceAccountSetupFormProps) {
  const [currentStep, setCurrentStep] = useState<FormStep>('basic');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    businessName: '',
    businessType: '',
    businessRegistration: '',
    businessRegistrationDoc: null,
    businessAddress: '',
    taxId: '',
    taxIdDoc: null,
    ownerFullName: '',
    ownerEmail: '',
    ownerPhone: '',
    ownerIdType: '',
    ownerIdNumber: '',
    ownerIdDoc: null,
    bankCode: '',
    bankAccountName: '',
    bankAccountNumber: '',
    accountType: 'business',
  });

  const [uploadedDocs, setUploadedDocs] = useState<Record<string, boolean>>({
    businessRegistrationDoc: false,
    taxIdDoc: false,
    ownerIdDoc: false,
  });

  const handleInputChange = (field: keyof FormData, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
    setError(null);
  };

  const handleFileChange = (field: string, file: File | null) => {
    if (file) {
      // Validate file size (max 5MB)
      if (file.size > 5 * 1024 * 1024) {
        setError(`${field} must be less than 5MB`);
        return;
      }
      // Validate file type
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        setError(`${field} must be PDF, JPEG, PNG, or WebP`);
        return;
      }
    }

    setFormData((prev) => ({
      ...prev,
      [field]: file,
    }));
    setError(null);
  };

  const validateStep = (step: FormStep): boolean => {
    switch (step) {
      case 'basic':
        if (!formData.businessName?.trim()) {
          setError('Business name is required');
          return false;
        }
        if (!formData.businessType) {
          setError('Business type is required');
          return false;
        }
        if (!formData.businessRegistration?.trim()) {
          setError('Business registration number is required');
          return false;
        }
        if (!formData.businessRegistrationDoc) {
          setError('Business registration document is required');
          return false;
        }
        if (!formData.businessAddress?.trim()) {
          setError('Business address is required');
          return false;
        }
        if (!formData.taxId?.trim()) {
          setError('Tax ID is required');
          return false;
        }
        if (!formData.taxIdDoc) {
          setError('Tax ID document is required');
          return false;
        }
        return true;

      case 'owner':
        if (!formData.ownerFullName?.trim()) {
          setError('Owner full name is required');
          return false;
        }
        if (!formData.ownerEmail?.trim()) {
          setError('Owner email is required');
          return false;
        }
        if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.ownerEmail)) {
          setError('Invalid email address');
          return false;
        }
        if (!formData.ownerPhone?.trim()) {
          setError('Owner phone is required');
          return false;
        }
        if (!formData.ownerIdType) {
          setError('Owner ID type is required');
          return false;
        }
        if (!formData.ownerIdNumber?.trim()) {
          setError('Owner ID number is required');
          return false;
        }
        if (!formData.ownerIdDoc) {
          setError('Owner ID document is required');
          return false;
        }
        return true;

      case 'bank':
        if (!formData.bankCode) {
          setError('Bank is required');
          return false;
        }
        if (!formData.bankAccountName?.trim()) {
          setError('Account holder name is required');
          return false;
        }
        if (!formData.bankAccountNumber?.trim()) {
          setError('Account number is required');
          return false;
        }
        if (!formData.accountType) {
          setError('Account type is required');
          return false;
        }
        return true;

      case 'review':
        return true;
    }
    return true;
  };

  const handleNext = () => {
    if (!validateStep(currentStep)) {
      return;
    }

    const steps: FormStep[] = ['basic', 'owner', 'bank', 'review'];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex < steps.length - 1) {
      setCurrentStep(steps[currentIndex + 1]);
    }
  };

  const handleBack = () => {
    const steps: FormStep[] = ['basic', 'owner', 'bank', 'review'];
    const currentIndex = steps.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(steps[currentIndex - 1]);
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateStep('review')) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Create FormData for multipart file upload
      const submitData = new FormData();

      // Add all text fields
      submitData.append('businessName', formData.businessName);
      submitData.append('businessType', formData.businessType);
      submitData.append('businessRegistration', formData.businessRegistration);
      submitData.append('businessAddress', formData.businessAddress);
      submitData.append('taxId', formData.taxId);
      submitData.append('ownerFullName', formData.ownerFullName);
      submitData.append('ownerEmail', formData.ownerEmail);
      submitData.append('ownerPhone', formData.ownerPhone);
      submitData.append('ownerIdType', formData.ownerIdType);
      submitData.append('ownerIdNumber', formData.ownerIdNumber);
      submitData.append('bankCode', formData.bankCode);
      submitData.append('bankAccountName', formData.bankAccountName);
      submitData.append('bankAccountNumber', formData.bankAccountNumber);
      submitData.append('accountType', formData.accountType);

      // Add files if they exist
      if (formData.businessRegistrationDoc) {
        submitData.append('businessRegistrationDoc', formData.businessRegistrationDoc);
      }
      if (formData.taxIdDoc) {
        submitData.append('taxIdDoc', formData.taxIdDoc);
      }
      if (formData.ownerIdDoc) {
        submitData.append('ownerIdDoc', formData.ownerIdDoc);
      }

      const response = await fetch('/api/finance/account/submit', {
        method: 'POST',
        body: submitData,
      });

      const result = await response.json();

      if (!response.ok) {
        throw new Error(result.error || 'Failed to submit finance account');
      }

      setSuccess(true);
      if (onSubmitSuccess) {
        onSubmitSuccess(result);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center text-center space-y-4">
            <CheckCircle className="w-16 h-16 text-green-600" />
            <h3 className="text-lg font-semibold">Submission Successful!</h3>
            <p className="text-gray-600">
              Your merchant account details have been submitted for superadmin review. You will receive an email notification once your account is approved.
            </p>
            <p className="text-sm text-gray-500">This typically takes 24-48 hours.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle>Finance Account Setup</CardTitle>
        <CardDescription>
          Complete your merchant account details for payment processing
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Step Indicator */}
          <div className="flex justify-between mb-8">
            {(['basic', 'owner', 'bank', 'review'] as FormStep[]).map((step, index) => (
              <div
                key={step}
                className={`flex items-center ${index < 3 ? 'flex-1' : ''}`}
              >
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-semibold ${
                    currentStep === step
                      ? 'bg-blue-600 text-white'
                      : ['basic', 'owner', 'bank', 'review'].indexOf(step) < ['basic', 'owner', 'bank', 'review'].indexOf(currentStep)
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-200 text-gray-600'
                  }`}
                >
                  {index + 1}
                </div>
                {index < 3 && (
                  <div
                    className={`flex-1 h-1 mx-2 ${
                      ['basic', 'owner', 'bank', 'review'].indexOf(step) < ['basic', 'owner', 'bank', 'review'].indexOf(currentStep)
                        ? 'bg-green-600'
                        : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>

          {/* Step 1: Business Information */}
          {currentStep === 'basic' && (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Business Information</h3>

              <div>
                <Label htmlFor="businessName">Business Name *</Label>
                <Input
                  id="businessName"
                  placeholder="e.g., Good Shepherd Ministry"
                  value={formData.businessName}
                  onChange={(e) => handleInputChange('businessName', e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="businessType">Business Type *</Label>
                <SelectRoot value={formData.businessType} onValueChange={(value) => handleInputChange('businessType', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select business type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="nonprofit">Non-Profit Organization</SelectItem>
                    <SelectItem value="sole_proprietorship">Sole Proprietorship</SelectItem>
                    <SelectItem value="partnership">Partnership</SelectItem>
                    <SelectItem value="llc">Limited Liability Company</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </SelectRoot>
              </div>

              <div>
                <Label htmlFor="businessRegistration">Business Registration Number *</Label>
                <Input
                  id="businessRegistration"
                  placeholder="e.g., NGO/REG/2024/001"
                  value={formData.businessRegistration}
                  onChange={(e) => handleInputChange('businessRegistration', e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="businessRegistrationDoc">Business Registration Document *</Label>
                <div className="border-2 border-dashed rounded-lg p-4">
                  <Input
                    id="businessRegistrationDoc"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                    onChange={(e) => handleFileChange('businessRegistrationDoc', e.target.files?.[0] || null)}
                    className="hidden"
                  />
                  <label htmlFor="businessRegistrationDoc" className="flex flex-col items-center cursor-pointer">
                    <Upload className="w-8 h-8 text-gray-400 mb-2" />
                    <span className="text-sm">
                      {formData.businessRegistrationDoc?.name || 'Click to upload or drag and drop'}
                    </span>
                    <span className="text-xs text-gray-500">PDF, JPG, PNG up to 5MB</span>
                  </label>
                </div>
              </div>

              <div>
                <Label htmlFor="businessAddress">Business Address *</Label>
                <Input
                  id="businessAddress"
                  placeholder="123 Main St, City, Country"
                  value={formData.businessAddress}
                  onChange={(e) => handleInputChange('businessAddress', e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="taxId">Tax ID *</Label>
                <Input
                  id="taxId"
                  placeholder="e.g., 12345678901"
                  value={formData.taxId}
                  onChange={(e) => handleInputChange('taxId', e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="taxIdDoc">Tax ID Document *</Label>
                <div className="border-2 border-dashed rounded-lg p-4">
                  <Input
                    id="taxIdDoc"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                    onChange={(e) => handleFileChange('taxIdDoc', e.target.files?.[0] || null)}
                    className="hidden"
                  />
                  <label htmlFor="taxIdDoc" className="flex flex-col items-center cursor-pointer">
                    <Upload className="w-8 h-8 text-gray-400 mb-2" />
                    <span className="text-sm">
                      {formData.taxIdDoc?.name || 'Click to upload or drag and drop'}
                    </span>
                    <span className="text-xs text-gray-500">PDF, JPG, PNG up to 5MB</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Owner Information */}
          {currentStep === 'owner' && (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Owner/Principal Details</h3>

              <div>
                <Label htmlFor="ownerFullName">Full Name *</Label>
                <Input
                  id="ownerFullName"
                  placeholder="John Doe"
                  value={formData.ownerFullName}
                  onChange={(e) => handleInputChange('ownerFullName', e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="ownerEmail">Email Address *</Label>
                <Input
                  id="ownerEmail"
                  type="email"
                  placeholder="john@example.com"
                  value={formData.ownerEmail}
                  onChange={(e) => handleInputChange('ownerEmail', e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="ownerPhone">Phone Number *</Label>
                <Input
                  id="ownerPhone"
                  type="tel"
                  placeholder="+1234567890"
                  value={formData.ownerPhone}
                  onChange={(e) => handleInputChange('ownerPhone', e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="ownerIdType">ID Type *</Label>
                <SelectRoot value={formData.ownerIdType} onValueChange={(value) => handleInputChange('ownerIdType', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select ID type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="national_id">National ID</SelectItem>
                    <SelectItem value="passport">Passport</SelectItem>
                    <SelectItem value="drivers_license">Driver's License</SelectItem>
                    <SelectItem value="other">Other</SelectItem>
                  </SelectContent>
                </SelectRoot>
              </div>

              <div>
                <Label htmlFor="ownerIdNumber">ID Number *</Label>
                <Input
                  id="ownerIdNumber"
                  placeholder="ID number"
                  value={formData.ownerIdNumber}
                  onChange={(e) => handleInputChange('ownerIdNumber', e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="ownerIdDoc">ID Document *</Label>
                <div className="border-2 border-dashed rounded-lg p-4">
                  <Input
                    id="ownerIdDoc"
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png,.webp"
                    onChange={(e) => handleFileChange('ownerIdDoc', e.target.files?.[0] || null)}
                    className="hidden"
                  />
                  <label htmlFor="ownerIdDoc" className="flex flex-col items-center cursor-pointer">
                    <Upload className="w-8 h-8 text-gray-400 mb-2" />
                    <span className="text-sm">
                      {formData.ownerIdDoc?.name || 'Click to upload or drag and drop'}
                    </span>
                    <span className="text-xs text-gray-500">PDF, JPG, PNG up to 5MB</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Bank Information */}
          {currentStep === 'bank' && (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Bank Account Information</h3>

              <div>
                <Label htmlFor="bankCode">Bank *</Label>
                <SelectRoot value={formData.bankCode} onValueChange={(value) => handleInputChange('bankCode', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select your bank" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="044">Access Bank</SelectItem>
                    <SelectItem value="050">Ecobank</SelectItem>
                    <SelectItem value="058">GTBank</SelectItem>
                    <SelectItem value="033">United Bank for Africa</SelectItem>
                    <SelectItem value="002">First Bank</SelectItem>
                    {/* Add more banks as needed */}
                  </SelectContent>
                </SelectRoot>
              </div>

              <div>
                <Label htmlFor="bankAccountName">Account Holder Name *</Label>
                <Input
                  id="bankAccountName"
                  placeholder="Name on bank account"
                  value={formData.bankAccountName}
                  onChange={(e) => handleInputChange('bankAccountName', e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="bankAccountNumber">Account Number *</Label>
                <Input
                  id="bankAccountNumber"
                  placeholder="10 digits"
                  value={formData.bankAccountNumber}
                  onChange={(e) => handleInputChange('bankAccountNumber', e.target.value)}
                />
              </div>

              <div>
                <Label htmlFor="accountType">Account Type *</Label>
                <SelectRoot value={formData.accountType} onValueChange={(value) => handleInputChange('accountType', value)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select account type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="business">Business</SelectItem>
                    <SelectItem value="individual">Individual</SelectItem>
                  </SelectContent>
                </SelectRoot>
              </div>
            </div>
          )}

          {/* Step 4: Review */}
          {currentStep === 'review' && (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg">Review Your Information</h3>

              <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-gray-600">Business Name</p>
                    <p className="font-semibold">{formData.businessName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Business Type</p>
                    <p className="font-semibold capitalize">{formData.businessType}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Owner Name</p>
                    <p className="font-semibold">{formData.ownerFullName}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Owner Email</p>
                    <p className="font-semibold">{formData.ownerEmail}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Bank Account</p>
                    <p className="font-semibold">{formData.bankAccountNumber}</p>
                  </div>
                  <div>
                    <p className="text-sm text-gray-600">Account Holder</p>
                    <p className="font-semibold">{formData.bankAccountName}</p>
                  </div>
                </div>
              </div>

              <Alert>
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>
                  By submitting this form, you confirm that all information is accurate and complete.
                  Your account will be reviewed by our superadmin team within 24-48 hours.
                </AlertDescription>
              </Alert>
            </div>
          )}

          {/* Navigation Buttons */}
          <div className="flex justify-between pt-6 border-t">
            <Button
              type="button"
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 'basic' || isLoading}
            >
              Back
            </Button>

            {currentStep === 'review' ? (
              <Button
                type="submit"
                disabled={isLoading}
                className="bg-blue-600 hover:bg-blue-700"
              >
                {isLoading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Submitting...
                  </>
                ) : (
                  'Submit for Approval'
                )}
              </Button>
            ) : (
              <Button
                type="button"
                onClick={handleNext}
                className="bg-blue-600 hover:bg-blue-700"
              >
                Next
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
