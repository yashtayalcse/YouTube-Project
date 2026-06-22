import mongoose, { isValidObjectId } from "mongoose"
import {Tweet} from "../models/tweet.model.js"
import {User} from "../models/user.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import asyncWrapper from "../utils/asyncWrapper.js"
import { Like } from "../models/like.model.js"
import {LIMIT} from "../../constants.js"
    
const createTweet = asyncWrapper(async (req, res) => {
    //TODO: create tweet
    const {content} = req.body;
    if(!content?.trim()){
        throw new ApiError(400, "Content cannot be empty")
    }
    const tweet = await Tweet.create(
        {
            content: content,
            owner: req.user._id
        }
    )
    return res.status(201).json(new ApiResponse(201, "Tweet created successfully", tweet))
})

const getUserTweets = asyncWrapper(async (req, res) => {
    // TODO: get user tweets
    /*
    2. verify userId whose tweets are to be Found
    3. Fetch all userId tweets
    4. calculate num of likesCount
    5. also fecth owner's details {username, avatar} separately
    6. evaluate if curr user is owner of tweets
    7. check if currUser has liked each tweet or not
    8. apply aggregatepaginate fucntion this time (we are using it first time actually properly)
    */
   const {userId} = req.params;
   const page = Number(req.query.page) || 1;
   const limit = Number(req.query.limit) || LIMIT;
   const skip = (page - 1) * limit;

   if(!isValidObjectId(userId.trim())){
    throw new ApiError(400,"Invalid userId, can't fetch tweets")
   }
   const isOwnerOfTweets = userId.toString()===req.user?._id;
   const ownerDetails = await User.findById(userId.trim()).select("username avatar");
   if(!ownerDetails){
    throw new ApiError(404,"User not found, can't fetch tweets")
   }
   const tweets = await Tweet.aggregate([
    {$match: {owner: new mongoose.Types.ObjectId(userId)}}, //yha pe comparison core mongoDB karega, object ID hee chhaiye isliye ismein type
    {$sort: {updatedAt:-1}},
    {$skip: skip},
    {$limit: limit},
    {
    $lookup: {
        from: "likes",
        localField: "_id",
        foreignField: "tweet",
        as: "likes"
    }
    },
    {
        $addFields: {
            likesCount: {$size: "$likes"},
            isLikedByCurrUser: {$in: [new mongoose.Types.ObjectId(req.user?._id) ,
                {
                    $map: {
                        input: "$likes",
                        as: "like",
                        in: "$$like.likedBy"
                    }
                }
            ]}
        }
    },
    {
        $project: {
            _id: 1,
            content: 1,
            createdAt: 1,
            updatedAt: 1,
            likesCount: 1,
            isLikedByCurrUser: 1,
        }
    }

   ]);

   const data = {
    tweets,
    ownerDetails,
    isOwnerOfTweets,
   }
   return res.status(200).json(new ApiResponse(200, `User tweets fetched successfully (${tweets.length})`, data))
})

const updateTweet = asyncWrapper(async (req, res) => {
    //TODO: update tweet
    const {tweetId} = req.params;
    const {content} = req.body;
    if(!isValidObjectId(tweetId.trim())){
        throw new ApiError(400, "Invalid tweet id")
    }
    if(!content?.trim()){
        throw new ApiError(400, "Content cannot be empty")
    }
    const tweet = await Tweet.findById(tweetId.trim());
    if(!tweet){
        throw new ApiError(404, "Tweet not found")
    }
    if(tweet.owner.toString()!==req.user._id.toString()){
        throw new ApiError(403, "ACCESS DENIED: Only owner can update the tweet")
    }
    tweet.content = content;
    const updatedTweet = await tweet.save({validateBeforeSave: false});
    if(!updatedTweet){
        throw new ApiError(404, "error updating tweet")
    }
    return res.status(200).json(new ApiResponse(200, "Tweet updated successfully", updatedTweet))
})

const deleteTweet = asyncWrapper(async (req, res) => {
    //TODO: delete tweet
    const {tweetId} = req.params;
    if(!isValidObjectId(tweetId.trim())){
        throw new ApiError(400, "Invalid tweet id")
    }
    const tweet = await Tweet.findById(tweetId.trim());
    if(!tweet){
        throw new ApiError(404, "Tweet not found")
    }
    if(tweet.owner.toString()!==req.user._id.toString()){
        throw new ApiError(403, "ACCESS DENIED: Only owner can delete the tweet")
    }
    await Tweet.findByIdAndDelete(tweetId.trim());
    await Like.deleteMany({tweet: tweetId.trim()})
    return res.status(200).json(new ApiResponse(200, "Tweet deleted successfully and likes cleared"))
})

export {
    createTweet,
    getUserTweets,
    updateTweet,
    deleteTweet
}
