"use client"

import type React from "react"

import { useEffect, useState } from "react"
import { securityToasts } from "@/lib/security-toasts" // Using the new utility

// Define a type for your notification structure
interface RealtimeNotification {
  id: string
  type:
    | "critical_alert"
    | "security_alert"
    | "system_update"
    | "integration_alert"
    | "user_activity"
    | "training_reminder"
  title: string
  description: string
  timestamp: string
  source: string
  severity: "critical" | "high" | "medium" | "low" | "info" | "warning" // Expanded severity
  actions?: { label: string; onClick: string }[] // Example: onClick could be a route or function ID
  read: boolean
}

export function useRealTimeNotifications(
  setNotifications?: React.Dispatch<React.SetStateAction<RealtimeNotification[]>>, // Optional setter for a list
) {
  const [isConnected, setIsConnected] = useState(false)

  useEffect(() => {
    const eventSource = new EventSource("/api/notifications/stream")
    setIsConnected(true)

    eventSource.onmessage = (event) => {
      try {
        const notification: RealtimeNotification = JSON.parse(event.data)

        if (setNotifications) {
          setNotifications((prevNotifications) => [notification, ...prevNotifications].slice(0, 50)) // Keep last 50
        }

        // Use securityToasts for displaying
        switch (notification.severity) {
          case "critical":
            securityToasts.threatDetected({
              title: notification.title,
              severity: "critical",
              details: notification.description,
              id: notification.id,
            })
            break
          case "high":
            securityToasts.threatDetected({
              title: notification.title,
              severity: "high",
              details: notification.description,
              id: notification.id,
            })
            break
          case "medium":
          case "warning": // Group medium and warning
            securityToasts.warning(notification.title, notification.description)
            break
          case "low":
          case "info": // Group low and info
          default:
            securityToasts.info(notification.title, notification.description)
            break
        }
      } catch (error) {
        console.error("Failed to parse notification data:", error)
        securityToasts.error("Notification Error", "Received an invalid notification from the server.")
      }
    }

    eventSource.onerror = (error) => {
      console.error("EventSource failed:", error)
      securityToasts.error("Connection Lost", "Lost connection to the notification stream.")
      setIsConnected(false)
      eventSource.close()
      // Optional: Implement retry logic here
    }

    return () => {
      setIsConnected(false)
      eventSource.close()
    }
  }, [setNotifications])

  return { isConnected }
}
