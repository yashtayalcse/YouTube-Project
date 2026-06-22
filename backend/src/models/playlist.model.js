import mongoose from "mongoose";

const playlistSchema = new mongoose.Schema({
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true
  },
  title: {
    type: String,
    required:true
  },
  description: {
    type: String,
  },
  videos: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Video",
      required: true
    }
  ],
  visibility: {
    type: String,
    enum: ["public", "private"],
    default: "public"
  }
}, {timestamps: true})

export const Playlist = mongoose.model("Playlist",playlistSchema)