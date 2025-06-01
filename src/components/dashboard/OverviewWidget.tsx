'use client';

import React from 'react';

interface OverviewWidgetProps {
  title: string;
  value: string | number;
  icon?: React.ElementType; // Heroicon or similar SVG component
  iconColor?: string; // Tailwind CSS color class for the icon
  valueColor?: string; // Tailwind CSS color class for the value
}

const OverviewWidget: React.FC<OverviewWidgetProps> = ({ title, value, icon: Icon, iconColor = 'text-blue-400', valueColor = 'text-gray-100' }) => {
  return (
    <div className="bg-gray-700 p-4 md:p-6 rounded-xl shadow-lg hover:shadow-xl transition-shadow duration-300 ease-in-out">
      <div className="flex items-center">
        {Icon && (
          <div className={`p-3 rounded-full mr-4 ${iconColor} bg-gray-800`}>
            <Icon className="h-6 w-6" />
          </div>
        )}
        <div>
          <p className="text-sm font-medium text-gray-400 uppercase tracking-wider">{title}</p>
          <p className={`text-2xl md:text-3xl font-bold ${valueColor}`}>{value}</p>
        </div>
      </div>
    </div>
  );
};

export default OverviewWidget;
