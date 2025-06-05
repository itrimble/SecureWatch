"use client"; // Required for Recharts components

import React, { memo } from 'react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const data = [
  { time: '10:00', critical: 5, warning: 10, information: 50 },
  { time: '10:05', critical: 2, warning: 15, information: 60 },
  { time: '10:10', critical: 8, warning: 5, information: 40 },
  { time: '10:15', critical: 3, warning: 12, information: 70 },
  { time: '10:20', critical: 1, warning: 8, information: 55 },
];

const EventsOverTimeChart: React.FC = () => {
  return (
    <div className="bg-gray-700 p-6 rounded-lg shadow-lg text-gray-100">
      <h3 className="text-xl font-semibold mb-4 text-center">Events Over Time (by Severity)</h3>
      <ResponsiveContainer width="100%" height={300}>
        <LineChart
          data={data}
          margin={{
            top: 5,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
          <XAxis dataKey="time" tick={{ fill: '#cbd5e0' }} />
          <YAxis tick={{ fill: '#cbd5e0' }} />
          <Tooltip 
            contentStyle={{ backgroundColor: '#374151', border: 'none', borderRadius: '0.375rem' }}
            labelStyle={{ color: '#e5e7eb' }}
          />
          <Legend wrapperStyle={{ color: '#e5e7eb' }} />
          <Line type="monotone" dataKey="critical" stroke="#ef4444" name="Critical" strokeWidth={2} />
          <Line type="monotone" dataKey="warning" stroke="#f59e0b" name="Warning" strokeWidth={2} />
          <Line type="monotone" dataKey="information" stroke="#3b82f6" name="Information" strokeWidth={2} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
};

export default memo(EventsOverTimeChart);
