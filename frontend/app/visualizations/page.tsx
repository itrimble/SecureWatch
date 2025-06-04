'use client';

import React, { useState } from 'react';
import EventTimeline from '@/components/visualization/EventTimeline';
import BasicDashboards from '@/components/visualization/BasicDashboards';
import CorrelationGraphPlaceholder from '@/components/visualization/CorrelationGraphPlaceholder';
import HeatmapsPlaceholder from '@/components/visualization/HeatmapsPlaceholder';
import AuthenticationDashboard from '@/components/visualization/AuthenticationDashboard';
import InsiderThreatDashboard from '@/components/visualization/InsiderThreatDashboard';
import MalwareDefenseDashboard from '@/components/visualization/MalwareDefenseDashboard';
import SupplyChainRiskDashboard from '@/components/visualization/SupplyChainRiskDashboard';
import CASBDashboard from '@/components/visualization/CASBDashboard';
import ThreatGeolocationMap from '@/components/visualization/ThreatGeolocationMap';

type TabName =
  | 'Timeline'
  | 'Summary Dashboards'
  | 'Auth & Access'
  | 'Insider Threat'
  | 'Malware Defense'
  | 'Supply Chain Risk'
  | 'CASB'
  | 'Correlation Graph'
  | 'Heatmaps'
  | 'Threat Map';

const VisualizationsPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabName>('Timeline');

  const tabs: TabName[] = [
    'Timeline',
    'Summary Dashboards',
    'Auth & Access',
    'Insider Threat',
    'Malware Defense',
    'Supply Chain Risk',
    'CASB',
    'Correlation Graph',
    'Heatmaps',
    'Threat Map'
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case 'Timeline':
        return <EventTimeline />;
      case 'Summary Dashboards':
        return <BasicDashboards />;
      case 'Auth & Access':
        return <AuthenticationDashboard />;
      case 'Insider Threat':
        return <InsiderThreatDashboard />;
      case 'Malware Defense':
        return <MalwareDefenseDashboard />;
      case 'Supply Chain Risk':
        return <SupplyChainRiskDashboard />;
      case 'CASB':
        return <CASBDashboard />;
      case 'Correlation Graph':
        return <CorrelationGraphPlaceholder />;
      case 'Heatmaps':
        return <HeatmapsPlaceholder />;
      case 'Threat Map':
        return <ThreatGeolocationMap />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-6 p-4 md:p-6">
      <h1 className="text-2xl md:text-3xl font-semibold text-gray-100">Event Visualizations & Analysis</h1>

      <div className="border-b border-gray-700">
        <nav className="-mb-px flex space-x-4" aria-label="Tabs">
          {tabs.map((tabName) => (
            <button
              key={tabName}
              onClick={() => setActiveTab(tabName)}
              className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm focus:outline-none
                ${
                  activeTab === tabName
                    ? 'border-blue-500 text-blue-400'
                    : 'border-transparent text-gray-400 hover:text-gray-200 hover:border-gray-500'
                }
              `}
              aria-current={activeTab === tabName ? 'page' : undefined}
            >
              {tabName}
            </button>
          ))}
        </nav>
      </div>

      <div className="mt-6">
        {renderTabContent()}
      </div>
    </div>
  );
};

export default VisualizationsPage;
