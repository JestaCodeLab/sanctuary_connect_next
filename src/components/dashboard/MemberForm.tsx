'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { User, Mail, Phone, Users, FileText, X } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { Button, Input, Card, Select } from '@/components/ui';
import BranchField from '@/components/dashboard/BranchField';
import MemberSearch from '@/components/dashboard/MemberSearch';
import { memberSchema, type MemberFormData } from '@/lib/validations';
import { countryOptions, regionsByCountry } from '@/lib/data/countries';
import { membersApi, departmentsApi } from '@/lib/api';
import type { Member } from '@/types';

const relationshipOptions = [
  { value: 'mother', label: 'Mother' },
  { value: 'father', label: 'Father' },
  { value: 'spouse', label: 'Spouse' },
  { value: 'child', label: 'Child' },
  { value: 'sibling', label: 'Sibling' },
  { value: 'grandparent', label: 'Grandparent' },
  { value: 'other', label: 'Other' },
];

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

interface DepartmentSelectProps {
  value?: string[];
  onChange: (value: string[]) => void;
}

function DepartmentSelect({ value, onChange }: DepartmentSelectProps) {
  const { data: departments = [] } = useQuery({
    queryKey: ['departments'],
    queryFn: () => departmentsApi.getAll(),
  });

  const selectedDepts: string[] = value || [];

  const handleToggleDepartment = (deptId: string) => {
    const updated = selectedDepts.includes(deptId)
      ? selectedDepts.filter((id) => id !== deptId)
      : [...selectedDepts, deptId];
    onChange(updated);
  };

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium text-foreground">Departments (Optional)</label>
      <p className="text-xs text-muted">Select all departments this member belongs to</p>
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {departments.map((dept) => (
          <label key={dept._id} className="flex items-center gap-2 p-2 rounded border border-border cursor-pointer hover:bg-muted/50 transition">
            <input
              type="checkbox"
              checked={selectedDepts.includes(dept._id)}
              onChange={() => handleToggleDepartment(dept._id)}
              className="w-4 h-4"
            />
            <span className="text-sm text-foreground">{dept.name}</span>
          </label>
        ))}
      </div>
      {selectedDepts.length > 0 && (
        <div className="flex flex-wrap gap-2 mt-2">
          {selectedDepts.map((deptId) => {
            const dept = departments.find((d) => d._id === deptId);
            return dept ? (
              <div key={deptId} className="flex items-center gap-2 px-2 py-1 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded text-sm">
                {dept.name}
                <button
                  type="button"
                  onClick={() => handleToggleDepartment(deptId)}
                  className="ml-1 text-blue-600 dark:text-blue-400 hover:text-blue-800"
                >
                  ×
                </button>
              </div>
            ) : null;
          })}
        </div>
      )}
    </div>
  );
}

interface MemberFormProps {
  defaultValues?: Partial<MemberFormData>;
  onSubmit: (data: MemberFormData) => void;
  isLoading: boolean;
  submitLabel: string;
  onCancel: () => void;
  currentMemberId?: string;
}

