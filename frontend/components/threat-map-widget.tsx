"use client"

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Globe, MapPin } from "lucide-react"

export function ThreatMapWidget() {
  const threats = [
    { country: "Russia", attacks: 45, severity: "high" },
    { country: "China", attacks: 32, severity: "medium" },
    { country: "North Korea", attacks: 18, severity: "high" },
    { country: "Iran", attacks: 12, severity: "medium" },
    { country: "Unknown", attacks: 8, severity: "low" },
  ]

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case "high":
        return "bg-red-500"
      case "medium":
        return "bg-yellow-500"
      case "low":
        return "bg-green-500"
      default:
        return "bg-gray-500"
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Globe className="h-5 w-5" />
          Global Threat Map
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="bg-gray-100 rounded-lg p-4 h-32 flex items-center justify-center">
            <div className="text-center text-gray-500">
              <Globe className="h-8 w-8 mx-auto mb-2" />
              <p className="text-sm">Interactive World Map</p>
              <p className="text-xs">Threat Origins Visualization</p>
            </div>
          </div>

          <div className="space-y-2">
            <h4 className="font-semibold text-sm">Top Threat Sources</h4>
            {threats.map((threat, index) => (
              <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                <div className="flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-gray-600" />
                  <span className="text-sm font-medium">{threat.country}</span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-gray-600">{threat.attacks} attacks</span>
                  <Badge variant="secondary" className={`${getSeverityColor(threat.severity)} text-white`}>
                    {threat.severity}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
