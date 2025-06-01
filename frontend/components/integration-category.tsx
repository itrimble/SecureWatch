"use client"

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Switch } from "@/components/ui/switch"
import type { SecurityIntegrationConfig, IntegrationCategoryProps } from "@/types/integrations"
import { CheckCircle, XCircle, AlertTriangle, Settings2 } from "lucide-react"

function IntegrationCard({ integration }: { integration: SecurityIntegrationConfig }) {
  const getRiskColor = (riskLevel: "low" | "medium" | "high") => {
    if (riskLevel === "high") return "bg-red-500 hover:bg-red-600"
    if (riskLevel === "medium") return "bg-yellow-500 hover:bg-yellow-600 text-black"
    return "bg-green-500 hover:bg-green-600"
  }

  const getStatusIndicator = (status?: "active" | "inactive" | "pending" | "error") => {
    if (status === "active") return <CheckCircle className="h-5 w-5 text-green-500" />
    if (status === "pending") return <AlertTriangle className="h-5 w-5 text-yellow-500" />
    if (status === "error") return <XCircle className="h-5 w-5 text-red-500" />
    return <XCircle className="h-5 w-5 text-gray-400" />
  }

  return (
    <Card className="flex flex-col">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">{integration.name}</CardTitle>
          {getStatusIndicator(integration.status)}
        </div>
        <CardDescription>{integration.description}</CardDescription>
      </CardHeader>
      <CardContent className="flex-grow space-y-3">
        <div>
          <span className="text-sm font-medium text-muted-foreground">Capabilities:</span>
          <div className="flex flex-wrap gap-1 mt-1">
            {integration.capabilities.map((cap) => (
              <Badge key={cap} variant="secondary" className="text-xs">
                {cap}
              </Badge>
            ))}
          </div>
        </div>
        {integration.pricing && (
          <p className="text-sm">
            <span className="font-medium text-muted-foreground">Pricing:</span> {integration.pricing}
          </p>
        )}
        <div>
          <span className="text-sm font-medium text-muted-foreground">Risk Level:</span>
          <Badge variant="destructive" className={`ml-2 text-xs ${getRiskColor(integration.riskLevel)}`}>
            {integration.riskLevel.toUpperCase()}
          </Badge>
        </div>
      </CardContent>
      <CardFooter className="flex justify-between items-center">
        <Button variant="outline" size="sm">
          <Settings2 className="h-4 w-4 mr-2" />
          Configure
        </Button>
        <Switch checked={integration.status === "active"} aria-label={`Toggle ${integration.name}`} />
      </CardFooter>
    </Card>
  )
}

export function IntegrationCategory({ title, description, integrations, icon: Icon }: IntegrationCategoryProps) {
  return (
    <section className="space-y-6">
      <div>
        <h2 className="text-2xl font-semibold tracking-tight flex items-center gap-2">
          {Icon && <Icon className="h-6 w-6 text-primary" />}
          {title}
        </h2>
        <p className="text-muted-foreground">{description}</p>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {integrations.map((integration) => (
          <IntegrationCard key={integration.id} integration={integration} />
        ))}
      </div>
    </section>
  )
}
