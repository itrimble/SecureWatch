"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface ChannelPreferences {
  inApp: boolean
  email: boolean
  slack: boolean
  sms: boolean
}

interface PreferenceCategory {
  name: string
  description: string
  channels: ChannelPreferences
  frequency: "immediate" | "daily_digest" | "weekly_digest" | "as_needed" | string
}

interface NotificationPreferencesProps {
  categories: PreferenceCategory[]
  onSave?: (preferences: PreferenceCategory[]) => void
}

export function NotificationPreferences({ categories: initialCategories, onSave }: NotificationPreferencesProps) {
  const [preferences, setPreferences] = useState<PreferenceCategory[]>(initialCategories)

  const handleChannelChange = (categoryIndex: number, channel: keyof ChannelPreferences, value: boolean) => {
    const newPreferences = [...preferences]
    newPreferences[categoryIndex].channels[channel] = value
    setPreferences(newPreferences)
  }

  const handleFrequencyChange = (categoryIndex: number, value: string) => {
    const newPreferences = [...preferences]
    newPreferences[categoryIndex].frequency = value
    setPreferences(newPreferences)
  }

  const channelLabels: { key: keyof ChannelPreferences; label: string }[] = [
    { key: "inApp", label: "In-App" },
    { key: "email", label: "Email" },
    { key: "slack", label: "Slack" },
    { key: "sms", label: "SMS" },
  ]

  return (
    <div className="space-y-6">
      {preferences.map((category, categoryIndex) => (
        <div key={category.name} className="p-4 border rounded-lg bg-card">
          <h4 className="text-md font-semibold text-card-foreground">{category.name}</h4>
          <p className="text-sm text-muted-foreground mb-3">{category.description}</p>

          <div className="mb-3">
            <Label className="text-sm font-medium text-card-foreground mb-1 block">Notification Channels:</Label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-2">
              {channelLabels.map((ch) => (
                <div key={ch.key} className="flex items-center space-x-2">
                  <Switch
                    id={`${category.name}-${ch.key}`}
                    checked={category.channels[ch.key]}
                    onCheckedChange={(checked) => handleChannelChange(categoryIndex, ch.key, checked)}
                  />
                  <Label htmlFor={`${category.name}-${ch.key}`} className="text-sm font-normal text-muted-foreground">
                    {ch.label}
                  </Label>
                </div>
              ))}
            </div>
          </div>

          <div>
            <Label
              htmlFor={`${category.name}-frequency`}
              className="text-sm font-medium text-card-foreground mb-1 block"
            >
              Frequency:
            </Label>
            <Select value={category.frequency} onValueChange={(value) => handleFrequencyChange(categoryIndex, value)}>
              <SelectTrigger id={`${category.name}-frequency`} className="w-full sm:w-[180px]">
                <SelectValue placeholder="Select frequency" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="immediate">Immediate</SelectItem>
                <SelectItem value="daily_digest">Daily Digest</SelectItem>
                <SelectItem value="weekly_digest">Weekly Digest</SelectItem>
                <SelectItem value="as_needed">As Needed</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      ))}
      {onSave && (
        <div className="mt-6 flex justify-end">
          <Button onClick={() => onSave(preferences)}>Save Preferences</Button>
        </div>
      )}
    </div>
  )
}
