"use client"

import { useState, useEffect } from "react"
import { getSocket, disconnectSocket } from "@/lib/socket-client"
import Map from "../../components/Map"
// No longer importing geo-utils

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
  const [currentTime, setCurrentTime] = useState("");
  const [shuttleData, setShuttleData] = useState([]);
  const [notification, setNotification] = useState(null);
  const [clientLocation, setClientLocation] = useState('PORTAL'); // Default destination
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isClient, setIsClient] = useState(false);

  const getShuttleTableData = () => {
    // ✨ Sort shuttles based on eta_seconds for the current clientLocation
    const sortedShuttles = [...shuttleData]
        .filter(s => !s.isAtDestination)
        .sort((a, b) => {
            // Get the relevant eta_seconds key (e.g., 'eta_seconds_PORTAL')
            const etaKey = `eta_seconds_${clientLocation}`;

            // Get ETA values, defaulting to Infinity if N/A, Idle, or missing
            const etaAString = a[etaKey];
            const etaBString = b[etaKey];

            // Convert valid numeric strings to numbers, otherwise treat as Infinity
            const etaA = (etaAString && !isNaN(etaAString)) ? parseInt(etaAString, 10) : Infinity;
            const etaB = (etaBString && !isNaN(etaBString)) ? parseInt(etaBString, 10) : Infinity;
            
            // Handle cases where ETA might be 0 (meaning Idle or just arrived)
            const effectiveEtaA = etaA === 0 ? Infinity : etaA;
            const effectiveEtaB = etaB === 0 ? Infinity : etaB;

            return effectiveEtaA - effectiveEtaB; // Sort ascending
        });

    const tableData = [];
    for (let i = 0; i < Math.min(sortedShuttles.length, 10); i++) {
      const shuttle = sortedShuttles[i];
      // Select the correct display ETA based on clientLocation
      const displayEta = shuttle[`eta_${clientLocation}`] || "N/A";
      tableData.push({...shuttle, displayEta: displayEta });
    }
    // Add placeholders
    for (let i = tableData.length; i < 10; i++) {
      tableData.push({ shuttle_id: "", available_seats: null, displayEta: null, isPlaceholder: true });
    }
    return tableData;
  };

  useEffect(() => {
    setIsClient(true);
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
    setClientLocation(location ? location.toUpperCase() : 'PORTAL');
    
    let socket;
    const initializeConnection = async () => {
      setIsLoading(true);
      setError(null);
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL;
        const apiUser = process.env.NEXT_PUBLIC_API_USER;
        const apiPass = process.env.NEXT_PUBLIC_API_PASS;
        const authToken = Buffer.from(`${apiUser}:${apiPass}`).toString('base64');
        const authHeaders = { 'Authorization': `Basic ${authToken}` };

        const shuttleResponse = await fetch(`${apiUrl}/api/shuttles`, { headers: authHeaders });
        if (!shuttleResponse.ok) throw new Error(`API fetch failed`);
        
        const initialShuttles = await shuttleResponse.json();
        setShuttleData(initialShuttles.shuttles || []);
        
        socket = getSocket();

        socket.on("shuttle-update", (data) => {
          
          if (data.type === "shuttle-location-update" && data.shuttle) {
            setShuttleData((prevData) => {
              const incomingShuttle = data.shuttle; // Contains all ETAs or "Idle"
              
              const shuttleIndex = prevData.findIndex((s) => s.shuttle_id === incomingShuttle.shuttle_id);
              if (shuttleIndex > -1) {
                  const newData = [...prevData];
                  newData[shuttleIndex] = { ...newData[shuttleIndex], ...incomingShuttle };
                  return newData;
              } else {
                  return [...prevData, incomingShuttle];
              }
            });
          }
          
          if (data.type === "shuttle-capacity-update" && data.shuttle) {
            setShuttleData((prevData) => {
              const capacityUpdate = data.shuttle;
              const shuttleIndex = prevData.findIndex((s) => s.shuttle_id === capacityUpdate.shuttle_id);

              if (shuttleIndex > -1) {
                const newData = [...prevData];
                newData[shuttleIndex] = { 
                  ...newData[shuttleIndex], 
                  current_capacity: capacityUpdate.current_capacity,
                  available_seats: capacityUpdate.available_seats
                };
                return newData;
              }
              return prevData;
            });
          }
          
          if (data.type === "shuttle-geofence-event" && data.event === "enter" && clientLocation && data.location === clientLocation) {
            const message = `Shuttle ${data.shuttle.shuttle_id} has arrived at ${clientLocation}.`;
            setNotification(message);
            setTimeout(() => setNotification(null), 7000);
          }
          if (data.type === "shuttle-geofence-event" && data.event === "exit" && clientLocation && data.location === clientLocation) {
            const message = `Shuttle ${data.shuttle.shuttle_id} has left the ${clientLocation} area.`;
            setNotification(message);
            setShuttleData((prevData) => prevData.map((shuttle) => shuttle.shuttle_id === data.shuttle.shuttle_id ? { ...shuttle, isAtDestination: true } : shuttle));
            setTimeout(() => setNotification(null), 7000);
          }
          if (data.type === "shuttle-reentry-event" && data.event === "enter" && data.shuttle) {
             const message = `Shuttle ${data.shuttle.shuttle_id} has returned to the Portal area.`;
             setNotification(message);
             setShuttleData((prevData) => prevData.map((shuttle) => shuttle.shuttle_id === data.shuttle.shuttle_id ? { ...shuttle, isAtDestination: false } : shuttle));
             setTimeout(() => setNotification(null), 7000);
          }
        });
      } catch (error) {
        console.error("Error initializing connection:", error);
        setError("Could not connect to the shuttle service. Please try again later.");
      } finally {
        setIsLoading(false);
      }
    };
    initializeConnection();
    return () => { if (socket) disconnectSocket() };
  }, [clientLocation]); 

  const getSeatColor = (seats) => {
    const numSeats = parseInt(seats, 10);
    if (isNaN(numSeats)) return "text-gray-600";
    if (numSeats <= 2) return "text-red-600";
    if (numSeats <= 5) return "text-yellow-600";
    return "text-green-600";
  };
  
  if (isLoading) {
    return <div className="flex items-center justify-center min-h-screen bg-gray-100 text-lg font-medium">Loading Shuttle Data...</div>;
  }
  
  if (error) {
    return <div className="flex items-center justify-center min-h-screen bg-gray-100 text-red-600 text-lg font-medium">{error}</div>;
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      <div className="bg-green-700 text-white px-4 py-3 flex justify-between items-center">
        <h1 className="text-xl font-semibold">evTraK - {clientLocation || 'Main View'}</h1>
        <div className="text-lg font-medium">{isClient ? currentTime : ""}</div>
      </div>
      <Notification message={notification} onDismiss={() => setNotification(null)} />
      <div className="flex-1 relative bg-gray-200">
        <div className="w-full h-full absolute inset-0">
          <Map height="100%" shuttles={shuttleData} />
        </div>
      </div>
      <div className="bg-white">
        <table className="w-full">
          <thead className="bg-green-600 text-white">
            <tr>
              <th className="px-3 py-2 text-left text-sm font-medium">Shuttle ID</th>
              <th className="px-3 py-2 text-left text-sm font-medium">Available Seats</th>
              <th className="px-3 py-2 text-left text-sm font-medium">ETA ({clientLocation})</th> 
            </tr>
          </thead>
          <tbody>
            {getShuttleTableData().map((shuttle, index) => (
              <tr key={shuttle.shuttle_id || `empty-${index}`} className={index % 2 === 0 ? "bg-gray-50" : "bg-white"}>
                <td className={`px-3 py-3 text-sm font-medium ${shuttle.isPlaceholder ? "text-gray-400" : "text-gray-900"}`}>{shuttle.shuttle_id || "—"}</td>
                <td className={`px-3 py-3 text-sm font-medium ${shuttle.isPlaceholder ? "text-gray-400" : getSeatColor(shuttle.available_seats)}`}>{shuttle.isPlaceholder ? "—" : shuttle.available_seats ?? "—"}</td>
                <td className={`px-3 py-3 text-sm ${shuttle.isPlaceholder ? "text-gray-400" : "text-gray-500"}`}>{shuttle.isPlaceholder ? "—" : shuttle.displayEta || "—"}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="bg-green-700 text-white px-4 py-3 text-lg font-bold">USC TC</div>
    </div>
  );
}