import React from 'react';
import AlertsDisplay from '@/components/dashboard/AlertsDisplay';
import RuleEditor from '@/components/rules/RuleEditor';

const AlertsAndRulesPage: React.FC = () => {
  return (
    <div className="space-y-8 p-4 md:p-6">
      <h1 className="text-2xl md:text-3xl font-semibold text-gray-100 mb-6">Detection & Alerting</h1>
      
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <section aria-labelledby="alerts-display-heading">
          <h2 id="alerts-display-heading" className="sr-only">Alerts Display</h2>
          <AlertsDisplay />
        </section>
        
        <section aria-labelledby="rule-editor-heading">
          <h2 id="rule-editor-heading" className="sr-only">Rule Editor</h2>
          <RuleEditor />
        </section>
      </div>
    </div>
  );
};

export default AlertsAndRulesPage;
