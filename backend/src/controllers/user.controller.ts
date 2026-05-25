import { User } from "../models/user.model.js";
import jwt from "jsonwebtoken"
import type { RegisterBody,LoginBody } from "../types/auth.types.js";
import type {Request,Response} from "express"
import crypto from 'crypto';
import type { AuthRequest } from "../middlewares/auth.middleware.js";
import { uploadToCloudinary } from "../utils/cloudinary.js";
//generate token

const generateToken = (id:string) =>{
    return jwt.sign({id},process.env.JWT_SECRET!,{
        expiresIn:"1d"
    });
};


//O - Auth Integration
const googleAuthUser = async (
  req: Request,
  res: Response
): Promise<Response> => {
  try {
    let { email, name, avatar } = req.body;

    if (!email) {
      return res.status(400).json({
        message: 'Email is required',
      });
    }

    email = email.trim().toLowerCase();

    let user = await User.findOne({ email });

    if (!user) {
      const generatedUsername = email.split('@')[0] + Math.floor(Math.random() * 1000);

      user = await User.create({
        email,
        name,
        avatar,
        username: generatedUsername,
        password: crypto.randomUUID(),
      });
    }

    const token = generateToken(String(user._id));

    res.cookie('token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 7 * 24 * 60 * 60 * 1000,
    });

    return res.status(200).json({
      success: true,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        username: user.username,
        avatar: user.avatar,
      },
      token,
    });
  } catch (error) {
    console.error(error);

    return res.status(500).json({
      message: 'Google login failed',
    });
  }
};

const registerUser = async(req:Request<{},{},RegisterBody>, res:Response):Promise<Response> =>{
    try {
        // console.log(req.body)
        let {name, password, email, username} = req.body;
        // console.log(name,password,email,username);
        
    if([name.trim(),email.trim(),password.trim(),username.trim()].some((field)=>!field)){
        return res.status(400).json({
            message:"All fields are mandatory"
        })
    }
    email = email.trim().toLowerCase();
    username = username.trim().toLowerCase();
    password = password.trim()
    name = name.trim();
    const existingUser = await User.findOne({
        $or:[{email},{username}],
    })

    if(existingUser){
        return res.status(400).json({
            message:"User already exists"
        })
    }

    const user = await User.create({
        name,
        username,
        email,
        password
    })
    // console.log(user);
    
    const token = generateToken(String(user._id));

    return res.status(201).json({
        user:{
        _id:user._id,
        name:user.name,
        email:user.email,
        username:user.username,
        avatar:user.avatar,
        },
        token
    })
    } catch (error) {
        console.error(error)
        return res.status(500).json({
            message:"Something went wrong while creating user"
        })
    }
}

const loginUser = async(req:Request<{},{},LoginBody>,res:Response):Promise<Response> =>{
    try {
        let {email,username,password} = req.body
        if(email)email = email.trim().toLowerCase();
        if(username)username = username.trim().toLowerCase();
        if(!password?.trim()){
            return res.status(400).json({
                message:"Password Required"
            })
        }
        password = password.trim();
        if(!email && !username){
            return res.status(404).json({
                message:"Invalid Credentials"
            })
        }
        
        const user = await User.findOne({
            $or: [{ email }, { username }]
        }).select("+password")
        if(!user){
            return res.status(401).json({
                message:"Invalid Credentials"
            })
        }
        const isMatch = await user.comparePassword(password);
        if(!isMatch){
            return res.status(400).json({
                message:"Invalid Credentials"
            })
        }
        const token = generateToken(String(user._id));

        res.cookie("token",token,{
            httpOnly:true,
            secure: process.env.NODE_ENV ==="production",
            sameSite:"strict",
            maxAge: 7 * 24 * 60 * 60 * 1000,

        })
        return res.status(200).json({
            user:{
                _id:user._id,
                name:user.name,
                email:user.email,
                username:user.username,
                avatar:user.avatar
            },
            token,
        })
        
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            message:"Internal Server Error"
        })
    }
}

const logoutUser = async(req:AuthRequest, res:Response):Promise<Response> =>{
    try {
        res.clearCookie("token",{
            httpOnly:true,
            secure: process.env.NODE_ENV === "production",
            sameSite:"strict",
        })

        return res.status(200).json({
            message:"Logout Successfully"
        })
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            message:"Server Error during logout"
        })
    }
}


const uploadAvatar = async(req:AuthRequest,res:Response):Promise<Response> =>{
    try {
        // console.log(req.user)
        if(!req.user?._id){
            return res.status(404).json({
                message:"User not Found"
            })
        }
        // // console.log(req.user)
        if(!req.file){
            return res.status(400).json({
                message:"Image file is required"
            })
        }
        // // console.log(req.file.path);
        
        const uploadedImage = await uploadToCloudinary(req.file.path);
        
        
        const user = await User.findByIdAndUpdate(
            req.user._id,
            {
                avatar:uploadedImage.url
            },
            {
                returnDocument: "after"
            }
        ).select("-password")
        
        if(!user){
            return res.status(400).json({
                message:"Something wrong while changing"
            })
        }
        return res.status(200).json({
            message:"Avatar Updated Successfully",
            user
        })
    } catch (error) {
        console.error(error)
        return res.status(500).json({
            message:"Something went wrong"
        })
    }
}
export{
    registerUser,
    loginUser,
    logoutUser,
    uploadAvatar,
    googleAuthUser
}