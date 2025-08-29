import React, { Suspense } from 'react';
import { useSearchParams } from 'react-router-dom';
import ChartBuilder from '@/pages/ChartBuilder';

// This wrapper component ensures Router context is available
function ChartBuilderWithParams() {
  const [searchParams] = useSearchParams();
  const editChartId = searchParams.get('edit');
  
  return <ChartBuilder editChartId={editChartId} />;
}

export default function ChartBuilderWrapper() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading...</p>
        </div>
      </div>
    }>
      <ChartBuilderWithParams />
    </Suspense>
  );
}