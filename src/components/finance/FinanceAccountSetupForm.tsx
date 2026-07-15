'use client';

import { useState, useEffect } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Button,
  Input,
  Label,
  SelectRoot,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  Alert,
  AlertDescription,
} from '@/components/ui';
import { Loader2, AlertCircle, CheckCircle, Upload } from 'lucide-react';
import { api } from '@/lib/api';
import { useBranchStore } from '@/store/branchStore';

type FormStep = 'basic' | 'owner' | 'bank' | 'review';

const FORM_STEPS: FormStep[] = ['basic', 'owner', 'bank', 'review'];

interface FormData {
  // Branch this primary account will be tied to
  branchId: string;

  // Business Info
  businessName: string;
  businessType: string;
  businessRegistration: string;
  businessRegistrationDoc: File | null;
  businessAddress: string;

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
  bankAccountType: string;
}

interface FinanceAccountSetupFormProps {
  onSubmitSuccess?: (data: any) => void;
  organizationId?: string;
}

export function FinanceAccountSetupForm({ onSubmitSuccess, organizationId }: FinanceAccountSetupFormProps) {
  const { branches, selectedBranchId } = useBranchStore();
  const [currentStep, setCurrentStep] = useState<FormStep>('basic');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [formData, setFormData] = useState<FormData>({
    branchId: selectedBranchId || '',
    businessName: '',
    businessType: '',
    businessRegistration: '',
    businessRegistrationDoc: null,
    businessAddress: '',
    ownerFullName: '',
    ownerEmail: '',
    ownerPhone: '',
    ownerIdType: '',
    ownerIdNumber: '',
    ownerIdDoc: null,
    bankCode: '',
    bankAccountName: '',
    bankAccountNumber: '',
    bankAccountType: 'business',
  });

  const [uploadedDocs, setUploadedDocs] = useState<Record<string, boolean>>({
    businessRegistrationDoc: false,
    ownerIdDoc: false,
  });

  const [banks, setBanks] = useState<Array<{ code: string; name: string }>>([]);
  const [loadingBanks, setLoadingBanks] = useState(true);
  const [bankSearchTerm, setBankSearchTerm] = useState('');

  // Fetch list of Ghanaian banks on component mount
  useEffect(() => {
    const fetchBanks = async () => {
      try {
        const response = await api.get('/api/finance/banks');
        setBanks(response.data.banks || []);
      } catch (err) {
        console.error('Failed to fetch bank list:', err);
        // Fall back to empty list on error
        setBanks([]);
      } finally {
        setLoadingBanks(false);
      }
    };

    fetchBanks();
  }, []);

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
        setUploadedDocs((prev) => ({
          ...prev,
          [field]: false,
        }));
        return;
      }
      // Validate file type
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
      if (!allowedTypes.includes(file.type)) {
        setError(`${field} must be PDF, JPEG, PNG, or WebP`);
        setUploadedDocs((prev) => ({
          ...prev,
          [field]: false,
        }));
        return;
      }

      setFormData((prev) => ({
        ...prev,
        [field]: file,
      }));

      setUploadedDocs((prev) => ({
        ...prev,
        [field]: true,
      }));

      setError(null);
    } else {
      // File cleared/removed
      setFormData((prev) => ({
        ...prev,
        [field]: null,
      }));

      setUploadedDocs((prev) => ({
        ...prev,
        [field]: false,
      }));
    }
  };

  const validateStep = (step: FormStep): boolean => {
    switch (step) {
      case 'basic':
        if (!formData.branchId) {
          setError('Branch is required');
          return false;
        }
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
        if (!formData.bankAccountNumber || formData.bankAccountNumber.length < 10 || formData.bankAccountNumber.length > 15) {
          setError('Account number must be between 10-15 digits');
          return false;
        }
        if (!formData.bankAccountType) {
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

    const currentIndex = FORM_STEPS.indexOf(currentStep);
    if (currentIndex < FORM_STEPS.length - 1) {
      setCurrentStep(FORM_STEPS[currentIndex + 1]);
    }
  };

  const handleBack = () => {
    const currentIndex = FORM_STEPS.indexOf(currentStep);
    if (currentIndex > 0) {
      setCurrentStep(FORM_STEPS[currentIndex - 1]);
      setError(null);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    // Prevent form submission via Enter key unless on review step
    if (currentStep !== 'review' && e.key === 'Enter' && e.target instanceof HTMLInputElement) {
      e.preventDefault();
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Only allow submission on the review step
    if (currentStep !== 'review') {
      return;
    }

    if (!validateStep('review')) {
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Create FormData for multipart file upload
      const submitData = new FormData();

      // Add all text fields
      submitData.append('branchId', formData.branchId);
      submitData.append('businessName', formData.businessName);
      submitData.append('businessType', formData.businessType);
      submitData.append('businessRegistration', formData.businessRegistration);
      submitData.append('businessAddress', formData.businessAddress);
      submitData.append('ownerFullName', formData.ownerFullName);
      submitData.append('ownerEmail', formData.ownerEmail);
      submitData.append('ownerPhone', formData.ownerPhone);
      submitData.append('ownerIdType', formData.ownerIdType);
      submitData.append('ownerIdNumber', formData.ownerIdNumber);
      submitData.append('bankCode', formData.bankCode);
      submitData.append('bankAccountName', formData.bankAccountName);
      submitData.append('bankAccountNumber', formData.bankAccountNumber);
      submitData.append('bankAccountType', formData.bankAccountType);

      // Add files if they exist
      if (formData.businessRegistrationDoc) {
        submitData.append('businessRegistrationDoc', formData.businessRegistrationDoc);
      }
      if (formData.ownerIdDoc) {
        submitData.append('ownerIdDoc', formData.ownerIdDoc);
      }

      // Don't set Content-Type header - let axios/browser handle it automatically with FormData
      const { data: result } = await api.post('/api/finance/account/submit', submitData);

      setSuccess(true);
      if (onSubmitSuccess) {
        onSubmitSuccess(result);
      }
    } catch (err: any) {
      const errorMessage = err?.response?.data?.error || err?.response?.data?.message || err?.message || 'An error occurred while submitting your form';
      console.error('Form submission error:', err);
      setError(errorMessage);
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center text-center space-y-4">
            <CheckCircle className="w-16 h-16 text-success" />
            <h3 className="text-lg font-semibold text-foreground">Submission Successful!</h3>
            <p className="text-muted">
              Your merchant account details have been submitted for review. You will be notified once your account is approved.
            </p>
            <p className="text-sm text-muted">This typically takes 24-48 hours.</p>
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
        <form onSubmit={handleSubmit} onKeyDown={handleKeyDown} className="space-y-6">
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Step Indicator */}
          <div className="flex justify-between mb-8">
            {FORM_STEPS.map((step, index) => {
              const stepIndex = FORM_STEPS.indexOf(step);
              const currentIndex = FORM_STEPS.indexOf(currentStep);
              const isActive = currentStep === step;
              const isComplete = stepIndex < currentIndex;
              return (
                <div key={step} className={`flex items-center ${index < 3 ? 'flex-1' : ''}`}>
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-semibold ${
                    isActive ? 'bg-primary text-white' : isComplete ? 'bg-success text-white' : 'bg-muted text-muted-foreground'
                  }`}>
                    {index + 1}
                  </div>
                  {index < 3 && (
                    <div className={`flex-1 h-1 mx-2 rounded ${isComplete ? 'bg-success' : 'bg-border'}`} />
                  )}
                </div>
              );
            })}
          </div>

          {/* Step 1: Business Information */}
          {currentStep === 'basic' && (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg text-foreground">Business Information</h3>

              <div>
                <Label htmlFor="branchId">Branch *</Label>
                <SelectRoot value={formData.branchId} onValueChange={(value) => handleInputChange('branchId', value)}>
                  <SelectTrigger>
                    {formData.branchId ? (
                      <span>{branches.find((b) => b._id === formData.branchId)?.name || 'Select branch'}</span>
                    ) : (
                      <SelectValue placeholder="Select the branch for this account" />
                    )}
                  </SelectTrigger>
                  <SelectContent>
                    {branches.map((branch) => (
                      <SelectItem key={branch._id} value={branch._id}>
                        {branch.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </SelectRoot>
                <p className="text-xs text-muted mt-1">
                  This becomes your organization&apos;s primary Paystack business account. Other branches can be added later from Finance Settings.
                </p>
              </div>

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
                <div className={`border-2 border-dashed rounded-lg p-4 transition-colors ${uploadedDocs.businessRegistrationDoc ? 'border-green-500 dark:border-green-500 bg-green-50 dark:bg-green-950/30' : 'border-border bg-background dark:bg-background hover:bg-muted/30 dark:hover:bg-muted/50'}`}>
                  <Input
                    id="businessRegistrationDoc"
                    type="file"
                    accept="application/pdf,image/jpeg,image/png,image/webp"
                    onChange={(e) => handleFileChange('businessRegistrationDoc', e.target.files?.[0] || null)}
                    className="hidden"
                  />
                  <label htmlFor="businessRegistrationDoc" className="flex flex-col items-center cursor-pointer text-foreground">
                    {uploadedDocs.businessRegistrationDoc ? (
                      <CheckCircle className="w-8 h-8 text-green-600 mb-2" />
                    ) : (
                      <Upload className="w-8 h-8 text-muted mb-2" />
                    )}
                    <span className="text-sm font-medium">
                      {formData.businessRegistrationDoc?.name || 'Click to upload or drag and drop'}
                    </span>
                    <span className="text-xs text-muted">PDF, JPG, PNG up to 5MB</span>
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
            </div>
          )}

          {/* Step 2: Owner Information */}
          {currentStep === 'owner' && (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg text-foreground">Director Details</h3>

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
                <div className={`border-2 border-dashed rounded-lg p-4 transition-colors ${uploadedDocs.ownerIdDoc ? 'border-green-500 dark:border-green-500 bg-green-50 dark:bg-green-950/30' : 'border-border bg-background dark:bg-background hover:bg-muted/30 dark:hover:bg-muted/50'}`}>
                  <Input
                    id="ownerIdDoc"
                    type="file"
                    accept="application/pdf,image/jpeg,image/png,image/webp"
                    onChange={(e) => handleFileChange('ownerIdDoc', e.target.files?.[0] || null)}
                    className="hidden"
                  />
                  <label htmlFor="ownerIdDoc" className="flex flex-col items-center cursor-pointer text-foreground">
                    {uploadedDocs.ownerIdDoc ? (
                      <CheckCircle className="w-8 h-8 text-green-600 mb-2" />
                    ) : (
                      <Upload className="w-8 h-8 text-muted mb-2" />
                    )}
                    <span className="text-sm font-medium">
                      {formData.ownerIdDoc?.name || 'Click to upload or drag and drop'}
                    </span>
                    <span className="text-xs text-muted">PDF, JPG, PNG up to 5MB</span>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Step 3: Bank Information */}
          {currentStep === 'bank' && (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg text-foreground">Bank Account Information</h3>

              <div>
                <Label htmlFor="bankCode">Bank *</Label>
                <SelectRoot value={formData.bankCode} onValueChange={(value) => !loadingBanks && handleInputChange('bankCode', value)}>
                  <SelectTrigger className={loadingBanks ? 'opacity-60' : ''}>
                    {formData.bankCode ? (
                      <span>{banks.find((b) => b.code === formData.bankCode)?.name || formData.bankCode}</span>
                    ) : (
                      <SelectValue placeholder={loadingBanks ? 'Loading banks...' : 'Search and select your bank'} />
                    )}
                  </SelectTrigger>
                  <SelectContent>
                    <div className="px-2 py-2 border-b border-border">
                      <Input
                        placeholder="Search banks..."
                        value={bankSearchTerm}
                        onChange={(e) => setBankSearchTerm(e.target.value.toLowerCase())}
                        className="h-8"
                      />
                    </div>
                    {banks.length > 0 ? (
                      banks
                        .filter((bank) =>
                          bank.name.toLowerCase().includes(bankSearchTerm) ||
                          bank.code.includes(bankSearchTerm)
                        )
                        .map((bank) => (
                          <SelectItem key={bank.code} value={bank.code}>
                            <span className="text-sm">{bank.name}</span>
                          </SelectItem>
                        ))
                    ) : (
                      <div className="px-2 py-1.5 text-sm text-gray-500">No banks available</div>
                    )}
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
                <Label htmlFor="bankAccountNumber">Account Number * (10-15 digits)</Label>
                <Input
                  id="bankAccountNumber"
                  placeholder="Enter account number (10-15 digits)"
                  value={formData.bankAccountNumber}
                  onChange={(e) => {
                    const value = e.target.value.replace(/\D/g, '').slice(0, 15);
                    handleInputChange('bankAccountNumber', value);
                  }}
                  maxLength={15}
                />
                {formData.bankAccountNumber && (formData.bankAccountNumber.length < 10 || formData.bankAccountNumber.length > 15) && (
                  <p className="text-xs text-amber-600 mt-1">
                    Account number must be between 10-15 digits. Currently: {formData.bankAccountNumber.length}
                  </p>
                )}
              </div>

              <div>
                <Label htmlFor="bankAccountType">Account Type *</Label>
                <SelectRoot value={formData.bankAccountType} onValueChange={(value) => handleInputChange('bankAccountType', value)}>
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
              <h3 className="font-semibold text-lg text-foreground">Review Your Information</h3>

              <div className="bg-background border border-border rounded-lg p-4 space-y-6">
                <div>
                  <h4 className="font-semibold text-sm text-muted mb-3">Business Information</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="col-span-2">
                      <p className="text-xs text-muted">Branch</p>
                      <p className="font-medium text-foreground">
                        {branches.find((b) => b._id === formData.branchId)?.name || formData.branchId}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted">Business Name</p>
                      <p className="font-medium text-foreground">{formData.businessName}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted">Business Type</p>
                      <p className="font-medium text-foreground capitalize">{formData.businessType}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-xs text-muted">Registration Number</p>
                      <p className="font-medium text-foreground">{formData.businessRegistration}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-xs text-muted">Business Address</p>
                      <p className="font-medium text-foreground">{formData.businessAddress}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-sm text-muted mb-3">Director Information</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted">Full Name</p>
                      <p className="font-medium text-foreground">{formData.ownerFullName}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted">Email</p>
                      <p className="font-medium text-foreground">{formData.ownerEmail}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted">Phone</p>
                      <p className="font-medium text-foreground">{formData.ownerPhone}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted">ID Type</p>
                      <p className="font-medium text-foreground capitalize">{formData.ownerIdType?.replace(/_/g, ' ')}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-xs text-muted">ID Number</p>
                      <p className="font-medium text-foreground">{formData.ownerIdNumber}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-sm text-muted mb-3">Bank Account Information</h4>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-muted">Bank</p>
                      <p className="font-medium text-foreground">
                        {banks.find((b) => b.code === formData.bankCode)?.name || formData.bankCode}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted">Account Type</p>
                      <p className="font-medium text-foreground capitalize">{formData.bankAccountType}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted">Account Holder Name</p>
                      <p className="font-medium text-foreground">{formData.bankAccountName}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted">Account Number</p>
                      <p className="font-medium text-foreground">{formData.bankAccountNumber}</p>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-semibold text-sm text-muted mb-2">Documents Attached</h4>
                  <ul className="text-sm space-y-1">
                    <li className="flex items-center gap-2">
                      {uploadedDocs.businessRegistrationDoc ? (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-amber-600" />
                      )}
                      <span>Business Registration Document</span>
                    </li>
                    <li className="flex items-center gap-2">
                      {uploadedDocs.ownerIdDoc ? (
                        <CheckCircle className="w-4 h-4 text-green-600" />
                      ) : (
                        <AlertCircle className="w-4 h-4 text-amber-600" />
                      )}
                      <span>Director ID Document</span>
                    </li>
                  </ul>
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
          <div className="flex justify-between pt-6 border-t border-border">
            <Button
              type="button"
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 'basic' || isLoading}
            >
              Back
            </Button>

            {currentStep === 'review' ? (
              <Button type="submit" disabled={isLoading}>
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
              <Button type="button" onClick={handleNext}>
                Next
              </Button>
            )}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
