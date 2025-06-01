"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { BarChart3 } from "lucide-react"

export function SecurityMetricsChart() {
  // Mock data for the chart
  const data = [
    { time: "00:00", threats: 12, events: 1200 },
    { time: "04:00", threats: 8, events: 980 },
    { time: "08:00", threats: 25, events: 1800 },
    { time: "12:00", threats: 18, events: 2100 },
    { time: "16:00", threats: 32, events: 2400 },
    { time: "20:00", threats: 15, events: 1600 },
  ]

  const maxThreats = Math.max(...data.map((d) => d.threats))
  const maxEvents = Math.max(...data.map((d) => d.events))

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5" />
          Security Events Timeline
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex justify-between text-sm text-gray-600">
            <span>Last 24 Hours</span>
            <div className="flex gap-4">
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-red-500 rounded" />
                <span>Threats</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-3 h-3 bg-blue-500 rounded" />
                <span>Events</span>
              </div>
            </div>
          </div>

          <div className="h-64 flex items-end justify-between gap-2">
            {data.map((item, index) => (
              <div key={index} className="flex-1 flex flex-col items-center gap-2">
                <div className="w-full flex flex-col gap-1">
                  <div className="bg-red-500 rounded-t" style={{ height: `${(item.threats / maxThreats) * 100}px` }} />
                  <div className="bg-blue-500 rounded-b" style={{ height: `${(item.events / maxEvents) * 80}px` }} />
                </div>
                <span className="text-xs text-gray-600">{item.time}</span>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
