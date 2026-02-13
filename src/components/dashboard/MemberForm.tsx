'use client';

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { User, Mail, Phone } from 'lucide-react';
import { Button, Input, Card, Select } from '@/components/ui';
import { memberSchema, type MemberFormData } from '@/lib/validations';

const genderOptions = [
  { value: 'male', label: 'Male' },
  { value: 'female', label: 'Female' },
];

const maritalStatusOptions = [
  { value: 'single', label: 'Single' },
  { value: 'married', label: 'Married' },
  { value: 'divorced', label: 'Divorced' },
  { value: 'widowed', label: 'Widowed' },
];

const memberStatusOptions = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'visiting', label: 'Visiting' },
  { value: 'transferred', label: 'Transferred' },
];

interface MemberFormProps {
  defaultValues?: Partial<MemberFormData>;
  onSubmit: (data: MemberFormData) => void;
  isLoading: boolean;
  submitLabel: string;
  onCancel: () => void;
}

export default function MemberForm({
  defaultValues,
  onSubmit,
  isLoading,
  submitLabel,
  onCancel,
}: MemberFormProps) {
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<MemberFormData>({
    resolver: zodResolver(memberSchema) as any,
    defaultValues: {
      firstName: '',
      lastName: '',
      email: '',
      phone: '',
      dateOfBirth: '',
      gender: '',
      maritalStatus: '',
      address: '',
      city: '',
      suburb: '',
      region: '',
      zipCode: '',
      country: '',
      baptismDate: '',
      membershipDate: '',
      memberStatus: 'active',
      ...defaultValues,
    },
  });

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      {/* Personal Information */}
      <Card padding="lg">
        <h2 className="text-lg font-semibold text-foreground mb-6">Personal Information</h2>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="First Name"
              placeholder="John"
              leftIcon={<User className="w-4 h-4" />}
              error={errors.firstName?.message}
              {...register('firstName')}
            />
            <Input
              label="Last Name"
              placeholder="Doe"
              error={errors.lastName?.message}
              {...register('lastName')}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Email"
              type="email"
              placeholder="john@example.com"
              leftIcon={<Mail className="w-4 h-4" />}
              error={errors.email?.message}
              {...register('email')}
            />
            <Input
              label="Phone"
              type="tel"
              placeholder="+1 234 567 8900"
              leftIcon={<Phone className="w-4 h-4" />}
              error={errors.phone?.message}
              {...register('phone')}
            />
          </div>
        </div>
      </Card>

      {/* Member Details */}
      <Card padding="lg">
        <h2 className="text-lg font-semibold text-foreground mb-6">Member Details</h2>
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Date of Birth"
              type="date"
              error={errors.dateOfBirth?.message}
              {...register('dateOfBirth')}
            />
            <Select
              label="Gender"
              options={genderOptions}
              placeholder="Select gender"
              error={errors.gender?.message}
              {...register('gender')}
            />
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Marital Status"
              options={maritalStatusOptions}
              placeholder="Select status"
              error={errors.maritalStatus?.message}
              {...register('maritalStatus')}
            />
            <Select
              label="Member Status"
              options={memberStatusOptions}
              placeholder="Select status"
              error={errors.memberStatus?.message}
              {...register('memberStatus')}
            />
          </div>
        </div>
      </Card>

      {/* Address */}
      <Card padding="lg">
        <h2 className="text-lg font-semibold text-foreground mb-6">Address</h2>
        <div className="space-y-4">
          <Input
            label="Street Address"
            placeholder="123 Main Street"
            error={errors.address?.message}
            {...register('address')}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="City"
              placeholder="City"
              error={errors.city?.message}
              {...register('city')}
            />
            <Input
              label="Suburb"
              placeholder="Suburb"
              error={errors.suburb?.message}
              {...register('suburb')}
            />
          </div>
          <Input
            label="Region"
            placeholder="Region"
            error={errors.region?.message}
            {...register('region')}
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Input
              label="Zip / Postal Code"
              placeholder="Zip code"
              error={errors.zipCode?.message}
              {...register('zipCode')}
            />
            <Input
              label="Country"
              placeholder="Country"
              error={errors.country?.message}
              {...register('country')}
            />
          </div>
        </div>
      </Card>

      {/* Church Information */}
      <Card padding="lg">
        <h2 className="text-lg font-semibold text-foreground mb-6">Church Information</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Input
            label="Baptism Date"
            type="date"
            error={errors.baptismDate?.message}
            {...register('baptismDate')}
          />
          <Input
            label="Membership Date"
            type="date"
            error={errors.membershipDate?.message}
            {...register('membershipDate')}
          />
        </div>
      </Card>

      {/* Actions */}
      <div className="flex items-center justify-end gap-3">
        <Button type="button" variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button type="submit" isLoading={isLoading}>
          {submitLabel}
        </Button>
      </div>
    </form>
  );
}
