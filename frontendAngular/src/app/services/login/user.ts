export interface User {
  _id: string;
  name: string;
  email: string;
  username: string;
  avatar: string;
}

export interface LoginResponse {
  user: User;
  token: string;
}