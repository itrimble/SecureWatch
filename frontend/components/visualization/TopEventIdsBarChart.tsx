"use client"; // Required for Recharts components

import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';

const data = [
  { eventId: '4624', count: 1200 },
  { eventId: '4625', count: 300 },
  { eventId: '4688', count: 800 },
  { eventId: '1102', count: 50 },
  { eventId: '4720', count: 150 },
];

const TopEventIdsBarChart: React.FC = () => {
  return (
    <div className="bg-gray-700 p-6 rounded-lg shadow-lg text-gray-100">
      <h3 className="text-xl font-semibold mb-4 text-center">Top 5 Event IDs</h3>
      <ResponsiveContainer width="100%" height={300}>
        <BarChart
          data={data}
          margin={{
            top: 5,
            right: 30,
            left: 20,
            bottom: 5,
          }}
        >
          <CartesianGrid strokeDasharray="3 3" strokeOpacity={0.2} />
          <XAxis dataKey="eventId" tick={{ fill: '#cbd5e0' }} />
          <YAxis tick={{ fill: '#cbd5e0' }} />
          <Tooltip
            contentStyle={{ backgroundColor: '#374151', border: 'none', borderRadius: '0.375rem' }} 
            labelStyle={{ color: '#e5e7eb' }}
            itemStyle={{ color: '#86efac' }} // Using a green color for bar items in tooltip
          />
          <Legend wrapperStyle={{ color: '#e5e7eb' }} />
          <Bar dataKey="count" fill="#3b82f6" name="Event Count" /> 
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
};

export default TopEventIdsBarChart;
