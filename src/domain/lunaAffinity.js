export const LUNA_AFFINITY_LEVELS = [
  {
    level: 1,
    title: 'Dulce Acariciadora 🐾',
    required: 0,
    message: 'Noté tus primeras caricias y abrí un ojito para mirarte.',
  },
  {
    level: 2,
    title: 'Amiguita de Luna 🌙',
    required: 30,
    message: 'Ya reconozco tu presencia y me siento tranquila cuando estás cerca.',
  },
  {
    level: 3,
    title: 'Compañera de Bigotes 🐱',
    required: 60,
    message: 'Quiero presentarte a mi mamá. Ya no está conmigo, pero cuando me acaricias con tanta ternura siento que su amor todavía me acompaña.',
  },
  {
    level: 4,
    title: 'Guardiana de Siestas 😴',
    required: 100,
    message: 'Confío tanto en ti que puedo dormir profundamente a tu lado.',
  },
  {
    level: 5,
    title: 'Encantadora Felina ✨',
    required: 160,
    message: 'Cada vez que apareces, espero recibir un poquito de cariño.',
  },
  {
    level: 6,
    title: 'Susurradora de Ronroneos 💕',
    required: 230,
    message: 'Respondo a tus caricias con suaves ronroneos llenos de felicidad.',
  },
  {
    level: 7,
    title: 'Mejor Amiga de Luna 🌸',
    required: 320,
    message: 'Ya no eres una visita. Te considero una amiga especial.',
  },
  {
    level: 8,
    title: 'Corazón Gatuno 💖',
    required: 450,
    message: 'Guardo un lugar muy especial para ti dentro de mi pequeño corazón.',
  },
  {
    level: 9,
    title: 'Princesa de los Bigotes 👑',
    required: 650,
    message: 'Si pudiera elegir a alguien para consentirme siempre, te elegiría a ti.',
  },
  {
    level: 10,
    title: 'Alma Gemela de Luna 🌙✨',
    required: 1000,
    message: 'Has alcanzado nuestro vínculo más fuerte. Te quiero como parte de mi familia.',
  },
];

export const LUNA_MEMORIES = [
  {
    id: 'luna-mama',
    level: 3,
    title: 'Te presento a mi mamá',
    text: 'Ella ya no está conmigo, pero la llevo en mis recuerdos más suaves. Cuando me acompañas con cariño, siento un poquito de la calma que ella me dejó.',
    activeLevelOnly: true,
  },
  {
    id: 'safe-sleeping-place',
    level: 5,
    text: 'Mi lugar favorito para dormir es donde me siento protegida.',
  },
  {
    id: 'closed-eyes-trust',
    level: 7,
    text: 'A veces cierro los ojos porque me siento completamente segura.',
  },
  {
    id: 'happier-days',
    level: 10,
    text: 'Gracias por acompañarme. Mis días son más felices contigo.',
  },
];

export const INACTIVITY_SLEEP_MS = 60 * 60 * 1000;

export const getCurrentAffinityLevel = (affinityPoints = 0) =>
  LUNA_AFFINITY_LEVELS.reduce((currentLevel, level) => {
    if (affinityPoints >= level.required) {
      return level;
    }

    return currentLevel;
  }, LUNA_AFFINITY_LEVELS[0]);

export const getUnlockedLevels = (affinityPoints = 0) =>
  LUNA_AFFINITY_LEVELS.filter((level) => affinityPoints >= level.required).map((level) => level.level);

export const getUnlockedMemories = (affinityPoints = 0) => {
  const currentLevel = getCurrentAffinityLevel(affinityPoints);
  return LUNA_MEMORIES.filter((memory) =>
    memory.activeLevelOnly ? currentLevel.level === memory.level : currentLevel.level >= memory.level,
  ).map((memory) => memory.text);
};

export const applyAffinityProgress = (profile) => {
  const level = getCurrentAffinityLevel(profile.affinityPoints);

  profile.currentLevel = level.level;
  profile.levelTitle = level.title;
  profile.unlockedLevels = getUnlockedLevels(profile.affinityPoints);
  profile.unlockedMemories = getUnlockedMemories(profile.affinityPoints);

  return profile;
};

export const resolveCatVisualState = (userProgress) => {
  const now = new Date();
  const lastActivity = userProgress.lastActivityAt
    ? new Date(userProgress.lastActivityAt)
    : new Date(userProgress.lastInteractionAt ?? userProgress.updatedAt ?? now);
  const inactiveTime = now.getTime() - lastActivity.getTime();

  if (userProgress.catVisualState === 'awake' && inactiveTime >= INACTIVITY_SLEEP_MS) {
    userProgress.catVisualState = 'sleeping';
    userProgress.lastSleepAt = now;
  }

  return userProgress;
};
