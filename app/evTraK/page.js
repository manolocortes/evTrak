"use client"

import { useState, useEffect } from "react"
import { getSocket, disconnectSocket } from "@/lib/socket-client"
import Map from "../../components/Map"

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
  const [clientLocation, setClientLocation] = useState('');

  const getShuttleTableData = () => {
    const shuttlesForTable = shuttleData.filter(s => !s.isAtDestination);
    const tableData = [];

    for (let i = 0; i < Math.min(shuttlesForTable.length, 10); i++) {
        const shuttle = shuttlesForTable[i];
        const max = Number(shuttle.max_capacity ?? 0);
        const current = Number(shuttle.current_capacity ?? 0);
        const available_seats = max - current;
        tableData.push({ ...shuttle, available_seats });
    }
    
    for (let i = shuttlesForTable.length; i < 10; i++) {
      tableData.push({ shuttle_id: "", available_seats: null, eta: null, isPlaceholder: true });
    }
    return tableData;
  }

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const timeString = now.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", hour12: true });
      setCurrentTime(timeString);
    };
    updateTime();
    const interval = setInterval(updateTime, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const location = params.get('location');
    if (location) {
        setClientLocation(location.toUpperCase());
    }
    
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

        socket.on("shuttle-update", (data) => {
          if (data.type === "shuttle-location-update" && data.shuttle) {
            setShuttleData((prevData) => {
              const incomingShuttle = data.shuttle;
              const shuttleIndex = prevData.findIndex((s) => s.shuttle_id === incomingShuttle.shuttle_id);

              if (shuttleIndex > -1) {
                  const newData = [...prevData];
                  const oldShuttle = newData[shuttleIndex];
                  newData[shuttleIndex] = { ...oldShuttle, ...incomingShuttle };
                  return newData;
              } else {
                  return [...prevData, incomingShuttle];
              }
            });
          }
          
          if (data.type === "shuttle-geofence-event" && data.event === "exit" && clientLocation && data.location === clientLocation) {
            const message = `Shuttle ${data.shuttle.shuttle_id} has left the ${clientLocation} area.`;
            setNotification(message);
            setShuttleData((prevData) => prevData.map((shuttle) => 
                shuttle.shuttle_id === data.shuttle.shuttle_id ? { ...shuttle, isAtDestination: true } : shuttle
            ));
            setTimeout(() => setNotification(null), 7000);
          }

          if (data.type === "shuttle-reentry-event" && data.shuttle) {
            const message = `Shuttle ${data.shuttle.shuttle_id} has re-entered the route.`;
            setNotification(message);
            setShuttleData((prevData) => prevData.map((shuttle) => 
                shuttle.shuttle_id === data.shuttle.shuttle_id ? { ...shuttle, isAtDestination: false } : shuttle
            ));
            setTimeout(() => setNotification(null), 7000);
          }
        });
      } catch (error) {
        console.error("Error initializing connection:", error);
      }
    };
    initializeConnection();
    return () => { if (socket) disconnectSocket() };
  }, [clientLocation]);

  const getSeatColor = (seats) => {
    if (typeof seats !== 'number') return "text-gray-600";
    if (seats <= 2) return "text-red-600";
    if (seats <= 5) return "text-yellow-600";
    return "text-green-600";
  };
  
  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <div className="bg-green-700 text-white px-4 py-3 flex justify-between items-center">
        <h1 className="text-xl font-semibold">evTraK - {clientLocation || 'Main View'}</h1>
        <div className="text-lg font-medium">{currentTime}</div>
      </div>
      <Notification message={notification} onDismiss={() => setNotification(null)} />
      <div className="flex-1 relative bg-gray-200">
        <div className="w-full h-full absolute inset-0">
          <Map height="100%" shuttles={shuttleData} />
        </div>
      </div>
      <div className="bg-white">
        <table className="w-full">
          <thead>
            <tr className="bg-green-600 text-white">
              <th className="px-3 py-2 text-left text-sm font-medium">Shuttle ID</th>
              <th className="px-3 py-2 text-left text-sm font-medium">Available Seats</th>
              <th className="px-3 py-2 text-left text-sm font-medium">ETA</th>
            </tr>
          </thead>
          <tbody>
            {getShuttleTableData().map((shuttle, index) => (
              <tr key={shuttle.shuttle_id || `empty-${index}`} className={index % 2 === 0 ? "bg-gray-50" : "bg-white"}>
                <td className={`px-3 py-3 text-sm font-medium ${shuttle.isPlaceholder ? "text-gray-400" : "text-gray-900"}`}>{shuttle.shuttle_id || "—"}</td>
                <td className={`px-3 py-3 text-sm font-medium ${shuttle.isPlaceholder ? "text-gray-400" : getSeatColor(shuttle.available_seats)}`}>{shuttle.isPlaceholder ? "—" : shuttle.available_seats ?? "—"}</td>
                <td className={`px-3 py-3 text-sm ${shuttle.isPlaceholder ? "text-gray-400" : "text-gray-500"}`}>{shuttle.isPlaceholder ? "—" : shuttle.eta || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="bg-green-700 text-white px-4 py-3 text-lg font-bold">USC TC</div>
    </div>
  );
}