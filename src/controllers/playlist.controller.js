import mongoose, {isValidObjectId} from "mongoose"
import {Playlist} from "../models/playlist.model.js"
import {ApiError} from "../utils/ApiError.js"
import {ApiResponse} from "../utils/ApiResponse.js"
import asyncWrapper from "../utils/asyncWrapper.js"
import {FallbackPlaylistThumbnail} from "../../constants.js"
import { Video } from "../models/video.model.js"


const createPlaylist = asyncWrapper(async (req, res) => {
    const {name, description, visibility} = req.body
    if(!name.trim()){
        throw new ApiError(400,"playlist name is required")
    }
    const playlist = await Playlist.create(
        {
            owner: req.user._id,
            title: name.trim(),
            description,
            visibility: visibility?visibility:"public",
        }
    )
    return res.status(201).json(new ApiResponse(201,"playlist created",{playlist}))
})

const getUserPlaylists = asyncWrapper(async (req, res) => {
    /*
    1. get userId and match with curr user
    2. mark isOwner field
    3. if (isOwner){
        3a. get all the playlists of this user
    }
    4. else{
        4a. get only public playlists
    }
    5. for each playlist,only send info: {thumbnail, no of videos, timestamps, title}
    */
    const {userId} = req.params
    //TODO: get user playlists
    if(!isValidObjectId(userId)){
        throw new ApiError(401,"invalid userId, can't fetch playlists")
    }
    const isOwner = req.user?._id.toString()===userId;
    let playlists = await Playlist.find({owner: new mongoose.Types.ObjectId(userId)}).sort({createdAt: -1});
    if(!isOwner){
        playlists = playlists.filter(p=>p.visibility==="public")
    }
    playlists = await Promise.all(
        playlists.map(
        async (p)=>{
            const numbOfVideos=p.videos.length;
            let video;
            if(numbOfVideos>0){
                video = await Video.findById(p.videos[0]);
            }
            const thumbnail = (numbOfVideos==0)? FallbackPlaylistThumbnail:video.thumbnail;
            return {
                _id: p._id,
                title: p.name,
                createdAt: p.createdAt,
                updatedAt: p.updatedAt,
                videoCount: numbOfVideos,
                thumbnail,
                visibility: p.visibility
            }
        }
    )
    )
    return res.status(200).json(new ApiResponse(200,"user playlists fetched",{playlists, isOwner}))
})

const getPlaylistById = asyncWrapper(async (req, res) => {
    const {playlistId} = req.params
    //TODO: get playlist by id
    /* Basic expected flow
    1. if user is owner, mark isOwner=true
    2. add owner username and avatar to res
    3. add no of videos
    4. Frontend: if isOwner==true {show Edit, Delete, Visibility status}
    5. For each video, send {_id, title, duration, thumbnail, onwer.Username}
    */
   if(!isValidObjectId(playlistId)){
    throw new ApiError(400, "Playlist not found")
   }

   const playlist = await Playlist.aggregate([
    {$match: {_id: new mongoose.Types.ObjectId(playlistId)}},
    {$lookup: {
        from: "users",
        localField: "owner",
        foreignField: "_id",
        as: "owner",
        pipeline: [
            {$project: {_id: 1, username: 1, avatar: 1}}
        ]
    }},
    {$unwind: "$owner"},
    {$lookup: {
        from: "videos",
        localField: "videos",
        foreignField: "_id",
        as: "videos",
        pipeline: [
            {$lookup: {
                from: "users",
                localField: "owner",
                foreignField: "_id",
                as: "owner",
                pipeline: [
                    {$project: {_id: 1, username: 1}}
                ]
            }},
            {$unwind: "$owner"},
            {$project: {
                _id: 1,
                title: 1,
                duration: 1,
                thumbnail: 1,
                ownerUserName: "$owner.username"
                }
            }
        ]
    }},
    {
        $addFields: 
        {
            videos: {
                $filter: {
                    input: "$videos",
                    as: "video",
                    cond: {
                        $or: [
                            { $eq: ["$$video.isPublished", true] },
                            { $eq: ["$$video.owner._id", new mongoose.Types.ObjectId(req.user?._id)] }
                        ]
                    }
                }
            },
            videoCount: {$size: "$videos"}
        }
    }
   ])
   if(playlist.length==0){
    throw new ApiError(400, "Playlist not found")
   }
   const isOwner = playlist[0]?.owner._id.toString()==req.user?._id.toString();
   if(playlist[0]?.visibility=="private" && !isOwner){
    throw new ApiError(401,"Playlist public access not allowed!")
   }
   const thumbnail = playlist[0]?.videos?.[0]?.thumbnail || FallbackPlaylistThumbnail;
    return res.status(200).json(new ApiResponse(200,"playlist fetched",{...playlist[0], isOwner, thumbnail}));
})

