'use client';

import React, { useState } from 'react';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Sector,
} from 'recharts';

// Mock Data
const eventFrequencyData = [
  { name: '4624 (Logon)', count: 120 },
  { name: '4625 (Failed Logon)', count: 30 },
  { name: '1102 (Log Cleared)', count: 5 },
  { name: '4688 (Process Create)', count: 80 },
  { name: '4720 (User Create)', count: 15 },
  { name: '5156 (Firewall Allow)', count: 250 },
];

const eventsBySeverityData = [
  { name: 'High', value: 20 }, // (1102, 4688, 4720 count from above)
  { name: 'Medium', value: 30 }, // (4625)
  { name: 'Low', value: 370 }, // (4624, 5156)
];

const SEVERITY_COLORS = {
  High: '#ef4444', // red-500
  Medium: '#f59e0b', // amber-500
  Low: '#22c55e', // green-500
};

// Active Shape for Pie Chart
const renderActiveShape = (props: any) => {
  const RADIAN = Math.PI / 180;
  const {
    cx,
    cy,
    midAngle,
    innerRadius,
    outerRadius,
    startAngle,
    endAngle,
    fill,
    payload,
    percent,
    value,
  } = props;
  const sin = Math.sin(-RADIAN * midAngle);
  const cos = Math.cos(-RADIAN * midAngle);
  const sx = cx + (outerRadius + 10) * cos;
  const sy = cy + (outerRadius + 10) * sin;
  const mx = cx + (outerRadius + 30) * cos;
  const my = cy + (outerRadius + 30) * sin;
  const ex = mx + (cos >= 0 ? 1 : -1) * 22;
  const ey = my;
  const textAnchor = cos >= 0 ? 'start' : 'end';

  return (
    <g>
      <text
        x={cx}
        y={cy}
        dy={8}
        textAnchor="middle"
        fill={fill}
        className="font-semibold text-lg"
      >
        {payload.name}
      </text>
      <Sector
        cx={cx}
        cy={cy}
        innerRadius={innerRadius}
        outerRadius={outerRadius}
        startAngle={startAngle}
        endAngle={endAngle}
        fill={fill}
      />
      <Sector
        cx={cx}
        cy={cy}
        startAngle={startAngle}
        endAngle={endAngle}
        innerRadius={outerRadius + 6}
        outerRadius={outerRadius + 10}
        fill={fill}
      />
      <path
        d={`M${sx},${sy}L${mx},${my}L${ex},${ey}`}
        stroke={fill}
        fill="none"
      />
      <circle cx={ex} cy={ey} r={2} fill={fill} stroke="none" />
      <text
        x={ex + (cos >= 0 ? 1 : -1) * 12}
        y={ey}
        textAnchor={textAnchor}
        fill="#ccc"
        className="text-sm"
      >{`Count: ${value}`}</text>
      <text
        x={ex + (cos >= 0 ? 1 : -1) * 12}
        y={ey}
        dy={18}
        textAnchor={textAnchor}
        fill="#999"
        className="text-xs"
      >
        {`(Rate: ${(percent * 100).toFixed(2)}%)`}
      </text>
    </g>
  );
};

const BasicDashboards: React.FC = () => {
  const [activeIndex, setActiveIndex] = useState(0);

  const onPieEnter = (_: any, index: number) => {
    setActiveIndex(index);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Event Frequency by ID - Bar Chart */}
      <div className="bg-gray-800 p-4 md:p-6 rounded-lg shadow-xl">
        <h3 className="text-lg font-semibold text-gray-100 mb-4">
          Event Frequency by ID
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <BarChart
            data={eventFrequencyData}
            margin={{ top: 5, right: 0, left: 0, bottom: 5 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#4b5563" />
            <XAxis
              dataKey="name"
              stroke="#9ca3af"
              tick={{ fontSize: 12 }}
              interval={0}
              angle={-30}
              textAnchor="end"
            />
            <YAxis stroke="#9ca3af" />
            <Tooltip
              contentStyle={{
                backgroundColor: '#374151',
                border: '1px solid #4b5563',
                borderRadius: '0.375rem',
              }}
              labelStyle={{ color: '#e5e7eb', fontWeight: 'bold' }}
              itemStyle={{ color: '#d1d5db' }}
            />
            <Legend wrapperStyle={{ color: '#e5e7eb' }} />
            <Bar dataKey="count" fill="#3b82f6" name="Event Count" />
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Events by Severity - Pie Chart */}
      <div className="bg-gray-800 p-4 md:p-6 rounded-lg shadow-xl">
        <h3 className="text-lg font-semibold text-gray-100 mb-4">
          Events by Severity
        </h3>
        <ResponsiveContainer width="100%" height={300}>
          <PieChart>
            <Pie
              activeIndex={activeIndex}
              activeShape={renderActiveShape}
              data={eventsBySeverityData}
              cx="50%"
              cy="50%"
              innerRadius={60}
              outerRadius={80}
              fill="#8884d8"
              dataKey="value"
              onMouseEnter={onPieEnter}
              nameKey="name"
            >
              {eventsBySeverityData.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={
                    SEVERITY_COLORS[entry.name as keyof typeof SEVERITY_COLORS]
                  }
                />
              ))}
            </Pie>
            <Legend wrapperStyle={{ color: '#e5e7eb', paddingTop: '10px' }} />
          </PieChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

export default BasicDashboards;
