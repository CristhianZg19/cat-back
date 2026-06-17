import { Router } from 'express';
import { CatInteraction } from '../models/CatInteraction.js';

export const catRouter = Router();

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

catRouter.post('/api/cat/pet', async (req, res, next) => {
  try {
    const now = new Date();
    const ip = getClientIp(req);

    await CatInteraction.findOneAndUpdate(
      { ip },
      {
        $inc: { totalPets: 1 },
        $set: { lastInteractionAt: now },
        $setOnInsert: { firstInteractionAt: now },
      },
      {
        new: true,
        upsert: true,
        setDefaultsOnInsert: true,
      },
    );

    res.json({ success: true });
  } catch (error) {
    next(error);
  }
});

catRouter.get('/data/cat', async (req, res, next) => {
  try {
    if (!process.env.CAT_SECRET_KEY || req.query.key !== process.env.CAT_SECRET_KEY) {
      return res.status(404).send('Not found');
    }

    const [topUsers, totalUsers, totals] = await Promise.all([
      CatInteraction.find().sort({ totalPets: -1 }).limit(10).lean(),
      CatInteraction.countDocuments(),
      CatInteraction.aggregate([
        {
          $group: {
            _id: null,
            totalPets: { $sum: '$totalPets' },
          },
        },
      ]),
    ]);

    const totalPets = totals[0]?.totalPets ?? 0;
    const rows = topUsers
      .map(
        (item) => `
          <tr>
            <td>${htmlEscape(item.ip)}</td>
            <td>${item.totalPets}</td>
            <td>${formatDate(item.firstInteractionAt)}</td>
            <td>${formatDate(item.lastInteractionAt)}</td>
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
          <title>Sleepy Cat Data</title>
          <style>
            :root {
              color-scheme: light;
              font-family: Inter, ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
              background: #f7efe5;
              color: #201913;
            }

            body {
              margin: 0;
              min-height: 100vh;
              background:
                linear-gradient(140deg, rgba(246, 221, 203, 0.9), rgba(218, 238, 244, 0.95) 52%, rgba(227, 241, 224, 0.9));
            }

            main {
              width: min(1040px, calc(100% - 32px));
              margin: 0 auto;
              padding: 40px 0;
            }

            h1 {
              margin: 0 0 8px;
              font-size: clamp(2rem, 5vw, 3.4rem);
              letter-spacing: 0;
            }

            p {
              margin: 0 0 28px;
              color: #5b5148;
            }

            .stats {
              display: grid;
              grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
              gap: 14px;
              margin-bottom: 28px;
            }

            .stat {
              padding: 18px;
              border: 1px solid rgba(32, 25, 19, 0.12);
              border-radius: 8px;
              background: rgba(255, 255, 255, 0.66);
              box-shadow: 0 16px 50px rgba(75, 47, 26, 0.08);
            }

            .stat strong {
              display: block;
              font-size: 2rem;
              line-height: 1;
            }

            .table-wrap {
              overflow-x: auto;
              border: 1px solid rgba(32, 25, 19, 0.12);
              border-radius: 8px;
              background: rgba(255, 255, 255, 0.72);
            }

            table {
              width: 100%;
              border-collapse: collapse;
              min-width: 700px;
            }

            th,
            td {
              padding: 14px 16px;
              text-align: left;
              border-bottom: 1px solid rgba(32, 25, 19, 0.1);
            }

            th {
              color: #6a4b36;
              font-size: 0.78rem;
              text-transform: uppercase;
              letter-spacing: 0.06em;
              background: rgba(255, 247, 236, 0.8);
            }

            tr:last-child td {
              border-bottom: 0;
            }
          </style>
        </head>
        <body>
          <main>
            <h1>Sleepy Cat</h1>
            <p>Top 10 usuarios más cariñosos</p>

            <section class="stats" aria-label="Resumen">
              <div class="stat">
                <span>Total de usuarios</span>
                <strong>${totalUsers}</strong>
              </div>
              <div class="stat">
                <span>Total de caricias</span>
                <strong>${totalPets}</strong>
              </div>
            </section>

            <div class="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>IP</th>
                    <th>Total Caricias</th>
                    <th>Primera Interacción</th>
                    <th>Última Interacción</th>
                  </tr>
                </thead>
                <tbody>
                  ${rows || '<tr><td colspan="4">Aún no hay caricias registradas.</td></tr>'}
                </tbody>
              </table>
            </div>
          </main>
        </body>
      </html>
    `);
  } catch (error) {
    next(error);
  }
});
