import { Router } from "express";
import { loginUser, logoutUser, registerUser, refreshAccessToken, changePassword, updateAvatar, updateCoverImage, updateUserDetails,getUserChannelProfile, getWatchHistory } from "../controllers/user.controller.js";
import { upload } from "../middleware/multer.middleware.js";
import { verifyJWT } from "../middleware/auth.middleware.js";
import { optionalAuth } from "../middleware/optionalAuth.middleware.js";

const router=Router();

router.route("/register").post(

  upload.fields([
    {name: "avatar", maxCount:1},
    {name: "coverimage", maxCount:1},
  ])
  
  ,registerUser) // http://localhost:8000/api/v1/users/register

router.route("/login").post(loginUser) // http://localhost:8000/api/v1/users/login

router.route("/logout").post(verifyJWT, logoutUser)

router.route("/refresh-access-token").get(refreshAccessToken) // http://localhost:8000/api/v1/users/refresh-access-token  

router.route("/change-password").put(verifyJWT,changePassword)

router.route("/change-avatar").put(
  verifyJWT,
  upload.single("avatar"),
  updateAvatar
)

router.route("/change-coverimage").put(
  verifyJWT,
  upload.single("coverImage"),
  updateCoverImage
)

router.route("/update-details").put(
  verifyJWT,
  updateUserDetails
)

router.route("/refreshAccessToken").get(refreshAccessToken)

router.route("/history").get(optionalAuth, getWatchHistory) // http://localhost:8000/api/v1/users/watch-history

export default router;