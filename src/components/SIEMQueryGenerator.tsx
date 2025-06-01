'use client'

import { useState } from 'react'
import { EventMapping } from '@/data/eventMappings'
import { generateSIEMQuery, formatEventId } from '@/lib/utils'
import { Copy, Download, Settings, Code, Database, Trash2 } from 'lucide-react'

interface SIEMQueryGeneratorProps {
  selectedEvents: EventMapping[]
  onClearSelection?: () => void
}

const SIEM_PLATFORMS = [
  { id: 'splunk', name: 'Splunk', description: 'Splunk Enterprise Search' },
  { id: 'sentinel', name: 'Microsoft Sentinel', description: 'KQL Query Language' },
  { id: 'elk', name: 'ELK Stack', description: 'Elasticsearch DSL' },
  { id: 'logstash', name: 'Logstash', description: 'Logstash Filter Config' }
]

export function SIEMQueryGenerator({ selectedEvents, onClearSelection }: SIEMQueryGeneratorProps) {
  const [selectedPlatform, setSelectedPlatform] = useState('splunk')
  const [additionalFilters, setAdditionalFilters] = useState<Record<string, string>>({})
  const [showAdvanced, setShowAdvanced] = useState(false)

  const eventIds = selectedEvents.map(event => event.eventId.toString())
  const generatedQuery = generateSIEMQuery(eventIds, selectedPlatform, additionalFilters)

  const handleCopyQuery = async () => {
    try {
      await navigator.clipboard.writeText(generatedQuery)
      // You could add a toast notification here
      alert('Query copied to clipboard!')
    } catch (err) {
      console.error('Failed to copy query:', err)
    }
  }

  const handleDownloadQuery = () => {
    const blob = new Blob([generatedQuery], { type: 'text/plain' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${selectedPlatform}_query_${new Date().toISOString().split('T')[0]}.txt`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const addFilter = () => {
    const key = prompt('Enter filter field name:')
    const value = prompt('Enter filter value:')
    if (key && value) {
      setAdditionalFilters(prev => ({ ...prev, [key]: value }))
    }
  }

  const removeFilter = (key: string) => {
    setAdditionalFilters(prev => {
      const newFilters = { ...prev }
      delete newFilters[key]
      return newFilters
    })
  }

  if (selectedEvents.length === 0) {
    return (
      <div className="bg-gray-50 border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
        <Database className="mx-auto text-gray-400 mb-4" size={48} />
        <h3 className="text-lg font-medium text-gray-900 mb-2">No Events Selected</h3>
        <p className="text-gray-500">
          Search and select Windows Event IDs to generate SIEM queries
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header with Selected Events */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center justify-between mb-2">
          <h3 className="text-lg font-semibold text-blue-900">
            SIEM Query Generator ({selectedEvents.length} events)
          </h3>
          <button
            onClick={onClearSelection}
            className="flex items-center space-x-1 text-blue-600 hover:text-blue-800 text-sm"
          >
            <Trash2 size={16} />
            <span>Clear All</span>
          </button>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {selectedEvents.map((event) => (
            <div
              key={event.eventId}
              className="flex items-center space-x-2 bg-white px-3 py-1 rounded-full border"
            >
              <span className="font-mono text-sm font-medium">
                {formatEventId(event.eventId)}
              </span>
              <span className="text-sm text-gray-600 truncate max-w-32">
                {event.eventName}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Platform Selection */}
      <div className="space-y-3">
        <h4 className="font-medium text-gray-900">Select SIEM Platform</h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {SIEM_PLATFORMS.map((platform) => (
            <button
              key={platform.id}
              onClick={() => setSelectedPlatform(platform.id)}
              className={`p-3 text-left border rounded-lg transition-colors ${
                selectedPlatform === platform.id
                  ? 'bg-blue-500 text-white border-blue-500'
                  : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
              }`}
            >
              <div className="font-medium">{platform.name}</div>
              <div className={`text-sm ${
                selectedPlatform === platform.id ? 'text-blue-100' : 'text-gray-500'
              }`}>
                {platform.description}
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Advanced Filters */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-gray-900">Query Filters</h4>
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="flex items-center space-x-2 text-blue-600 hover:text-blue-800 text-sm"
          >
            <Settings size={16} />
            <span>{showAdvanced ? 'Hide' : 'Show'} Advanced</span>
          </button>
        </div>

        {showAdvanced && (
          <div className="space-y-3 p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-700">Additional Filters</span>
              <button
                onClick={addFilter}
                className="text-sm bg-blue-500 hover:bg-blue-600 text-white px-3 py-1 rounded"
              >
                Add Filter
              </button>
            </div>
            
            {Object.entries(additionalFilters).length > 0 && (
              <div className="space-y-2">
                {Object.entries(additionalFilters).map(([key, value]) => (
                  <div key={key} className="flex items-center space-x-2 text-sm">
                    <span className="font-mono bg-white px-2 py-1 rounded border">
                      {key} = &quot;{value}&quot;
                    </span>
                    <button
                      onClick={() => removeFilter(key)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Generated Query */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="font-medium text-gray-900 flex items-center space-x-2">
            <Code size={16} />
            <span>Generated Query</span>
          </h4>
          <div className="flex space-x-2">
            <button
              onClick={handleCopyQuery}
              className="flex items-center space-x-2 px-3 py-1.5 bg-gray-100 hover:bg-gray-200 text-gray-700 text-sm rounded border transition-colors"
            >
              <Copy size={14} />
              <span>Copy</span>
            </button>
            <button
              onClick={handleDownloadQuery}
              className="flex items-center space-x-2 px-3 py-1.5 bg-blue-500 hover:bg-blue-600 text-white text-sm rounded transition-colors"
            >
              <Download size={14} />
              <span>Download</span>
            </button>
          </div>
        </div>
        
        <div className="relative">
          <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto text-sm">
            <code>{generatedQuery}</code>
          </pre>
        </div>
      </div>

      {/* Query Tips */}
      <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
        <h5 className="font-medium text-yellow-800 mb-2">Query Tips</h5>
        <div className="text-sm text-yellow-700 space-y-1">
          <p>• Test queries in a non-production environment first</p>
          <p>• Adjust time ranges based on your investigation scope</p>
          <p>• Consider adding host filters to narrow down results</p>
          <p>• Monitor query performance for large time ranges</p>
        </div>
      </div>
    </div>
  )
}