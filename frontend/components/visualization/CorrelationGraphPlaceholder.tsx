'use client';

import React from 'react';
import NetworkCorrelationGraph from './NetworkCorrelationGraph';

const CorrelationGraphPlaceholder: React.FC = () => {
  return (
    <div className="space-y-6">
      <NetworkCorrelationGraph />
    </div>
  );
};

export default CorrelationGraphPlaceholder;
