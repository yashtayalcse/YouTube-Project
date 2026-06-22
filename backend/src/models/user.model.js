import mongoose from "mongoose"
import bcrypt from  "bcrypt"
import jwt from "jsonwebtoken"

const UserSchema = new mongoose.Schema(
  {
    username:{
      type:String,
      required:true,
      lowercase:true,
      unique:true,
      trim:true,
      index:true,
    },
    email:{
      type:String,
      required:true,
      lowercase:true,
      trim:true,
      unique:true
    },
    fullname:{
      type:String,
      required:true,
      trim:true,
      index:true
    },
    avatar:{
      type:String
    },
    coverimage:{
      type:String
    },
    password:{
      type: String,
      required: [true,"password is required!!"]
    },
    refreshtoken:{
      type:String
    }
  },{timestamps:true}
)

UserSchema.pre("save", async function(){
  if(!this.isModified("password"))return;

  this.password=await bcrypt.hash(this.password,10);
})

UserSchema.methods.isPasswordCorrect = async function (password){
  return await bcrypt.compare(password,this.password); //true or false 
}
//accesstoken kee expiry is less, i am not storing it in the userschema
UserSchema.methods.generateAccessToken = function(){
    return jwt.sign(
        {
            _id: this._id,
            email: this.email,
            username: this.username,
            fullname: this.fullname
        },
        process.env.ACCESS_TOKEN_SECRET,
        {
            expiresIn: process.env.ACCESS_TOKEN_EXPIRY
        }
    )
}
//refresh token expiry is more, i am storing it in the schema.
UserSchema.methods.generateRefreshToken = function(){
    return jwt.sign(
        {
            _id: this._id,
        },
        process.env.REFRESH_TOKEN_SECRET,
        {
            expiresIn: process.env.REFRESH_TOKEN_EXPIRY
        }
    )
}

export const User=mongoose.model("User",UserSchema);

