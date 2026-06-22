import mongoose from "mongoose";
import { DB_NAME } from "../../constants.js";

const connectDB = async ()=>{
  try {
    let connection = await mongoose.connect(`${process.env.MONGODB_URI}/${DB_NAME}`);
    console.log("Connected to database: ", connection.connections[0].host);
  } catch (error) {
    console.log("ERROR connecting to DB: ",error);
    throw error;
  }
}

export default connectDB;
