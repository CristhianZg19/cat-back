import mongoose from 'mongoose';

const catInteractionSchema = new mongoose.Schema(
  {
    ip: {
      type: String,
      required: true,
      index: true,
      trim: true,
    },
    totalPets: {
      type: Number,
      default: 0,
      min: 0,
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

catInteractionSchema.index({ ip: 1 }, { unique: true });
catInteractionSchema.index({ totalPets: -1 });

export const CatInteraction = mongoose.model('CatInteraction', catInteractionSchema);
