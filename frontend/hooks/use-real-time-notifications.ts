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
  const [reconnectAttempts, setReconnectAttempts] = useState(0)
  const maxReconnectAttempts = 5

  useEffect(() => {
    let eventSource: EventSource | null = null
    let reconnectTimeoutId: NodeJS.Timeout | null = null
    let isActive = true

    const connect = () => {
      if (!isActive) return

      try {
        eventSource = new EventSource("/api/notifications/stream")
        setIsConnected(true)

        eventSource.onmessage = (event) => {
          if (!isActive) return

          try {
            const notification: RealtimeNotification = JSON.parse(event.data)

            if (setNotifications) {
              setNotifications((prevNotifications) => {
                // Avoid duplicates and limit to 50 most recent
                const filtered = prevNotifications.filter(n => n.id !== notification.id)
                return [notification, ...filtered].slice(0, 50)
              })
            }

            // Reset reconnect attempts on successful message
            setReconnectAttempts(0)

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
          if (!isActive) return

          console.error("EventSource failed:", error)
          setIsConnected(false)
          
          if (eventSource) {
            eventSource.close()
            eventSource = null
          }

          // Implement exponential backoff retry
          if (reconnectAttempts < maxReconnectAttempts) {
            const backoffDelay = Math.min(1000 * Math.pow(2, reconnectAttempts), 30000) // Max 30 seconds
            reconnectTimeoutId = setTimeout(() => {
              if (isActive) {
                setReconnectAttempts(prev => prev + 1)
                connect()
              }
            }, backoffDelay)
          } else {
            securityToasts.error("Connection Failed", "Could not establish connection to notification stream after multiple attempts.")
          }
        }

        eventSource.onopen = () => {
          if (isActive) {
            setIsConnected(true)
            setReconnectAttempts(0)
          }
        }

      } catch (error) {
        console.error("Failed to create EventSource:", error)
        setIsConnected(false)
      }
    }

    // Initial connection
    connect()

    return () => {
      isActive = false
      setIsConnected(false)
      
      if (eventSource) {
        eventSource.close()
      }
      
      if (reconnectTimeoutId) {
        clearTimeout(reconnectTimeoutId)
      }
    }
  }, []) // Removed setNotifications from dependencies to prevent reconnections

  return { isConnected, reconnectAttempts }
}
