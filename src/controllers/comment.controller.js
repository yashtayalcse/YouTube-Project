import mongoose, { isValidObjectId } from "mongoose"
import {Comment} from "../models/comment.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import asyncWrapper from "../utils/asyncWrapper.js"
import { Video } from "../models/video.model.js"
import { Like } from "../models/like.model.js"

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
        {$match: {video: new mongoose.Types.ObjectId(videoId.trim())}},
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
                    req.user?._id,   //isko toString kee zrurat nhi hai bcz optionalAuth ne already req.user._id ko string me convert krke diya hai
                    {
                        $map: {
                            input: "$likes",
                            as: "like",
                            in: {$toObjectId: "$$like.owner"}
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
                    _id:1,
                    username: 1,
                    avatar: 1
                },
                likesCount: 1,
                isLikedByCurrUser: 1,
                updatedAt: 1,
                createdAt: 1,
                isCommentOwner: {
                    $eq: [ {$toString: "$owner._id"}, req.user?._id.toString()]
                },
                isVideoOwner: {
                    $eq: [video.owner.toString(), req.user?._id.toString()]
                }
            }
        }
    ])

    return res.status(200).json(new ApiResponse(200, "Comments fetched successfully", comments))

})

const addComment = asyncWrapper(async (req, res) => {
    // TODO: add a comment to a video
    const {videoId} = req.params;
    const {content} = req.body;
    if(!isValidObjectId(videoId.trim())){
        throw new ApiError(400, "Invalid video id")
    }
    const video = await Video.findById(videoId.trim());
    if(!video){
        throw new ApiError(404, "Video not found")
    }
    if(!video.isPublished && video.owner.toString()!==req.user?._id.toString()){
        throw new ApiError(403, "ACCESS DENIED: Video is not published, cannot add comment")
    }
    const comment = await Comment.create(
        {
            content: content,
            video: videoId,
            owner: req.user._id
        }
    )
    return res.status(201).json(new ApiResponse(201, "Comment added successfully", comment))
})

const updateComment = asyncWrapper(async (req, res) => {
    // TODO: update a comment
    const {commentId} = req.params;
    const {content} = req.body;
    if(!isValidObjectId(commentId)){
        throw new ApiError(400,"commentId invalid")
    }
    const comment = await Comment.findById(commentId);
    if(!comment){
        throw new ApiError(400,"Comment not found")
    }
    if(comment.owner.toString()!==req.user._id.toString()){
        throw new ApiError(400,"ACESS DENIED! can't update comment you don't own")
    }
    comment.content = content;
    const updatedComment = await comment.save({validateBeforeSave : false});
    if(!updatedComment){
        throw new ApiError(500,"Failed to update comment")
    }
    return res.status(200).json(new ApiResponse(200, "Comment updated successfully", updatedComment));
})

const deleteComment = asyncWrapper(async (req, res) => {
    // TODO: delete a comment
    /*
    1. get commentID and validate it
    2. check if user is comment owner or video owner to which comment was made
    3. delete comment
    4. delete all likes on the comment
    */
   const {commentId} = req.params;
   if(!isValidObjectId(commentId)){
    throw new ApiError(400,"Invalid Comment id")
   }
   const comment = await Comment.findById(commentId);
   if(!comment){
    throw new ApiError(400,"Comment not found!")
   }
   const video = await Video.findById(comment.video);
   if(comment.owner.toString()!==req.user._id.toString() || req.user._id.toString()!==video.owner.toString()){
    throw new ApiError(400,"ACCESS DENIED: can't delete comment")
   }
   await Comment.deleteOne({_id:commentId});
   await Like.deleteMany({comment: commentId});
   return res.status(200).json(new ApiResponse(200, "Comment deleted successfully", null));

})

export {
    getVideoComments, 
    addComment, 
    updateComment,
     deleteComment
    }
