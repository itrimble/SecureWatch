'use client'

import { EventMapping } from '@/data/eventMappings'
import { cn, formatEventId } from '@/lib/utils'
import { Shield, AlertTriangle, Database, CheckCircle } from 'lucide-react'

interface EventCardProps {
  event: EventMapping
  isSelected?: boolean
  onClick?: () => void
}

export function EventCard({ event, isSelected = false, onClick }: EventCardProps) {
  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'text-red-600 bg-red-50 border-red-200'
      case 'high':
        return 'text-red-500 bg-red-50 border-red-200'
      case 'medium':
        return 'text-yellow-600 bg-yellow-50 border-yellow-200'
      case 'low':
        return 'text-green-600 bg-green-50 border-green-200'
      default:
        return 'text-gray-600 bg-gray-50 border-gray-200'
    }
  }

  return (
    <div
      onClick={onClick}
      className={cn(
        "relative p-4 border rounded-lg cursor-pointer transition-all duration-200 hover:shadow-md",
        isSelected
          ? "bg-blue-50 border-blue-300 shadow-sm"
          : "bg-white border-gray-200 hover:border-gray-300"
      )}
    >
      {/* Selection Indicator */}
      {isSelected && (
        <div className="absolute top-2 right-2">
          <CheckCircle className="text-blue-500" size={20} />
        </div>
      )}

      {/* Event ID and Name */}
      <div className="space-y-2">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-2">
            <span className="font-mono text-lg font-bold text-gray-900">
              {formatEventId(event.eventId)}
            </span>
            <div className={cn(
              "px-2 py-1 text-xs font-medium rounded border",
              getSeverityColor(event.severity)
            )}>
              {event.severity.toUpperCase()}
            </div>
          </div>
        </div>
        
        <h3 className="font-medium text-gray-900 leading-tight">
          {event.eventName}
        </h3>
        
        <p className="text-sm text-gray-600 line-clamp-2">
          {event.description}
        </p>
      </div>

      {/* Metadata */}
      <div className="mt-4 space-y-3">
        {/* Log Source */}
        <div className="flex items-center space-x-2">
          <Database size={14} className="text-gray-400" />
          <span className="text-xs text-gray-500">{event.logSource}</span>
        </div>

        {/* Attack Types */}
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <AlertTriangle size={14} className="text-orange-500" />
            <span className="text-xs font-medium text-gray-700">Attack Types</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {event.attackTypes.slice(0, 3).map((type, index) => (
              <span
                key={index}
                className="px-2 py-1 text-xs bg-orange-100 text-orange-700 rounded"
              >
                {type}
              </span>
            ))}
            {event.attackTypes.length > 3 && (
              <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                +{event.attackTypes.length - 3} more
              </span>
            )}
          </div>
        </div>

        {/* MITRE Techniques */}
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Shield size={14} className="text-blue-500" />
            <span className="text-xs font-medium text-gray-700">MITRE Techniques</span>
          </div>
          <div className="flex flex-wrap gap-1">
            {event.mitreTechniques.slice(0, 2).map((technique, index) => (
              <span
                key={index}
                className="px-2 py-1 text-xs bg-blue-100 text-blue-700 rounded font-mono"
              >
                {technique}
              </span>
            ))}
            {event.mitreTechniques.length > 2 && (
              <span className="px-2 py-1 text-xs bg-gray-100 text-gray-600 rounded">
                +{event.mitreTechniques.length - 2} more
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Hover State Indicator */}
      <div className="absolute inset-0 border-2 border-transparent rounded-lg transition-colors hover:border-blue-200 pointer-events-none" />
    </div>
  )
}