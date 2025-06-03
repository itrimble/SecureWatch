// Using Edge runtime for SSE is often more scalable
// export const runtime = 'edge'; // Next.js might not support this, default to Node.js runtime

export async function GET() {
  let counter = 0
  let intervalId: NodeJS.Timeout | null = null
  let isClosed = false
  
  const stream = new ReadableStream({
    start(controller) {
      intervalId = setInterval(() => {
        if (isClosed) {
          if (intervalId) clearInterval(intervalId)
          return
        }
        
        counter++
        const mockNotification = {
          id: `notif-${Date.now()}-${counter}`,
          type: counter % 5 === 0 ? "critical_alert" : counter % 3 === 0 ? "system_update" : "security_alert",
          title: `Mock Notification #${counter}`,
          description: `This is mock notification number ${counter}. Something happened!`,
          timestamp: new Date().toLocaleTimeString(),
          source: "Mock SSE Stream",
          severity:
            counter % 5 === 0 ? "critical" : counter % 4 === 0 ? "high" : counter % 3 === 0 ? "info" : "warning",
          actions: ["View Details", "Acknowledge"],
          read: false,
        }
        
        try {
          const data = `data: ${JSON.stringify(mockNotification)}\n\n`
          controller.enqueue(new TextEncoder().encode(data))
        } catch (error) {
          // Controller is closed, stop the interval
          isClosed = true
          if (intervalId) clearInterval(intervalId)
        }

        if (counter > 100) {
          // Stop after 100 messages for demo purposes
          isClosed = true
          if (intervalId) clearInterval(intervalId)
          controller.close()
        }
      }, 3000) // Send a notification every 3 seconds
    },
    cancel() {
      // Called when the client disconnects
      isClosed = true
      if (intervalId) clearInterval(intervalId)
    },
  })

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  })
}
