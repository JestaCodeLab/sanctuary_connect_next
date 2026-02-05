'use client';

import { Check, X } from 'lucide-react';
import { getPasswordStrength, checkPasswordRequirements } from '@/lib/validations';

interface PasswordStrengthProps {
  password: string;
  showRequirements?: boolean;
}

export default function PasswordStrength({
  password,
  showRequirements = true,
}: PasswordStrengthProps) {
  const strength = getPasswordStrength(password);
  const requirements = checkPasswordRequirements(password);

  const getBarWidth = () => {
    if (!password) return '0%';
    if (strength.score <= 2) return '25%';
    if (strength.score <= 3) return '50%';
    if (strength.score <= 4) return '75%';
    return '100%';
  };

  return (
    <div className="space-y-3">
      {/* Strength Bar */}
      <div className="space-y-1">
        <div className="flex gap-1">
          {[1, 2, 3, 4].map((segment) => {
            let bgColor = 'bg-gray-200 dark:bg-gray-700';
            if (password) {
              if (strength.score >= 5 && segment <= 4) bgColor = 'bg-green-500';
              else if (strength.score >= 4 && segment <= 3) bgColor = 'bg-[#3AAFDC]';
              else if (strength.score >= 3 && segment <= 2) bgColor = 'bg-yellow-500';
              else if (strength.score >= 1 && segment <= 1) bgColor = 'bg-red-500';
            }
            return (
              <div
                key={segment}
                className={`h-1 flex-1 rounded-full transition-colors duration-300 ${bgColor}`}
              />
            );
          })}
        </div>
        {password && (
          <div className="flex justify-between items-center">
            <span
              className="text-xs font-medium"
              style={{ color: strength.color }}
            >
              Strength: {strength.label}
            </span>
            {showRequirements && (
              <span className="text-xs text-gray-400 dark:text-gray-500">
                MUST INCLUDE SPECIAL CHARACTER & NUMBER
              </span>
            )}
          </div>
        )}
      </div>

      {/* Requirements Checklist */}
      {showRequirements && password && (
        <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-3 space-y-2">
          <p className="text-xs font-medium text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            Security Requirements
          </p>
          <div className="space-y-1.5">
            <RequirementItem
              met={requirements.minLength}
              label="At least 8 characters"
            />
            <RequirementItem
              met={requirements.hasNumber}
              label="At least one number"
            />
            <RequirementItem
              met={requirements.hasSpecial}
              label="At least one special character"
            />
          </div>
        </div>
      )}
    </div>
  );
}

function RequirementItem({ met, label }: { met: boolean; label: string }) {
  return (
    <div className="flex items-center gap-2">
      {met ? (
        <Check className="w-4 h-4 text-green-500" />
      ) : (
        <X className="w-4 h-4 text-gray-300 dark:text-gray-600" />
      )}
      <span className={`text-sm ${met ? 'text-gray-700 dark:text-gray-300' : 'text-gray-400 dark:text-gray-500'}`}>
        {label}
      </span>
    </div>
  );
}
