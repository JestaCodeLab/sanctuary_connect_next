'use client';

import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { Save, Upload, Image as ImageIcon } from 'lucide-react';
import { Badge } from '@/components/dashboard';
import { Button, Input, Card, Select } from '@/components/ui';
import { organizationApi } from '@/lib/api';
import { useAuthStore } from '@/store/authStore';
import { useOrganizationStore } from '@/store/organizationStore';

const currencyOptions = [
  { value: 'GHS', label: 'GHS - Ghanaian Cedi' },
  { value: 'USD', label: 'USD - US Dollar' },
  { value: 'GBP', label: 'GBP - British Pound' },
  { value: 'EUR', label: 'EUR - Euro' },
  { value: 'NGN', label: 'NGN - Nigerian Naira' },
];

const roleBadgeVariant: Record<string, 'info' | 'success' | 'muted'> = {
  admin: 'info',
  pastor: 'success',
  staff: 'muted',
  member: 'muted',
};

function getInitials(firstName: string, lastName: string): string {
  return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase();
}

export default function GeneralTab() {
  const queryClient = useQueryClient();
  const { user } = useAuthStore();
  const { setOrganization, setCurrency: setStoreCurrency } = useOrganizationStore();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Form state for church profile
  const [churchName, setChurchName] = useState('');
  const [legalName, setLegalName] = useState('');
  const [currency, setCurrency] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState('');

  // Fetch organization data
  const { data: orgData, isLoading } = useQuery({
    queryKey: ['organization'],
    queryFn: () => organizationApi.getMyOrganization(),
  });
  const organization = orgData?.organization;

  // Initialize form fields from org data
  useEffect(() => {
    if (organization) {
      setChurchName(organization.churchName || '');
      setLegalName(organization.legalName || '');
      setCurrency(organization.currency || '');
      setLogoUrl(organization.logoUrl || '');
      setLogoPreview(organization.logoUrl || '');
      setOrganization(organization);
    }
  }, [organization, setOrganization]);

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: (data: { churchName: string; legalName: string; currency: string; logoUrl: string }) =>
      organizationApi.update(organization!._id, data),
    onSuccess: (updatedOrg) => {
      queryClient.invalidateQueries({ queryKey: ['organization'] });
      setOrganization(updatedOrg);
      setStoreCurrency(updatedOrg.currency || 'GHS');
      toast.success('Church profile updated successfully');
    },
    onError: () => {
      toast.error('Failed to update church profile');
    },
  });

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();

    let finalLogoUrl = logoUrl;

    // If a new logo file was selected, upload it first
    if (logoFile) {
      // TODO: Implement actual file upload to your storage service (e.g., AWS S3, Cloudinary)
      // For now, we'll use the preview URL (data URL)
      // In production, you would upload the file and get back a URL
      finalLogoUrl = logoPreview;
      toast('Logo upload would happen here in production');
    }

    updateMutation.mutate({ churchName, legalName, currency, logoUrl: finalLogoUrl });
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (file.size > 5 * 1024 * 1024) {
        toast.error('Logo file size must be less than 5MB');
        return;
      }

      if (!file.type.startsWith('image/')) {
        toast.error('Please select an image file');
        return;
      }

      setLogoFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setLogoPreview(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveLogo = () => {
    setLogoFile(null);
    setLogoPreview('');
    setLogoUrl('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  if (isLoading) {
    return (
      <Card padding="lg">
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <h2 className="text-lg font-semibold text-foreground mb-1">Church Profile</h2>
        <p className="text-sm text-muted mb-6">Update your church information and preferences.</p>
        <form onSubmit={handleSaveProfile} className="space-y-4">
          {/* Logo Upload */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Church Logo
            </label>
            <div className="flex items-start gap-4">
              <div className="flex-shrink-0">
                {logoPreview ? (
                  <div className="relative w-24 h-24 rounded-lg border-2 border-border overflow-hidden bg-background">
                    <img
                      src={logoPreview}
                      alt="Church logo"
                      className="w-full h-full object-cover"
                    />
                  </div>
                ) : (
                  <div className="w-24 h-24 rounded-lg border-2 border-dashed border-border flex items-center justify-center bg-muted/20">
                    <ImageIcon className="w-8 h-8 text-muted" />
                  </div>
                )}
              </div>
              <div className="flex-1">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleLogoChange}
                  className="hidden"
                  id="logo-upload"
                />
                <div className="flex gap-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    leftIcon={<Upload className="w-4 h-4" />}
                    onClick={() => fileInputRef.current?.click()}
                  >
                    Upload Logo
                  </Button>
                  {logoPreview && (
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={handleRemoveLogo}
                    >
                      Remove
                    </Button>
                  )}
                </div>
                <p className="text-xs text-muted mt-2">
                  PNG, JPG or GIF (max. 5MB)
                </p>
              </div>
            </div>
          </div>

          <Input
            label="Church Name"
            value={churchName}
            onChange={(e) => setChurchName(e.target.value)}
            placeholder="Enter church name"
          />
          <Input
            label="Legal Name"
            value={legalName}
            onChange={(e) => setLegalName(e.target.value)}
            placeholder="Enter legal name"
          />
          <Select
            label="Currency"
            value={currency}
            onChange={(e) => setCurrency(e.target.value)}
            options={currencyOptions}
            placeholder="Select currency"
          />
          <div className="flex justify-end pt-2">
            <Button
              type="submit"
              isLoading={updateMutation.isPending}
              leftIcon={<Save className="w-4 h-4" />}
            >
              Save Changes
            </Button>
          </div>
        </form>
      </Card>

      {/* Your Profile */}
      <Card>
        <h2 className="text-lg font-semibold text-foreground mb-4">Your Profile</h2>
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 bg-primary rounded-full flex items-center justify-center flex-shrink-0">
            <span className="text-xl font-bold text-white">
              {user ? getInitials(user.firstName, user.lastName) : '??'}
            </span>
          </div>
          <div>
            <h3 className="text-xl font-bold text-foreground">
              {user ? `${user.firstName} ${user.lastName}` : 'Unknown User'}
            </h3>
            <p className="text-muted">{user?.email || 'No email'}</p>
            <div className="mt-1">
              <Badge variant={user ? roleBadgeVariant[user.role] || 'muted' : 'muted'}>
                {user?.role ? user.role.charAt(0).toUpperCase() + user.role.slice(1) : 'Unknown'}
              </Badge>
            </div>
          </div>
        </div>
      </Card>

      {/* Change Password */}
      <Card>
        <h2 className="text-lg font-semibold text-foreground mb-1">Change Password</h2>
        <p className="text-sm text-muted mb-4">
          To change your password, use the password reset flow.
        </p>
        <Button
          variant="outline"
          onClick={() => toast('Password reset link sent to your email')}
        >
          Reset Password
        </Button>
      </Card>
    </div>
  );
}