const addVideoToPlaylist = asyncWrapper(async (req, res) => {
    const {playlistId, videoId} = req.params
    if(!isValidObjectId(playlistId) || !isValidObjectId(videoId)){
        throw new ApiError(400,"playlist or video not found")
    }
    const playlist = await Playlist.findById(playlistId);
    if(!playlist){
        throw new ApiError(401,"playlist not found")
    }
    if(playlist.owner.toString()!==req.user._id.toString()){
        throw new ApiError(401,"only owner can add video to playlist");
    }
    if(playlist.videos.includes(videoId)){
        return res.status(200).json(new ApiResponse(200,"video already in playlist"))
    }
    playlist.videos.push(videoId);
    await playlist.save();
    return res.status(200).json(new ApiResponse(200,"video added to playlist")) 
})

const removeVideoFromPlaylist = asyncWrapper(async (req, res) => {
    const {playlistId, videoId} = req.params
    if(!isValidObjectId(playlistId) || !isValidObjectId(videoId)){
        throw new ApiError(400,"playlist or video not found")
    }
    const playlist = await Playlist.findById(playlistId);
    if(!playlist){
        throw new ApiError(401,"playlist not found")
    }
    if(playlist.owner.toString()!==req.user._id.toString()){
        throw new ApiError(401,"only owner can remove video from playlist");
    }
    if(!playlist.videos.includes(videoId)){
        return res.status(200).json(new ApiResponse(200,"video not in playlist"))
    }
    playlist.videos = playlist.videos.filter(id=>id.toString()!==videoId);
    await playlist.save();
    return res.status(200).json(new ApiResponse(200,"video removed from playlist")) 
})

const deletePlaylist = asyncWrapper(async (req, res) => {
    const {playlistId} = req.params
    // TODO: delete playlist
    if(!isValidObjectId(playlistId)){
        throw new ApiError(400,"playlist not found")
    }
    const playlist = await Playlist.findById(playlistId);
    if(!playlist){
        throw new ApiError(401,"playlist not found")
    }
    if(playlist.owner.toString()!==req.user._id.toString()){
        throw new ApiError(401,"only owner can delete playlist");
    }
    await Playlist.findByIdAndDelete(playlistId);
    return res.status(200).json(new ApiResponse(200,"playlist deleted"))
})

const updatePlaylist = asyncWrapper(async (req, res) => {
    const {playlistId} = req.params
    const {name, description, visibility} = req.body

    if(!isValidObjectId(playlistId)){
        throw new ApiError(400,"playlist not found")
    }
    const playlist = await Playlist.findById(playlistId);
    if(!playlist){
        throw new ApiError(401,"playlist not found")
    }
    if(playlist.owner.toString()!==req.user._id.toString()){
        throw new ApiError(401,"only owner can update playlist");
    }
    if(!name.trim() || !visibility.trim() || (visibility.trim() !== "public" && visibility.trim() !== "private")){
        throw new ApiError(400,"name and valid visibility are required")
    }
    playlist.title = name.trim();
    playlist.description = description;
    playlist.visibility = visibility.trim();
    const updatedPlaylist = await playlist.save();
    return res.status(200).json(new ApiResponse(200,"playlist updated",{updatedPlaylist}))
})

export {
    createPlaylist, //secured
    getUserPlaylists, //optionally secured, anyone can access
    getPlaylistById, //optionally secured, anyone can access
    addVideoToPlaylist, //secured
    removeVideoFromPlaylist, //secured
    deletePlaylist, //secured
    updatePlaylist //secured
}