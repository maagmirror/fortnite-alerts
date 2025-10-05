import axios from 'axios';
import dotenv from 'dotenv';
import TelegramBot from 'node-telegram-bot-api';
import cron from 'node-cron';

dotenv.config();

const telegramBotToken = process.env.TELEGRAM_BOT_TOKEN;
const telegramChatId = process.env.TELEGRAM_CHAT_ID;
const newsLanguage = process.env.NEWS_LANGUAGE || 'es';
const cronSchedule = process.env.CRON_SCHEDULE || '0 */6 * * *'; // cada 6 horas por defecto
const cronTz = process.env.CRON_TZ || 'UTC';
const showLogGroupId =
  String(process.env.SHOW_LOG_GROUP_ID || '').toLowerCase() === 'true';
const seasonEventKeywords = (
  process.env.SEASON_EVENT_KEYWORDS ||
  'final de temporada,evento en vivo,live event,season finale,gran evento,big bang'
)
  .split(',')
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);

function assertEnv(name, value) {
  if (!value) {
    console.error(`Falta la variable de entorno ${name}`);
    process.exit(1);
  }
}

assertEnv('TELEGRAM_BOT_TOKEN', telegramBotToken);
if (!showLogGroupId) {
  // En modo normal, exigimos TELEGRAM_CHAT_ID. En modo log, permitimos iniciar sin él
  assertEnv('TELEGRAM_CHAT_ID', telegramChatId);
}

const bot = new TelegramBot(telegramBotToken, { polling: showLogGroupId });

// Si SHOW_LOG_GROUP_ID=true, loguea cualquier mensaje entrante para capturar chat.id
if (showLogGroupId) {
  bot.on('message', (msg) => {
    const chat = msg?.chat || {};
    const id = chat.id;
    const titleOrName =
      chat.title ||
      [chat.first_name, chat.last_name].filter(Boolean).join(' ') ||
      '';
    console.log(
      `[Telegram] chat.id: ${id}${titleOrName ? ` | ${titleOrName}` : ''}`
    );
  });

  // Comando /id para devolver chat.id (útil con Privacy Mode)
  bot.onText(/^\/id(?:@\w+)?$/, (msg) => {
    const chat = msg?.chat || {};
    const id = chat.id;
    const titleOrName =
      chat.title ||
      [chat.first_name, chat.last_name].filter(Boolean).join(' ') ||
      '';
    const texto = `chat.id: ${id}${titleOrName ? `\n${titleOrName}` : ''}`;
    console.log(`[Telegram]/id -> ${texto}`);
    bot.sendMessage(id, texto).catch(() => {});
  });
}

async function obtenerNoticias() {
  const url = 'https://fortnite-api.com/v2/news';
  try {
    const { data } = await axios.get(url, {
      params: { language: newsLanguage },
    });
    const br = data?.data?.br || data?.data?.battleRoyale || {};
    const items =
      Array.isArray(br?.motds) && br.motds.length
        ? br.motds
        : Array.isArray(br?.messages)
        ? br.messages
        : [];
    return { items, date: br?.date || data?.data?.date || null };
  } catch (error) {
    const details = error?.response?.data || error.message;
    console.error('Error obteniendo noticias:', details);
    return { items: [], date: null };
  }
}

function construirMensajeNoticias(items, date) {
  const top = items.slice(0, 3);
  let mensaje = '📰 Noticias de Fortnite\n';
  if (date) mensaje += `Fecha: ${date}\n`;
  mensaje += '\n';
  for (const item of top) {
    const titulo = item.title || item.tabTitle || item.header || 'Novedad';
    const cuerpo = item.body || item.message || item.paragraph || '';
    mensaje += `- ${titulo}\n`;
    if (cuerpo) mensaje += `${cuerpo}\n`;
    mensaje += '\n';
  }
  mensaje += 'Más info: https://dash.fortnite-api.com/endpoints/news';
  return mensaje.trim();
}

async function enviarNoticias(items, date) {
  if (!telegramChatId) {
    console.warn(
      'No se definió TELEGRAM_CHAT_ID. Modo captura activo: enviá un mensaje al bot para ver chat.id en consola (SHOW_LOG_GROUP_ID=true).'
    );
    return;
  }
  const mensaje = construirMensajeNoticias(items, date);
  try {
    await bot.sendMessage(telegramChatId, mensaje);
    console.log(`Noticias enviadas (${items.length} items)`);
  } catch (err) {
    console.error('Error enviando mensaje:', err.message);
  }
}

function detectarEventos(items) {
  const encontrados = [];
  for (const item of items) {
    const texto = [
      item.title,
      item.tabTitle,
      item.header,
      item.body,
      item.message,
      item.paragraph,
    ]
      .filter(Boolean)
      .join(' \n ')
      .toLowerCase();
    if (seasonEventKeywords.some((k) => texto.includes(k))) {
      encontrados.push(item);
    }
  }
  return encontrados;
}

async function enviarAlertaEventos(items) {
  if (!telegramChatId) return;
  const top = items.slice(0, 2);
  let mensaje = '⚠️ Posible evento especial detectado\n\n';
  for (const item of top) {
    const titulo = item.title || item.tabTitle || item.header || 'Novedad';
    const cuerpo = item.body || item.message || item.paragraph || '';
    mensaje += `- ${titulo}\n`;
    if (cuerpo) mensaje += `${cuerpo}\n`;
    mensaje += '\n';
  }
  mensaje += '(Detectado por palabras clave configurables)';
  try {
    await bot.sendMessage(telegramChatId, mensaje.trim());
  } catch {}
}

async function ejecutarChequeo() {
  const { items, date } = await obtenerNoticias();
  if (!Array.isArray(items) || items.length === 0) {
    console.log('No hay noticias disponibles para enviar.');
    return;
  }
  await enviarNoticias(items, date);
  const matches = detectarEventos(items);
  if (matches.length > 0) {
    await enviarAlertaEventos(matches);
  }
}

function registrarCron() {
  try {
    cron.schedule(
      cronSchedule,
      () => {
        ejecutarChequeo().catch((err) =>
          console.error('Error en tarea programada:', err.message)
        );
      },
      { timezone: cronTz }
    );
    console.log(`Cron registrado con '${cronSchedule}' (TZ=${cronTz})`);
  } catch (err) {
    console.error('Error registrando cron:', err.message);
  }
}

async function main() {
  console.log('Iniciando bot de Fortnite…');
  console.log(
    `Idioma: ${newsLanguage} | Cron: '${cronSchedule}' TZ: ${cronTz}`
  );
  await ejecutarChequeo();
  registrarCron();
}

main().catch((err) => {
  console.error('Error en ejecución:', err.message);
  process.exit(1);
});
