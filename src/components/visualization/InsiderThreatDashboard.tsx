import React, { useEffect, useState } from 'react';
import { ResponsiveHeatMap } from '@nivo/heatmap';
import { ResponsiveChord } from '@nivo/chord';

interface HeatmapDataItem {
  id: string; // User or Department
  data: Array<{ x: string; y: number }>; // x: Date/TimePeriod, y: activityScore/EventCount
}

interface SessionEvent {
  id: string;
  user: string;
  system: string;
  action: string;
  timestamp: string;
  details?: string;
}

interface InsiderThreatData {
  userBehaviorHeatmap: HeatmapDataItem[];
  dataAccessChordKeys: string[];
  dataAccessChordMatrix: number[][];
  sessionEvents: SessionEvent[];
}

const InsiderThreatDashboard: React.FC = () => {
  const [data, setData] = useState<InsiderThreatData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/dashboards/insider_threat')
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
        console.error("Failed to fetch insider threat data:", err);
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="text-center p-8 text-gray-100">Loading Insider Threat data...</div>;
  if (error) return <div className="text-center p-8 text-red-500">Error: {error}</div>;
  if (!data) return <div className="text-center p-8 text-gray-100">No data available.</div>;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6 p-4 md:p-6">
      {/* User Behavior Heatmap */}
      <div className="lg:col-span-2 bg-gray-800 p-4 md:p-6 rounded-lg shadow-xl h-96 md:h-[500px]">
        <h3 className="text-lg font-semibold text-gray-100 mb-4">User Behavior Activity/Risk</h3>
        {data.userBehaviorHeatmap && data.userBehaviorHeatmap.length > 0 ? (
          <ResponsiveHeatMap
            data={data.userBehaviorHeatmap}
            indexBy="id" // User/Department
            keys={data.userBehaviorHeatmap[0]?.data.map(d => d.x) || []} // Dates or Time Periods
            margin={{ top: 60, right: 90, bottom: 60, left: 120 }}
            axisTop={{
              tickSize: 5,
              tickPadding: 5,
              tickRotation: -45,
              legend: 'Time Period / Date',
              legendPosition: 'middle',
              legendOffset: -50,
            }}
            axisLeft={{
              tickSize: 5,
              tickPadding: 5,
              tickRotation: 0,
              legend: 'User / Department',
              legendPosition: 'middle',
              legendOffset: -100,
            }}
            colors={{ type: 'sequential', scheme: 'oranges' }}
            cellOpacity={0.85}
            cellBorderColor={{ from: 'color', modifiers: [['darker', 0.4]] }}
            labelTextColor={{ from: 'color', modifiers: [['brighter', 2]] }}
            legends={[{ anchor: 'bottom', translateX: 0, translateY: 50, length: 300, thickness: 10, direction: 'row', title: 'Activity Score / Event Count' }]}
            tooltip={({ cell }) => (
              <div className="p-2 bg-gray-900 text-white rounded shadow-lg border border-gray-700">
                <strong>{cell.serieId}</strong> ({cell.label || cell.xKey})<br />
                Score: {cell.value}
              </div>
            )}
            theme={{
              axis: { ticks: { text: { fill: '#e5e7eb' } }, legend: { text: { fill: '#e5e7eb' } } },
              legends: { title: { text: { fill: '#e5e7eb' } }, ticks: { text: { fill: '#e5e7eb' } } },
            }}
          />
        ) : (
          <p className="text-gray-400 text-center pt-10">No user behavior heatmap data available.</p>
        )}
      </div>

      {/* Data Access Chord Diagram */}
      <div className="lg:col-span-2 bg-gray-800 p-4 md:p-6 rounded-lg shadow-xl h-96 md:h-[500px]">
        <h3 className="text-lg font-semibold text-gray-100 mb-4">Data Access Relationships</h3>
        {data.dataAccessChordMatrix && data.dataAccessChordKeys && data.dataAccessChordKeys.length > 0 ? (
          <ResponsiveChord
            matrix={data.dataAccessChordMatrix}
            keys={data.dataAccessChordKeys}
            margin={{ top: 40, right: 40, bottom: 40, left: 40 }}
            valueFormat=".2~f" // Format for the numbers in arcs/ribbons
            padAngle={0.02}
            innerRadiusRatio={0.96}
            innerRadiusOffset={0.02}
            arcOpacity={1}
            arcBorderWidth={1}
            arcBorderColor={{ from: 'color', modifiers: [['darker', 0.4]] }}
            ribbonOpacity={0.5}
            ribbonBorderWidth={1}
            ribbonBorderColor={{ from: 'color', modifiers: [['darker', 0.4]] }}
            enableLabel={true}
            label={d => d.id}
            labelOffset={12}
            labelRotation={-90}
            labelTextColor={{ from: 'color', modifiers: [['darker', 1]] }}
            colors={{ scheme: 'set2' }} // Qualitative color scheme
            motionConfig="wobbly"
            theme={{
                labels: { text: { fill: '#e5e7eb', fontSize: 10 } },
                tooltip: { container: { background: '#333', color: '#fff' } }
            }}
            legends={[
              {
                anchor: 'bottom',
                direction: 'row',
                justify: false,
                translateX: 0,
                translateY: 30,
                itemsSpacing: 0,
                itemWidth: 80,
                itemHeight: 14,
                itemTextColor: '#999',
                itemDirection: 'left-to-right',
                itemOpacity: 1,
                symbolSize: 12,
                symbolShape: 'circle',
                 effects: [{ on: 'hover', style: { itemTextColor: '#fff' } }]
              }
            ]}
          />
        ) : (
          <p className="text-gray-400 text-center pt-10">No data access chord data available.</p>
        )}
      </div>

      {/* Enhanced Session Timeline Viewer */}
      <div className="lg:col-span-2 bg-gray-800 p-4 md:p-6 rounded-lg shadow-xl">
        <h3 className="text-lg font-semibold text-gray-100 mb-4">Key Session Events</h3>
        <div className="overflow-y-auto max-h-96 space-y-3">
          {data.sessionEvents && data.sessionEvents.length > 0 ? (
            data.sessionEvents.map((event) => (
              <div key={event.id} className="p-3 bg-gray-700 rounded-md text-sm">
                <div className="flex justify-between items-center mb-1">
                  <span className="font-semibold text-blue-300">{event.user} @ {event.system}</span>
                  <span className="text-xs text-gray-400">{new Date(event.timestamp).toLocaleString()}</span>
                </div>
                <p className="text-gray-200">{event.action}</p>
                {event.details && <p className="text-xs text-gray-500 mt-1">Details: {event.details}</p>}
              </div>
            ))
          ) : (
            <p className="text-gray-400">No session event data available.</p>
          )}
        </div>
      </div>
    </div>
  );
};

export default InsiderThreatDashboard;
