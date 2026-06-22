import {Router} from "express";
import { optionalAuth } from "../middleware/optionalAuth.middleware.js";
import { getUserChannelProfile } from "../controllers/user.controller.js";

const router = Router();

router.route("/:channelName").get(optionalAuth,getUserChannelProfile) 
//~get user channel profile details, videos, subscribers count, subscribedTo count, isSubscribed by the logged in user, no of videos in the channel

export default router;