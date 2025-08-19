import "leaflet/dist/leaflet.css";
import { MapContainer, TileLayer, Marker } from "react-leaflet";
import L from "leaflet";

function GetIcon(shuttle_number) {
  return new L.DivIcon({
    html: `
        <div style="position: relative; display: flex; flex-direction: column; align-items: center;">
          <img src="https://www.clipartmax.com/png/small/169-1691337_icon-transfer-bus-circle-logo.png" 
               style="width: 32px; height: 32px;" />
          <div style="
            background: #16a34a; 
            color: white; 
            padding: 2px 6px; 
            border-radius: 4px; 
            font-size: 20px; 
            font-weight: bold; 
            margin-top: 2px;
            box-shadow: 0 2px 4px rgba(0,0,0,0.3);
            white-space: nowrap;
          ">${shuttle_number}</div>
        </div>
      `,
      className: "custom-shuttle-marker",
      iconSize: [40, 50],
      iconAnchor: [20, 45],
  });
}

function Map({ height = "100vh", shuttles = [] }) {
  return (
    <MapContainer
      center={[10.35374, 123.911405]}
      zoom={18}
      style={{ height, width: "100%" }}
      dragging={true}
      touchZoom={true}
      scrollWheelZoom={true}
      doubleClickZoom={true}
      boxZoom={false}
      keyboard={false}
      zoomControl={false}
    >
      <TileLayer
        attribution='&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {shuttles
        .filter((s) => s.latitude && s.longitude)
        .map((shuttle) => (
          <Marker
            key={shuttle.shuttle_number}
            position={[shuttle.latitude, shuttle.longitude]}
            icon={GetIcon(shuttle.shuttle_number)}
          />
        ))}
    </MapContainer>
  );
}

export default Map;
