import { useEffect, useState } from 'react'
import { MapContainer, Marker, Popup, TileLayer, useMapEvents } from 'react-leaflet'
import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import defaultPlaneIcon from './assets/plane-icon.png'
import americanPlaneIcon from './assets/plane-icon-american.png'
import alaskaPlaneIcon from './assets/plane-icon-alaska.png'
import deltaPlaneIcon from './assets/plane-icon-delta.png'
import jetBluePlaneIcon from './assets/plane-icon-jetblue.png'
import southWestPlaneIcon from './assets/plane-icon-southwest.png'
import unitedPlaneIcon from './assets/plane-icon-united.png'
import './App.css'

const DEFAULT_LAT = 28.156468684830465
const DEFAULT_LON = -82.50010740795891
const DEFAULT_DIST = 250
const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:8181'

const AIRLINE_ICON_MAP: Record<string, string> = {
  AAL: americanPlaneIcon,
  AA: americanPlaneIcon,
  AS: alaskaPlaneIcon,
  ASA: alaskaPlaneIcon,
  DL: deltaPlaneIcon,
  DAL: deltaPlaneIcon,
  B6: jetBluePlaneIcon,
  JBU: jetBluePlaneIcon,
  WN: southWestPlaneIcon,
  SWA: southWestPlaneIcon,
  UA: unitedPlaneIcon,
  UAL: unitedPlaneIcon,
}

type FlightQuery = {
  lat: number
  lon: number
  dist: number
}

const createPlaneIcon = (track = 0, iconSrc = defaultPlaneIcon) =>
  L.divIcon({
    className: 'plane-marker',
    html: `<div class="plane-marker__inner" style="transform: rotate(${track}deg)"><img src="${iconSrc}" alt="plane" /></div>`,
    iconSize: [28, 28],
    iconAnchor: [14, 14],
    popupAnchor: [0, -14],
  })

const getPlaneIconForFlight = (flight?: string, track = 0) => {
  const normalized = (flight ?? '').toUpperCase().trim()
  if (!normalized) {
    return createPlaneIcon(track)
  }

  const airlineCode = normalized.replace(/\d+/g, '').replace(/[^A-Z]/g, '')
  const preferred = AIRLINE_ICON_MAP[airlineCode] ?? AIRLINE_ICON_MAP[normalized.slice(0, 3)] ?? AIRLINE_ICON_MAP[normalized.slice(0, 2)]

  return createPlaneIcon(track, preferred ?? defaultPlaneIcon)
}

type Plane = {
  hex?: string
  flight?: string
  lat?: number
  lon?: number
  alt_baro?: number
  gs?: number
  track?: number
}

function MapFlightQuery({ onChange }: { onChange: (query: FlightQuery) => void }) {
  useMapEvents({
    moveend: (event) => {
      const map = event.target
      const center = map.getCenter()
      const bounds = map.getBounds()
      const northEast = bounds.getNorthEast()
      const radiusMeters = map.distance(center, northEast)

      onChange({
        lat: center.lat,
        lon: center.lng,
        dist: Math.max(25, Math.round(radiusMeters / 1000)),
      })
    },
  })

  return null
}

function App() {
  const [planes, setPlanes] = useState<Plane[]>([])
  const [query, setQuery] = useState<FlightQuery>({
    lat: DEFAULT_LAT,
    lon: DEFAULT_LON,
    dist: DEFAULT_DIST,
  })

  useEffect(() => {
    let isMounted = true

    const fetchPlanes = async () => {
      try {
        const response = await fetch(
          `${API_BASE}/api/flights?lat=${query.lat}&lon=${query.lon}&dist=${query.dist}`,
        )

        if (!response.ok) {
          throw new Error(`Request failed: ${response.status}`)
        }

        const data = await response.json()
        if (isMounted) {
          setPlanes(Array.isArray(data.ac) ? data.ac : [])
        }
      } catch (error) {
        console.error('Failed to load flight data:', error)
        if (isMounted) {
          setPlanes([])
        }
      }
    }

    fetchPlanes()

    return () => {
      isMounted = false
    }
  }, [query])

  return (
    <div className="app-shell">
      <header className="map-header">Flight Tracker</header>

      <MapContainer
        center={[DEFAULT_LAT, DEFAULT_LON]}
        zoom={8}
        scrollWheelZoom={true}
        className="map"
      >
        <MapFlightQuery onChange={setQuery} />

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
              icon={getPlaneIconForFlight(plane.flight, plane.track ?? 0)}
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
