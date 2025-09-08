"use client"

import { useState, useEffect } from "react"
import { getSocket, disconnectSocket } from "@/lib/socket-client"
import Map from "../../components/Map" // Adjusted path to component

export default function MobileTracker() {
  const [currentTime, setCurrentTime] = useState("")
  const [shuttleData, setShuttleData] = useState([])

  useEffect(() => {
    // Set up the clock
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
    let socket;

    const initializeConnection = async () => {
      try {
        // Initial fetch to get the current state of all shuttles
        const response = await fetch("/api/shuttles");
        if (!response.ok) throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        const data = await response.json();
        
        // Filter out any shuttles that don't have location data to start with
        const activeShuttles = data.shuttles ? data.shuttles.filter(s => s.latitude && s.longitude) : [];
        setShuttleData(activeShuttles);
        
        await new Promise((resolve) => setTimeout(resolve, 1000));

        socket = getSocket();

        socket.on("connect", () => console.log("Socket.io connected successfully"));
        socket.on("disconnect", (reason) => console.log("Socket.io disconnected:", reason));
        socket.on("connect_error", (error) => console.error("Socket.io connection error:", error));

        socket.on("shuttle-update", (data) => {
          // This mobile version only cares about location updates.
          // It ignores "shuttle-geofence-event" and "shuttle-reentry-event".
          if (data.type === "shuttle-location-update" && data.shuttle) {
            setShuttleData((prevData) => {
              const incomingShuttle = data.shuttle;
              const shuttleIndex = prevData.findIndex(
                  (s) => Number(s.shuttle_number) === Number(incomingShuttle.shuttle_number)
              );

              if (shuttleIndex > -1) {
                  // If shuttle exists, update its data
                  const newData = [...prevData];
                  newData[shuttleIndex] = incomingShuttle;
                  return newData;
              } else {
                  // If it's a new shuttle, add it to the list
                  return [...prevData, incomingShuttle];
              }
            });
          }
        });
      } catch (error) {
        console.error("Error initializing connection:", error);
      }
    };

    initializeConnection();

    return () => {
      if (socket) {
        disconnectSocket();
      }
    };
  }, []); // Empty dependency array ensures this runs only once

  const getSeatColor = (seats) => {
    const numSeats = Number(seats);
    if (isNaN(numSeats)) return "text-gray-600";
    if (numSeats <= 2) return "text-red-600";
    if (numSeats <= 5) return "text-yellow-600";
    return "text-green-600";
  };
  
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Header */}
      <div className="bg-green-700 text-white px-4 py-3 flex justify-between items-center">
        <h1 className="text-xl font-semibold">evTraK</h1>
        <div className="text-lg font-medium">{currentTime}</div>
      </div>

      {/* Map Container */}
      <div className="flex-1 relative bg-gray-200">
        <div className="w-full h-full absolute inset-0">
          <Map height="100%" shuttles={shuttleData} />
        </div>
      </div>

      {/* Dynamic Shuttle Information Table */}
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
              {shuttleData.length > 0 ? (
                shuttleData.map((shuttle, index) => (
                  <tr key={`shuttle-${shuttle.shuttle_number}-${index}`} className={index % 2 === 0 ? "bg-gray-50" : "bg-white"}>
                    <td className="px-3 py-3 text-sm font-medium text-gray-900">
                      {shuttle.shuttle_number}
                    </td>
                    <td className={`px-3 py-3 text-sm font-medium ${getSeatColor(shuttle.available_seats)}`}>
                      {shuttle.available_seats ?? "—"}
                    </td>
                    <td className="px-3 py-3 text-sm text-gray-500">
                      {shuttle.estimated_arrival || "—"}
                    </td>
                  </tr>
                ))
              ) : (
                // Display a message when no shuttles are active
                <tr>
                  <td colSpan="3" className="text-center py-4 text-gray-500">
                    No active shuttles at the moment.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-green-700 text-white px-4 py-3 flex justify-between items-center">
        <div className="text-lg font-bold">USC TC</div>
      </div>
    </div>
  );
}