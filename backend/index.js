import "dotenv/config";
import connectDB from "./src/db/index.js";
import {app} from "./app.js";

connectDB()
.then(()=>{
  app.on("error",(error)=>{ //register this listener
    console.log("ERROR HAPPENDED FROM index.js app object",error);
  })

  app.listen(process.env.PORT,()=>{
    console.log("Server running on port: ",process.env.PORT)
  })
})
.catch((error)=>{
  console.log("MONGODB CONNECTION FAILED FROM index.js: ",error)
})