export default function MemberForm({
  defaultValues,
  onSubmit,
  isLoading,
  submitLabel,
  onCancel,
  currentMemberId,
}: MemberFormProps) {
  const [selectedFamilyMembers, setSelectedFamilyMembers] = useState<Array<{
    member: Member;
    relationship: string;
  }>>([]);
  const [memberForRelationship, setMemberForRelationship] = useState<Member | null>(null);

  const { data: allMembers = [] } = useQuery<Member[]>({
    queryKey: ['members'],
    queryFn: () => membersApi.getAll(),
  });
  const {
    register,
    handleSubmit,
    setValue,
    watch,
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
      departments: [],
      notes: '',
      ...defaultValues,
    },
  });

  const selectedCountry = watch('country');
  const regionOptions = selectedCountry ? (regionsByCountry[selectedCountry] || []) : [];

  // Load default family members
  useEffect(() => {
    if (defaultValues?.familyMembers && defaultValues.familyMembers.length > 0) {
      const familyMembers = (defaultValues.familyMembers as any[])
        .map((fm) => ({
          member: allMembers.find((m) => m._id === fm.memberId),
          relationship: fm.relationship,
        }))
        .filter((fm): fm is { member: Member; relationship: string } => !!fm.member);
      setSelectedFamilyMembers(familyMembers);
    }
  }, [defaultValues?.familyMembers, allMembers]);

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
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Select
              label="Country"
              options={countryOptions}
              placeholder="Select country"
              error={errors.country?.message}
              {...register('country')}
            />
            <Select
              label="Region"
              options={regionOptions}
              placeholder={selectedCountry ? 'Select region' : 'Select a country first'}
              error={errors.region?.message}
              {...register('region')}
            />
          </div>
          <Input
            label="Zip / Postal Code"
            placeholder="Zip code"
            error={errors.zipCode?.message}
            {...register('zipCode')}
          />
        </div>
      </Card>

      {/* Church Information */}
      <Card padding="lg">
        <h2 className="text-lg font-semibold text-foreground mb-6">Church Information</h2>
        <div className="space-y-4">
          <BranchField
            value={watch('branchId')}
            onChange={(v) => setValue('branchId', v)}
          />
          <DepartmentSelect
            value={watch('departments')}
            onChange={(v) => setValue('departments', v)}
          />
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
        </div>
      </Card>

      {/* Family Information */}
      <Card padding="lg">
        <h2 className="text-lg font-semibold text-foreground mb-6 flex items-center gap-2">
          <Users className="w-5 h-5" />
          Family Links
        </h2>
        <div className="space-y-4">
          <p className="text-sm text-muted">Search and add family members to create relationships</p>

          {memberForRelationship ? (
            <div className="p-4 bg-blue-50 dark:bg-blue-950 border border-blue-200 dark:border-blue-800 rounded-lg">
              <p className="text-sm font-medium text-foreground mb-3">
                Select relationship for: <span className="font-semibold">{memberForRelationship.firstName} {memberForRelationship.lastName}</span>
              </p>
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2">
                {relationshipOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    onClick={() => {
                      if (!selectedFamilyMembers.find((fm) => fm.member._id === memberForRelationship._id)) {
                        const updated = [...selectedFamilyMembers, { member: memberForRelationship, relationship: option.value }];
                        setSelectedFamilyMembers(updated);
                        setValue(
                          'familyMembers',
                          updated.map((fm) => ({ memberId: fm.member._id, relationship: fm.relationship as 'mother' | 'father' | 'spouse' | 'child' | 'sibling' | 'grandparent' | 'other' }))
                        );
                      }
                      setMemberForRelationship(null);
                    }}
                    className="px-3 py-2 text-sm bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded hover:bg-gray-50 dark:hover:bg-gray-800 transition"
                  >
                    {option.label}
                  </button>
                ))}
              </div>
              <button
                type="button"
                onClick={() => setMemberForRelationship(null)}
                className="mt-3 text-sm text-muted hover:text-foreground"
              >
                Cancel
              </button>
            </div>
          ) : (
            <MemberSearch
              onSelect={(member) => {
                setMemberForRelationship(member);
              }}
              excludeIds={[
                ...(currentMemberId ? [currentMemberId] : []),
                ...selectedFamilyMembers.map((fm) => fm.member._id),
              ]}
              placeholder="Search for family members..."
            />
          )}

          {/* Selected Family Members */}
          {selectedFamilyMembers.length > 0 && (
            <div className="mt-6 space-y-2">
              <p className="text-sm font-medium text-foreground">
                Linked Family Members ({selectedFamilyMembers.length})
              </p>
              <div className="space-y-2">
                {selectedFamilyMembers.map((fm) => (
                  <div
                    key={fm.member._id}
                    className="flex items-center justify-between p-3 bg-muted/20 rounded-lg border border-border"
                  >
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">
                        {fm.member.firstName} {fm.member.lastName}
                        <span className="ml-2 text-xs bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 px-2 py-1 rounded">
                          {fm.relationship}
                        </span>
                      </p>
                      <p className="text-xs text-muted">{fm.member.email || fm.member.phone}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        const updated = selectedFamilyMembers.filter((m) => m.member._id !== fm.member._id);
                        setSelectedFamilyMembers(updated);
                        setValue(
                          'familyMembers',
                          updated.map((m) => ({ memberId: m.member._id, relationship: m.relationship as 'mother' | 'father' | 'spouse' | 'child' | 'sibling' | 'grandparent' | 'other' }))
                        );
                      }}
                      className="ml-2 p-1.5 text-muted hover:text-foreground hover:bg-muted rounded transition"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Notes */}
      <Card padding="lg">
        <h2 className="text-lg font-semibold text-foreground mb-6 flex items-center gap-2">
          <FileText className="w-5 h-5" />
          Notes
        </h2>
        <div>
          <textarea
            placeholder="Add any notes about this member..."
            rows={4}
            className="w-full px-4 py-3 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-lg text-sm text-gray-900 dark:text-gray-100 placeholder:text-gray-400 dark:placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-[#3AAFDC] focus:border-transparent resize-none"
            {...register('notes')}
          />
          {errors.notes?.message && (
            <p className="mt-1 text-sm text-red-500">{errors.notes.message}</p>
          )}
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
