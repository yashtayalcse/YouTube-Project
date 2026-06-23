import mongoose, {isValidObjectId} from "mongoose"
import {Video} from "../models/video.model.js"
import {Subscription} from "../models/subscription.model.js"
import {Like} from "../models/like.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import asyncWrapper from "../utils/asyncWrapper.js"

const getChannelStats = asyncWrapper(async (req, res) => {
    // TODO: Get the channel stats like total video views, total subscribers, total videos, total likes etc.
    // channel id actually ek userId hee hai
    const {channelId} = req.params;
    if(!isValidObjectId(channelId)){
        throw new ApiError(400,"invalid channelId, can't fetch videos")
    }
    let videos = await Video.find({owner: channelId});
    const videoCount = videos.length;
    let totalVideoViews=0;
    for(let i=0;i<videoCount;i++){
        totalVideoViews+= videos[i].views;
        videos[i] = videos[i]._id;
    }
    const totalLikes = await Like.countDocuments({video: {$in: videos}})
    
    return res.status(200).json(new ApiResponse(200,"channel stats fecthed",{
        videoCount,
        totalLikes,
        totalVideoViews
    }))
})

const getChannelVideos = asyncWrapper(async (req, res) => {

    // channel id actually ek userId hee hai
    const {channelId} = req.params;
    if(!isValidObjectId(channelId)){
        throw new ApiError(400,"invalid channelId, can't fetch videos")
    }
    const isOwner = req.user?._id.toString()===channelId;

    const videos= await Video.find({
        owner: channelId,
        $or: [
            {isPublished: true},
            {owner: req.user?._id}
        ]
    })

    return res.status(200).json(new ApiResponse(200,"videos fetched", 
        {videos,
        isOwner,
        videoCount: videos.length
        }
    ));
})

export {
    getChannelStats, 
    getChannelVideos
    }