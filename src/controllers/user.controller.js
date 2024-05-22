import { asyncHandler } from "../utils/asyncHandler.js";
import {ApiError} from "../utils/ApiError.js";
import {User} from "../models/user.model.js"
import { uploadOnCloudinary } from "../utils/cloudinary.js";
import { ApiResponse } from "../utils/ApiResponse.js";


const generateAccessAndRefreshToken = async (userId)=>{
  try {
   const user = await User.findById(userId);
   const accessToken = user.generateAcessToken()
   const refreshToken = user.generateRefreshToken()

   user.refreshTOken = refreshTOken
   await user.save({validateBeforeSave: false})

  return {accessToken, refreshToken}  

  } catch (error) {
    throw new ApiError(500,"Something went wrong while generating refresh and access token")
  }
}

const registerUser = asyncHandler(async(req,res)=>{
  //get user details from frontend
  //validation- not empty
  //check if user already exists
  //check for images and avtar
  //upload images to cloudinary
  //create user object
  //remove password and refresh token field
  //check for user creation
  //return response


  const {fullName,email,userName,password} = req.body
  // console.log("email: ", email);

  if(
    [fullName,email,userName,password].some((field)=> field?.trim() === "")
  ){
    throw new ApiError(400, "All fields are required")
  }
  const existedUser = await User.findOne({
    $or:[
      {email},
      {userName}
    ]
  })
  if(existedUser){
    throw new ApiError(409, "User already exists")
  }


  const avatarLocalPath = req.files?.avatar[0]?.path;
//   const coverImageLocalPath = req.files?.coverImage[0]?.path;
let coverImageLocalPath;
if (req.files && Array.isArray(req.files.coverImage) && req.files.coverImage.length > 0) {
    coverImageLocalPath = req.files.coverImage[0].path
}

  if(!avatarLocalPath){
    throw new ApiError(400, "Avatar is required")
  }


 const avatar = await uploadOnCloudinary(avatarLocalPath)
 const coverImage = await uploadOnCloudinary(coverImageLocalPath)

 if(!avatar){
    throw new ApiError(400, "Avatar upload failed")
 }


 const user = await User.create({
    fullName,
    avatar: avatar.url,
    coverImage: coverImage?.url || "",
    email,
    password,
    userName: userName.toLowerCase()
 })

 const createdUser = await User.findById(user._id).select(
    "-password -refreshToken"
 )

 if(!createdUser){
    throw new ApiError(500, "User creation failed")
 }


 return res.status(201).json(
    new ApiResponse(200, createdUser, "User registered successfully")
 )

})

const loginUser = asyncHandler(async (req,res)=>{
  //req body ->data
  //username or email
  //find the user
  //check for password
  //generate accesstoken and refresh token
  //send cookies


  const {email,userName,password} = req.body


  if(!userName || !email){
    throw new ApiError(400, "Username or email is required")
  }

  const user = User.findOne({
    $or:[{userName},{email}]
  })

  if(!user){
    throw new ApiError(404,"User dose not exist")
  }

  const isPasswordValid = await user.isPasswordCorrect(password)

  if(!isPasswordValid){
    throw new ApiError(401,"Password is Incorrect")
  }

  const {accessToken,refreshToken} = await generateAccessAndRefreshToken(user._id)

  const loggedInUser = await User.findById(user._id).select("-password -refreshToken")
  const options = {
    httpOnly: true,
    secure: true
  }

  return res
  .status(200)
  .cookie("accessToken", accessToken, options)
  .cookie("refreshToken", refreshToken, options)
  .json(
    new ApiResponse(
      200, 
      {
        user: loggedInUser,
        refreshToken,
      }, 
      "User logged in successfully")
  )
  
})

const logoutUser = asyncHandler(async (req,res)=>{
  //clear cookies
  //remove refreshToken and accessToken
  //send response
  await User.findByIdAndUpdate(
    req.user._id,
    {
      $set: {
        refreshToken: undefined
      }
    },
    {
      new: true
    }
  )

  const options = {
    httpOnly: true,
    secure: true
  }
  return res
  .status(200)
  .clearCookie("accessToken", options)
  .clearCookie("refreshToken", options)
  .json(new ApiResponse(200,{},"User logged out successfully"))
})


export {registerUser,
  loginUser,
  logoutUser,
}