export interface projectTemplate{
    id:string,
    title:string,
    description:string,
    image?:string,
    liveLink?:string,
    gitHubLink?:string,
    tags?:string[],
    owner?:string,
    likes?: string[],
    likeCount?: number,
    likedByMe?: boolean,
    comments?:Comment[]
}

export interface Comment{
id?:string,
user:{
  id:string;
  name:string;
  username:string;
  avatar:string;
},
    text:string,
    createdAt:Date,
    replies:Reply[]
}


export interface Reply{ 
    id?:string,
    user:{
    id:string;
  name:string;
  username:string;
  avatar:string;
    },
    text:string,
    createdAt:Date


}

export interface PaginationMeta {
  total: number;
  page: number;
  limit: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export interface realProjectTemplate{
    count:number,
    projects:projectTemplate[]
}

export interface PaginatedProjectsResponse {
  data: projectTemplate[];
  pagination: PaginationMeta;
}

export interface addProjectTemplate {
  title: string,
  description: string,
  image?: File | null,
  liveLink?: string,
  gitHubLink?: string,
  tags?: string
}
