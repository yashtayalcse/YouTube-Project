import asyncWrapper from "../utils/asyncWrapper.js"
import { ApiError } from "../utils/ApiError.js";
import { User } from "../models/user.model.js";
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";
import jwt from "jsonwebtoken";
import {v2 as cloudinary} from "cloudinary";
import { WatchHistory } from "../models/watchHistory.model.js";
import mongoose from "mongoose";

const get_publicID_from_cloudinaryUrl = function(url){
  const list= url.split('/');
  const id = list[list.length-1].split(".")[0]
  return id;
}

const registerUser = asyncWrapper( 
  async (req,res)=>{
    // get user details from frontend
    // validation - not empty
    // check if user already exists: username, email
    // check for images, check for avatar
    // upload them to cloudinary, avatar
    // create user object - create entry in db
    // remove password and refresh token field from response
    // check for user creation
    // return res
    
    const {username,email,fullname,password} = req.body;
    
    const arr=[username, email, fullname, password];
    const isEmpty = arr.some(field=> field.trim()==="");
    if (isEmpty){
      throw new ApiError(400, "Field is required!")
    }

    const userFound = await User.findOne({
      $or: [{username}, {email}]
    });

    if(userFound){
      throw new ApiError(400,"User already exists")
    }

    const avatarLocalPath = req.files?.avatar?.[0]?.path;
    const coverimageLocalPath = req.files?.coverimage?.[0]?.path;

    if(!avatarLocalPath){
      throw new ApiError(400, "Avatar is required!!");
    }

    const avatar=await uploadOnCloudinary(avatarLocalPath);
    const coverimage=await uploadOnCloudinary(coverimageLocalPath);

    const user = await User.create(
      {
        username,
        email,
        fullname,
        password,
        avatar: avatar.url,
        coverimage: coverimage?.url || ""
      }
    );

    const createdUser = await User.findById(user._id).select("-password -refreshtoken");

    if(!createdUser){
      throw new ApiError(500,"Something went wrong while registering the user");
    }

    return res.status(200).json(
      new ApiResponse(200,createdUser)
    );
  }
)

const loginUser = asyncWrapper(
  async(req,res)=>{

    const {email, username, password} = req.body;

    if(!email && !username){
      throw new ApiError(401,"Email or username required");
    }

    const user = await User.findOne({
      $or:[{username}, {email}]
    })
    if(!user){
      throw new ApiError(401,"user not found");
    }
    const isPasswordCorrect = await user.isPasswordCorrect(password);
    if(!isPasswordCorrect){
      throw new ApiError(401,"Incorrect password")
    }
    //all credentials are now verified
    //now generate tokens
    const accessToken = user.generateAccessToken();
    const refreshToken = user.generateRefreshToken();

    user.refreshtoken = refreshToken;
    await user.save({ validateBeforeSave: false })

    const options = {
        httpOnly: true,
        secure: true
    }

    const loggedInUser = user;
    loggedInUser.password=undefined;
    loggedInUser.refreshtoken=undefined;

    return res
    .status(200)
    .cookie("accessToken", accessToken, options)
    .cookie("refreshToken", refreshToken, options)
    .json(
      new ApiResponse(
          200, 
          "User logged In Successfully",
          {
            loggedInUser
          }
      )
    )
  }
)

const logoutUser = asyncWrapper(
  async(req,res)=>{

    await User.findByIdAndUpdate(
      req.user._id,
      {refreshtoken: null}
    )

    const options = {
        httpOnly: true,
        secure: true
    }

    res
    .status(200)
    .clearCookie("accessToken", options)
    .clearCookie("refreshToken", options)
    .json(new ApiResponse(200, "User logged Out",{}))
  }
)

