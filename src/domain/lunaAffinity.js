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
    message: 'Tus caricias empiezan a convertirse en uno de mis momentos favoritos.',
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
    id: 'little-shadow-chaser',
    level: 3,
    text: 'Cuando era pequeña me gustaba perseguir sombras por toda la casa.',
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
  return LUNA_MEMORIES.filter((memory) => currentLevel.level >= memory.level).map((memory) => memory.text);
};

export const applyAffinityProgress = (profile) => {
  const level = getCurrentAffinityLevel(profile.affinityPoints);

  profile.currentLevel = level.level;
  profile.levelTitle = level.title;
  profile.unlockedLevels = getUnlockedLevels(profile.affinityPoints);
  profile.unlockedMemories = getUnlockedMemories(profile.affinityPoints);

  return profile;
};
