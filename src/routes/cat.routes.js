import { Router } from 'express';
import { applyAffinityProgress, resolveCatVisualState } from '../domain/lunaAffinity.js';
import { CatInteraction } from '../models/CatInteraction.js';

export const catRouter = Router();

const DEFAULT_USER_NAME = 'Amiga de Luna';
const MAX_BATCHED_PETS = 25;

const htmlEscape = (value) =>
  String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;');

const formatDate = (value) => {
  if (!value) {
    return '-';
  }

  return new Intl.DateTimeFormat('es-PE', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(new Date(value));
};

const formatRelativeActivity = (value) => {
  if (!value) {
    return '-';
  }

  const diffMs = Date.now() - new Date(value).getTime();
  const diffMinutes = Math.max(0, Math.floor(diffMs / 60000));

  if (diffMinutes < 1) {
    return 'hace menos de 1 min';
  }

  if (diffMinutes < 60) {
    return `hace ${diffMinutes} min`;
  }

  const diffHours = Math.floor(diffMinutes / 60);

  if (diffHours < 24) {
    return `hace ${diffHours} h`;
  }

  return `hace ${Math.floor(diffHours / 24)} d`;
};

const getClientIp = (req) => {
  const forwardedFor = req.headers['x-forwarded-for'];

  if (typeof forwardedFor === 'string' && forwardedFor.trim()) {
    return forwardedFor.split(',')[0].trim();
  }

  if (Array.isArray(forwardedFor) && forwardedFor.length > 0) {
    return forwardedFor[0].split(',')[0].trim();
  }

  return req.ip;
};

const normalizeUserName = (value) => {
  const cleanValue = String(value ?? '').replace(/\s+/g, ' ').trim();
  return cleanValue.slice(0, 40);
};

const normalizeDeviceId = (value) => String(value ?? '').trim().slice(0, 120);

const normalizeAffinityPoints = (value) => {
  const points = Number(value);

  if (!Number.isFinite(points) || points < 0) {
    return 0;
  }

  return Math.floor(points);
};

const normalizePetCount = (value) => {
  const count = Number(value);

  if (!Number.isFinite(count) || count < 1) {
    return 1;
  }

  return Math.min(Math.floor(count), MAX_BATCHED_PETS);
};

const normalizeCatVisualState = (value) => {
  if (value === 'sleeping' || value === 'awake') {
    return value;
  }

  return null;
};

const serializeProfile = (profile) => ({
  userName: profile.userName,
  deviceId: profile.deviceId,
  affinityPoints: profile.affinityPoints,
  currentLevel: profile.currentLevel,
  levelTitle: profile.levelTitle,
  unlockedMemories: profile.unlockedMemories,
  unlockedLevels: profile.unlockedLevels,
  catVisualState: profile.catVisualState,
  lastActivityAt: profile.lastActivityAt,
  lastSleepAt: profile.lastSleepAt,
  lastWakeUpAt: profile.lastWakeUpAt,
  lastInteractionAt: profile.lastInteractionAt,
});

const getProgressSignature = (profile) =>
  JSON.stringify({
    currentLevel: profile.currentLevel,
    levelTitle: profile.levelTitle,
    unlockedLevels: profile.unlockedLevels ?? [],
    unlockedMemories: profile.unlockedMemories ?? [],
  });

const findOrCreateProfile = async ({ deviceId, userName, ip, seedAffinityPoints = 0 }) => {
  const now = new Date();
  const cleanUserName = normalizeUserName(userName);
  const profileName = cleanUserName || DEFAULT_USER_NAME;
  let profile = await CatInteraction.findOne({ deviceId });

  if (!profile) {
    profile = new CatInteraction({
      ip,
      userName: profileName,
      deviceId,
      affinityPoints: seedAffinityPoints,
      firstInteractionAt: now,
      lastInteractionAt: now,
      lastActivityAt: now,
    });
  } else {
    profile.ip = ip;
    profile.userName = cleanUserName || profile.userName || DEFAULT_USER_NAME;
    profile.affinityPoints = Math.max(profile.affinityPoints ?? 0, seedAffinityPoints);
    profile.lastInteractionAt = profile.lastInteractionAt ?? now;
    profile.lastActivityAt = profile.lastActivityAt ?? profile.lastInteractionAt ?? now;
    profile.catVisualState = profile.catVisualState ?? 'sleeping';
  }

  resolveCatVisualState(profile);
  applyAffinityProgress(profile);
  await profile.save();

  return profile;
};

const resetProfileProgress = (profile) => {
  const now = new Date();

  profile.affinityPoints = 0;
  profile.lastInteractionAt = now;
  profile.lastActivityAt = now;
  profile.catVisualState = 'sleeping';
  profile.lastSleepAt = now;
  profile.lastWakeUpAt = null;

  applyAffinityProgress(profile);

  return profile;
};

catRouter.post('/api/cat/register', async (req, res, next) => {
  try {
    const ip = getClientIp(req);
    const userName = normalizeUserName(req.body?.userName);
    const deviceId = normalizeDeviceId(req.body?.deviceId);
    const affinityPoints = normalizeAffinityPoints(req.body?.affinityPoints);

    if (!userName || !deviceId) {
      return res.status(400).json({
        success: false,
        message: 'Luna necesita un nombre y un dispositivo para recordar esta amistad.',
      });
    }

    const profile = await findOrCreateProfile({
      deviceId,
      userName,
      ip,
      seedAffinityPoints: affinityPoints,
    });

    const data = serializeProfile(profile);
    res.json({ success: true, data, profile: data });
  } catch (error) {
    next(error);
  }
});

catRouter.get('/api/cat/progress/:deviceId', async (req, res, next) => {
  try {
    const deviceId = normalizeDeviceId(req.params.deviceId);

    if (!deviceId) {
      return res.status(400).json({
        success: false,
        message: 'Luna necesita reconocer este dispositivo para recordar su estado.',
      });
    }

    const profile = await CatInteraction.findOne({ deviceId });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Luna todavía no conoce este dispositivo.',
      });
    }

    profile.lastActivityAt = profile.lastActivityAt ?? profile.lastInteractionAt ?? profile.updatedAt ?? new Date();
    profile.catVisualState = profile.catVisualState ?? 'sleeping';

    const previousState = profile.catVisualState;
    const previousSleepAt = profile.lastSleepAt?.getTime?.() ?? null;
    const previousProgress = getProgressSignature(profile);

    resolveCatVisualState(profile);
    applyAffinityProgress(profile);

    if (
      profile.catVisualState !== previousState ||
      (profile.lastSleepAt?.getTime?.() ?? null) !== previousSleepAt ||
      getProgressSignature(profile) !== previousProgress
    ) {
      await profile.save();
    }

    const data = serializeProfile(profile);
    res.json({ success: true, data, profile: data });
  } catch (error) {
    next(error);
  }
});

