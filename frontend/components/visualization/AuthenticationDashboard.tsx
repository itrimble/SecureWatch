'use client';

// src/components/visualization/AuthenticationDashboard.tsx
import React, { useEffect, useState, Suspense } from 'react';
import {
  BarChart,
  Bar,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import ReactECharts from 'echarts-for-react';
import { ResponsiveHeatMap } from '@nivo/heatmap';
// import 'echarts/lib/chart/map'; // Commented out - map module not available in current echarts version
// import 'echarts/map/js/world'; // Commented out - map module not available in current echarts version

// Define an interface for the expected API response structure
interface GeoDataItem {
  name: string;
  value: [number, number]; // [successful, failed]
}

interface HeatmapDataItem {
  id: string; // Day of the week e.g., "Mon"
  data: Array<{ x: string; y: number }>; // x: hour e.g., "00:00", y: count
}

interface AuthData {
  totalLogins: { successful: number; failed: number };
  orphanedAccountCount: number;
  // authAttemptsOverTime: Array<{ time: string; windows: number; linux: number; macos: number }>; // Replaced by KQL
  successVsFailureRates: Array<{
    application: string;
    successful: number;
    failed: number;
  }>;
  loginAttemptsByCountry: Array<{ country: string; attempts: number }>;
  peakAuthTimes: number[][];
  loginAttemptsGeo: GeoDataItem[];
  peakAuthTimesHeatmap: HeatmapDataItem[];
}

interface TopFailedLoginUser {
  user_id?: string;
  attempts: number;
}

// Interface for KQL result for auth attempts over time
interface AuthAttemptOverTimeKql {
  timestamp_hour: string; // ISO string from date_trunc
  event_source_name: string; // e.g., "Windows Security", "Linux-Auth"
  count_: number; // Alias from KQL: count_ = count()
}

// Interface for data structure transformed for Recharts LineChart
interface AuthAttemptOverTimeChartData {
  timestamp_hour: string; // Will be formatted for display
  [key: string]: any; // For dynamic event_source_name like Windows, Linux, macOS
}

const AuthenticationDashboard: React.FC = () => {
  const [data, setData] = useState<AuthData | null>(null); // For existing non-KQL parts
  const [loadingMain, setLoadingMain] = useState(true);
  const [errorMain, setErrorMain] = useState<string | null>(null);

  const [topFailedLoginUsers, setTopFailedLoginUsers] = useState<
    TopFailedLoginUser[]
  >([]);
  const [topFailedLoginUsersLoading, setTopFailedLoginUsersLoading] =
    useState(true);
  const [topFailedLoginUsersError, setTopFailedLoginUsersError] = useState<
    string | null
  >(null);

  const [authAttemptsChartData, setAuthAttemptsChartData] = useState<
    AuthAttemptOverTimeChartData[]
  >([]);
  const [authAttemptsChartLoading, setAuthAttemptsChartLoading] =
    useState(true);
  const [authAttemptsChartError, setAuthAttemptsChartError] = useState<
    string | null
  >(null);
  const [authChartSeriesKeys, setAuthChartSeriesKeys] = useState<string[]>([]);

  useEffect(() => {
    // Fetch main authentication dashboard data (excluding parts now fed by KQL)
    setLoadingMain(true);
    fetch('/api/dashboards/authentication')
      .then((res) => {
        if (!res.ok) {
          throw new Error(
            `Failed to fetch main authentication data: ${res.status} ${res.statusText}`
          );
        }
        return res.json();
      })
      .then((fetchedData) => {
        // Remove authAttemptsOverTime if it was part of the original fetch, as it's now KQL driven
        const { authAttemptsOverTime, ...restData } = fetchedData as any;
        setData(restData as AuthData);
      })
      .catch((err) => {
        setErrorMain(err.message);
        console.error('Failed to fetch main authentication data:', err);
      })
      .finally(() => setLoadingMain(false));

    // Fetch top 10 users with failed logins via KQL query
    setTopFailedLoginUsersLoading(true);
    fetch('/api/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query:
          'events | where event_type_id == "4625" | summarize attempts = count() by user_id | sort by attempts desc | take 10',
      }),
    })
      .then((res) => {
        if (!res.ok) {
          return res
            .json()
            .then((errBody) => {
              throw new Error(
                `KQL query for top failed logins failed: ${res.statusText} - ${errBody.error || errBody.details || 'Unknown error'}`
              );
            })
            .catch(() => {
              throw new Error(
                `KQL query for top failed logins failed: ${res.statusText}`
              );
            });
        }
        return res.json();
      })
      .then((queryResult) => {
        if (queryResult.error)
          throw new Error(queryResult.error.details || queryResult.error);
        setTopFailedLoginUsers(queryResult.data || []);
      })
      .catch((err) => {
        console.error('Failed to fetch top failed logins:', err);
        setTopFailedLoginUsersError(err.message);
      })
      .finally(() => setTopFailedLoginUsersLoading(false));

    // Fetch Authentication Attempts Over Time via KQL
    setAuthAttemptsChartLoading(true);
    fetch('/api/query', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        query:
          "events | summarize count_ = count() by timestamp_hour = date_trunc('hour', timestamp), event_source_name | sort by timestamp_hour asc",
      }),
    })
      .then((res) => {
        if (!res.ok) {
          return res
            .json()
            .then((errBody) => {
              throw new Error(
                `KQL for auth attempts failed: ${res.statusText} - ${errBody.error || errBody.details || 'Unknown error'}`
              );
            })
            .catch(() => {
              throw new Error(
                `KQL for auth attempts failed: ${res.statusText}`
              );
            });
        }
        return res.json();
      })
      .then((queryResult) => {
        if (queryResult.error)
          throw new Error(queryResult.error.details || queryResult.error);

        const rawData: AuthAttemptOverTimeKql[] = queryResult.data || [];

        // Transform data for Recharts LineChart
        const transformedData: { [key: string]: AuthAttemptOverTimeChartData } =
          {};
        const seriesKeys = new Set<string>();

        rawData.forEach((item) => {
          const formattedTime = item.timestamp_hour
            ? new Date(item.timestamp_hour).toLocaleString([], {
                year: 'numeric',
                month: 'short',
                day: 'numeric',
                hour: '2-digit',
                minute: '2-digit',
              })
            : 'Invalid Date';
          if (!transformedData[formattedTime]) {
            transformedData[formattedTime] = { timestamp_hour: formattedTime };
          }
          // Assuming event_source_name contains values like "Windows", "Linux", "macOS"
          // If it's more generic like "Windows Security", map it.
          let seriesName = item.event_source_name;
          if (
            seriesName === 'Windows Security' ||
            seriesName === 'Microsoft-Windows-Security-Auditing'
          )
            seriesName = 'Windows';
          // Add more mappings if necessary: e.g., "Linux-Syslog" -> "Linux"

          transformedData[formattedTime][seriesName] = item.count_;
          seriesKeys.add(seriesName);
        });

        setAuthAttemptsChartData(Object.values(transformedData));
        setAuthChartSeriesKeys(Array.from(seriesKeys).sort()); // Sort for consistent line colors
      })
      .catch((err) => {
        console.error('Failed to fetch auth attempts over time:', err);
        setAuthAttemptsChartError(err.message);
      })
      .finally(() => setAuthAttemptsChartLoading(false));
  }, []);

  // Combined loading state for initial page load feel
  const pageLoading =
    loadingMain || topFailedLoginUsersLoading || authAttemptsChartLoading;

  if (pageLoading && !data)
    return (
      <div className="text-center p-8 text-gray-100">
        Loading authentication data...
      </div>
    );
  // Display general error if main data fetch failed, otherwise individual widgets will show their errors.
  if (errorMain && !data)
    return (
      <div className="text-center p-8 text-red-500">
        Error loading critical dashboard data: {errorMain}
      </div>
    );

  // Define line colors for consistency
  const lineColors: { [key: string]: string } = {
    Windows: '#3b82f6', // blue
    Linux: '#22c55e', // green
    macOS: '#f59e0b', // amber
    Other: '#6b7280', // gray
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 p-4 md:p-6">
      {/* Top Row: Metric Cards */}
      {data ? (
        <>
          <div className="lg:col-span-1 bg-gray-800 p-4 md:p-6 rounded-lg shadow-xl">
            <h3 className="text-lg font-semibold text-gray-100 mb-2">
              Total Logins
            </h3>
            <p className="text-3xl font-bold text-blue-400">
              {data.totalLogins?.successful?.toLocaleString() ?? '0'}
            </p>
            <p className="text-sm text-gray-400 mb-2">Successful</p>
            <p className="text-3xl font-bold text-red-400">
              {data.totalLogins?.failed?.toLocaleString() ?? '0'}
            </p>
            <p className="text-sm text-gray-400">Failed</p>
          </div>

          <div className="lg:col-span-1 bg-gray-800 p-4 md:p-6 rounded-lg shadow-xl">
            <h3 className="text-lg font-semibold text-gray-100 mb-2">
              Orphaned Accounts
            </h3>
            <p className="text-4xl font-bold text-yellow-400">
              {data.orphanedAccountCount}
            </p>
          </div>
        </>
      ) : (
        !loadingMain && (
          <div className="lg:col-span-2 text-gray-400 p-4">
            Main metrics data unavailable. {errorMain}
          </div>
        )
      )}

      <div className="lg:col-span-1 bg-gray-800 p-4 md:p-6 rounded-lg shadow-xl">
        <h3 className="text-lg font-semibold text-gray-100 mb-2">
          MFA Adoption (Placeholder)
        </h3>
        <p className="text-4xl font-bold text-gray-500">N/A</p>
        <p className="text-sm text-gray-400">Data to be integrated</p>
      </div>

      {/* Geo Map - taking full width of its own row */}
      <div className="lg:col-span-3 bg-gray-800 p-4 md:p-6 rounded-lg shadow-xl h-96 md:h-[500px]">
        <h3 className="text-lg font-semibold text-gray-100 mb-4">
          Login Attempts Geo Distribution
        </h3>
        {loadingMain && (
          <p className="text-gray-300 text-center pt-10">
            Loading Geo Map data...
          </p>
        )}
        {!loadingMain &&
        data &&
        data.loginAttemptsGeo &&
        data.loginAttemptsGeo.length > 0 ? (
          <ReactECharts
            option={{
              tooltip: {
                /* ... existing tooltip ... */ trigger: 'item',
                formatter: (params: any) => {
                  if (
                    params.data &&
                    typeof params.data.originalSuccessful === 'number' &&
                    typeof params.data.originalFailed === 'number'
                  ) {
                    return `${params.name}<br/>Successful: ${params.data.originalSuccessful.toLocaleString()}<br/>Failed: ${params.data.originalFailed.toLocaleString()}<br/>Total: ${params.value != null ? params.value.toLocaleString() : 'N/A'}`;
                  }
                  return `${params.name}: ${params.value != null ? params.value.toLocaleString() : 'N/A'} (Total Attempts)`;
                },
              },
              visualMap: {
                /* ... existing visualMap ... */ min: 0,
                max:
                  data.loginAttemptsGeo.length > 0
                    ? data.loginAttemptsGeo.reduce(
                        (maxVal, item) =>
                          Math.max(maxVal, item.value[0] + item.value[1]),
                        0
                      )
                    : 0,
                left: 'left',
                top: 'bottom',
                text: ['High', 'Low'],
                calculable: true,
                inRange: { color: ['#50A3BA', '#E08A7F', '#D94E5D'] },
                textStyle: { color: '#fff' },
              },
              series: [
                /* ... existing series ... */
                {
                  name: 'Login Attempts',
                  type: 'map',
                  map: 'world',
                  roam: true,
                  emphasis: {
                    label: { show: true, color: '#fff' },
                    itemStyle: { areaColor: '#A9D0F5' },
                  },
                  itemStyle: { areaColor: '#323c48', borderColor: '#111' },
                  data: data.loginAttemptsGeo.map((item) => ({
                    name: item.name,
                    value: item.value[0] + item.value[1],
                    originalSuccessful: item.value[0],
                    originalFailed: item.value[1],
                  })),
                },
              ],
              backgroundColor: 'transparent',
            }}
            style={{ height: '100%', width: '100%' }}
            notMerge={true}
            lazyUpdate={true}
          />
        ) : (
          !loadingMain && (
            <p className="text-gray-400 text-center pt-10">
              No geo-map data available. {errorMain && `Error: ${errorMain}`}
            </p>
          )
        )}
      </div>

      {/* Middle Row: Charts (Line and Bar) */}
      <div className="lg:col-span-2 bg-gray-800 p-4 md:p-6 rounded-lg shadow-xl h-96">
        <h3 className="text-lg font-semibold text-gray-100 mb-4">
          Authentication Attempts Over Time
        </h3>
        {authAttemptsChartLoading && (
          <p className="text-gray-300 text-center pt-10">
            Loading chart data...
          </p>
        )}
        {authAttemptsChartError && (
          <p className="text-red-500 text-center pt-10">
            Error: {authAttemptsChartError}
          </p>
        )}
        {!authAttemptsChartLoading &&
        !authAttemptsChartError &&
        authAttemptsChartData.length > 0 ? (
          <ResponsiveContainer width="100%" height="85%">
            <LineChart data={authAttemptsChartData}>
              <CartesianGrid strokeDasharray="3 3" stroke="#4b5563" />
              <XAxis
                dataKey="timestamp_hour"
                stroke="#9ca3af"
                tickFormatter={(timeStr) =>
                  new Date(timeStr).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit',
                  })
                }
              />
              <YAxis stroke="#9ca3af" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1f2937',
                  border: '1px solid #4b5563',
                  borderRadius: '0.5rem',
                }}
                labelStyle={{ color: '#e5e7eb', fontWeight: 'bold' }}
                itemStyle={{ color: '#d1d5db' }}
              />
              <Legend wrapperStyle={{ color: '#e5e7eb' }} />
              {authChartSeriesKeys.map((key) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={lineColors[key] || lineColors['Other']}
                  name={key}
                  dot={false}
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        ) : (
          !authAttemptsChartLoading && (
            <p className="text-gray-400 text-center pt-10">
              No authentication attempt data available.
            </p>
          )
        )}
      </div>

      {data ? (
        <div className="lg:col-span-1 bg-gray-800 p-4 md:p-6 rounded-lg shadow-xl h-96">
          <h3 className="text-lg font-semibold text-gray-100 mb-4">
            Success vs. Failure by Application
          </h3>
          <ResponsiveContainer width="100%" height="85%">
            <BarChart data={data.successVsFailureRates}>
              <CartesianGrid strokeDasharray="3 3" stroke="#4b5563" />
              <XAxis dataKey="application" stroke="#9ca3af" />
              <YAxis stroke="#9ca3af" />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#1f2937',
                  border: '1px solid #4b5563',
                  borderRadius: '0.5rem',
                }}
                labelStyle={{ color: '#e5e7eb', fontWeight: 'bold' }}
                itemStyle={{ color: '#d1d5db' }}
              />
              <Legend wrapperStyle={{ color: '#e5e7eb' }} />
              <Bar
                dataKey="successful"
                stackId="a"
                fill="#22c55e"
                name="Successful"
              />
              <Bar dataKey="failed" stackId="a" fill="#ef4444" name="Failed" />
            </BarChart>
          </ResponsiveContainer>
        </div>
      ) : (
        !loadingMain && (
          <div className="lg:col-span-1 text-gray-400 p-4">
            Success/Failure by Application data unavailable. {errorMain}
          </div>
        )
      )}

      {/* Heatmap - Spanning full width */}
      <div className="lg:col-span-3 bg-gray-800 p-4 md:p-6 rounded-lg shadow-xl h-96 md:h-[500px]">
        <h3 className="text-lg font-semibold text-gray-100 mb-4">
          Peak Authentication Times (Hour of Day vs. Day of Week)
        </h3>
        {loadingMain && (
          <p className="text-gray-300 text-center pt-10">
            Loading Heatmap data...
          </p>
        )}
        {!loadingMain &&
        data &&
        data.peakAuthTimesHeatmap &&
        data.peakAuthTimesHeatmap.length > 0 ? (
          <ResponsiveHeatMap
            data={data.peakAuthTimesHeatmap}
            indexBy="id"
            keys={
              data.peakAuthTimesHeatmap[0] && data.peakAuthTimesHeatmap[0].data
                ? data.peakAuthTimesHeatmap[0].data.map((d) => d.x)
                : []
            }
            margin={{ top: 70, right: 90, bottom: 60, left: 90 }}
            axisTop={
              {
                /* ... */
              }
            }
            axisLeft={
              {
                /* ... */
              }
            }
            colors={{ type: 'sequential', scheme: 'inferno' }}
            cellOpacity={0.9}
            cellBorderWidth={1}
            cellBorderColor={{ from: 'color', modifiers: [['darker', 0.5]] }}
            labelTextColor={{ from: 'color', modifiers: [['brighter', 3]] }}
            enableGridX={false}
            enableGridY={true}
            hoverTarget="cell"
            legends={[
              {
                /* ... */
              },
            ]}
            tooltip={({ cell }) => (
              <div className="p-2 bg-gray-900 text-white rounded shadow-lg border border-gray-700">
                <strong>{cell.serieId}</strong> at{' '}
                <strong>{cell.label || cell.xKey}</strong>
                <br />
                Attempts:{' '}
                {typeof cell.value === 'number'
                  ? cell.value.toLocaleString()
                  : 'N/A'}
              </div>
            )}
            theme={
              {
                /* ... */
              }
            }
          />
        ) : (
          !loadingMain && (
            <p className="text-gray-400 text-center pt-10">
              No peak time heatmap data available.{' '}
              {errorMain && `Error: ${errorMain}`}
            </p>
          )
        )}
      </div>

      {/* Bottom Row: Table for Top 10 Failed Login Users & Placeholders */}
      <div className="lg:col-span-3 bg-gray-800 p-4 md:p-6 rounded-lg shadow-xl">
        <h3 className="text-lg font-semibold text-gray-100 mb-4">
          Top 10 Users with Failed Logins
        </h3>
        {topFailedLoginUsersLoading && (
          <p className="text-gray-300">Loading top failed login users...</p>
        )}
        {topFailedLoginUsersError && (
          <p className="text-red-500">
            Error loading users: {topFailedLoginUsersError}
          </p>
        )}
        {!topFailedLoginUsersLoading && !topFailedLoginUsersError && (
          <div className="overflow-x-auto">
            {topFailedLoginUsers.length > 0 ? (
              <table className="w-full text-sm text-left text-gray-400">
                <thead className="text-xs text-gray-100 uppercase bg-gray-700">
                  <tr>
                    <th scope="col" className="py-3 px-6">
                      User ID
                    </th>
                    <th scope="col" className="py-3 px-6 text-right">
                      Attempts
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {topFailedLoginUsers.map((user, index) => (
                    <tr
                      key={index}
                      className="bg-gray-800 border-b border-gray-700 hover:bg-gray-600"
                    >
                      <td className="py-4 px-6 font-medium text-gray-200 whitespace-nowrap">
                        {user.user_id || 'N/A'}
                      </td>
                      <td className="py-4 px-6 text-right">
                        {user.attempts?.toLocaleString() ?? '0'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            ) : (
              <p className="text-gray-400">
                No data on users with high failed login attempts.
              </p>
            )}
          </div>
        )}
      </div>

      <div className="lg:col-span-3 bg-gray-800 p-4 md:p-6 rounded-lg shadow-xl">
        <h3 className="text-lg font-semibold text-gray-100 mb-2">
          Privileged Access & RBAC (Placeholder)
        </h3>
        <p className="text-gray-400">
          Detailed privileged access alerts and RBAC status will be shown here.
        </p>
      </div>
    </div>
  );
};

export default AuthenticationDashboard;
