import type {Request, Response} from "express"
import type { AuthRequest } from "../middlewares/auth.middleware.js"
import { Project } from "../models/project.model.js"
import { uploadToCloudinary } from "../utils/cloudinary.js"
import mongoose from "mongoose"
import jwt from "jsonwebtoken"
import { publish, subscribe } from "../sse/sse.js";
import { createNotification } from "../utils/notifications.js";
import { log } from "node:console"
// import { log } from "node:console"

const getParamValue = (value: unknown): string | undefined => {
    if (Array.isArray(value)) {
        const first = value[0];
        return typeof first === 'string' ? first : undefined;
    }

    return typeof value === 'string' ? value : undefined;
}

const getOptionalUserId = (req: Request) => {
    const authorization = req.headers.authorization;

    if (!authorization?.startsWith('Bearer ')) {
        return undefined;
    }

    const token = authorization.split(' ')[1];
    if (!token) {
        return undefined;
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET!) as { id?: string };
        return decoded.id;
    } catch {
        return undefined;
    }
}

const createProject = async(req:AuthRequest,
    res:Response
) =>{
    try {
        const {title, description, liveLink, gitHubLink, tags} = req.body
        if(!title || ! description){
            return res.status(400).json({
                message:"Title and description required"
            })
        }

        if(!req.user?._id){
            return res.status(401).json({
                message:"Unauthorized"
            })
        }
        const imageUrl = req.file ? await uploadToCloudinary(req.file.path) : null;

        const project = await Project.create({
            title,
            description,
            image: imageUrl?.url ?? "",
            liveLink,
            gitHubLink,
            tags: tags?tags.split(",").map((t:string)=>t.trim()):[],
            owner:req.user._id,
            likeCount: 0,
        })

        res.status(201).json({
            message:"Project Created Successfully",
            project
        })
    } catch (error) {
        console.error(error);
        res.status(500).json({
            message:"Failed to Create Project"
        })
    }
}

const escapeRegExp = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

const getAllProjects = async(req:AuthRequest,
    res:Response
) =>{
    try {
        const search = getParamValue(req.query.search);
        const normalizedSearch = typeof search === 'string' ? search.trim() : undefined;

        // build a RegExp object once and use it in the $or clauses
        let query: Record<string, unknown> = {};
        if (normalizedSearch) {
            const regex = new RegExp(escapeRegExp(normalizedSearch), 'i');
            const orClauses: Record<string, unknown>[] = [
                { title: regex },
                { description: regex },
                { liveLink: regex },
                { gitHubLink: regex },
                // tags is an array of strings; use $in with a regex to match any element
                { tags: { $in: [regex] } },
            ];

            query = { $or: orClauses };
        }

        const projects = await Project.find(query)
        .select("title description image liveLink gitHubLink tags likeCount createdAt")
        .sort({ createdAt:-1 })
        .lean()

        res.status(200).json({
            count:projects.length,
            projects,
        })
    } catch (error) {
        console.error('getAllProjects error:', error);
        res.status(500).json({
            message:"Failed to fetch projects"
        })

    }
}

const getProjectById = async(req:AuthRequest,
    res:Response
) =>{
    try {
        const id = getParamValue(req.params.id);
        if(!id || !id.match(/^[0-9a-fA-F]{24}$/)){
            return res.status(404).json({
                message:"Invalid Project ID"
            })
        }
        
        const project = await Project.findById(id)
        .populate("owner", "name username avatar")
        .populate("comments.user", "name username avatar")
        .populate("comments.replies.user","name username avatar")

        if(!project){
            return res.status(404).json({
                message: "Project Not Found!!"
            })
        }

        const currentUserId = getOptionalUserId(req);
        const projectObject = project.toObject() as any;
        const likes = Array.isArray(projectObject.likes) ? projectObject.likes : [];
        const likeCount = likes.length;
        const likedByMe = currentUserId
            ? likes.some((id: any) => id.toString() === currentUserId)
            : false;

        res.status(200).json({
            project: {
                ...projectObject,
                likedByMe,
                likeCount,
            },
        })

    } catch (error) {
        res.status(500).json({
            message:"Failed to Fetch Project"
        })
    }
}

