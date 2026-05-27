export interface User {
  id: string;
  name: string;
  email: string;
  username: string;
  avatar: string;
}

export interface LoginResponse {
  user: User;
  token: string;
}