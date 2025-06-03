import React, { useEffect, useState } from 'react';
import { ResponsiveScatterPlot } from '@nivo/scatterplot';

// Interface for the new cloudAppRisks data structure
interface CloudAppRiskDataItem {
  x: number; // risk score
  y: number; // usage score
  sensitivity: number;
  users: number;
  appName: string;
}

interface CloudAppRiskGroup {
  id: string; // AppName, will also be used for series id
  data: CloudAppRiskDataItem[];
}

interface FileSharingExposureItem {
  fileId: string;
  fileName: string;
  app: string;
  currentExposure: string;
  recommendedAction: string;
  remediated: boolean;
  remediationDate?: string;
}

// The API returns CASBPolicyEnforcement as an array, with the last element being an object containing fileSharingExposure
// This is a bit unusual. We'll handle this structure.
interface CASBPolicy {
  policyName: string;
  app: string;
  actionsTaken: number;
  lastTriggered: string;
}

type CASBPolicyEnforcementDataItem = CASBPolicy | { fileSharingExposure: FileSharingExposureItem[] };


interface CASBData {
  cloudAppRisks: CloudAppRiskGroup[]; // Updated field name and type
  casbPolicyEnforcement: CASBPolicyEnforcementDataItem[];
}

const CASBDashboard: React.FC = () => {
  const [data, setData] = useState<CASBData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [policies, setPolicies] = useState<CASBPolicy[]>([]);
  const [fileExposure, setFileExposure] = useState<FileSharingExposureItem[]>([]);

  useEffect(() => {
    fetch('/api/dashboards/casb_integration')
      .then(res => {
        if (!res.ok) {
          throw new Error(`Failed to fetch data: ${res.status} ${res.statusText}`);
        }
        return res.json();
      })
      .then((fetchedData: CASBData) => {
        setData(fetchedData);
        // Separate policies from file exposure data
        const policyItems: CASBPolicy[] = [];
        let exposureItems: FileSharingExposureItem[] = [];

        if (fetchedData.casbPolicyEnforcement) {
          fetchedData.casbPolicyEnforcement.forEach(item => {
            if ('fileSharingExposure' in item) {
              exposureItems = item.fileSharingExposure;
            } else if ('policyName' in item) { // Type guard for CASBPolicy
              policyItems.push(item as CASBPolicy);
            }
          });
        }
        setPolicies(policyItems);
        setFileExposure(exposureItems);
      })
      .catch(err => {
        setError(err.message);
        console.error("Failed to fetch CASB integration data:", err);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center p-8 text-gray-100">Loading CASB Integration data...</div>;
  if (error) return <div className="text-center p-8 text-red-500">Error: {error}</div>;
  if (!data) return <div className="text-center p-8 text-gray-100">No data available.</div>;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 p-4 md:p-6">
      {/* Cloud App Risk Bubble Chart */}
      <div className="lg:col-span-2 bg-gray-800 p-4 md:p-6 rounded-lg shadow-xl h-96 md:h-[500px]">
        <h3 className="text-lg font-semibold text-gray-100 mb-4">Cloud Application Risk Landscape</h3>
        {data.cloudAppRisks && data.cloudAppRisks.length > 0 ? (
          <ResponsiveScatterPlot
            data={data.cloudAppRisks}
            margin={{ top: 60, right: 140, bottom: 70, left: 90 }}
            xScale={{ type: 'linear', min: 0, max: 100 }} // Risk Score 0-100
            xFormat={v => `${v} Risk`}
            yScale={{ type: 'linear', min: 0, max: 100 }} // Usage Score 0-100
            yFormat={v => `${v} Usage`}
            blendMode="multiply"
            nodeSize={node => node.data.sensitivity / 2 + 10} // Bubble size based on sensitivity
            colors={{ scheme: 'spectral' }}
            axisTop={null}
            axisRight={null}
            axisBottom={{
              orient: 'bottom',
              tickSize: 5,
              tickPadding: 5,
              tickRotation: 0,
              legend: 'Overall Risk Score',
              legendPosition: 'middle',
              legendOffset: 46,
              format: v => `${v}`, // Simple number format
              tickValues: [0, 20, 40, 60, 80, 100],
            }}
            axisLeft={{
              orient: 'left',
              tickSize: 5,
              tickPadding: 5,
              tickRotation: 0,
              legend: 'Usage Score / Adoption',
              legendPosition: 'middle',
              legendOffset: -60,
              format: v => `${v}`, // Simple number format
              tickValues: [0, 20, 40, 60, 80, 100],
            }}
            legends={[
              {
                anchor: 'bottom-right',
                direction: 'column',
                justify: false,
                translateX: 130,
                translateY: 0,
                itemsSpacing: 5,
                itemWidth: 100,
                itemHeight: 12,
                itemDirection: 'left-to-right',
                itemOpacity: 0.85,
                symbolSize: 12,
                symbolShape: 'circle',
                effects: [{ on: 'hover', style: { itemOpacity: 1 } }],
              }
            ]}
            tooltip={({ node }) => (
              <div className="p-2 bg-gray-900 text-white rounded shadow-lg border border-gray-700 text-sm">
                <strong>{node.data.appName}</strong><br />
                Risk: {node.data.x}<br />
                Usage: {node.data.y}<br />
                Sensitivity: {node.data.sensitivity}<br />
                Users: {node.data.users.toLocaleString()}
              </div>
            )}
            theme={{
              axis: { ticks: { text: { fill: '#e5e7eb' } }, legend: { text: { fill: '#e5e7eb' } } },
              legends: { text: { text: { fill: '#e5e7eb' } } },
              tooltip: { container: { background: '#1f2937', color: '#e5e7eb', border: '1px solid #374151' } }
            }}
          />
        ) : (
          <p className="text-gray-400 text-center pt-10">No cloud app risk data available.</p>
        )}
      </div>

      {/* CASB Policy Enforcement (remains the same) */}
      <div className="lg:col-span-1 bg-gray-800 p-4 md:p-6 rounded-lg shadow-xl">
        <h3 className="text-lg font-semibold text-gray-100 mb-4">CASB Policy Enforcement Actions</h3>
        <div className="overflow-y-auto max-h-96 space-y-3">
          {policies.length > 0 ? (
            policies.map((policy, index) => (
              <div key={index} className="p-3 bg-gray-700 rounded-md text-sm">
                <p className="font-semibold text-gray-200">{policy.policyName}</p>
                <p className="text-gray-300">App: {policy.app}</p>
                <p className="text-gray-300">Actions Taken: {policy.actionsTaken.toLocaleString()}</p>
                <p className="text-xs text-gray-500">Last Triggered: {new Date(policy.lastTriggered).toLocaleString()}</p>
              </div>
            ))
          ) : (
            <p className="text-gray-400">No CASB policy enforcement data available.</p>
          )}
        </div>
      </div>

      {/* File Sharing Exposure */}
      <div className="lg:col-span-1 bg-gray-800 p-4 md:p-6 rounded-lg shadow-xl">
        <h3 className="text-lg font-semibold text-gray-100 mb-4">File Sharing Exposure</h3>
        <div className="overflow-y-auto max-h-96 space-y-3">
          {fileExposure.length > 0 ? (
            fileExposure.map((file, index) => (
              <div key={file.fileId || index} className="p-3 bg-gray-700 rounded-md text-sm">
                <p className="font-semibold text-gray-200 truncate" title={file.fileName}>{file.fileName}</p>
                <p className="text-gray-300">App: {file.app}</p>
                <p className="text-gray-300">Exposure: <span className="font-semibold text-yellow-400">{file.currentExposure}</span></p>
                <p className="text-gray-300">Recommendation: {file.recommendedAction}</p>
                <p className={`font-semibold ${file.remediated ? 'text-green-400' : 'text-red-400'}`}>
                  Status: {file.remediated ? `Remediated (${file.remediationDate ? new Date(file.remediationDate).toLocaleDateString() : 'N/A'})` : 'Outstanding'}
                </p>
              </div>
            ))
          ) : (
            <p className="text-gray-400">No file sharing exposure data available.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default CASBDashboard;
