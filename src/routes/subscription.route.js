import { Router } from 'express';
import {
    getSubscribedChannels,
    getUserChannelSubscribers,
    toggleSubscription,
} from "../controllers/subscription.controller.js"
import {verifyJWT} from "../middleware/auth.middleware.js"
import { optionalAuth } from '../middleware/optionalAuth.middleware.js';

const router = Router();

router.route("/c/:subscriberId")
.get(getSubscribedChannels)  //isne kis kis ko suscribe kar rakha hai

router.route("/u/:channelId")
.get(getUserChannelSubscribers) //isko kisne subscribe kiya hai

router.route("/toggle/:channelId")
.post(verifyJWT, toggleSubscription)

export default router