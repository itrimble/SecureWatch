'use client';

import React from 'react';
import InteractiveHeatmap from './InteractiveHeatmap';

const HeatmapsPlaceholder: React.FC = () => {
  return (
    <div className="space-y-6">
      <InteractiveHeatmap 
        title="Security Event Heatmap Analysis"
        colorScheme="security"
      />
    </div>
  );
};

export default HeatmapsPlaceholder;
