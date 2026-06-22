import mongoose, {isValidObjectId} from "mongoose"
import {User} from "../models/user.model.js"
import { Subscription } from "../models/subscription.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import asyncWrapper from "../utils/asyncWrapper.js"
import { LIMIT } from "../../constants.js"


const toggleSubscription = asyncWrapper(async (req, res) => {
    const {channelId} = req.params
    // TODO: toggle subscription
    if(!isValidObjectId(channelId)){
        throw new ApiError(400,"Invalid channelId")
    }
    if(channelId === req.user._id.toString()){
        throw new ApiError(400,"You cannot subscribe to yourself")
    }
    const subscription = await Subscription.findOne({subscriber: req.user._id, channel: channelId})
    if(subscription){
        await Subscription.findByIdAndDelete(subscription._id)
        return res.status(200).json(new ApiResponse(200, "Unsubscribed successfully"))
    }
    else{
        await Subscription.create(
            {
                subscriber: req.user._id,
                channel: channelId
            }
        )
        return res.status(200).json(new ApiResponse(200, "Subscribed successfully"))
    }
})

// controller to return subscriber list of a channel
const getUserChannelSubscribers = asyncWrapper(async (req, res) => {
    const {channelId} = req.params
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || LIMIT;
    const skip = (page - 1) * limit;

    if(!isValidObjectId(channelId)){
        throw new ApiError(400, "Invalid channelId")
    }
    const subscribers = await Subscription.aggregate([
        {$match: {channel: new mongoose.Types.ObjectId(channelId)}},
        {$sort: {createdAt: -1}},
        {$skip: skip},
        {$limit: limit},
        {
            $lookup: {
                from: "users",
                localField: "subscriber",
                foreignField: "_id",
                as: "subscriber"
            }
        },
        {$unwind: "$subscriber"},
        {
            $project: {
                _id:0,
                username: "$subscriber.username",
                avatar: "$subscriber.avatar"
            }
        }
    ])
    return res.status(200).json(new ApiResponse(200, `Subscribers fetched`, {
        subscribers,
        count: subscribers.length
    }))

})

// controller to return channel list to which user has subscribed
const getSubscribedChannels = asyncWrapper(async (req, res) => {
    const { subscriberId } = req.params
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || LIMIT;
    const skip = (page - 1) * limit;
    /* TODO
    1. check validity of this subscriberId
    2. start creating the pipeline
    3. get all suscribedChannels, 
    4. polulate channel details {avatar username}
    5. (conditional req) for each channel find the total suscribers
    */
   if(!isValidObjectId(subscriberId)){
    throw new ApiError(400, "Invalid subscriberId")
   }
   
   const pipeline = [
    {$match : {subscriber: new mongoose.Types.ObjectId(subscriberId)}},
    {$sort: {createdAt: -1}},
    {$skip: skip},
    {$limit: limit},
    {
        $lookup: {
            from: "users",
            localField: "channel",
            foreignField: "_id",
            as: "channel",
            pipeline: [
                {$lookup: {
                    from: "subscriptions",
                    localField: "_id",
                    foreignField: "channel",
                    as: "subscribers"
                }},
                {
                    $addFields: {
                        totalSubscribers: {$size: "$subscribers"}
                    }
                },
                {
                    $project: {
                        username: 1,
                        avatar: 1,
                        totalSubscribers: 1
                    }
                }
            ]
        }
    },
    {$unwind: "$channel"},
    {
        $project: {
            _id: "$channel._id",
            username: "$channel.username",
            avatar: "$channel.avatar",
            totalSubscribers: "$channel.totalSubscribers"
        }
    }
   ]
    const subscribedChannels = await Subscription.aggregate(pipeline)
    return res.status(200).json(new ApiResponse(200, `Subscribed channels fetched`, {
        subscribedChannels,
        count: subscribedChannels.length
    }))

})

export {
    toggleSubscription,
    getUserChannelSubscribers,
    getSubscribedChannels
}