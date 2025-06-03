import React, { useEffect, useState } from 'react';

interface VendorAssessment {
  vendor: string;
  service: string;
  sbomValidated: boolean;
  cvssScore: number;
  lastAssessment: string;
}

interface PipelineAlert {
  timestamp: string;
  pipeline: string;
  alertType: string;
  dependencyName?: string;
  details?: string;
  component?: string;
  severity: string;
}

interface ComplianceStatus {
  standard: string;
  requirement: string;
  status: string;
  gaps: number;
}

interface SupplyChainRiskData {
  vendorAssessmentStatus: VendorAssessment[];
  buildPipelineSecurityAlerts: PipelineAlert[];
  complianceMappingStatus: ComplianceStatus[];
}

const SupplyChainRiskDashboard: React.FC = () => {
  const [data, setData] = useState<SupplyChainRiskData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/dashboards/supply_chain_risk')
      .then(res => {
        if (!res.ok) {
          throw new Error(`Failed to fetch data: ${res.status} ${res.statusText}`);
        }
        return res.json();
      })
      .then(fetchedData => {
        setData(fetchedData);
      })
      .catch(err => {
        setError(err.message);
        console.error("Failed to fetch supply chain risk data:", err);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center p-8 text-gray-100">Loading Supply Chain Risk data...</div>;
  if (error) return <div className="text-center p-8 text-red-500">Error: {error}</div>;
  if (!data) return <div className="text-center p-8 text-gray-100">No data available.</div>;

  const getSeverityClass = (severity: string) => {
    switch (severity.toLowerCase()) {
      case 'critical': return 'text-red-500 font-bold';
      case 'high': return 'text-red-400 font-semibold';
      case 'medium': return 'text-yellow-400';
      case 'low': return 'text-blue-400';
      default: return 'text-gray-300';
    }
  };

  const getStatusClass = (status: string) => {
    switch (status.toLowerCase()) {
      case 'achieved': return 'text-green-400';
      case 'partial': return 'text-yellow-400';
      case 'in progress': return 'text-blue-400';
      default: return 'text-gray-300';
    }
  };


  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6 p-4 md:p-6">
      {/* Third-Party Vendor Assessment Status */}
      <div className="lg:col-span-3 bg-gray-800 p-4 md:p-6 rounded-lg shadow-xl">
        <h3 className="text-lg font-semibold text-gray-100 mb-4">Third-Party Vendor Assessment Status</h3>
        <div className="overflow-x-auto">
          {data.vendorAssessmentStatus && data.vendorAssessmentStatus.length > 0 ? (
            <table className="w-full text-sm text-left text-gray-400">
              <thead className="text-xs text-gray-100 uppercase bg-gray-700">
                <tr>
                  <th scope="col" className="py-3 px-6">Vendor</th>
                  <th scope="col" className="py-3 px-6">Service</th>
                  <th scope="col" className="py-3 px-6 text-center">SBOM Validated</th>
                  <th scope="col" className="py-3 px-6 text-center">CVSS Score</th>
                  <th scope="col" className="py-3 px-6">Last Assessment</th>
                </tr>
              </thead>
              <tbody>
                {data.vendorAssessmentStatus.map((vendor) => (
                  <tr key={vendor.vendor + vendor.service} className="bg-gray-800 border-b border-gray-700 hover:bg-gray-600">
                    <td className="py-4 px-6 font-medium text-gray-200 whitespace-nowrap">{vendor.vendor}</td>
                    <td className="py-4 px-6">{vendor.service}</td>
                    <td className={`py-4 px-6 text-center font-semibold ${vendor.sbomValidated ? 'text-green-400' : 'text-red-400'}`}>
                      {vendor.sbomValidated ? 'Yes' : 'No'}
                    </td>
                    <td className="py-4 px-6 text-center">{vendor.cvssScore.toFixed(1)}</td>
                    <td className="py-4 px-6">{new Date(vendor.lastAssessment).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <p className="text-gray-400">No vendor assessment data available.</p>
          )}
        </div>
      </div>

      {/* Build Pipeline Security Alerts */}
      <div className="lg:col-span-3 bg-gray-800 p-4 md:p-6 rounded-lg shadow-xl">
        <h3 className="text-lg font-semibold text-gray-100 mb-4">Build Pipeline Security Alerts</h3>
        <div className="overflow-y-auto max-h-96 space-y-3">
          {data.buildPipelineSecurityAlerts && data.buildPipelineSecurityAlerts.length > 0 ? (
            data.buildPipelineSecurityAlerts.map((alert, index) => (
              <div key={index} className="p-3 bg-gray-700 rounded-md text-sm">
                <p className="font-semibold text-gray-200">Pipeline: {alert.pipeline} - <span className={getSeverityClass(alert.severity)}>{alert.severity}</span></p>
                <p className="text-gray-300">Type: {alert.alertType}</p>
                {alert.dependencyName && <p className="text-gray-300">Dependency: {alert.dependencyName}</p>}
                {alert.component && <p className="text-gray-300">Component: {alert.component}</p>}
                {alert.details && <p className="text-gray-300">Details: {alert.details}</p>}
                <p className="text-xs text-gray-500">{new Date(alert.timestamp).toLocaleString()}</p>
              </div>
            ))
          ) : (
            <p className="text-gray-400">No build pipeline security alerts available.</p>
          )}
        </div>
      </div>

      {/* Compliance Mapping Status */}
      <div className="lg:col-span-3 bg-gray-800 p-4 md:p-6 rounded-lg shadow-xl">
        <h3 className="text-lg font-semibold text-gray-100 mb-4">Compliance Mapping Status</h3>
        <div className="overflow-y-auto max-h-96 space-y-3">
          {data.complianceMappingStatus && data.complianceMappingStatus.length > 0 ? (
            data.complianceMappingStatus.map((compliance, index) => (
              <div key={index} className="p-3 bg-gray-700 rounded-md text-sm">
                <p className="font-semibold text-gray-200">Standard: {compliance.standard}</p>
                <p className="text-gray-300">Requirement: {compliance.requirement}</p>
                <p className="text-gray-300">Status: <span className={getStatusClass(compliance.status)}>{compliance.status}</span></p>
                {compliance.gaps > 0 && <p className="text-yellow-400">Gaps: {compliance.gaps}</p>}
              </div>
            ))
          ) : (
            <p className="text-gray-400">No compliance mapping data available.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default SupplyChainRiskDashboard;
