export interface projectTemplate{
    _id:string,
    title:string,
    description:string,
    image?:string,
    liveLink?:string,
    gitHubLink?:string,
    tags?:string[],
    owner:string,
    likes:string[],
    comments:Comment[]
}

export interface Comment{
_id?:string,
user:{
  _id:string;
  name:string;
  username:string;
  avatar:string;
},
    text:string,
    createdAt:Date,
    replies:Reply[]
}


export interface Reply{ 
    _id?:string,
    user:{
    _id:string;
  name:string;
  username:string;
  avatar:string;
    },
    text:string,
    createdAt:Date


}

export interface realProjectTemplate{
    count:number,
    projects:projectTemplate[]
}

export interface addProjectTemplate {
  title: string,
  description: string,
  image?: File | null,
  liveLink?: string,
  gitHubLink?: string,
  tags?: string
}