const streamProjectEvents = (req: Request, res: Response) => {
    const id = getParamValue(req.params.id);
    if (!id || !mongoose.Types.ObjectId.isValid(id)) {
        return res.status(400).end();
    }

    res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
    });

    // send a comment to establish the stream
    res.write(`: connected to project ${id}\n\n`);

    const onPayload = (payload: any) => {
        const eventName = payload?.event ?? 'message';
        const data = payload?.data ?? payload;
        res.write(`event: ${eventName}\n`);
        res.write(`data: ${JSON.stringify(data)}\n\n`);
    };

    const unsubscribe = subscribe(`project:${id}`, onPayload);

    // remove listener on client disconnect
    req.on('close', () => {
        unsubscribe();
    });
};


const toogleLikeProject = async(req:AuthRequest,res:Response):Promise<Response>=>{
    try {
        const id = getParamValue(req.params.id);
        const userId = req.user._id;

        if(!id || !mongoose.Types.ObjectId.isValid(id)){
            return res.status(400).json({
                message:"Invalid Project Id"
            })
        }

        const project = await Project.findById(id);

        if(!project){
            return res.status(404).json({
                message:"Project not Found!!"
            })
        }

        const likes = Array.isArray(project.likes) ? project.likes : [];
        const isAlreadyLiked = likes.some(id => id.toString() === userId.toString());

        let likedByMe = false;

        if(isAlreadyLiked){
            // Remove like
            project.likes = likes.filter(id => id.toString() !== userId.toString());
            likedByMe = false;
        }else{
            // Add like
            project.likes.push(userId);
            likedByMe = true;
        }

        project.likeCount = project.likes.length;
        await project.save();

        publish(`project:${id}`, {
            event: "project:likes-updated",
            data: {
                projectId: id,
                likeCount: project.likeCount,
            },
        });

        return res.status(200).json({
            message: likedByMe ? "Liked Project":"Unliked Project",
            likeCount: project.likeCount,
            likedByMe,
        })

    } catch (error) {
        return res.status(500).json({
            message:"Failed to toggle!!"
        })
    }
}


const postComment = async(req:AuthRequest, res:Response):Promise<Response> =>{
    try {
        const id = getParamValue(req.params.id);
        let {text} = req.body;
        console.log(id);
        
        console.log("Received comment text:", text);
        text = text.trim();
        const userId:string = req.user.id;
        if(!text){
            return res.status(400).json({
                message:"No text Found"
            })
        }
        if(!id || !mongoose.Types.ObjectId.isValid(id)){
            return res.status(400).json({
                message:"Invalid ProjectID"
            })
        }
        
        const project = await Project.findById(id);

        if(!project){
            return res.status(404).json({
                message:"No project with given ID"
            })
        }
        const newComment = {
            user:userId,
            text,
            createdAt: new Date()
        }
        
        project.comments.push(newComment);
        await project.save();
        const createdComment = project.comments[project.comments.length - 1];

        const updatedProject = await Project.findById(id)
        .populate("comments.user", "name username avatar")
        .populate("comments.replies.user", "name username avatar");

        if (updatedProject) {
            publish(`project:${id}`, {
                event: "project:comments-updated",
                data: {
                    projectId: id,
                    comments: updatedProject.comments,
                },
            });
        }

                void createNotification({
          userId: project.owner,
          actorId: req.user._id,
          projectId: project._id,
          type: 'comment',
          message: `${req.user.name} commented on your project "${project.title}"`,
                    commentId: createdComment?._id ?? null,
                }).catch((error) => console.error('Failed to create comment notification', error));

        return res.status(201).json({
            message:"Comment Added Successfully",
            comments:updatedProject?.comments ?? project.comments
        })
    } catch (error) {
        return res.status(500).json({
            message:"Error while creating the comment"
        })
    }
}


