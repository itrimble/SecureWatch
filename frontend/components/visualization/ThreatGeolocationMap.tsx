"use client";

import React, { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { 
  Globe, 
  MapPin, 
  AlertTriangle, 
  RotateCcw,
  Download
} from "lucide-react";

interface GeoLocation {
  id: string;
  ip: string;
  latitude: number;
  longitude: number;
  country: string;
  city: string;
  threatLevel: 'low' | 'medium' | 'high' | 'critical';
  eventCount: number;
  lastSeen: string;
  threatType: string;
  metadata: any;
}

interface ThreatStats {
  total: number;
  critical: number;
  high: number;
  medium: number;
  low: number;
  countries: number;
  uniqueIPs: number;
}

const THREAT_COLORS = {
  low: '#10b981',      // Green
  medium: '#f59e0b',   // Amber
  high: '#ef4444',     // Red
  critical: '#dc2626'  // Dark red
};

const MAP_THEMES = [
  { id: 'dark', name: 'Dark Theme', description: 'Dark background for SOC environments' },
  { id: 'satellite', name: 'Satellite', description: 'Satellite imagery view' },
  { id: 'terrain', name: 'Terrain', description: 'Topographical view' },
  { id: 'light', name: 'Light', description: 'Light background theme' }
];

// Generate mock geolocation data for threats
const generateMockGeoData = (): GeoLocation[] => {
  const threatLocations = [
    // Russia
    { lat: 55.7558, lng: 37.6176, country: 'Russia', city: 'Moscow' },
    { lat: 59.9311, lng: 30.3609, country: 'Russia', city: 'St. Petersburg' },
    
    // China
    { lat: 39.9042, lng: 116.4074, country: 'China', city: 'Beijing' },
    { lat: 31.2304, lng: 121.4737, country: 'China', city: 'Shanghai' },
    
    // North Korea
    { lat: 39.0392, lng: 125.7625, country: 'North Korea', city: 'Pyongyang' },
    
    // Iran
    { lat: 35.6892, lng: 51.3890, country: 'Iran', city: 'Tehran' },
    
    // Various other locations
    { lat: 52.5200, lng: 13.4050, country: 'Germany', city: 'Berlin' },
    { lat: 40.7128, lng: -74.0060, country: 'USA', city: 'New York' },
    { lat: 35.6762, lng: 139.6503, country: 'Japan', city: 'Tokyo' },
    { lat: 51.5074, lng: -0.1278, country: 'UK', city: 'London' },
    { lat: -33.8688, lng: 151.2093, country: 'Australia', city: 'Sydney' },
    { lat: 19.4326, lng: -99.1332, country: 'Mexico', city: 'Mexico City' },
    { lat: -23.5505, lng: -46.6333, country: 'Brazil', city: 'São Paulo' },
    { lat: 28.6139, lng: 77.2090, country: 'India', city: 'New Delhi' }
  ];

  const threatTypes = [
    'Brute Force Attack',
    'DDoS Attack',
    'Malware C2',
    'Phishing Campaign',
    'Data Exfiltration',
    'Crypto Mining',
    'Botnet Activity',
    'Reconnaissance Scan',
    'SQL Injection',
    'XSS Attack'
  ];

  return threatLocations.map((location, index) => {
    const eventCount = Math.floor(Math.random() * 1000) + 10;
    const threatLevel = eventCount > 750 ? 'critical' : 
                       eventCount > 500 ? 'high' : 
                       eventCount > 250 ? 'medium' : 'low';
    
    return {
      id: `threat-${index}`,
      ip: `${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}.${Math.floor(Math.random() * 255)}`,
      latitude: location.lat + (Math.random() - 0.5) * 2, // Add some randomness
      longitude: location.lng + (Math.random() - 0.5) * 2,
      country: location.country,
      city: location.city,
      threatLevel: threatLevel as 'low' | 'medium' | 'high' | 'critical',
      eventCount,
      lastSeen: new Date(Date.now() - Math.random() * 86400000 * 7).toISOString(), // Last 7 days
      threatType: threatTypes[Math.floor(Math.random() * threatTypes.length)],
      metadata: {
        asn: `AS${Math.floor(Math.random() * 99999)}`,
        isp: ['Unknown ISP', 'VPS Provider', 'Hosting Company', 'Residential ISP'][Math.floor(Math.random() * 4)],
        firstSeen: new Date(Date.now() - Math.random() * 86400000 * 30).toISOString(), // Last 30 days
        protocols: ['TCP', 'UDP', 'ICMP'][Math.floor(Math.random() * 3)],
        ports: [22, 80, 443, 3389, 21, 25, 53][Math.floor(Math.random() * 7)]
      }
    };
  });
};

export default function ThreatGeolocationMap() {
  const [selectedTheme, setSelectedTheme] = useState('dark');
  const [filterThreatLevel, setFilterThreatLevel] = useState<string>('all');
  const [selectedLocation, setSelectedLocation] = useState<GeoLocation | null>(null);
  const [showHeatmap, setShowHeatmap] = useState(true);

  const geoData = useMemo(() => generateMockGeoData(), []);

  const filteredData = useMemo(() => {
    if (filterThreatLevel === 'all') return geoData;
    return geoData.filter(location => location.threatLevel === filterThreatLevel);
  }, [geoData, filterThreatLevel]);

  const threatStats: ThreatStats = useMemo(() => {
    const stats = filteredData.reduce((acc, location) => {
      acc.total += location.eventCount;
      acc[location.threatLevel]++;
      return acc;
    }, { total: 0, critical: 0, high: 0, medium: 0, low: 0, countries: 0, uniqueIPs: 0 });

    stats.countries = new Set(filteredData.map(l => l.country)).size;
    stats.uniqueIPs = filteredData.length;

    return stats;
  }, [filteredData]);

  const getMarkerSize = (eventCount: number): number => {
    const maxEvents = Math.max(...filteredData.map(l => l.eventCount));
    return Math.max(8, (eventCount / maxEvents) * 30);
  };

  // Simple world map projection (for demonstration - in production would use proper mapping library)
  const projectToMapCoordinates = (lat: number, lng: number, width: number, height: number) => {
    const x = ((lng + 180) / 360) * width;
    const y = ((90 - lat) / 180) * height;
    return { x, y };
  };

  const resetFilters = () => {
    setFilterThreatLevel('all');
    setSelectedLocation(null);
  };

  return (
    <TooltipProvider>
      <Card className="w-full">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Globe className="w-5 h-5" />
              Global Threat Geolocation Map
            </CardTitle>
            <div className="flex items-center gap-2">
              <Select value={selectedTheme} onValueChange={setSelectedTheme}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MAP_THEMES.map((theme) => (
                    <SelectItem key={theme.id} value={theme.id}>
                      {theme.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={filterThreatLevel} onValueChange={setFilterThreatLevel}>
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Threats</SelectItem>
                  <SelectItem value="critical">Critical</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon" onClick={resetFilters}>
                    <RotateCcw className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Reset Filters</TooltipContent>
              </Tooltip>

              <Tooltip>
                <TooltipTrigger asChild>
                  <Button variant="outline" size="icon">
                    <Download className="w-4 h-4" />
                  </Button>
                </TooltipTrigger>
                <TooltipContent>Export Map</TooltipContent>
              </Tooltip>
            </div>
          </div>
          <p className="text-gray-400 text-sm">
            Visualizing threat origins and attack patterns across global IP addresses
          </p>
        </CardHeader>

        <CardContent>
          <div className="space-y-4">
            {/* Threat Statistics */}
            <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
              <div className="text-center p-3 bg-gray-700 rounded-lg">
                <div className="text-2xl font-bold text-blue-400">{threatStats.total.toLocaleString()}</div>
                <div className="text-sm text-gray-400">Total Events</div>
              </div>
              <div className="text-center p-3 bg-gray-700 rounded-lg">
                <div className="text-2xl font-bold text-red-400">{threatStats.critical}</div>
                <div className="text-sm text-gray-400">Critical</div>
              </div>
              <div className="text-center p-3 bg-gray-700 rounded-lg">
                <div className="text-2xl font-bold text-orange-400">{threatStats.high}</div>
                <div className="text-sm text-gray-400">High</div>
              </div>
              <div className="text-center p-3 bg-gray-700 rounded-lg">
                <div className="text-2xl font-bold text-yellow-400">{threatStats.medium}</div>
                <div className="text-sm text-gray-400">Medium</div>
              </div>
              <div className="text-center p-3 bg-gray-700 rounded-lg">
                <div className="text-2xl font-bold text-green-400">{threatStats.countries}</div>
                <div className="text-sm text-gray-400">Countries</div>
              </div>
              <div className="text-center p-3 bg-gray-700 rounded-lg">
                <div className="text-2xl font-bold text-purple-400">{threatStats.uniqueIPs}</div>
                <div className="text-sm text-gray-400">Unique IPs</div>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
              {/* Map Visualization */}
              <div className="lg:col-span-3">
                <div 
                  className={`relative rounded-lg border border-gray-600 overflow-hidden ${
                    selectedTheme === 'dark' ? 'bg-gray-900' : 
                    selectedTheme === 'light' ? 'bg-gray-100' : 
                    'bg-gray-800'
                  }`}
                  style={{ height: '500px' }}
                >
                  {/* Simplified world map background */}
                  <div className="absolute inset-0 flex items-center justify-center text-gray-600">
                    <div className="text-center">
                      <Globe className="w-24 h-24 mx-auto mb-4 opacity-20" />
                      <p className="text-lg font-medium opacity-50">Interactive World Map</p>
                      <p className="text-sm opacity-30">Showing {filteredData.length} threat locations</p>
                    </div>
                  </div>

                  {/* Threat markers overlay */}
                  <svg className="absolute inset-0 w-full h-full" style={{ zIndex: 10 }}>
                    {filteredData.map((location) => {
                      const coords = projectToMapCoordinates(
                        location.latitude, 
                        location.longitude, 
                        800, 
                        500
                      );
                      const markerSize = getMarkerSize(location.eventCount);
                      
                      return (
                        <g key={location.id}>
                          <circle
                            cx={coords.x}
                            cy={coords.y}
                            r={markerSize}
                            fill={THREAT_COLORS[location.threatLevel]}
                            stroke="#ffffff"
                            strokeWidth="2"
                            opacity={0.8}
                            className="cursor-pointer hover:opacity-100 transition-opacity"
                            onClick={() => setSelectedLocation(location)}
                          />
                          {/* Pulsing animation for critical threats */}
                          {location.threatLevel === 'critical' && (
                            <circle
                              cx={coords.x}
                              cy={coords.y}
                              r={markerSize + 5}
                              fill="none"
                              stroke={THREAT_COLORS[location.threatLevel]}
                              strokeWidth="2"
                              opacity={0.6}
                              className="animate-ping"
                            />
                          )}
                        </g>
                      );
                    })}
                  </svg>
                </div>
              </div>

              {/* Location Details Panel */}
              <div className="lg:col-span-1">
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">
                      {selectedLocation ? 'Threat Details' : 'Select a Location'}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    {selectedLocation ? (
                      <div className="space-y-3">
                        <div>
                          <div className="text-sm text-gray-400">IP Address</div>
                          <div className="font-mono text-sm">{selectedLocation.ip}</div>
                        </div>
                        
                        <div>
                          <div className="text-sm text-gray-400">Location</div>
                          <div className="text-sm">{selectedLocation.city}, {selectedLocation.country}</div>
                        </div>
                        
                        <div>
                          <div className="text-sm text-gray-400">Threat Level</div>
                          <Badge 
                            variant="outline"
                            style={{ borderColor: THREAT_COLORS[selectedLocation.threatLevel] }}
                            className="capitalize"
                          >
                            <div 
                              className="w-2 h-2 rounded-full mr-2"
                              style={{ backgroundColor: THREAT_COLORS[selectedLocation.threatLevel] }}
                            />
                            {selectedLocation.threatLevel}
                          </Badge>
                        </div>
                        
                        <div>
                          <div className="text-sm text-gray-400">Threat Type</div>
                          <div className="text-sm">{selectedLocation.threatType}</div>
                        </div>
                        
                        <div>
                          <div className="text-sm text-gray-400">Event Count</div>
                          <div className="text-lg font-bold text-blue-400">{selectedLocation.eventCount.toLocaleString()}</div>
                        </div>
                        
                        <div>
                          <div className="text-sm text-gray-400">Last Seen</div>
                          <div className="text-sm">{new Date(selectedLocation.lastSeen).toLocaleString()}</div>
                        </div>
                        
                        <div>
                          <div className="text-sm text-gray-400 mb-2">Additional Info</div>
                          <div className="space-y-1">
                            <div className="text-xs">
                              <span className="text-gray-400">ASN:</span>{' '}
                              <span className="text-gray-200">{selectedLocation.metadata.asn}</span>
                            </div>
                            <div className="text-xs">
                              <span className="text-gray-400">ISP:</span>{' '}
                              <span className="text-gray-200">{selectedLocation.metadata.isp}</span>
                            </div>
                            <div className="text-xs">
                              <span className="text-gray-400">Protocol:</span>{' '}
                              <span className="text-gray-200">{selectedLocation.metadata.protocols}</span>
                            </div>
                            <div className="text-xs">
                              <span className="text-gray-400">Port:</span>{' '}
                              <span className="text-gray-200">{selectedLocation.metadata.ports}</span>
                            </div>
                          </div>
                        </div>
                        
                        <Button className="w-full mt-4" size="sm">
                          <AlertTriangle className="w-4 h-4 mr-2" />
                          Block IP
                        </Button>
                      </div>
                    ) : (
                      <div className="text-center text-gray-400 py-8">
                        <MapPin className="w-12 h-12 mx-auto mb-2 opacity-50" />
                        <p>Click on a marker to view threat details</p>
                      </div>
                    )}
                  </CardContent>
                </Card>

                {/* Legend */}
                <Card className="mt-4">
                  <CardHeader>
                    <CardTitle className="text-lg">Legend</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <div>
                      <div className="text-sm text-gray-400 mb-2">Threat Levels</div>
                      {Object.entries(THREAT_COLORS).map(([level, color]) => (
                        <div key={level} className="flex items-center gap-2 mb-1">
                          <div 
                            className="w-3 h-3 rounded-full"
                            style={{ backgroundColor: color }}
                          />
                          <span className="text-xs text-gray-300 capitalize">{level}</span>
                        </div>
                      ))}
                    </div>
                    
                    <div>
                      <div className="text-sm text-gray-400 mb-2">Marker Size</div>
                      <div className="text-xs text-gray-300">
                        Proportional to event count
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
}