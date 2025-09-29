"use client"

import { useState, useEffect } from "react";
import { getSocket, disconnectSocket } from "@/lib/socket-client";
import Map from "../../components/Map";

export default function LiveTracker() {
  const [currentTime, setCurrentTime] = useState("");
  const [shuttleData, setShuttleData] = useState([]);

  // This function now prepares the data directly for the dynamic table
  const getShuttleTableData = () => {
    return shuttleData.map(shuttle => {
      const max = Number(shuttle.max_capacity ?? 0);
      const current = Number(shuttle.current_capacity ?? 0);
      const available_seats = max - current;
      return { ...shuttle, available_seats };
    });
  };

  useEffect(() => {
    // Sets up the clock
    const updateTime = () => {
      const now = new Date();
      const timeString = now.toLocaleTimeString("en-US", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: true,
      });
      setCurrentTime(timeString);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    let socket;
    const initializeConnection = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL;
        const apiUser = process.env.NEXT_PUBLIC_API_USER;
        const apiPass = process.env.NEXT_PUBLIC_API_PASS;

        // Create the Basic Auth token
        const authToken = Buffer.from(`${apiUser}:${apiPass}`).toString('base64');

        const response = await fetch(`${apiUrl}/api/shuttles`, {
          headers: {
            'Authorization': `Basic ${authToken}`
          }
        });

        if (!response.ok) {
          throw new Error(`Authorization failed with status: ${response.status}`);
        }

        const data = await response.json();
        setShuttleData(data.shuttles || []);

        socket = getSocket();

        // Simplified listener: only handles location updates
        socket.on("shuttle-update", (data) => {
          if (data.type === "shuttle-location-update" && data.shuttle) {
            setShuttleData((prevData) => {
              const incomingShuttle = data.shuttle;
              const shuttleIndex = prevData.findIndex(
                (s) => s.shuttle_id === incomingShuttle.shuttle_id
              );

              if (shuttleIndex > -1) {
                // Update existing shuttle
                const newData = [...prevData];
                newData[shuttleIndex] = { ...newData[shuttleIndex], ...incomingShuttle };
                return newData;
              } else {
                // Add new shuttle if not found
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
      if (socket) disconnectSocket();
    };
  }, []);

  const getSeatColor = (seats) => {
    if (typeof seats !== 'number') return "text-gray-600";
    if (seats <= 2) return "text-red-600";
    if (seats <= 5) return "text-yellow-600";
    return "text-green-600";
  };
  
  const shuttleTableData = getShuttleTableData();

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <header className="bg-green-700 text-white px-4 py-3 flex justify-between items-center shadow-md">
        <h1 className="text-xl font-semibold">evTraK - Live Shuttle Tracker</h1>
        <div className="text-lg font-medium">{currentTime}</div>
      </header>
      
      <main className="flex-1 relative bg-gray-200">
        <div className="w-full h-full absolute inset-0">
          <Map height="100%" shuttles={shuttleData} />
        </div>
      </main>
      
      <div className="bg-white border-t border-gray-200">
        <table className="w-full">
          <thead className="bg-green-600 text-white">
            <tr>
              <th className="px-4 py-2 text-left text-sm font-medium uppercase tracking-wider">Shuttle ID</th>
              <th className="px-4 py-2 text-left text-sm font-medium uppercase tracking-wider">Available Seats</th>
              <th className="px-4 py-2 text-left text-sm font-medium uppercase tracking-wider">ETA</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {shuttleTableData.length > 0 ? (
              shuttleTableData.map((shuttle, index) => (
                <tr key={shuttle.shuttle_id} className={index % 2 === 0 ? "bg-gray-50" : "bg-white"}>
                  <td className="px-4 py-3 text-sm font-medium text-gray-900">{shuttle.shuttle_id}</td>
                  <td className={`px-4 py-3 text-sm font-bold ${getSeatColor(shuttle.available_seats)}`}>
                    {shuttle.available_seats ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-500">{shuttle.eta || "—"}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="3" className="text-center py-10 px-4 text-gray-500">
                  No active shuttles at the moment.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <footer className="bg-green-700 text-white px-4 py-3 text-lg font-bold text-center">
        USC TC
      </footer>
    </div>
  );
}
