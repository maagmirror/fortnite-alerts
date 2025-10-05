## Fortnite Alerts Bot

Bot de Node.js que consulta las noticias de Fortnite y las envía a un chat de Telegram. Usa `node-cron` para ejecutar un chequeo diario y soporta despliegue en Docker.

### Qué hace

- Consulta el endpoint de noticias de Fortnite (`https://fortnite-api.com/v2/news`).
- Envía las 3 principales novedades a Telegram en el idioma configurado.
- Ejecuta automáticamente según un cron configurable.

Enlace de referencia: [endpoint de noticias](https://dash.fortnite-api.com/endpoints/news).

## Requisitos

- Node.js 18+ (recomendado 20)
- Bot de Telegram y `TELEGRAM_BOT_TOKEN`
- `TELEGRAM_CHAT_ID` (del chat o grupo destino)

## Pasos: crear el bot de Telegram y obtener chat_id

1. En Telegram, hablá con `@BotFather` y creá un bot:
   - Enviá: `/newbot`
   - Elegí nombre visible (p. ej. "Fortnite Alerts")
   - Elegí un username único que termine en `bot` (p. ej. `fortnite_alerts_bot`)
   - BotFather te dará el token: guardalo como `TELEGRAM_BOT_TOKEN`.
2. Obtené el `chat_id`:
   - Escribí cualquier mensaje a tu bot (o añadilo a un grupo y mandá un mensaje ahí).
   - Visitá: `https://api.telegram.org/bot<tu_token>/getUpdates`
   - Buscá en la respuesta JSON el campo `chat.id` y usalo como `TELEGRAM_CHAT_ID`.
3. Probar envío manual (opcional):
   - `https://api.telegram.org/bot<tu_token>/sendMessage?chat_id=<tu_chat_id>&text=Prueba%20desde%20API`

## Configuración (.env)

Creá un archivo `.env` (o `.env.example` → `.env`):

```env
TELEGRAM_BOT_TOKEN=tu_token_telegram
TELEGRAM_CHAT_ID=tu_chat_id

# Opcional
NEWS_LANGUAGE=es
CRON_SCHEDULE=0 */6 * * *
CRON_TZ=UTC
# Si es true, el bot inicia en modo polling y loguea chat.id al recibir mensajes
SHOW_LOG_GROUP_ID=false
```

- `NEWS_LANGUAGE`: idioma de las noticias (por ejemplo `es`, `en`, `fr`).
- `CRON_SCHEDULE`: crontab de ejecución (por defecto, cada 6 horas).
- `CRON_TZ`: zona horaria en la que se interpreta el cron.
- `SHOW_LOG_GROUP_ID`: si es `true`, el bot escucha mensajes entrantes y loguea `chat.id` en consola.

## Instalación y uso (host)

```bash
npm install
npm start
```

- Hace un chequeo inmediato de noticias.
- Registra un cron interno con `node-cron` para futuras ejecuciones.

## Docker

### Construir imagen

```bash
docker build -t fornite-alerts:latest .
```

### Ejecutar contenedor

```bash
docker run -d \
  --name fornite-alerts \
  -e TELEGRAM_BOT_TOKEN=tu_token_telegram \
  -e TELEGRAM_CHAT_ID=tu_chat_id \
  -e NEWS_LANGUAGE=es \
  -e CRON_SCHEDULE="0 */6 * * *" \
  -e CRON_TZ=UTC \
  -e SHOW_LOG_GROUP_ID=false \
  fornite-alerts:latest
```

El contenedor hace un chequeo al iniciar y luego mantiene el cron interno activo.

## Estructura del proyecto

```text
fornite-alerts/
├── package.json
├── index.js
└── readme.md
```

## Notas

- Se usa `https://fortnite-api.com/v2/news` para obtener noticias.
- Si no hay noticias, el bot no envía mensajes y reintenta en el próximo cron.
- Podés cambiar el idioma con `NEWS_LANGUAGE`.

## Licencia

MIT