const editComment = async(req:AuthRequest,res:Response):Promise<Response> =>{
    try {
        const commentId = getParamValue(req.params.commentId);
        const projectId = getParamValue(req.params.projectId);
        const { updatedText } = req.body
        const userId = req.user._id;

        if(!commentId || !mongoose.Types.ObjectId.isValid(commentId)){
            return res.status(400).json({
                message:"Invalid commentId"
            })
        }

        if(!projectId || !mongoose.Types.ObjectId.isValid(projectId)){
            return res.status(400).json({
                message:"Invalid projectId"
            })
        }

        const project = await Project.findById(projectId);

        if(!project){
            return res.status(404).json({
                message:"Project Not Found"
            })
        }

        const comment = project.comments.id(commentId);
        if(!comment){
            return res.status(404).json({
                message:"Comment Not Found"
            })
        }
        if(comment.user?.toString() !== userId.toString()){
            return res.status(401).json({
                message:"Unauthorized"
            })
        }

        comment.text = updatedText;
        await project.save();

        return res.status(201).json({
            message:"Comment Edited Successfully",
            comment,
        })


    } catch (error) {
        return res.status(500).json({
            message:"Something Went Wrong while Updating Comment"
        })
    }
}

const deleteComment = async(req:AuthRequest,res:Response):Promise<Response> =>{
    try {
        const commentId = getParamValue(req.params.commentId);
        const projectId = getParamValue(req.params.projectId);
        const userId = req.user._id;

        if(!commentId || !mongoose.Types.ObjectId.isValid(commentId)){
            return res.status(400).json({
                message:"Invalid commentId"
            })
        }

        if(!projectId || !mongoose.Types.ObjectId.isValid(projectId)){
            return res.status(400).json({
                message:"Invalid projectId"
            })
        }

        const project = await Project.findById(projectId);
        if(!project){
            return res.status(404).json({
                message:"Project Not Found"
            })
        }

        const comment = project.comments.id(commentId);
        if(!comment){
            return res.status(404).json({
                message:"Comment Not Found!!"
            })
        }

        if(!comment.user || comment.user.toString() !== userId.toString()){
            return res.status(401).json({
                message:"Unauthorized Access"
            })
        }

        comment.deleteOne();
        await project.save();

        return res.status(200).json({
            message:"Comment Deleted Successfully",
            comments: project.comments
        })
        
        
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            message:"Something Went Wrong While deleting the comment"
        })
    }
}

const replyComment = async(req:AuthRequest,res:Response):Promise<Response> =>{
    try {
        const commentId = getParamValue(req.params.commentId);
        let {text} = req.body;
        const userId = req.user._id;
        text = text.trim();
        if(!commentId || !mongoose.Types.ObjectId.isValid(commentId)){
            return res.status(400).json({
                message:"Invalid commentId"
            })
        }
        if(!text){
            return res.status(400).json({
                message:"Reply Text required"
            })
        }
        

        const project = await Project.findOne({"comments._id":commentId});
        // console.log(project)
        if(!project){
            return res.status(404).json({
                message:"Project Not Found"
            })
        }

        const comment = project.comments.id(commentId);
        // console.log(comment)
        if(!comment){
            return res.status(404).json({
                message:"Comment Not Found!!"
            })
        }
        // console.log("Replies",comment.replies)
        comment.replies.push({
            user:userId,
            text,
            createdAt:new Date()
        })

        await project.save();
        const updatedProject = await Project.findById(project._id)
        .populate("comments.user", "name username avatar")
        .populate("comments.replies.user", "name username avatar");

        if (updatedProject) {
            publish(`project:${project._id}`, {
                event: "project:comments-updated",
                data: {
                    projectId: project._id,
                    comments: updatedProject.comments,
                },
            });
            publish(`project:${project._id}`, {
                event: "project:replies-updated",
                data: {
                    projectId: project._id,
                    commentId,
                    comments: updatedProject.comments,
                },
            });
        }

                void createNotification({
          userId: project.owner,
          actorId: req.user._id,
          projectId: project._id,
          type: 'reply',
          message: `${req.user.name} replied on your project "${project.title}"`,
          commentId,
                }).catch((error) => console.error('Failed to create reply notification', error));
        return res.status(201).json({
            message:"Reply Added",
            comment
        })


    } catch (error) {
        return res.status(500).json({
            message:"Failed to reply comment"
        })
    }
}

