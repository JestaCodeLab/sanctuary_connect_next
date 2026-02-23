'use client';

import { ReactNode } from 'react';
import { useFeatureAccess } from '@/lib/hooks/useFeatureAccess';
import UpgradePrompt from './UpgradePrompt';

interface FeatureGateProps {
  featureKey: string;
  featureName?: string;
  children: ReactNode;
  fallback?: ReactNode;
}

export default function FeatureGate({
  featureKey,
  featureName,
  children,
  fallback,
}: FeatureGateProps) {
  const { hasFeature, isLoading, planName } = useFeatureAccess();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-[#3AAFDC]"></div>
      </div>
    );
  }

  if (!hasFeature(featureKey)) {
    return (
      <>
        {fallback || (
          <UpgradePrompt
            featureKey={featureKey}
            featureName={featureName}
            currentPlan={planName}
          />
        )}
      </>
    );
  }

  return <>{children}</>;
}
