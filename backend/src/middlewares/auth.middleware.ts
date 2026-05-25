import type { Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken"
import { User } from "../models/user.model.js";

interface JwtPayLoad{
    id:string
}

export interface AuthRequest extends Request{
    user?:any
}

export const protectRoute = async(
    req:AuthRequest,
    res:Response,
    next:NextFunction
)=>{
    try {
        let token;
        if(req.headers.authorization?.startsWith("Bearer") ){
            token = req.headers.authorization.split(" ")[1];
        }else if(req.cookies?.token){
            token = req.cookies.token;
        }else if(typeof req.query.token === "string"){
            token = req.query.token;
        }

        if(!token){
            return res.status(401).json({message:"Not authorized, no token"})
        }
        const decoded = jwt.verify(token,process.env.JWT_SECRET!) as JwtPayLoad

        const user = await User.findById(decoded.id).select("-password");
        if(!user){
            return res.status(404).json({message:"User Not Found"})
        }
        req.user = user;
        next();
    } catch (error) {
        return res.status(401).json({message:"Invalid Token!!"})
    }
}