const editReply = async(req:AuthRequest,res:Response):Promise<Response> =>{
    try {
        const commentId = getParamValue(req.params.commentId);
        const replyId = getParamValue(req.params.replyId);
        const { updatedText } = req.body
        const userId = req.user._id;

        if(!commentId || !mongoose.Types.ObjectId.isValid(commentId)){
            return res.status(400).json({
                message:"Invalid commentId"
            })
        }

        if(!replyId || !mongoose.Types.ObjectId.isValid(replyId)){
            return res.status(400).json({
                message:"Invalid replyId"
            })
        }

        const project = await Project.findOne({"comments._id":commentId});

        if(!project){
            return res.status(404).json({
                message:"Project Not Found"
            })
        }

        const comment = project.comments.id(commentId);
        if(!comment){
            return res.status(404).json({
                message:"Comment Not Found"
            })
        }

        const reply = comment.replies.id(replyId);
        if(!reply){
            return res.status(404).json({
                message:"Reply Not Found"
            })
        }

        if(reply.user?.toString() !== userId.toString()){
            return res.status(401).json({
                message:"Unauthorized"
            })
        }

        reply.text = updatedText;
        await project.save();

        const updatedProject = await Project.findById(project._id)
        .populate("comments.user", "name username avatar")
        .populate("comments.replies.user", "name username avatar");

        if (updatedProject) {
            publish(`project:${project._id}`, {
                event: "project:comments-updated",
                data: {
                    projectId: project._id,
                    comments: updatedProject.comments,
                },
            });
            publish(`project:${project._id}`, {
                event: "project:replies-updated",
                data: {
                    projectId: project._id,
                    commentId,
                    comments: updatedProject.comments,
                },
            });
        }

        return res.status(200).json({
            message:"Reply Edited Successfully",
            comment
        })
    } catch (error) {
        return res.status(500).json({
            message:"Something Went Wrong While Updating Reply"
        })
    }
}

const deleteReply = async(req:AuthRequest,res:Response):Promise<Response> =>{
    try {
        const commentId = getParamValue(req.params.commentId);
        const replyId = getParamValue(req.params.replyId);
        const userId = req.user._id;

        if(!commentId || !mongoose.Types.ObjectId.isValid(commentId)){
            return res.status(400).json({
                message:"Invalid commentId"
            })
        }

        if(!replyId || !mongoose.Types.ObjectId.isValid(replyId)){
            return res.status(400).json({
                message:"Invalid replyId"
            })
        }

        const project = await Project.findOne({"comments._id":commentId});

        if(!project){
            return res.status(404).json({
                message:"Project Not Found"
            })
        }

        const comment = project.comments.id(commentId);
        if(!comment){
            return res.status(404).json({
                message:"Comment Not Found"
            })
        }

        const reply = comment.replies.id(replyId);
        if(!reply){
            return res.status(404).json({
                message:"Reply Not Found"
            })
        }

        if(reply.user?.toString() !== userId.toString()){
            return res.status(401).json({
                message:"Unauthorized"
            })
        }

        reply.deleteOne();
        await project.save();

        const updatedProject = await Project.findById(project._id)
        .populate("comments.user", "name username avatar")
        .populate("comments.replies.user", "name username avatar");

        if (updatedProject) {
            publish(`project:${project._id}`, {
                event: "project:comments-updated",
                data: {
                    projectId: project._id,
                    comments: updatedProject.comments,
                },
            });
            publish(`project:${project._id}`, {
                event: "project:replies-updated",
                data: {
                    projectId: project._id,
                    commentId,
                    comments: updatedProject.comments,
                },
            });
        }

        return res.status(200).json({
            message:"Reply Deleted Successfully",
            comment
        })
    } catch (error) {
        console.error(error);
        return res.status(500).json({
            message:"Something Went Wrong While Deleting Reply"
        })
    }
}

export {
    createProject,
    getAllProjects,
    getProjectById,
    toogleLikeProject,
    postComment,
    editComment,
    deleteComment,
    replyComment,
    editReply,
    deleteReply
    ,streamProjectEvents
}
