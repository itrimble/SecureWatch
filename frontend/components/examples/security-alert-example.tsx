"use client"

import { securityToasts } from "@/lib/security-toasts"
import { Button } from "@/components/ui/button" // Using shadcn Button

export function SecurityAlertExample() {
  // 🚨 Critical Security Alert
  const handleCriticalAlert = () => {
    securityToasts.threatDetected({
      title: "CRITICAL: Multiple Failed Login Attempts",
      severity: "critical",
      details: 'User "admin" has 8 failed attempts from IP 192.168.1.100',
      id: "incident-123",
    })
  }

  // ✅ Integration Success
  const handleIntegrationSuccess = () => {
    securityToasts.integrationStatus("Claude AI", "connected")
  }

  const handleIntegrationError = () => {
    securityToasts.integrationStatus("VirusTotal API", "error")
  }

  // ⚠️ Warning Notification
  const handleRateLimitWarning = () => {
    securityToasts.warning("API Rate Limit Warning", "Approaching monthly limit (85% used)")
  }

  // 📊 Info Notification
  const handleTrainingUpdate = () => {
    securityToasts.trainingProgress("John Doe", "MITRE ATT&CK Framework", 75)
  }

  const handleUserActivity = () => {
    securityToasts.userActivity("Alice Wonderland", 'Accessed critical asset "DB-PROD-01"', "high")
  }

  return (
    <div className="space-y-4 p-4 bg-card border rounded-lg shadow">
      <h3 className="text-lg font-semibold mb-4">Test Toast Notifications</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Button onClick={handleCriticalAlert} variant="destructive" className="w-full">
          Test Critical Alert
        </Button>
        <Button
          onClick={handleIntegrationSuccess}
          variant="default"
          className="w-full bg-green-600 hover:bg-green-700 text-white"
        >
          Test Integration Success
        </Button>
        <Button onClick={handleIntegrationError} variant="destructive" className="w-full">
          Test Integration Error
        </Button>
        <Button
          onClick={handleRateLimitWarning}
          variant="outline"
          className="w-full border-yellow-500 text-yellow-500 hover:bg-yellow-50"
        >
          Test Warning Toast
        </Button>
        <Button onClick={handleTrainingUpdate} variant="default" className="w-full">
          Test Info Toast
        </Button>
        <Button onClick={handleUserActivity} variant="secondary" className="w-full">
          Test User Activity (High Risk)
        </Button>
      </div>
    </div>
  )
}