catRouter.post('/api/cat/pet', async (req, res, next) => {
  try {
    const ip = getClientIp(req);
    const userName = normalizeUserName(req.body?.userName);
    const deviceId = normalizeDeviceId(req.body?.deviceId);
    const petCount = normalizePetCount(req.body?.count);

    if (!deviceId) {
      return res.status(400).json({
        success: false,
        message: 'Luna necesita reconocer este dispositivo antes de guardar afinidad.',
      });
    }

    const profile = await findOrCreateProfile({
      deviceId,
      userName,
      ip,
    });

    const wasSleeping = profile.catVisualState !== 'awake';
    const now = new Date();

    profile.affinityPoints += petCount;
    profile.lastInteractionAt = now;
    profile.lastActivityAt = now;
    profile.catVisualState = 'awake';

    if (wasSleeping) {
      profile.lastWakeUpAt = now;
    }

    applyAffinityProgress(profile);
    await profile.save();

    const data = serializeProfile(profile);
    res.json({ success: true, data, profile: data });
  } catch (error) {
    next(error);
  }
});

catRouter.patch('/api/cat/state', async (req, res, next) => {
  try {
    const deviceId = normalizeDeviceId(req.body?.deviceId);
    const catVisualState = normalizeCatVisualState(req.body?.catVisualState);

    if (!deviceId || !catVisualState) {
      return res.status(400).json({
        success: false,
        message: 'Luna solo puede sincronizarse como sleeping o awake.',
      });
    }

    const profile = await CatInteraction.findOne({ deviceId });

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Luna todavía no conoce este dispositivo.',
      });
    }

    profile.lastActivityAt = profile.lastActivityAt ?? profile.lastInteractionAt ?? profile.updatedAt ?? new Date();
    profile.catVisualState = profile.catVisualState ?? 'sleeping';
    resolveCatVisualState(profile);

    const now = new Date();
    const previousState = profile.catVisualState;
    profile.catVisualState = catVisualState;

    if (catVisualState === 'sleeping' && previousState !== 'sleeping') {
      profile.lastSleepAt = now;
    }

    if (catVisualState === 'awake') {
      profile.lastActivityAt = now;

      if (previousState !== 'awake') {
        profile.lastWakeUpAt = now;
      }
    }

    applyAffinityProgress(profile);
    await profile.save();

    const data = serializeProfile(profile);
    res.json({ success: true, data, profile: data });
  } catch (error) {
    next(error);
  }
});

