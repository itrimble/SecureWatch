"use client"

import { useState } from "react"
import { IntegrationCategory } from "@/components/integration-category"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import {
  ShieldAlert,
  BrainCircuit,
  SearchCode,
  BookOpen,
  FileText,
  Shield,
  Zap,
  Server,
  Activity,
  CheckCircle2,
  Plus,
} from "lucide-react"
import type { SecurityIntegrationConfig } from "@/types/integrations"

// Enhanced integrations data with cybersecurity focus
const cybersecurityIntegrations: SecurityIntegrationConfig[] = [
  // MCP Integration
  {
    id: "mcp-server",
    name: "MCP Server Integration",
    category: "ai_threat_detection",
    description: "Model Context Protocol server for AI-powered security analysis and KQL query generation",
    riskLevel: "low",
    capabilities: ["KQL Generation", "Threat Analysis", "Log Correlation", "Natural Language Queries"],
    pricing: "Self-hosted",
    status: "active",
  },

  // Local LLM Support
  {
    id: "ollama-integration",
    name: "Ollama Local LLM",
    category: "ai_threat_detection",
    description: "Local LLM integration for private threat analysis and KQL generation",
    riskLevel: "low",
    capabilities: ["Local Processing", "KQL Generation", "Privacy-First", "Offline Analysis"],
    pricing: "Free",
    status: "inactive",
  },
  {
    id: "lmstudio-integration",
    name: "LM Studio Integration",
    category: "ai_threat_detection",
    description: "LM Studio local model server for secure, on-premises AI analysis",
    riskLevel: "low",
    capabilities: ["Local Models", "API Integration", "Custom Fine-tuning", "KQL Assistance"],
    pricing: "Free",
    status: "inactive",
  },

  // High-Value SIEM Integrations - Threat Intelligence & Enrichment
  {
    id: "virustotal-mcp",
    name: "VirusTotal MCP",
    category: "threat_intelligence",
    description: "Essential IOC enrichment, file/URL reputation checks, and malware family attribution",
    riskLevel: "medium",
    capabilities: ["IOC Enrichment", "File Analysis", "URL Reputation", "Malware Attribution"],
    pricing: "Free: 500 queries/day",
    status: "inactive",
  },
  {
    id: "misp-mcp",
    name: "MISP MCP",
    category: "threat_intelligence",
    description: "Direct threat intelligence platform integration for IOC feeds and threat actor attribution",
    riskLevel: "high",
    capabilities: ["Threat Intelligence", "IOC Feeds", "Threat Actor Attribution", "Campaign Tracking"],
    pricing: "Self-hosted",
    status: "inactive",
  },
  {
    id: "shodan-mcp",
    name: "Shodan MCP",
    category: "threat_intelligence",
    description: "Asset discovery, internet exposure analysis, and threat intelligence on external infrastructure",
    riskLevel: "medium",
    capabilities: ["Asset Discovery", "Exposure Analysis", "Internet Scanning", "Threat Intelligence"],
    pricing: "API Credits Required",
    status: "inactive",
  },

  // Log Analysis & Monitoring
  {
    id: "cloudwatch-logs-mcp",
    name: "CloudWatch Logs MCP",
    category: "siem_platforms",
    description: "AI-powered log analysis for AWS environments with KQL integration",
    riskLevel: "medium",
    capabilities: ["AWS Log Analysis", "KQL Translation", "Anomaly Detection", "Cloud Monitoring"],
    pricing: "AWS Usage Based",
    status: "inactive",
  },
  {
    id: "wazuh-mcp",
    name: "Wazuh MCP",
    category: "siem_platforms",
    description: "Integration with open-source SIEM/XDR for unified security monitoring",
    riskLevel: "low",
    capabilities: ["SIEM Integration", "XDR Correlation", "Rule Management", "Alert Enrichment"],
    pricing: "Open Source",
    status: "inactive",
  },

  // Asset Discovery & Network Intelligence
  {
    id: "nmap-mcp",
    name: "Nmap MCP",
    category: "threat_intelligence",
    description: "Network discovery, port scanning, and asset inventory for threat hunting",
    riskLevel: "medium",
    capabilities: ["Network Discovery", "Port Scanning", "Asset Inventory", "Service Detection"],
    pricing: "Free",
    status: "inactive",
  },
  {
    id: "aws-security-mcp",
    name: "AWS Security MCP",
    category: "siem_platforms",
    description: "Cloud asset discovery and security posture monitoring",
    riskLevel: "medium",
    capabilities: ["Cloud Security", "Asset Discovery", "Posture Monitoring", "Compliance Checks"],
    pricing: "AWS Usage Based",
    status: "inactive",
  },

  // Identity & Access Management
  {
    id: "bloodhound-mcp",
    name: "BloodHound MCP",
    category: "threat_intelligence",
    description: "Active Directory attack path analysis for insider threat detection",
    riskLevel: "high",
    capabilities: ["AD Analysis", "Attack Paths", "Privilege Escalation", "Insider Threats"],
    pricing: "Free",
    status: "inactive",
  },
  {
    id: "roadrecon-mcp",
    name: "ROADRecon MCP",
    category: "threat_intelligence",
    description: "Azure AD security analysis for cloud identity incidents",
    riskLevel: "high",
    capabilities: ["Azure AD Analysis", "Identity Security", "Cloud Incidents", "Privilege Review"],
    pricing: "Free",
    status: "inactive",
  },

  // Vulnerability Management
  {
    id: "nessus-mcp",
    name: "Nessus MCP",
    category: "threat_intelligence",
    description: "Vulnerability scan integration for risk-based alerting",
    riskLevel: "medium",
    capabilities: ["Vulnerability Scanning", "Risk Assessment", "Patch Management", "Compliance"],
    pricing: "License Required",
    status: "inactive",
  },
  {
    id: "semgrep-mcp",
    name: "Semgrep MCP",
    category: "threat_intelligence",
    description: "Code vulnerability detection for DevSecOps integration",
    riskLevel: "low",
    capabilities: ["Code Analysis", "SAST", "DevSecOps", "Security Rules"],
    pricing: "Free Tier Available",
    status: "inactive",
  },

  // Web Security
  {
    id: "burp-suite-mcp",
    name: "Burp Suite MCP",
    category: "threat_intelligence",
    description: "Web application security testing results and findings",
    riskLevel: "medium",
    capabilities: ["Web App Security", "DAST", "Vulnerability Testing", "Security Findings"],
    pricing: "License Required",
    status: "inactive",
  },

  // OSINT & Reconnaissance Detection
  {
    id: "maigret-mcp",
    name: "Maigret MCP",
    category: "threat_intelligence",
    description: "OSINT tool for investigating user accounts across platforms",
    riskLevel: "medium",
    capabilities: ["OSINT", "Account Investigation", "Social Media Analysis", "Digital Footprint"],
    pricing: "Free",
    status: "inactive",
  },
  {
    id: "dnstwist-mcp",
    name: "dnstwist MCP",
    category: "threat_intelligence",
    description: "Domain spoofing and typosquatting detection",
    riskLevel: "low",
    capabilities: ["Domain Monitoring", "Typosquatting", "Brand Protection", "DNS Analysis"],
    pricing: "Free",
    status: "inactive",
  },
  {
    id: "external-attacker-mcp",
    name: "ExternalAttacker MCP",
    category: "threat_intelligence",
    description: "Automated reconnaissance and attack surface monitoring",
    riskLevel: "medium",
    capabilities: ["Attack Surface", "Reconnaissance", "External Monitoring", "Threat Simulation"],
    pricing: "Free",
    status: "inactive",
  },
]

