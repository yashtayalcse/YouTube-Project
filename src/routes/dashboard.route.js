import { Router } from 'express';
import {
    getChannelStats,
    getChannelVideos,
} from "../controllers/dashboard.controller.js"
import {optionalAuth} from "../middleware/optionalAuth.middleware.js"

const router = Router();

router.route("/stats/:channelId").get(getChannelStats);
router.route("/videos/:channelId").get(optionalAuth, getChannelVideos);

export default router