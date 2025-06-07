import { IncidentManagement } from "@/components/incident-management"

export default function IncidentInvestigationPage() {
  return (
    <div className="container mx-auto p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Incident Investigation</h1>
        <p className="text-muted-foreground">
          Manage security incidents, investigate threats, and coordinate response efforts
        </p>
      </div>
      <IncidentManagement />
    </div>
  )
}