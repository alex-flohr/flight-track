import { useEffect, useState } from 'react'
import { MapContainer, Marker, Popup, TileLayer } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import planeIconAsset from './assets/plane-icon.png'
import './App.css'

const DEFAULT_LAT = 28.156468684830465
const DEFAULT_LON = -82.50010740795891
const DEFAULT_DIST = 250
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8181'

const createPlaneIcon = (track = 0) =>
  L.divIcon({
    className: 'plane-marker',
    html: `<div class="plane-marker__inner" style="transform: rotate(${track}deg)"><img src="${planeIconAsset}" alt="plane" /></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  })

type Plane = {
  hex?: string
  flight?: string
  lat?: number
  lon?: number
  alt_baro?: number
  gs?: number
  track?: number
}

function App() {
  const [planes, setPlanes] = useState<Plane[]>([])

  useEffect(() => {
    const fetchPlanes = async () => {
      try {
        const response = await fetch(
          `${API_BASE}/api/flights?lat=${DEFAULT_LAT}&lon=${DEFAULT_LON}&dist=${DEFAULT_DIST}`,
        )

        if (!response.ok) {
          throw new Error(`Request failed: ${response.status}`)
        }

        const data = await response.json()
        setPlanes(Array.isArray(data.ac) ? data.ac : [])
      } catch (error) {
        console.error('Failed to load flight data:', error)
        setPlanes([])
      }
    }

    fetchPlanes()
    const interval = window.setInterval(fetchPlanes, 15000)

    return () => window.clearInterval(interval)
  }, [])

  return (
    <div className="app-shell">
      <header className="map-header">Flight Tracker</header>

      <MapContainer
        center={[DEFAULT_LAT, DEFAULT_LON]}
        zoom={8}
        scrollWheelZoom={true}
        className="map"
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/">OpenStreetMap</a> contributors'
          url="https://tiles.stadiamaps.com/tiles/alidade_smooth_dark/{z}/{x}/{y}{r}.png"
        />

        {planes
          .filter((plane) => typeof plane.lat === 'number' && typeof plane.lon === 'number')
          .map((plane) => (
            <Marker
              key={plane.hex ?? `${plane.lat}-${plane.lon}`}
              position={[plane.lat as number, plane.lon as number]}
              icon={createPlaneIcon(plane.track ?? 0)}
            >
              <Popup>
                <div>
                  <strong>{plane.flight || plane.hex || 'Unknown flight'}</strong>
                  <br />
                  Alt: {plane.alt_baro ?? 'n/a'} ft
                  <br />
                  Speed: {plane.gs ?? 'n/a'} kt
                  <br />
                  Track: {plane.track ?? 'n/a'}°
                </div>
              </Popup>
            </Marker>
          ))}
      </MapContainer>
    </div>
  )
}

export default App
