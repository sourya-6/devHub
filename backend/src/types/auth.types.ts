interface RegisterBody{
    name:string,
    password:string,
    email:string,
    username:string
    avatar?:string|""
}

interface LoginBody{
    email?:string,
    username?:string,
    password:string
}

export type{
    RegisterBody,
    LoginBody
}