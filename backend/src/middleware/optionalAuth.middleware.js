import asyncWrapper from "../utils/asyncWrapper.js";
import jwt from "jsonwebtoken";

const optionalAuth = asyncWrapper(
  async function(req,res,next){
    const token = req.headers.authorization?.split(" ")[1] || req.cookies?.accessToken;

    if(!token){
      req.loggedIn = false;
      return next();
    }
    const decoded = jwt.verify(token, process.env.ACCESS_TOKEN_SECRET);
    req.loggedIn = true;
    req.user = decoded;
    return next();
  }
)

export {optionalAuth};