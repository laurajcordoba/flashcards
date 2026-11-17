export interface Settings {
  newPerDay: number
  maxReviewsPerDay: number
  retention: number
  autoPlay: boolean
  voiceName: string
  speechRate: number
}

export const defaultSettings: Settings = {
  newPerDay: 10,
  maxReviewsPerDay: 100,
  retention: 0.9,
  autoPlay: true,
  voiceName: '',
  speechRate: 0.95,
}

const KEY = 'flashcards.settings'

function load(): Settings {
  try {
    const raw = localStorage.getItem(KEY)
    if (raw) return { ...defaultSettings, ...JSON.parse(raw) }
  } catch {
    // storage unavailable or corrupt: fall back to defaults
  }
  return { ...defaultSettings }
}

export const settings = $state<Settings>(load())

export function saveSettings() {
  try {
    localStorage.setItem(KEY, JSON.stringify($state.snapshot(settings)))
  } catch {
    // ignore: settings stay in memory for this session
  }
}

export function replaceSettings(next: Partial<Settings>) {
  Object.assign(settings, defaultSettings, next)
  saveSettings()
}