const refreshAccessToken = asyncWrapper(
  async function (req,res){
    const incomingRefreshToken = req.cookies?.refreshToken || req.body?.refreshToken || req.headers.authorization?.split(" ")[1];

    if(!incomingRefreshToken){
      throw new ApiError(401,"unathorized path - refresh token is required")
    }
    const decoded = jwt.verify(incomingRefreshToken, process.env.REFRESH_TOKEN_SECRET);

    const user = await User.findById(decoded._id);
    if(!user){
      throw new ApiError(401,"user not found")
    }
    if(user.refreshtoken !== incomingRefreshToken){
      throw new ApiError(401,"invalid refresh token")
    }

    const newAccessToken = user.generateAccessToken();
    const options = {
        httpOnly: true,
        secure: true
    }

    return res
    .status(200)
    .cookie("accessToken", newAccessToken, options)
    .json(
      new ApiResponse(
          200, 
          "Access token refreshed successfully",
          {
            accessToken: newAccessToken
          }
      )
    )
  }
)

const changePassword = asyncWrapper(
  async function(req,res){
    const {newPassword, oldPassword, confirmPassword}=req.body;
    if(!(newPassword.trim()&&oldPassword.trim()&&confirmPassword.trim())){
      throw new ApiError(401,"All three passwords are required!")
    }
    if(newPassword===oldPassword){
      throw new ApiError(401,"newPassword must be different from old")
    }
    if(newPassword!==confirmPassword){
      throw new ApiError(401,"new and Confirm password must match!")
    }
    const user = await User.findById(req.user._id)
    const isCorrect=await user.isPasswordCorrect(oldPassword);
    if(!isCorrect){
      throw new ApiError(401,"old password incorrect!!")
    }
    user.password=newPassword;
    await user.save({validateBeforeSave:false})

    res
    .status(200)
    .json(new ApiResponse(200,"password changed"))
  }
)

const updateAvatar = asyncWrapper(
  async function(req,res){
    const avatarLocalPath = req.file?.path;
    console.log(req.file)
    if(!avatarLocalPath){
      throw new ApiError(403,"new avatar file for update needed")
    }
    const avatar = await uploadOnCloudinary(avatarLocalPath);

    if(!avatar){
      throw new ApiError(501,"avatar upload failed")
    }

    // Delete Old avatar file from cloudinary
    const publicID = get_publicID_from_cloudinaryUrl(req.user.avatar)
    if(publicID){
      const deleteOldAvatar=await cloudinary.uploader.destroy(publicID);
      console.log(deleteOldAvatar);
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        avatar: avatar.url
      },
      {returnDocument: "after"}
    ).select("-password -refreshtoken")

    res
    .status(200)
    .json(new ApiResponse(200,"avatar image updated",user))
  }
)

const updateCoverImage = asyncWrapper(
  async function(req,res){
    const coverImageLocalPath = req.file?.path;
    if(!coverImageLocalPath){
      throw newApiError(401,"new coverImage file for update needed")
    }
    const coverImage = await uploadOnCloudinary(coverImageLocalPath);
    if(!coverImage){
      throw new ApiError(501,"coverImage upload failed")
    }

    // Delete Old coverimage file from cloudinary
    const publicID = get_publicID_from_cloudinaryUrl(req.user.coverimage)
    if(publicID){
    const deleteOldcoverimage=await cloudinary.uploader.destroy(publicID);
    console.log(deleteOldcoverimage);
    }

    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        coverimage: coverImage.url
      },
      {new:true}
    ).select("-password -refreshtoken")

    res
    .status(200)
    .json(new ApiResponse(200,"coverImage image updated",user))
  }
)

const updateUserDetails = asyncWrapper(
  async function (req,res) {
    let {username, fullname, email} = req.body;
    username = username?.trim().toLowerCase();
    email = email?.trim().toLowerCase();
    fullname = fullname?.trim();
    if(!(username&&fullname&&email)){
      throw new ApiError(401,"all fields are required!")
    }
    const user = await User.findById(req.user._id).select("-password -refreshtoken")

    if(user.username==username&&user.fullname==fullname&&user.email==email){
      //no update needed
      return res.status(200).json(new ApiResponse(200,"No update was seen, operation completed successfully"))
    }

    //check if new usernme or email already exists for some other user
    const existingUser = await User.findOne({
      $or: [{username}, {email}],
      _id: {$ne: req.user._id}
    })

    if(existingUser){
      throw new ApiError(400,"Username or email already exists, try with different ones")
    }

    user.username=username;
    user.fullname=fullname;
    user.email=email;
    user.save({validateBeforeSave:false});

    res.status(200).json(new ApiResponse(200,"User details updated",user))
  }
)

