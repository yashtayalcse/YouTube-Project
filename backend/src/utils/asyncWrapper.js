const Wrapperfunction= (asyncfn)=>(
  async function (req,res,next){
    try {
      await asyncfn(req,res,next)
    } catch (error) {
      res
      .status(error.statusCode || 500)
      .json({
        success:false,
        message:error.message
      })
    }
  }
)

export default Wrapperfunction