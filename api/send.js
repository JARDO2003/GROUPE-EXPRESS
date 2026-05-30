const admin = require('firebase-admin');

// Init une seule fois (réutilisé entre les invocations Vercel)
if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert({
      type: "service_account",
      project_id: "livraison-c8498",
      private_key_id: "f2ceaf58b797f5a52cc229d652f0e9393f0e7fc2",
      private_key: "-----BEGIN PRIVATE KEY-----\nMIIEvwIBADANBgkqhkiG9w0BAQEFAASCBKkwggSlAgEAAoIBAQDRD26i7sj62cLx\nyRsz7aZQ5PQYSXy0uln8xA2h10BLW6gauLJpWy+lQXMMigk2AKMprSB9z5zWvY/J\nv5rGQZqjT2vDsLBHzyFLzE7Wycjbplnok7ArM8TMy8CSRnjuP5/GOeShkAGvXrjT\nPunp9Twoh34ByLcXKj+DpFuvd826FTsYyXXzzuEv8MTmQjpx4XcoLJK25VxJ6PFg\naACWKrAQWAf/cbK4AGM962Ij5sq8qOc2gviAxjQMXYVnh1tGSVSXC5ILGM3oZ+l7\n8EJosmvkqt1cgX3KZI8tYzfqawwH9HcbjMn06/yCfsy8wft50JBgiII277zRQbrM\nBacNEo1LAgMBAAECggEAD7ZOtN0oar4CCkT4j+sNBGhotgiT4EtfJwGfGqpAUUmW\ntUdrVUK+rndgS7F2JsJegOvblMkNOxBtJZcKbVsR4bM+4Kq/XO5CzN0Skc8BkwyK\nFlI/O8f8wv2PQA8e2J0ch3vjZIcbsU/3qRzB3M0LE+q2/DBXHl0U//JS17mz0wfR\nqPSh/6GMl3F3UF2AQdWy8xKeyCY4iZZjFHqMtpq5JE9/s3oBO93LXbBjii/BcM5i\nvJ3YmlEw2AEnUHb2J1hhk2NSKsoUDXfCFGvNNrky2Fb6WHSB7c+pEMVSCFCKTMMi\nwD1AEaOpXXhQB8cs6IXWn3aWCqwdQTizWjSs92aYwQKBgQDvr5RCyzOrgET1heUI\noE1cytdrwmNyx8vfLPvMnvQnAEx0UbV19q0NpvKPJGaV7Ml/q01IxngYoy0r3E3F\nGf5DnPJNO7ve6+hZHjqY0tONnSPRGO/l/niiyM5d3EdVz2p8Si9HDpA7RClBEg+a\nUc4RdstvtdB+XW9DLLxpUoa3iwKBgQDfSjdBVXvU4l6Cv7iB3iia6MAY2yTQ9dap\nvUCI1PcWe7qZoYlekjw4OZzX9Sskv6pqEH5pyaX2IpTuAKw8bFmSP9Pn87TUm14x\noiPeABW5RYkkq16Iu8C9NCWwUBC1jjI4Y1Xa5fTlsluZv0SZkHCEnVNHMWlCYpGm\nvexujgA5QQKBgQClSySn25LKly73U1tb05EGiSx+uBP1OCw0wMT1nDksHFydaywF\nKhS18YgdhzDn++AKF4y4v4ZbF00zjj5jy0U6Q6Yl9Sfe2DnoG5y1f889Pj1RGi13\nI0L2oB0RRbQ8TUpWZKKuEjENbjg1E8uG1RuTl6U8aNpcCvuMC/HzgGI/eQKBgQCq\nLUoHhTsneI9HXw8kC0kvJwyg5QQeLf84xoAUyRq4C/yfcjnb1eAHigE7piMHkvwy\ncfemcIUIHjsbWW/rbTim+fZq5ZaAIxmbAlQLskzcM17ej60w0MeIa+H9ikfx1zn3\nN94LQw9usIyXlOqXjznyGGWL8OCkM7OGPWGgsKEDAQKBgQCadaZ3ATmVoZ7kRU0D\n7i9hPVgq4AM7GGjFPizo97omKTOH9GIpsP6cj9Ax6oL2HcmQNpBYr0HiBnC/YPLG\n+CbjRTop3P8r/zR249VdEwg0DuMS74LWNw3ObZ+0wQetHyAOm/ysSbEfis/pvfUD\nUuZdxunrjlmY15CIRo9127UqvA==\n-----END PRIVATE KEY-----\n",
      client_email: "firebase-adminsdk-fbsvc@livraison-c8498.iam.gserviceaccount.com",
      client_id: "114335306450823773837",
      auth_uri: "https://accounts.google.com/o/oauth2/auth",
      token_uri: "https://oauth2.googleapis.com/token",
    }),
    databaseURL: "https://livraison-c8498-default-rtdb.firebaseio.com",
  });
}

const LOGO = 'https://groupe-express.vercel.app/image/GE.jpg';

const messaging = admin.messaging();

module.exports = async (req, res) => {
  // CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  const { tokens, title, body, data } = req.body;

  if (!tokens?.length || !title || !body) {
    return res.status(400).json({ error: 'Champs requis : tokens[], title, body' });
  }

  const db = admin.database();

  // Envoi multicast
  const message = {
    tokens,
    notification: {
      title,
      body,
      imageUrl: LOGO,
    },
    data: data || {},
    webpush: {
      headers: { Urgency: 'high' },
      notification: {
        title,
        body,
        icon: LOGO,
        badge: LOGO,
        image: LOGO,
        requireInteraction: true,
      },
      fcmOptions: {
        link: (data && data.url) ? data.url : '/',
      },
    },
  };

  try {
    const result = await messaging.sendEachForMulticast(message);

    // Supprimer les tokens invalides de la DB
    const invalidTokens = [];
    result.responses.forEach((r, i) => {
      if (!r.success && (
        r.error?.code === 'messaging/registration-token-not-registered' ||
        r.error?.code === 'messaging/invalid-registration-token'
      )) {
        invalidTokens.push(tokens[i]);
      }
    });

    if (invalidTokens.length) {
      const snapshot = await db.ref('fcm_tokens').once('value');
      const all = snapshot.val() || {};
      for (const [key, val] of Object.entries(all)) {
        if (invalidTokens.includes(val.token)) {
          await db.ref(`fcm_tokens/${key}`).remove();
        }
      }
    }

    res.json({
      success: true,
      successCount: result.successCount,
      failureCount: result.failureCount,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};
