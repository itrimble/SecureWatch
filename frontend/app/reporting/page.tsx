import React from 'react';
import ReportGenerator from '@/components/reporting/ReportGenerator';
import ScheduledReportsConfig from '@/components/reporting/ScheduledReportsConfig';

const ReportingPage: React.FC = () => {
  return (
    <div className="space-y-8 p-4 md:p-6">
      <h1 className="text-2xl md:text-3xl font-semibold text-gray-100 mb-6">Reporting & Export</h1>
      
      <section aria-labelledby="report-generator-heading">
        <h2 id="report-generator-heading" className="sr-only">Report Generator</h2>
        <ReportGenerator />
      </section>
      
      <section aria-labelledby="scheduled-reports-heading" className="mt-8">
         {/* The h2 is already inside ScheduledReportsConfig, so we don't need one here if it's prominent enough */}
        <ScheduledReportsConfig />
      </section>
    </div>
  );
};

export default ReportingPage;
