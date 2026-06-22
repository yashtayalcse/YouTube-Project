import mongoose, {isValidObjectId} from "mongoose"
import {Like} from "../models/like.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import asyncWrapper from "../utils/asyncWrapper.js"

const toggleVideoLike = asyncWrapper(async (req, res) => {
    const {videoId} = req.params
    //TODO: toggle like on video
    if(!isValidObjectId(videoId)){
        throw new ApiError(400,"Invalid videoId")
    }
    //i am assuming the video exists
    const like = await Like.findOne({likedBy: req.user._id, video: videoId})
    if(like){
        await Like.findByIdAndDelete(like._id)
        return res.status(200).json(new ApiResponse(200, "Video unliked successfully"))
    }
    else{
        await Like.create(
            {
                likedBy: req.user._id,
                video: videoId
            }
        )
        return res.status(200).json(new ApiResponse(200, "Video liked successfully"))
    }
})

const toggleCommentLike = asyncWrapper(async (req, res) => {
    const {commentId} = req.params
    //TODO: toggle like on comment
    if(!isValidObjectId(commentId)){
        throw new ApiError(400,"Invalid commentId")
    }
    //i am assuming the comment exists
    const like = await Like.findOne({likedBy: req.user._id, comment: commentId})
    if(like){
        await Like.findByIdAndDelete(like._id)
        return res.status(200).json(new ApiResponse(200, "Comment unliked successfully"))
    }
    else{
        await Like.create(
            {
                likedBy: req.user._id,
                comment: commentId
            }
        )
        return res.status(200).json(new ApiResponse(200, "Comment liked successfully"))
    }
})

const toggleTweetLike = asyncWrapper(async (req, res) => {
    const {tweetId} = req.params
    //TODO: toggle like on tweet
    if(!isValidObjectId(tweetId)){
        throw new ApiError(400,"Invalid tweetId")
    }
    //i am assuming the tweet exists
    const like = await Like.findOne({likedBy: req.user._id, tweet: tweetId})
    if(like){
        await Like.findByIdAndDelete(like._id)
        return res.status(200).json(new ApiResponse(200, "Tweet unliked successfully"))
    }
    else{
        await Like.create(
            {
                likedBy: req.user._id,
                tweet: tweetId
            }
        )
        return res.status(200).json(new ApiResponse(200, "Tweet liked successfully"))
    }
}
)

const getLikedVideos = asyncWrapper(async (req, res) => {
    //TODO: get all liked videos
    const likedVideos = await Like.find({likedBy: req.user._id, video: {$exists: true}}).populate(
        {
            path: "video",
            select: "title thumbnail owner views duration createdAt updatedAt",
            populate: {
                path: "owner",
                select: "username avatar"
            }
        }
    )
    const videos = likedVideos.sort((a, b) => b.createdAt - a.createdAt).map(like => like.video)

    return res.status(200).json(new ApiResponse(200, `Liked videos fetched successfully (${videos.length})`, videos))
})

export {
    toggleCommentLike,
    toggleTweetLike,
    toggleVideoLike,
    getLikedVideos
}