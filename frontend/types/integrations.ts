import type { LucideIcon } from "lucide-react"

// Based on the user's provided TypeScript
export interface SecurityIntegrationConfig {
  id: string
  name: string
  description: string
  category:
    | "ai_threat_detection"
    | "threat_intelligence"
    | "siem_platforms"
    | "report_generation"
    | "educational_content"
  riskLevel: "low" | "medium" | "high"
  dataAccess?: "logs_only" | "metadata" | "full_access" // Optional as per user's example
  compliance?: string[] // Optional
  capabilities: string[]
  status?: "active" | "inactive" | "pending" | "error" // Added from UI example
  pricing?: string // Added from UI example
  icon?: LucideIcon // For UI representation
  logoUrl?: string // For UI representation
}

export interface IntegrationCategoryProps {
  title: string
  description: string
  integrations: SecurityIntegrationConfig[]
  icon?: LucideIcon
}

// Mock data structure from user's specification
export const securityIntegrationsList: Record<string, SecurityIntegrationConfig> = {
  // AI Threat Detection
  "claude-security": {
    id: "claude-security",
    name: "Claude Security Analysis",
    category: "ai_threat_detection",
    description: "Advanced threat pattern recognition and incident analysis",
    riskLevel: "low",
    capabilities: ["Log Analysis", "Threat Correlation", "Incident Reports"],
    pricing: "Free tier available",
    status: "active",
  },
  "gemini-threat": {
    id: "gemini-threat",
    name: "Gemini Threat Hunter",
    category: "ai_threat_detection",
    description: "Real-time threat hunting and anomaly detection",
    riskLevel: "medium",
    capabilities: ["Anomaly Detection", "Behavioral Analysis"],
    pricing: "Pay per query",
    status: "pending",
  },
  "deepseek-forensics": {
    id: "deepseek-forensics",
    name: "DeepSeek Digital Forensics",
    category: "ai_threat_detection",
    description: "Deep log forensics and attack reconstruction",
    riskLevel: "medium",
    capabilities: ["Attack Reconstruction", "Timeline Analysis"],
    pricing: "Contact Sales",
    status: "inactive",
  },
  // Threat Intelligence
  "misp-connector": {
    id: "misp-connector",
    name: "MISP Threat Intelligence",
    category: "threat_intelligence",
    description: "Connect to MISP threat intelligence platform",
    riskLevel: "high",
    capabilities: ["IOC Lookup", "Threat Feeds"],
    pricing: "Self-hosted",
    status: "inactive",
  },
  "virustotal-api": {
    id: "virustotal-api",
    name: "VirusTotal Integration",
    category: "threat_intelligence",
    description: "File and IP reputation checks",
    riskLevel: "medium",
    capabilities: ["IOC Lookup", "Reputation Scoring"],
    pricing: "Free: 500 queries/day",
    status: "inactive",
  },
  // SIEM Platforms
  "splunk-connector": {
    id: "splunk-connector",
    name: "Splunk Query Generator",
    category: "siem_platforms",
    description: "Generate Splunk queries from natural language",
    riskLevel: "low",
    capabilities: ["SPL Generation", "Dashboard Creation"],
    pricing: "Free",
    status: "active",
  },
  "elastic-connector": {
    id: "elastic-connector",
    name: "Elastic SIEM Integration",
    category: "siem_platforms",
    description: "Generate EQL and KQL queries",
    riskLevel: "low",
    capabilities: ["EQL/KQL Generation"],
    pricing: "Free",
    status: "inactive",
  },
}
