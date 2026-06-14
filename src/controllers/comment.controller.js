import mongoose, { isValidObjectId } from "mongoose"
import {Comment} from "../models/comment.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import asyncWrapper from "../utils/asyncWrapper.js"
import { Video } from "../models/video.model.js"

const getVideoComments = asyncWrapper(async (req, res) => {
    //TODO: get all comments for a video
    /*
    1. get video id from req.params
    2. validate video id
    3. check if video is published, if not check if curr user is owner
    4. get comments for the video, sort by createdAt in descending order, and apply pagination using page and limit query params
    5. add likes count
    6. add isLikedByCurrUser field to each comment
    7. in each comment add comment owner details {username, avatar,_id}
    8. `` `` add isCommentOwner and isVideoOwner fields to each comment
    9. a commentOwner can update and delete a comment
    10. a video owner can delete a comment via frontend
    11. return comments in response + pagination details {totalComments, totalPages, currentPage, limit}
    */
    const {videoId} = req.params
    const page = Number(req.query.page) || 1;
    const limit = Number(req.query.limit) || 10;
    const skip = (page - 1) * limit;

    if(!isValidObjectId(videoId.trim())){
        throw new ApiError(400, "Invalid video id")
    }
    const video = await Video.findById(videoId.trim());
    if(!video){
        throw new ApiError(404, "Video not found")
    }
    if(!video.isPublished && (!req.loggedIn || video.owner.toString()!==req.user._id.toString())){
        throw new ApiError(403, "ACCESS DENIED: Video is not published, cannot get comments")
    }
    const comments = await Comment.aggregate([
        {$match: {video: videoId}},
        {$sort: {createdAt: -1}},
        {$skip: skip},
        {$limit: limit},
        {
            $lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner"
            }
        },
        {$unwind: "$owner"},
        {
            $lookup: {
                from: "likes",
                localField: "_id",
                foreignField: "comment",
                as: "likes"
            }
        },
        {
        $addFields: {
            "likesCount": {$size: "$likes"},
            "isLikedByCurrUser": {
                $in: [
                    req.user?._id,
                    {
                        $map: {
                            input: "$likes",
                            as: "like",
                            in: "$$like.owner"
                        }
                    }
                ]
            }
        }
        },
        {
            $project: {
                content: 1,
                owner: {
                    _id: 1,
                    username: 1,
                    avatar: 1
                },
                likesCount: 1,
                isLikedByCurrUser: 1,
                updatedAt: 1,
                createdAt: 1,
                isCommentOwner: {
                    $eq: ["$owner._id", req.user?._id]
                },
                isVideoOwner: {
                    $eq: [video.owner, req.user?._id]
                }
            }
        }
    ])

    return res.status(200).json(new ApiResponse(200, "Comments fetched successfully", comments))

})

const addComment = asyncWrapper(async (req, res) => {
    // TODO: add a comment to a video
})

const updateComment = asyncWrapper(async (req, res) => {
    // TODO: update a comment
})

const deleteComment = asyncWrapper(async (req, res) => {
    // TODO: delete a comment
})

export {
    getVideoComments, 
    addComment, 
    updateComment,
     deleteComment
    }
