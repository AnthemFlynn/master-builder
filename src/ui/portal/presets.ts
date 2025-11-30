/**
 * Portal Gateway Presets
 * Curated location/date/time combinations for sun testing and atmosphere
 */

export interface PortalPreset {
  id: string
  name: string
  description: string
  category: 'testing' | 'landmark'
  location: {
    lat: number
    lon: number
    name: string
  }
  date: {
    month: number // 1-12
    day: number   // 1-31
    name: string  // "Spring Equinox", "Summer Solstice", etc.
  }
  time: {
    hour: number | 'solar-noon' | 'sunrise' | 'sunset'
    name: string
  }
  expectedSunAltitude: number // degrees, for preview
}

export const PORTAL_PRESETS: PortalPreset[] = [
  // ===== TESTING PRESETS =====
  {
    id: 'perfect-overhead',
    name: 'Perfect Overhead ☀️',
    description: 'Sun at 90° - Zero shadows, ideal for testing',
    category: 'testing',
    location: { lat: 0, lon: 0, name: 'Equator' },
    date: { month: 3, day: 20, name: 'Spring Equinox' },
    time: { hour: 'solar-noon', name: 'Solar Noon' },
    expectedSunAltitude: 90
  },
  {
    id: 'golden-hour',
    name: 'Golden Hour Magic 🌅',
    description: 'Low sun, warm light, dramatic long shadows',
    category: 'testing',
    location: { lat: 40, lon: 15, name: 'Mediterranean' },
    date: { month: 6, day: 21, name: 'Summer Solstice' },
    time: { hour: 'sunset', name: '1hr Before Sunset' },
    expectedSunAltitude: 8
  },
  {
    id: 'midnight-sun',
    name: 'Midnight Sun 🌞',
    description: 'Sun never sets - Arctic summer phenomenon',
    category: 'testing',
    location: { lat: 66, lon: -18, name: 'Arctic Circle' },
    date: { month: 6, day: 21, name: 'Summer Solstice' },
    time: { hour: 0, name: 'Midnight' },
    expectedSunAltitude: 3
  },
  {
    id: 'polar-night',
    name: 'Polar Night 🌙',
    description: 'Sun never rises - Pure darkness',
    category: 'testing',
    location: { lat: 66, lon: -18, name: 'Arctic Circle' },
    date: { month: 12, day: 21, name: 'Winter Solstice' },
    time: { hour: 12, name: 'Noon' },
    expectedSunAltitude: -5 // Below horizon
  },

  // ===== LANDMARK PRESETS =====
  {
    id: 'giza-dawn',
    name: 'Giza Pyramids - Dawn 🏜️',
    description: 'Egyptian desert sunrise, long shadows across sand',
    category: 'landmark',
    location: { lat: 30, lon: 31, name: 'Giza, Egypt' },
    date: { month: 6, day: 21, name: 'Summer Solstice' },
    time: { hour: 'sunrise', name: 'Sunrise' },
    expectedSunAltitude: 0
  },
  {
    id: 'stonehenge-winter',
    name: 'Stonehenge - Winter Solstice ⭐',
    description: 'Historic alignment, setting sun through stones',
    category: 'landmark',
    location: { lat: 51, lon: -2, name: 'Wiltshire, England' },
    date: { month: 12, day: 21, name: 'Winter Solstice' },
    time: { hour: 'sunset', name: 'Sunset' },
    expectedSunAltitude: 0
  },
  {
    id: 'machu-picchu',
    name: 'Machu Picchu - Equinox Noon 🏔️',
    description: 'Andes mountaintop, near-overhead sun',
    category: 'landmark',
    location: { lat: -13, lon: -72, name: 'Machu Picchu, Peru' },
    date: { month: 3, day: 20, name: 'Spring Equinox' },
    time: { hour: 'solar-noon', name: 'Solar Noon' },
    expectedSunAltitude: 77
  },
  {
    id: 'iceland-aurora',
    name: 'Iceland - Aurora Night 🌌',
    description: 'Polar winter night, stars and darkness',
    category: 'landmark',
    location: { lat: 64, lon: -22, name: 'Reykjavik, Iceland' },
    date: { month: 12, day: 21, name: 'Winter' },
    time: { hour: 0, name: 'Midnight' },
    expectedSunAltitude: -40 // Deep below horizon
  }
]

// Additional location options for custom selection
export const LOCATIONS = [
  { lat: 0, lon: 0, name: 'Equator (Prime Meridian)' },
  { lat: 0, lon: -78.5, name: 'Equator (Quito, Ecuador)' },
  { lat: 23.5, lon: 90, name: 'Tropic of Cancer (Bangladesh)' },
  { lat: -23.5, lon: -43, name: 'Tropic of Capricorn (Rio)' },
  { lat: 40, lon: -74, name: 'Mid-Latitude (New York)' },
  { lat: 51, lon: 0, name: 'Mid-Latitude (London)' },
  { lat: 66, lon: -18, name: 'Arctic Circle (Iceland)' },
  { lat: -66, lon: 110, name: 'Antarctic Circle' }
]

// Date presets
export const DATE_PRESETS = [
  { month: 3, day: 20, name: 'Spring Equinox', description: 'Equal day/night' },
  { month: 6, day: 21, name: 'Summer Solstice', description: 'Longest day (north)' },
  { month: 9, day: 22, name: 'Fall Equinox', description: 'Equal day/night' },
  { month: 12, day: 21, name: 'Winter Solstice', description: 'Shortest day (north)' }
]
