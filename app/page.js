"use client"

import { useState, useEffect } from "react"
import { getSocket, disconnectSocket } from "@/lib/socket-client"
import Map from "../components/Map"

export default function LiveTracker() {
  const [currentTime, setCurrentTime] = useState("")
  const [shuttleData, setShuttleData] = useState([])

  const getShuttleTableData = () => {
    const tableData = []

    // Add actual shuttle data (up to 10 shuttles)
    for (let i = 0; i < Math.min(shuttleData.length, 10); i++) {
      tableData.push(shuttleData[i])
    }

    for (let i = shuttleData.length; i < 10; i++) {
      tableData.push({
        shuttle_number: "", // Leave blank instead of generating numbers
        available_seats: null,
        estimated_arrival: null,
        isPlaceholder: true,
      })
    }

    return tableData
  }

  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      const timeString = now.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      })
      setCurrentTime(timeString)
    }

    updateTime()
    const interval = setInterval(updateTime, 1000)

    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    let socket

    const initializeConnection = async () => {
      try {
        // Initial data fetch
        console.log("Fetching initial shuttle data...")
        const response = await fetch("/api/shuttles")

        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        }

        const data = await response.json()
        setShuttleData(data.shuttles || [])
        console.log("Initial data loaded:", data.shuttles?.length, "shuttles")

        // Small delay to ensure server is ready
        await new Promise((resolve) => setTimeout(resolve, 1000))

        // Initialize Socket.io connection
        console.log("Creating Socket.io client connection...")
        socket = getSocket()

        // Set up event handlers
        socket.on("connect", () => {
          console.log("Socket.io connected successfully")
        })

        socket.on("welcome", (data) => {
          console.log("Received welcome message:", data)
        })

        socket.on("disconnect", (reason) => {
          console.log("Socket.io disconnected:", reason)
        })

        socket.on("connect_error", (error) => {
          console.error("Socket.io connection error:", error)
        })

        socket.on("reconnect", (attemptNumber) => {
          console.log("Socket.io reconnected after", attemptNumber, "attempts")
        })

        socket.on("shuttle-update", (data) => {
          console.log("Received shuttle update:", data)

          if (data.type === "shuttle-location-update" && data.shuttle) {
            setShuttleData((prevData) => {
              const updatedData = prevData.map((shuttle) =>
                shuttle.shuttle_number === data.shuttle.shuttle_number ? { ...shuttle, ...data.shuttle } : shuttle,
              )

              // If shuttle doesn't exist, add it
              if (!updatedData.find((s) => s.shuttle_number === data.shuttle.shuttle_number)) {
                updatedData.push(data.shuttle)
              }

              return updatedData
            })
          }
        })
      } catch (error) {
        console.error("Error initializing connection:", error)
      }
    }

    initializeConnection()

    return () => {
      if (socket) {
        disconnectSocket()
      }
    }
  }, [])

  const getSeatColor = (seats) => {
    if (typeof seats === "number") {
      if (seats <= 2) return "text-red-600"
      if (seats <= 5) return "text-yellow-600"
      return "text-green-600"
    }
    return "text-gray-600"
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Header */}
      <div className="bg-green-700 text-white px-4 py-3 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <h1 className="text-xl font-semibold">evTraK</h1>
        </div>
        <div className="text-lg font-medium">{currentTime}</div>
      </div>

      {/* Map Section */}
      <div className="flex-1 relative bg-gray-200">
        <div className="w-full h-full absolute inset-0">
          <Map height="100%" shuttles={shuttleData} />
        </div>
      </div>

      {/* Shuttle Information Table */}
      <div className="bg-white">
        <div className="rounded-none border-0 shadow-none">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-green-600 text-white">
                  <th className="px-3 py-2 text-left text-sm font-medium">Shuttle #</th>
                  <th className="px-3 py-2 text-left text-sm font-medium">Available Seats</th>
                  <th className="px-3 py-2 text-left text-sm font-medium">ETA</th>
                </tr>
              </thead>
              <tbody>
                {getShuttleTableData().map((shuttle, index) => (
                  <tr
                    key={`shuttle-${shuttle.shuttle_number || "empty"}-${index}`}
                    className={index % 2 === 0 ? "bg-gray-50" : "bg-white"}
                  >
                    <td
                      className={`px-3 py-3 text-sm font-medium ${shuttle.isPlaceholder ? "text-gray-400" : "text-gray-900"}`}
                    >
                      {shuttle.shuttle_number || "—"}
                    </td>
                    <td
                      className={`px-3 py-3 text-sm font-medium ${
                        shuttle.isPlaceholder ? "text-gray-400" : "text-yellow-600"}`}
                    >
                      {shuttle.isPlaceholder ? "—" : shuttle.available_seats || "—"}
                    </td>
                    <td className={`px-3 py-3 text-sm ${shuttle.isPlaceholder ? "text-gray-400" : "text-gray-500"}`}>
                      {shuttle.isPlaceholder ? "—" : shuttle.estimated_arrival || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-green-700 text-white px-4 py-3 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <span className="text-sm">
            Active Shuttles: {shuttleData.filter((s) => s.latitude && s.longitude).length}
          </span>
        </div>
        <div className="text-lg font-bold">USC TC</div>
      </div>
    </div>
  )
}
