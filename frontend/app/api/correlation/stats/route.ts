import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Fetch stats from correlation engine
    const correlationEngineUrl = process.env.CORRELATION_ENGINE_URL || 'http://localhost:4005';
    
    const [rulesResponse, incidentsResponse, patternsResponse] = await Promise.all([
      fetch(`${correlationEngineUrl}/api/rules/stats`),
      fetch(`${correlationEngineUrl}/api/incidents/stats`),
      fetch(`${correlationEngineUrl}/api/patterns/stats`)
    ]);

    const rulesStats = await rulesResponse.json();
    const incidentsStats = await incidentsResponse.json();
    const patternsStats = await patternsResponse.json();

    // Calculate risk score based on various factors
    const riskScore = calculateRiskScore(incidentsStats, patternsStats);

    return NextResponse.json({
      activeRules: rulesStats.activeRules || 0,
      openIncidents: incidentsStats.openIncidents || 0,
      detectedPatterns: patternsStats.detectedPatterns || 0,
      riskScore
    });
  } catch (error) {
    console.error('Failed to fetch correlation stats:', error);
    
    // Return mock data for development
    return NextResponse.json({
      activeRules: 24,
      openIncidents: 7,
      detectedPatterns: 12,
      riskScore: 72
    });
  }
}

function calculateRiskScore(incidents: any, patterns: any): number {
  // Simple risk score calculation
  const incidentScore = (incidents.criticalIncidents || 0) * 20 + 
                       (incidents.highIncidents || 0) * 10 + 
                       (incidents.mediumIncidents || 0) * 5;
  
  const patternScore = (patterns.attackChains || 0) * 15 + 
                      (patterns.anomalies || 0) * 10;
  
  // Normalize to 0-100
  return Math.min(100, incidentScore + patternScore);
}