const getUserChannelProfile = asyncWrapper(
  async function (req,res){
    //username
    //fullname
    //avatar
    //coverimage
    //subscribers
    //subscribed
    //no of videos uploaded
    //isOwner
    //if not owner subscibe/subcribed, else send subscribed

    const username = req.params.channelName.toLowerCase().trim();

    if(!username){
      throw new ApiError(400,"channelName is required")
    }

    const channel = await User.aggregate([
      {$match: {username}},

      {$lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "channel",
        as: "subscribers",
        }
      },

      {$lookup: {
        from: "subscriptions",
        localField: "_id",
        foreignField: "subscriber",
        as: "subscribed"
        }
      },

      {
        $lookup: {
          from: "videos",
          localField: "_id",
          foreignField: "owner",
          as: "videos"
        }
      },

      {
        $addFields: {
            isSubscribed: {
                $cond: {
                    if: {$in: [req.user?._id, "$subscribers.subscriber"]},
                    then: true,
                    else: false
                }
            },
            noOfVideos: {
                $size: "$videos"
            },
            subscribersCount: {
                $size: "$subscribers"
            },
            subscribedToCount: {
                $size: "$subscribed"
            }
        }
      },

      {
        $project: {
          username: 1,
          fullname: 1,
          avatar: 1,
          coverimage: 1,
          subscribersCount: 1,
          subscribedToCount: 1,
          isSubscribed: 1,
          noOfVideos: 1,
        }
      }
    ])

    if(!channel.length){
      throw new ApiError(404,"Channel not found")
    }
    req.isOwner = req.user?._id.toString() === channel[0]._id.toString();

    res.status(200).json(new ApiResponse(200,"Channel profile fetched",channel[0]))
  }
)

const getWatchHistory = asyncWrapper(
  async function(req,res){
    const userId = req?.user?._id;
    if(!userId){
      return res.status(200).json(new ApiResponse(200,"User not loggedIn",{
        watchHistory: []
      }))
    }
    const watchHistory = await WatchHistory.aggregate([
      {$match: {user: new mongoose.Types.ObjectId(userId)}},
      {
        $lookup: {
          from: "videos",
          localField: "video",
          foreignField: "_id",
          as: "videoDetails"
        }
      },
      {
        $unwind: "$videoDetails"
      },
      {
        $lookup: {
          from: "users",
          localField: "videoDetails.owner",
          foreignField: "_id",
          as: "ownerDetails"
        }
      },
      {$unwind: "$ownerDetails"},
      {$set: {"ownerName": "$ownerDetails.username"}},
      {
        $project: {
          _id: 0,  
          watchedAt: 1,
          ownerName: 1,
          videoDetails: {
            _id: 1,
            thumbnail: 1,
            title: 1,
            duration: 1,
            views: 1,
            isPublished: 1
          }, 
        }
      },
      {
        $replaceWith: {
          $mergeObjects: ["$videoDetails", "$$ROOT"]
        }
      },
      {$unset: ["videoDetails"]},
      {
        $sort: {watchedAt: -1}
      }
    ])
    return res.status(200).json(new ApiResponse(200,"Watch history fetched",{
      watchHistory
    })) 
  }
)

export 
  {registerUser,
  loginUser, 
  logoutUser, 
  refreshAccessToken, 
  changePassword,
  updateAvatar,
  updateCoverImage,
  updateUserDetails,
  getUserChannelProfile,
  getWatchHistory,
  get_publicID_from_cloudinaryUrl
  }