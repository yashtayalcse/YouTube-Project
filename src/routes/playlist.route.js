import { Router } from 'express';
import {
    addVideoToPlaylist,
    createPlaylist,
    deletePlaylist,
    getPlaylistById,
    getUserPlaylists,
    removeVideoFromPlaylist,
    updatePlaylist,
} from "../controllers/playlist.controller.js"
import {verifyJWT} from "../middleware/auth.middleware.js"
import { optionalAuth } from '../middleware/optionalAuth.middleware.js';

const router = Router();

router.route("/").post(verifyJWT,createPlaylist)

router
    .route("/:playlistId")
    .get(optionalAuth, getPlaylistById)
    .patch(verifyJWT, updatePlaylist)
    .delete(verifyJWT, deletePlaylist);

router.route("/add/:videoId/:playlistId").patch(verifyJWT, addVideoToPlaylist);
router.route("/remove/:videoId/:playlistId").patch(verifyJWT, removeVideoFromPlaylist);

router.route("/user/:userId").get(optionalAuth,getUserPlaylists);

export default router