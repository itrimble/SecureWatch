"use client"

import { IncidentManagement } from "@/components/incident-management"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import { useRouter } from "next/navigation"

export default function IncidentInvestigationPage() {
  const router = useRouter()

  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <div className="flex items-center space-x-4 mb-4">
          <Button 
            variant="ghost" 
            size="sm" 
            onClick={() => router.push('/')}
            className="flex items-center"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Dashboard
          </Button>
        </div>
        <h1 className="text-3xl font-bold">Incident Investigation</h1>
        <p className="text-muted-foreground">
          Manage security incidents, investigate threats, and coordinate response efforts
        </p>
      </div>
      <IncidentManagement />
    </div>
  )
}