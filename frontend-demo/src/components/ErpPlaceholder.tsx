import React from 'react';
import { Construction } from './icons';
import { Card, CardContent } from '@/components/ui/card';

interface Props {
  title: string;
}

export const ErpPlaceholder: React.FC<Props> = ({ title }) => {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[60vh] animate-in fade-in duration-500">
      <Card className="max-w-md w-full">
        <CardContent className="flex flex-col items-center text-center py-6">
          <div className="size-14 bg-muted text-muted-foreground rounded-xl flex items-center justify-center mb-4">
            <Construction className="size-7" />
          </div>
          <h2 className="text-2xl font-bold mb-2">{title}</h2>
          <p className="text-muted-foreground">
            This module is currently being built out as part of the Educational ERP integration phase.
          </p>
        </CardContent>
      </Card>
    </div>
  );
};
