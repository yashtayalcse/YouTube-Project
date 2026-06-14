import { Router } from 'express';
import {
    addComment,
    deleteComment,
    getVideoComments,
    updateComment,
} from "../controllers/comment.controller.js"
import {verifyJWT} from "../middleware/auth.middleware.js"
import { optionalAuth } from '../middleware/optionalAuth.middleware.js';

const router = Router();

// /api/v1/comments/
router.route("/:videoId").get(optionalAuth,getVideoComments).post(verifyJWT, addComment);
router.route("/c/:commentId").delete(verifyJWT,deleteComment).patch(verifyJWT, updateComment);

export default router