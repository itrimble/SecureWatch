"use client"

import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { MoreHorizontal } from "lucide-react"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"

interface AlertRule {
  id: string // Added ID for keying and actions
  name: string
  condition: string
  severity: "low" | "medium" | "high" | "critical" | string
  enabled: boolean
  lastTriggered: string
  triggerCount: number
}

interface AlertRulesTableProps {
  rules: AlertRule[]
  onToggleRule?: (id: string, enabled: boolean) => void
  onEditRule?: (id: string) => void
  onDeleteRule?: (id: string) => void
}

export function AlertRulesTable({ rules, onToggleRule, onEditRule, onDeleteRule }: AlertRulesTableProps) {
  const getSeverityBadgeVariant = (severity: string) => {
    switch (severity) {
      case "critical":
        return "destructive"
      case "high":
        return "destructive" // Or a custom orange-like variant
      case "medium":
        return "warning" // Assuming 'warning' is yellow-ish
      case "low":
        return "outline"
      default:
        return "secondary"
    }
  }

  if (!rules || rules.length === 0) {
    return <p className="text-center text-muted-foreground py-8">No alert rules configured.</p>
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead className="hidden md:table-cell">Condition</TableHead>
            <TableHead>Severity</TableHead>
            <TableHead className="hidden sm:table-cell">Last Triggered</TableHead>
            <TableHead className="hidden sm:table-cell text-center">Triggers</TableHead>
            <TableHead className="text-center">Enabled</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rules.map((rule) => (
            <TableRow key={rule.id}>
              <TableCell className="font-medium">{rule.name}</TableCell>
              <TableCell
                className="text-sm text-muted-foreground hidden md:table-cell max-w-xs truncate"
                title={rule.condition}
              >
                {rule.condition}
              </TableCell>
              <TableCell>
                <Badge variant={getSeverityBadgeVariant(rule.severity)} className="capitalize">
                  {rule.severity}
                </Badge>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground hidden sm:table-cell">{rule.lastTriggered}</TableCell>
              <TableCell className="text-sm text-muted-foreground hidden sm:table-cell text-center">
                {rule.triggerCount}
              </TableCell>
              <TableCell className="text-center">
                <Switch
                  checked={rule.enabled}
                  onCheckedChange={(checked) => onToggleRule && onToggleRule(rule.id, checked)}
                  aria-label={`Toggle rule ${rule.name}`}
                />
              </TableCell>
              <TableCell className="text-right">
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon">
                      <MoreHorizontal className="h-4 w-4" />
                      <span className="sr-only">Rule actions</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem onClick={() => onEditRule && onEditRule(rule.id)}>Edit</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onToggleRule && onToggleRule(rule.id, !rule.enabled)}>
                      {rule.enabled ? "Disable" : "Enable"}
                    </DropdownMenuItem>
                    <DropdownMenuItem className="text-red-600" onClick={() => onDeleteRule && onDeleteRule(rule.id)}>
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