const categoryDetails = {
  ai_threat_detection: {
    title: "🤖 AI Threat Detection & KQL Generation",
    description: "AI models for analyzing logs, generating KQL queries, and detecting security threats.",
    icon: BrainCircuit,
  },
  threat_intelligence: {
    title: "🎯 Threat Intelligence & Enrichment",
    description: "External threat intelligence, IOC feeds, and security enrichment sources.",
    icon: Shield,
  },
  siem_platforms: {
    title: "🔍 SIEM Platforms & Log Analysis",
    description: "Integrate with SIEM platforms and enhance log analysis capabilities.",
    icon: SearchCode,
  },
  report_generation: {
    title: "📄 Report Generation & Analytics",
    description: "Tools for generating security reports and analytics dashboards.",
    icon: FileText,
  },
  educational_content: {
    title: "🎓 Educational & Training Content",
    description: "Integrations for cybersecurity learning and training resources.",
    icon: BookOpen,
  },
}

export default function SecurityIntegrationsPage() {
  const [mcpConfig, setMcpConfig] = useState({
    enabled: true,
    endpoint: "http://localhost:3001",
    apiKey: "",
    model: "claude-3-sonnet",
  })

  const [localLlmConfig, setLocalLlmConfig] = useState({
    provider: "ollama",
    endpoint: "http://localhost:11434",
    model: "llama3.1:8b",
    enabled: false,
  })

  const categorized = cybersecurityIntegrations.reduce(
    (acc, curr) => {
      if (!acc[curr.category]) {
        acc[curr.category] = []
      }
      acc[curr.category].push(curr)
      return acc
    },
    {} as Record<string, SecurityIntegrationConfig[]>,
  )

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Security Integrations</h2>
          <p className="text-muted-foreground">
            Configure AI models, threat intelligence sources, and security tools for enhanced KQL-based threat
            detection.
          </p>
        </div>
        <Button>
          <Plus className="h-4 w-4 mr-2" />
          Add Custom Integration
        </Button>
      </div>

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 dark:bg-blue-900/20 dark:border-blue-700/50">
        <h3 className="text-blue-800 dark:text-blue-300 font-semibold flex items-center gap-2">
          <SearchCode className="h-5 w-5" />
          KQL-Powered SIEM Platform
        </h3>
        <p className="text-blue-700 dark:text-blue-400 text-sm mt-1">
          This SIEM platform uses <strong>Kusto Query Language (KQL)</strong> as its primary query language. AI
          integrations will generate KQL queries for threat hunting, log analysis, and security investigations.
        </p>
      </div>

      <Tabs defaultValue="ai-models" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="ai-models">AI Models & MCP</TabsTrigger>
          <TabsTrigger value="threat-intel">Threat Intelligence</TabsTrigger>
          <TabsTrigger value="siem-tools">SIEM Tools</TabsTrigger>
          <TabsTrigger value="all-integrations">All Integrations</TabsTrigger>
        </TabsList>

        <TabsContent value="ai-models" className="space-y-6">
          {/* MCP Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Zap className="h-5 w-5 text-purple-600" />
                MCP (Model Context Protocol) Integration
              </CardTitle>
              <CardDescription>Configure MCP server for AI-powered KQL generation and threat analysis</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-medium">Enable MCP Integration</Label>
                  <p className="text-sm text-muted-foreground">
                    Connect to MCP server for AI-enhanced security analysis
                  </p>
                </div>
                <Switch
                  checked={mcpConfig.enabled}
                  onCheckedChange={(checked) => setMcpConfig({ ...mcpConfig, enabled: checked })}
                />
              </div>

              {mcpConfig.enabled && (
                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                  <div className="space-y-2">
                    <Label htmlFor="mcp-endpoint">MCP Server Endpoint</Label>
                    <Input
                      id="mcp-endpoint"
                      value={mcpConfig.endpoint}
                      onChange={(e) => setMcpConfig({ ...mcpConfig, endpoint: e.target.value })}
                      placeholder="http://localhost:3001"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="mcp-model">AI Model</Label>
                    <Select
                      value={mcpConfig.model}
                      onValueChange={(value) => setMcpConfig({ ...mcpConfig, model: value })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="claude-3-sonnet">Claude 3 Sonnet</SelectItem>
                        <SelectItem value="claude-3-haiku">Claude 3 Haiku</SelectItem>
                        <SelectItem value="gpt-4">GPT-4</SelectItem>
                        <SelectItem value="gpt-3.5-turbo">GPT-3.5 Turbo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2 col-span-2">
                    <Label htmlFor="mcp-api-key">API Key</Label>
                    <Input
                      id="mcp-api-key"
                      type="password"
                      value={mcpConfig.apiKey}
                      onChange={(e) => setMcpConfig({ ...mcpConfig, apiKey: e.target.value })}
                      placeholder="Enter your API key"
                    />
                  </div>
                </div>
              )}

              <div className="flex items-center gap-2 pt-2">
                <CheckCircle2 className="h-4 w-4 text-green-600" />
                <span className="text-sm text-green-600">MCP Server Connected</span>
                <Badge variant="secondary" className="ml-auto">
                  Active
                </Badge>
              </div>
            </CardContent>
          </Card>

          {/* Local LLM Configuration */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Server className="h-5 w-5 text-green-600" />
                Local LLM Integration
              </CardTitle>
              <CardDescription>Configure local LLM providers for private, on-premises AI analysis</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <Label className="text-base font-medium">Enable Local LLM</Label>
                  <p className="text-sm text-muted-foreground">Use local models for privacy-first threat analysis</p>
                </div>
                <Switch
                  checked={localLlmConfig.enabled}
                  onCheckedChange={(checked) => setLocalLlmConfig({ ...localLlmConfig, enabled: checked })}
                />
              </div>

              {localLlmConfig.enabled && (
                <div className="space-y-4 pt-4 border-t">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="llm-provider">LLM Provider</Label>
                      <Select
                        value={localLlmConfig.provider}
                        onValueChange={(value) => setLocalLlmConfig({ ...localLlmConfig, provider: value })}
                      >
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="ollama">Ollama</SelectItem>
                          <SelectItem value="lmstudio">LM Studio</SelectItem>
                          <SelectItem value="llamacpp">llama.cpp</SelectItem>
                          <SelectItem value="textgen">Text Generation WebUI</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="llm-endpoint">Endpoint URL</Label>
                      <Input
                        id="llm-endpoint"
                        value={localLlmConfig.endpoint}
                        onChange={(e) => setLocalLlmConfig({ ...localLlmConfig, endpoint: e.target.value })}
                        placeholder="http://localhost:11434"
                      />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="llm-model">Model Name</Label>
                    <Input
                      id="llm-model"
                      value={localLlmConfig.model}
                      onChange={(e) => setLocalLlmConfig({ ...localLlmConfig, model: e.target.value })}
                      placeholder="llama3.1:8b"
                    />
                    <p className="text-xs text-muted-foreground">
                      Popular models: llama3.1:8b, codellama:13b, mistral:7b, deepseek-coder:6.7b
                    </p>
                  </div>
                  <Button variant="outline" size="sm">
                    Test Connection
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          {/* AI Model Integrations */}
          <IntegrationCategory
            title={categoryDetails.ai_threat_detection.title}
            description={categoryDetails.ai_threat_detection.description}
            integrations={categorized.ai_threat_detection || []}
            icon={categoryDetails.ai_threat_detection.icon}
          />
        </TabsContent>

        <TabsContent value="threat-intel" className="space-y-6">
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 dark:bg-red-900/20 dark:border-red-700/50">
            <h3 className="text-red-800 dark:text-red-300 font-semibold flex items-center gap-2">
              <ShieldAlert className="h-5 w-5" />
              High-Value SIEM Integrations
            </h3>
            <p className="text-red-700 dark:text-red-400 text-sm mt-1">
              These integrations provide essential threat intelligence and enrichment capabilities for your KQL-based
              SIEM platform.
            </p>
          </div>

          <IntegrationCategory
            title={categoryDetails.threat_intelligence.title}
            description={categoryDetails.threat_intelligence.description}
            integrations={categorized.threat_intelligence || []}
            icon={categoryDetails.threat_intelligence.icon}
          />
        </TabsContent>

        <TabsContent value="siem-tools" className="space-y-6">
          <IntegrationCategory
            title={categoryDetails.siem_platforms.title}
            description={categoryDetails.siem_platforms.description}
            integrations={categorized.siem_platforms || []}
            icon={categoryDetails.siem_platforms.icon}
          />
        </TabsContent>

        <TabsContent value="all-integrations" className="space-y-8">
          {Object.entries(categoryDetails).map(([categoryKey, details]) => {
            const integrations = categorized[categoryKey] || []
            if (integrations.length === 0) return null

            return (
              <IntegrationCategory
                key={categoryKey}
                title={details.title}
                description={details.description}
                integrations={integrations}
                icon={details.icon}
              />
            )
          })}
        </TabsContent>
      </Tabs>

      {/* Implementation Priority Guide */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Implementation Priority for KQL SIEM
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <h4 className="font-semibold text-green-600">Phase 1 - Essential</h4>
              <ul className="text-sm space-y-1">
                <li>• MCP Integration</li>
                <li>• VirusTotal MCP</li>
                <li>• MISP MCP</li>
                <li>• Local LLM (Ollama)</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold text-yellow-600">Phase 2 - Enhanced</h4>
              <ul className="text-sm space-y-1">
                <li>• Shodan MCP</li>
                <li>• Nmap MCP</li>
                <li>• CloudWatch Logs</li>
                <li>• Wazuh Integration</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-semibold text-blue-600">Phase 3 - Advanced</h4>
              <ul className="text-sm space-y-1">
                <li>• BloodHound MCP</li>
                <li>• AWS Security MCP</li>
                <li>• Nessus Integration</li>
                <li>• OSINT Tools</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
