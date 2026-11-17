# Flashcards

App personal de flashcards con repetición espaciada (FSRS) para aprender inglés. Es una PWA: se instala en el celular desde el navegador, funciona sin internet y guarda todo en el propio dispositivo (IndexedDB). No hay servidor ni cuentas.

## Funciones

- Mazos con idioma de frente y dorso, y tarjetas con contexto opcional y tarjeta inversa.
- Repaso con FSRS ([ts-fsrs](https://github.com/open-spaced-repetition/ts-fsrs)): Otra vez / Difícil / Bien / Fácil, con el próximo intervalo en cada botón y deshacer.
- Límites diarios de tarjetas nuevas y repasos, y retención deseada configurable.
- Pronunciación con la voz del sistema (Web Speech API), automática o con botón.
- Estadísticas: racha, récord, repasos de los últimos 30 días y porcentaje de aciertos.
- Backup: exportar e importar todo en un JSON.

Atajos en la compu: espacio o Enter para mostrar la respuesta, 1–4 para calificar.

## Desarrollo

```sh
npm install
npm run dev      # servidor local
npm test         # tests del scheduler y estadísticas
npm run check    # chequeo de tipos
npm run build    # build de producción en dist/
```

## Deploy

Cada push a `main` corre los tests y publica en GitHub Pages con `.github/workflows/deploy.yml`. Hay que activar Pages una vez: Settings → Pages → Source: **GitHub Actions**.

## Stack

Svelte 5 + TypeScript + Vite, Dexie (IndexedDB), ts-fsrs y vite-plugin-pwa.
