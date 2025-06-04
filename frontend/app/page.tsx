import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import DashboardContent from "@/components/dashboard-content"
import CustomizableDashboard from "@/components/customizable-dashboard"

export default function Home() {
  return (
    <div className="p-6">
      <Tabs defaultValue="overview" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="overview">Security Overview</TabsTrigger>
          <TabsTrigger value="custom">Custom Dashboard</TabsTrigger>
        </TabsList>
        
        <TabsContent value="overview" className="mt-6">
          <DashboardContent />
        </TabsContent>
        
        <TabsContent value="custom" className="mt-6">
          <CustomizableDashboard />
        </TabsContent>
      </Tabs>
    </div>
  )
}
