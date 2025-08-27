"use client"

import { useState, useEffect } from "react"
import { getSocket, disconnectSocket } from "@/lib/socket-client"
import Map from "../../components/Map"

// A simple Notification component
function Notification({ message, onDismiss }) {
  if (!message) return null;
  return (
    <div className="absolute top-20 left-1/2 -translate-x-1/2 z-[1000] bg-green-600 text-white font-bold py-3 px-6 rounded-lg shadow-lg animate-fade-in-down">
      <p>{message}</p>
      <button onClick={onDismiss} className="absolute top-1 right-2 text-white font-bold">&times;</button>
    </div>
  );
}

export default function LiveTracker() {
  const [currentTime, setCurrentTime] = useState("")
  const [shuttleData, setShuttleData] = useState([])
  const [notification, setNotification] = useState(null);

  // This function filters out shuttles that have passed the destination
  const getShuttleTableData = () => {
    const shuttlesForTable = shuttleData.filter(s => !s.isAtDestination);
    
    const tableData = []
    for (let i = 0; i < Math.min(shuttlesForTable.length, 10); i++) {
      tableData.push(shuttlesForTable[i])
    }
    // *** THE FIX: Corrected the syntax in the for loop condition ***
    for (let i = shuttlesForTable.length; i < 10; i++) {
      tableData.push({
        shuttle_number: "",
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
        const response = await fetch("/api/shuttles")
        if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`)
        const data = await response.json()
        setShuttleData(data.shuttles || [])
        
        await new Promise((resolve) => setTimeout(resolve, 1000));

        socket = getSocket()

        socket.on("connect", () => console.log("Socket.io connected successfully"));
        socket.on("disconnect", (reason) => console.log("Socket.io disconnected:", reason));
        socket.on("connect_error", (error) => console.error("Socket.io connection error:", error));

        socket.on("shuttle-update", (data) => {
          console.log("Received shuttle update:", data);

          if (data.type === "shuttle-location-update" && data.shuttle) {
            setShuttleData((prevData) => {
              const existingShuttle = prevData.find(s => s.shuttle_number === data.shuttle.shuttle_number);
              const isAtDestination = existingShuttle ? existingShuttle.isAtDestination : false;

              const updatedData = prevData.map((shuttle) =>
                shuttle.shuttle_number === data.shuttle.shuttle_number 
                  ? { ...shuttle, ...data.shuttle, isAtDestination } 
                  : shuttle
              );

              if (!updatedData.find((s) => s.shuttle_number === data.shuttle.shuttle_number)) {
                updatedData.push(data.shuttle);
              }
              return updatedData;
            });
          }
          
          // Handles the EXIT event from the main geofence (SAS/SAFAD)
          if (data.type === "shuttle-geofence-event" && data.shuttle) {
            const message = `Shuttle #${data.shuttle.shuttle_number} has left the destination area.`;
            setNotification(message);
            
            setShuttleData((prevData) => 
              prevData.map((shuttle) => 
                shuttle.shuttle_number === data.shuttle.shuttle_number
                  ? { ...shuttle, isAtDestination: true } // Hides from table
                  : shuttle
              )
            );

            setTimeout(() => setNotification(null), 7000);
          }

          // *** NEW LOGIC: Handles the RE-ENTRY event from the Portal geofence ***
          if (data.type === "shuttle-reentry-event" && data.shuttle) {
            const message = `Shuttle #${data.shuttle.shuttle_number} has re-entered the route.`;
            setNotification(message);
            
            setShuttleData((prevData) => 
              prevData.map((shuttle) => 
                shuttle.shuttle_number === data.shuttle.shuttle_number
                  ? { ...shuttle, isAtDestination: false } // Makes it reappear in the table
                  : shuttle
              )
            );

            setTimeout(() => setNotification(null), 7000);
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
        <h1 className="text-xl font-semibold">evTraK</h1>
        <div className="text-lg font-medium">{currentTime}</div>
      </div>

      <Notification message={notification} onDismiss={() => setNotification(null)} />

      <div className="flex-1 relative bg-gray-200">
        <div className="w-full h-full absolute inset-0">
          <Map height="100%" shuttles={shuttleData} />
        </div>
      </div>

      <div className="bg-white">
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
                <tr key={`shuttle-${shuttle.shuttle_number || "empty"}-${index}`} className={index % 2 === 0 ? "bg-gray-50" : "bg-white"}>
                  <td className={`px-3 py-3 text-sm font-medium ${shuttle.isPlaceholder ? "text-gray-400" : "text-gray-900"}`}>
                    {shuttle.shuttle_number || "—"}
                  </td>
                  <td className={`px-3 py-3 text-sm font-medium ${shuttle.isPlaceholder ? "text-gray-400" : getSeatColor(shuttle.available_seats)}`}>
                    {shuttle.isPlaceholder ? "—" : shuttle.available_seats ?? "—"}
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

      {/* Footer */}
      <div className="bg-green-700 text-white px-4 py-3 flex justify-between items-center">
        <div className="text-lg font-bold">USC TC</div>
      </div>
    </div>
  )
}
