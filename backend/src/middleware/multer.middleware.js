import multer from "multer";

//diskstorage stores the file on disk
//takes 2 options destination and filename
const storage = multer.diskStorage({
  destination: function(req,file,cb){
    cb(null,'public/temp/')
  },
  filename: function(req,file,cb){
    cb(null,file.originalname + Date.now())
  }
})

export const upload = multer({storage});