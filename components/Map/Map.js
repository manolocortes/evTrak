
import 'leaflet/dist/leaflet.css';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import L from 'leaflet';


const markerIcon = new L.Icon({
  iconUrl: 'https://www.clipartmax.com/png/small/169-1691337_icon-transfer-bus-circle-logo.png', // Path to your bus icon image
  iconSize: [32, 32],
});

function Map({ height = "100vh", shuttles = [] }) {
  return (
    <MapContainer
      center={[10.353740, 123.911405]}
      zoom={18}
      style={{ height, width: "100%" }}
      dragging={false}
      touchZoom={false}
      scrollWheelZoom={false}
      doubleClickZoom={false}
      boxZoom={false}
      keyboard={false}
      zoomControl={false}
    >
      <TileLayer
        attribution='&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      {shuttles
        .filter(s => s.latitude && s.longitude)
        .map(shuttle => (
          <Marker key={shuttle.number} position={[shuttle.latitude, shuttle.longitude]} icon={markerIcon} />
        ))}
    </MapContainer>
  );
}

export default Map;