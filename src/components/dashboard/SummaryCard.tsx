'use client';

import React from 'react';

interface SummaryCardProps {
  title: string;
  content: React.ReactNode; // Can be string, number, or a list of items
  icon?: React.ElementType;
  iconColor?: string;
}

const SummaryCard: React.FC<SummaryCardProps> = ({ title, content, icon: Icon, iconColor = 'text-purple-400' }) => {
  return (
    <div className="bg-gray-700 p-4 md:p-6 rounded-lg shadow-lg hover:shadow-xl transition-shadow duration-300 ease-in-out h-full flex flex-col">
      <div className="flex items-center mb-3">
        {Icon && (
          <div className={`p-2 rounded-full mr-3 ${iconColor} bg-gray-800`}>
            <Icon className="h-5 w-5" />
          </div>
        )}
        <h3 className="text-md font-semibold text-gray-200 uppercase tracking-wider">{title}</h3>
      </div>
      <div className="text-gray-300 text-sm flex-grow">
        {typeof content === 'string' || typeof content === 'number' ? (
          <p>{content}</p>
        ) : (
          content // Allows passing JSX for lists or more complex content
        )}
      </div>
    </div>
  );
};

export default SummaryCard;
