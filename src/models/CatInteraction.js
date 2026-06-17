import mongoose from 'mongoose';

const catInteractionSchema = new mongoose.Schema(
  {
    ip: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    userName: {
      type: String,
      required: true,
      trim: true,
      maxlength: 40,
    },
    deviceId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      trim: true,
      maxlength: 120,
    },
    affinityPoints: {
      type: Number,
      default: 0,
      min: 0,
    },
    currentLevel: {
      type: Number,
      default: 1,
      min: 1,
      max: 10,
    },
    levelTitle: {
      type: String,
      default: 'Dulce Acariciadora 🐾',
      trim: true,
    },
    unlockedMemories: {
      type: [String],
      default: [],
    },
    unlockedLevels: {
      type: [Number],
      default: [1],
    },
    firstInteractionAt: {
      type: Date,
      required: true,
    },
    lastInteractionAt: {
      type: Date,
      required: true,
    },
  },
  {
    collection: 'cat_interactions',
    timestamps: true,
  },
);

catInteractionSchema.index({ ip: 1 });
catInteractionSchema.index({ affinityPoints: -1 });
catInteractionSchema.index({ currentLevel: -1, affinityPoints: -1 });

export const CatInteraction = mongoose.model('CatInteraction', catInteractionSchema);
