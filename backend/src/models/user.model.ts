import bcrypt from "bcryptjs";
import mongoose from "mongoose"


interface IUser extends mongoose.Document{
    name:string,
    username:string,
    email:string,
    password:string,
    avatar:string
    comparePassword(password:string):Promise<boolean>
}

const userSchema = new mongoose.Schema<IUser>({
    name:{
        type:String,
        required:true,
        trim:true
    },
    username:{
        type:String,
        required:true,
        unique:true,
        trim:true,
        lowercase:true
    },
    password:{
        type:String,
        required:true,
        minlength:6,
        select:false

    },
    email:{
        type:String,
        required:true,
        unique:true,
        trim:true,
        lowercase:true
    },
    avatar:{
        type:String,
        default:""
    }
    ,
    bio: {
        type: String,
        default: ''
    },
    skills: {
        type: [String],
        default: []
    },
    links: {
        github: { type: String, default: '' },
        linkedin: { type: String, default: '' },
        website: { type: String, default: '' }
    }
},{
    timestamps:true
})

//Usually we used to call next function but in latest version it automatcically detects
// userSchema.pre("save", async function(next){
//     if(!this.isModified("password")) return next;

//     this.password = await bcrypt.hash(this.password,10);
//     return next
// })


userSchema.pre("save", async function(){
    if(!this.isModified("password")) return;

    this.password = await bcrypt.hash(this.password,10);
})

userSchema.methods.comparePassword = async function (
    this:IUser,
    enteredPassword:string) {
    return await bcrypt.compare(enteredPassword, this.password);
}




export const User = mongoose.model<IUser>("User", userSchema);