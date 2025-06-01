// Using Edge runtime for SSE is often more scalable
// export const runtime = 'edge'; // Next.js might not support this, default to Node.js runtime

export async function GET() {
  let counter = 0
  const stream = new ReadableStream({
    start(controller) {
      const intervalId = setInterval(() => {
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
        const data = `data: ${JSON.stringify(mockNotification)}\n\n`
        controller.enqueue(new TextEncoder().encode(data))

        if (counter > 100) {
          // Stop after 100 messages for demo purposes
          clearInterval(intervalId)
          controller.close()
        }
      }, 3000) // Send a notification every 3 seconds

      // Cleanup when the connection is closed by the client
      controller.signal.addEventListener("abort", () => {
        clearInterval(intervalId)
        console.log("SSE stream aborted by client.")
      })
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
