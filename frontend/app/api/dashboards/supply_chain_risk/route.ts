import { NextResponse } from 'next/server';

const mockSupplyChainData = {
  totalVendors: 156,
  criticalVendors: 23,
  riskScore: 7.2,
  vulnerabilities: 45,
  complianceRate: 92.3,
  riskByCategory: [
    { category: 'Software Dependencies', risk: 8.5, count: 23 },
    { category: 'Third-party Services', risk: 6.8, count: 18 },
    { category: 'Hardware Suppliers', risk: 5.2, count: 12 },
    { category: 'Cloud Providers', risk: 4.1, count: 8 }
  ],
  vendorRiskTrend: [
    { month: 'Jan', high: 12, medium: 25, low: 45 },
    { month: 'Feb', high: 15, medium: 28, low: 42 },
    { month: 'Mar', high: 18, medium: 32, low: 38 },
    { month: 'Apr', high: 16, medium: 29, low: 41 },
    { month: 'May', high: 14, medium: 31, low: 43 },
    { month: 'Jun', high: 23, medium: 35, low: 40 }
  ]
};

export async function GET() {
  return NextResponse.json(mockSupplyChainData, {
    headers: { 'X-Data-Source': 'mock-data', 'X-Dashboard-Type': 'supply_chain_risk' }
  });
}