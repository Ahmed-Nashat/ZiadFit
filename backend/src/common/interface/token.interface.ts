export interface ICreateToken {
  accessToken: string;
  refreshToken: string;
}

export interface ICachedUser {
  _id: string;
  credentialsChangedAt?: number;
  [key: string]: unknown;
}
