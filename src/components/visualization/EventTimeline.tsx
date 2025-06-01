'use client';

import React from 'react';
import { ScatterChart, Scatter, XAxis, YAxis, ZAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, Cell } from 'recharts';

interface TimelineEvent {
  timestamp: number; // Unix timestamp for easier sorting/plotting on a numerical axis
  displayTime: string; // For tooltip
  severity: 'High' | 'Medium' | 'Low';
  eventId: string;
  description: string;
  size: number; // To make scatter points visible
}

const mockTimelineData: TimelineEvent[] = [
  { timestamp: new Date('2023-10-27T08:00:00Z').getTime(), displayTime: '2023-10-27 08:00:00', eventId: '4625', description: 'Failed logon (User: admin)', severity: 'Medium', size: 100 },
  { timestamp: new Date('2023-10-27T08:15:00Z').getTime(), displayTime: '2023-10-27 08:15:00', eventId: '4625', description: 'Failed logon (User: guest)', severity: 'Medium', size: 100 },
  { timestamp: new Date('2023-10-27T09:30:00Z').getTime(), displayTime: '2023-10-27 09:30:00', eventId: '1102', description: 'Audit log cleared by Administrator', severity: 'High', size: 100 },
  { timestamp: new Date('2023-10-27T10:00:00Z').getTime(), displayTime: '2023-10-27 10:00:00', eventId: '4624', description: 'Successful logon (User: j.doe)', severity: 'Low', size: 100 },
  { timestamp: new Date('2023-10-27T10:15:00Z').getTime(), displayTime: '2023-10-27 10:15:00', eventId: '4688', description: 'New process created: evil.exe', severity: 'High', size: 100 },
  { timestamp: new Date('2023-10-27T10:45:00Z').getTime(), displayTime: '2023-10-27 10:45:00', eventId: '4720', description: 'User account created: backdoor_user', severity: 'Medium', size: 100 },
  { timestamp: new Date('2023-10-27T11:30:00Z').getTime(), displayTime: '2023-10-27 11:30:00', eventId: '4624', description: 'Successful logon (User: svc_account)', severity: 'Low', size: 100 },
];

const severityColors: Record<TimelineEvent['severity'], string> = {
  High: '#ef4444', // red-500
  Medium: '#f59e0b', // amber-500
  Low: '#22c55e', // green-500
};

// Custom Tooltip
const CustomTooltip = ({ active, payload }: any) => {
  if (active && payload && payload.length) {
    const data = payload[0].payload as TimelineEvent;
    return (
      <div className="bg-gray-700 text-white p-3 rounded-md shadow-lg border border-gray-600">
        <p className="text-sm font-semibold">{`Event ID: ${data.eventId}`}</p>
        <p className="text-xs">{`Time: ${data.displayTime}`}</p>
        <p className="text-xs">{`Severity: ${data.severity}`}</p>
        <p className="text-xs mt-1">{`Description: ${data.description}`}</p>
      </div>
    );
  }
  return null;
};


const EventTimeline: React.FC = () => {
  // For a simple timeline, Y-axis can be static or represent categories if needed.
  // Here, we'll use a static Y value to just place them along the time axis.
  const dataWithY = mockTimelineData.map(event => ({ ...event, y: 1 }));

  return (
    <div className="bg-gray-800 p-4 md:p-6 rounded-lg shadow-xl text-gray-100">
      <h2 className="text-xl font-semibold mb-4">Event Timeline</h2>
      <ResponsiveContainer width="100%" height={300}>
        <ScatterChart
          margin={{
            top: 20,
            right: 30,
            bottom: 20,
            left: 20,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" stroke="#4b5563" />
          <XAxis 
            dataKey="timestamp" 
            type="number" 
            domain={['dataMin', 'dataMax']}
            tickFormatter={(unixTime) => new Date(unixTime).toLocaleTimeString()}
            stroke="#9ca3af"
            name="Time"
          />
          <YAxis 
            dataKey="y" 
            type="number" 
            hide // Hide Y-axis as it's just for positioning
          />
          <ZAxis dataKey="size" range={[60, 400]} name="size" unit="" />
          <Tooltip content={<CustomTooltip />} cursor={{ strokeDasharray: '3 3', fill: 'rgba(107, 114, 128, 0.1)' }} />
          <Legend />
          <Scatter name="Events" data={dataWithY} fill="#8884d8">
            {dataWithY.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={severityColors[entry.severity]} />
            ))}
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
};

export default EventTimeline;
