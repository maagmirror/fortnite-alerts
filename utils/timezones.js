import { DateTime } from 'luxon';

export function convertirHorarios(utcString) {
  if (!utcString) return {};
  const dt = DateTime.fromISO(utcString, { zone: 'utc' });
  if (!dt.isValid) return {};

  return {
    Uruguay: dt.setZone('America/Montevideo').toFormat('dd/LL HH:mm'),
    México: dt.setZone('America/Mexico_City').toFormat('dd/LL HH:mm'),
    Argentina: dt
      .setZone('America/Argentina/Buenos_Aires')
      .toFormat('dd/LL HH:mm'),
    España: dt.setZone('Europe/Madrid').toFormat('dd/LL HH:mm'),
  };
}
