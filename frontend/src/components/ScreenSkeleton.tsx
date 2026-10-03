import React from 'react';
import { BrandedLoader } from './BrandedLoader';

export const ScreenSkeleton: React.FC = () => {
  return (
    <div className="flex-1 flex items-center justify-center bg-slate-50/50 min-h-[calc(100vh-2rem)]">
      <BrandedLoader />
    </div>
  );
};

export default ScreenSkeleton;
