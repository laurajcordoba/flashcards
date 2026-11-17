export const ttsSupported = typeof window !== 'undefined' && 'speechSynthesis' in window

export function voicesFor(lang: string): SpeechSynthesisVoice[] {
  if (!ttsSupported) return []
  const prefix = lang.split('-')[0]
  return speechSynthesis.getVoices().filter((v) => v.lang.replace('_', '-').startsWith(prefix))
}

/** Voices load asynchronously on most browsers. */
export function onVoicesChanged(cb: () => void): () => void {
  if (!ttsSupported) return () => {}
  speechSynthesis.addEventListener('voiceschanged', cb)
  cb()
  return () => speechSynthesis.removeEventListener('voiceschanged', cb)
}

export function speak(text: string, lang: string, opts: { voiceName?: string; rate?: number } = {}) {
  if (!ttsSupported || !text.trim()) return
  speechSynthesis.cancel()
  const u = new SpeechSynthesisUtterance(text)
  u.lang = lang
  u.rate = opts.rate ?? 1
  const voices = voicesFor(lang)
  const chosen = voices.find((v) => v.name === opts.voiceName) ?? voices.find((v) => v.lang.replace('_', '-') === lang) ?? voices[0]
  if (chosen) u.voice = chosen
  speechSynthesis.speak(u)
}

export function stopSpeaking() {
  if (ttsSupported) speechSynthesis.cancel()
}
