import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatEventId(eventId: string | number): string {
  return eventId.toString().padStart(4, '0')
}

export function generateSIEMQuery(eventIds: string[], platform: string, additionalFilters?: Record<string, string>): string {
  const eventIdsList = eventIds.map(id => formatEventId(id)).join(',')
  
  switch (platform.toLowerCase()) {
    case 'splunk':
      return `index=windows EventCode IN (${eventIdsList}) ${additionalFilters ? Object.entries(additionalFilters).map(([key, value]) => `${key}="${value}"`).join(' ') : ''}| table _time, EventCode, EventCodeDisplayName, Computer, Account_Name`
    
    case 'sentinel':
    case 'azure':
      return `SecurityEvent
| where EventID in (${eventIdsList})
${additionalFilters ? Object.entries(additionalFilters).map(([key, value]) => `| where ${key} == "${value}"`).join('\n') : ''}
| project TimeGenerated, EventID, Activity, Computer, Account`
    
    case 'elk':
    case 'elasticsearch':
      return `{
  "query": {
    "bool": {
      "must": [
        {
          "terms": {
            "winlog.event_id": [${eventIdsList}]
          }
        }${additionalFilters ? `,
        ${Object.entries(additionalFilters).map(([key, value]) => `{
          "term": {
            "${key}": "${value}"
          }
        }`).join(',\n        ')}` : ''}
      ]
    }
  },
  "sort": [
    {
      "@timestamp": {
        "order": "desc"
      }
    }
  ]
}`
    
    case 'logstash':
      return `filter {
  if [winlog][event_id] in [${eventIdsList}] {
    mutate {
      add_field => { "event_category" => "security" }
    }
  }
}

# Additional filters for investigation
${additionalFilters ? Object.entries(additionalFilters).map(([key, value]) => `if [${key}] == "${value}" {
  mutate {
    add_tag => ["filtered_event"]
  }
}`).join('\n\n') : ''}`
    
    default:
      return `Generic query for Event IDs: ${eventIdsList}`
  }
}