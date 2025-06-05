"use client"

import { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { SolutionsMarketplace } from '@/components/marketplace/solutions-marketplace'
import { ContentPackManager } from '@/components/marketplace/content-pack-manager'
import { MCPMarketplaceSettings } from '@/components/marketplace/mcp-marketplace-settings'
import { Package, Download, Settings, Store } from 'lucide-react'

export default function MarketplacePage() {
  const [activeTab, setActiveTab] = useState('browse')

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-3xl font-bold mb-2">Solutions Marketplace</h1>
        <p className="text-muted-foreground">
          Discover, install, and manage security content packs, MCP integrations, and tools for your SIEM platform
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="browse" className="flex items-center space-x-2">
            <Store className="w-4 h-4" />
            <span>Browse Marketplace</span>
          </TabsTrigger>
          <TabsTrigger value="installed" className="flex items-center space-x-2">
            <Package className="w-4 h-4" />
            <span>Installed Packs</span>
          </TabsTrigger>
          <TabsTrigger value="settings" className="flex items-center space-x-2">
            <Settings className="w-4 h-4" />
            <span>Marketplace Settings</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="browse" className="space-y-6">
          <SolutionsMarketplace />
        </TabsContent>

        <TabsContent value="installed" className="space-y-6">
          <ContentPackManager />
        </TabsContent>

        <TabsContent value="settings" className="space-y-6">
          <MCPMarketplaceSettings />
        </TabsContent>
      </Tabs>
    </div>
  )
}