catRouter.post('/api/cat/reset', async (req, res, next) => {
  try {
    const ip = getClientIp(req);
    const userName = normalizeUserName(req.body?.userName);
    const deviceId = normalizeDeviceId(req.body?.deviceId);

    if (!deviceId) {
      return res.status(400).json({
        success: false,
        message: 'Luna necesita reconocer este dispositivo para volver al inicio.',
      });
    }

    let profile = await CatInteraction.findOne({ deviceId });

    if (!profile) {
      const now = new Date();

      profile = new CatInteraction({
        ip,
        userName: userName || DEFAULT_USER_NAME,
        deviceId,
        affinityPoints: 0,
        firstInteractionAt: now,
        lastInteractionAt: now,
        lastActivityAt: now,
      });
    }

    if (!profile) {
      return res.status(404).json({
        success: false,
        message: 'Luna todavía no conoce este dispositivo.',
      });
    }

    profile.ip = ip;

    if (userName) {
      profile.userName = userName;
    }

    resetProfileProgress(profile);
    await profile.save();

    const data = serializeProfile(profile);
    res.json({ success: true, data, profile: data });
  } catch (error) {
    next(error);
  }
});

catRouter.get('/data/cat', async (req, res, next) => {
  try {
    if (!process.env.CAT_SECRET_KEY || req.query.key !== process.env.CAT_SECRET_KEY) {
      return res.status(404).send('Not found');
    }

    const [topFriends, totalUsers, totals] = await Promise.all([
      CatInteraction.find().sort({ affinityPoints: -1 }).limit(10),
      CatInteraction.countDocuments(),
      CatInteraction.aggregate([
        {
          $group: {
            _id: null,
            affinityPoints: { $sum: '$affinityPoints' },
          },
        },
      ]),
    ]);

    await Promise.all(
      topFriends.map(async (profile) => {
        const previousState = profile.catVisualState;
        const previousSleepAt = profile.lastSleepAt?.getTime?.() ?? null;
        const previousProgress = getProgressSignature(profile);

        profile.lastActivityAt = profile.lastActivityAt ?? profile.lastInteractionAt ?? profile.updatedAt ?? new Date();
        profile.catVisualState = profile.catVisualState ?? 'sleeping';
        resolveCatVisualState(profile);
        applyAffinityProgress(profile);

        if (
          profile.catVisualState !== previousState ||
          (profile.lastSleepAt?.getTime?.() ?? null) !== previousSleepAt ||
          getProgressSignature(profile) !== previousProgress
        ) {
          await profile.save();
        }
      }),
    );

    const totalAffinity = totals[0]?.affinityPoints ?? 0;
    const rankingRows = topFriends
      .map(
        (item, index) => `
          <tr>
            <td>${index + 1}</td>
            <td>${htmlEscape(item.userName)}</td>
            <td>${item.currentLevel}</td>
            <td>${item.affinityPoints}</td>
          </tr>
        `,
      )
      .join('');

    const detailRows = topFriends
      .map(
        (item) => `
          <tr>
            <td>${htmlEscape(item.userName)}</td>
            <td>${item.currentLevel}</td>
            <td>${htmlEscape(item.levelTitle)}</td>
            <td>${item.affinityPoints}</td>
            <td>${item.catVisualState === 'awake' ? 'Awake' : 'Sleeping'}</td>
            <td>${htmlEscape(item.ip)}</td>
            <td>${formatRelativeActivity(item.lastActivityAt)}</td>
            <td>${formatDate(item.lastWakeUpAt)}</td>
            <td>${formatDate(item.lastSleepAt)}</td>
          </tr>
        `,
      )
      .join('');

    res.type('html').send(`
      <!doctype html>
      <html lang="es">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>Afinidad con Luna</title>
          <style>
            :root {
              color-scheme: light;
              font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
              background: #f8edf2;
              color: #251f24;
            }

            body {
              margin: 0;
              min-height: 100vh;
              background:
                linear-gradient(140deg, rgba(252, 226, 236, 0.94), rgba(223, 238, 248, 0.95) 52%, rgba(229, 244, 232, 0.92));
            }

            main {
              width: min(1100px, calc(100% - 32px));
              margin: 0 auto;
              padding: 40px 0;
            }

            h1,
            h2 {
              margin: 0;
              letter-spacing: 0;
            }

            h1 {
              font-size: clamp(2rem, 5vw, 3.35rem);
            }

            h2 {
              margin-bottom: 16px;
              font-size: clamp(1.25rem, 3vw, 1.8rem);
            }

            p {
              margin: 8px 0 28px;
              color: #6b5a63;
            }

            .stats {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
              gap: 14px;
              margin-bottom: 28px;
            }

            .stat,
            .panel {
              border: 1px solid rgba(72, 43, 55, 0.12);
              border-radius: 8px;
              background: rgba(255, 255, 255, 0.7);
              box-shadow: 0 16px 50px rgba(83, 49, 63, 0.08);
            }

            .stat {
              padding: 18px;
            }

            .stat strong {
              display: block;
              font-size: 2rem;
              line-height: 1;
            }

            .panel {
              padding: 20px;
              margin-bottom: 22px;
            }

            .table-wrap {
              overflow-x: auto;
            }

            table {
              width: 100%;
              border-collapse: collapse;
              min-width: 980px;
            }

            th,
            td {
              padding: 14px 16px;
              text-align: left;
              border-bottom: 1px solid rgba(72, 43, 55, 0.1);
            }

            th {
              color: #8a4662;
              font-size: 0.78rem;
              text-transform: uppercase;
              letter-spacing: 0.06em;
              background: rgba(255, 245, 250, 0.8);
            }

            tr:last-child td {
              border-bottom: 0;
            }
          </style>
        </head>
        <body>
          <main>
            <h1>🌙 Afinidad con Luna</h1>
            <p>Un registro suave de la amistad que Luna está construyendo con cada usuaria.</p>

            <section class="stats" aria-label="Resumen">
              <div class="stat">
                <span>Total de amigas</span>
                <strong>${totalUsers}</strong>
              </div>
              <div class="stat">
                <span>Afinidad acumulada</span>
                <strong>${totalAffinity}</strong>
              </div>
            </section>

            <section class="panel">
              <h2>🏆 Top amigas de Luna</h2>
              <div class="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Posición</th>
                      <th>Nombre</th>
                      <th>Nivel</th>
                      <th>Afinidad</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${rankingRows || '<tr><td colspan="4">Luna aún está esperando sus primeras amigas.</td></tr>'}
                  </tbody>
                </table>
              </div>
            </section>

            <section class="panel">
              <h2>Detalle de actividad</h2>
              <div class="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Nombre</th>
                      <th>Nivel</th>
                      <th>Título</th>
                      <th>Afinidad</th>
                      <th>Estado visual</th>
                      <th>IP</th>
                      <th>Última actividad</th>
                      <th>Última vez que despertó</th>
                      <th>Última vez que durmió</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${detailRows || '<tr><td colspan="9">No hay actividad registrada todavía.</td></tr>'}
                  </tbody>
                </table>
              </div>
            </section>
          </main>
        </body>
      </html>
    `);
  } catch (error) {
    next(error);
  }
});
