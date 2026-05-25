import mongoose from "mongoose";

const likeSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    projectId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

likeSchema.index({ userId: 1, projectId: 1 }, { unique: true });
likeSchema.index({ projectId: 1 });

export const Like = mongoose.model("Like", likeSchema);