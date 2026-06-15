import { Router } from 'express';
import {
    createTweet,
    deleteTweet,
    getUserTweets,
    updateTweet,
} from "../controllers/tweet.controller.js"
import { verifyJWT } from "../middleware/auth.middleware.js"
import { optionalAuth } from '../middleware/optionalAuth.middleware.js';

const router = Router();

router.route("/").post(verifyJWT,createTweet);
router.route("/user/:userId").get(optionalAuth,getUserTweets);
router.route("/:tweetId").patch(verifyJWT,updateTweet).delete(verifyJWT,deleteTweet);

export default router