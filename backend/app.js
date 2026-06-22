import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"

const app = express();

app.use(cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true
}))

app.use(express.json({limit: "16kb"}))
app.use(express.urlencoded({extended: true, limit: "16kb"}))
app.use(express.static("public"))
app.use(cookieParser())


//routes import
import userRouter from "./src/routes/user.route.js"
import healthcheckRouter from "./src/routes/healthcheck.route.js"
import tweetRouter from "./src/routes/tweet.route.js"
import subscriptionRouter from "./src/routes/subscription.route.js"
import videoRouter from "./src/routes/video.route.js"
import commentRouter from "./src/routes/comment.route.js"
import likeRouter from "./src/routes/like.route.js"
import playlistRouter from "./src/routes/playlist.route.js"
import dashboardRouter from "./src/routes/dashboard.route.js"
import channelRouter from "./src/routes/channel.route.js"

//routes declaration
app.use("/api/v1/healthcheck", healthcheckRouter)
app.use("/api/v1/users", userRouter)
app.use("/api/v1/tweets", tweetRouter)
app.use("/api/v1/subscriptions", subscriptionRouter)
app.use("/api/v1/videos", videoRouter)
app.use("/api/v1/comments", commentRouter)
app.use("/api/v1/likes", likeRouter)
app.use("/api/v1/playlist", playlistRouter)
app.use("/api/v1/dashboard", dashboardRouter)
app.use("/api/v1/channel", channelRouter) // http://localhost:8000/api/v1/channels/:channelName

// http://localhost:8000/api/v1/users/register

export { app }