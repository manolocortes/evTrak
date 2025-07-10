"use client"

import { useState, useEffect } from "react"
import Map from "../components/Map"

export default function LiveTracker() {
  const [currentTime, setCurrentTime] = useState("")

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

  const shuttleData = [
    {
      number: 1,
      destination: "SAFAD → BUNZEL",
      seats: "5",
      remarks: "Standby",
      remarksColor: "text-gray-700",
      latitude: 10.354025,
      longitude: 123.912963,
    },
    {
      number: 2,
      destination: "BUNZEL → SAS",
      seats: "EMPTY",
      remarks: "Estimated 4:22 PM",
      remarksColor: "text-blue-600",
      latitude: 10.3542,
      longitude: 123.9120,
    },
  ]

  // Create 10 slots for shuttles, filling with empty objects if needed
  const totalSlots = 2;
  const filledShuttles = [
    ...shuttleData,
    ...Array.from({ length: totalSlots - shuttleData.length }, (_, i) => ({
      number: shuttleData.length + i + 1,
      destination: "",
      seats: "",
      remarks: "",
      remarksColor: "text-gray-700",
    })),
  ];

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col">
      {/* Header */}
      <div className="bg-green-700 text-white px-4 py-3 flex justify-between items-center">
        <h1 className="text-xl font-semibold">Live Tracker</h1>
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
                  <th className="px-3 py-2 text-left text-sm font-medium">Shuttle Number</th>
                  <th className="px-3 py-2 text-left text-sm font-medium">Destination</th>
                  <th className="px-3 py-2 text-left text-sm font-medium">Available Seats</th>
                  <th className="px-3 py-2 text-left text-sm font-medium">Remarks</th>
                </tr>
              </thead>
              <tbody>
                {filledShuttles.map((shuttle, index) => (
                  <tr key={shuttle.number} className={index % 2 === 0 ? "bg-gray-50" : "bg-white"}>
                    <td className="px-3 py-3 text-sm font-medium text-gray-900">{shuttle.number}</td>
                    <td className="px-3 py-3 text-sm text-gray-700">{shuttle.destination}</td>
                    <td className="px-3 py-3 text-sm text-gray-700 font-medium">{shuttle.seats}</td>
                    <td className={`px-3 py-3 text-sm font-medium ${shuttle.remarksColor}`}>{shuttle.remarks}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Footer */}
      <div className="bg-green-700 text-white px-4 py-3 flex justify-between items-center">
        <div className="flex items-center gap-2">
          <span className="text-sm">Powered By</span>
          <div className="flex gap-2">
            <div className="bg-white text-green-700 px-2 py-1 rounded text-xs font-semibold">Leaflet</div>
            <div className="bg-white text-gray-700 px-2 py-1 rounded text-xs">OpenStreetMap</div>
          </div>
        </div>
        <div className="text-lg font-bold">USC TC</div>
      </div>
    </div>
  )
}
