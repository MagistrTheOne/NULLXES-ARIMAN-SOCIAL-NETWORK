import type { ArimanSdkConfig, CreatePostBody, CreatePostResponse, GetPostsResponse, MeResponse } from "./types.js";
export declare function getMe(config: ArimanSdkConfig | undefined): Promise<MeResponse>;
export type GetFeedParams = {
    identityId: string;
    limit?: number;
};
export declare function getFeed(config: ArimanSdkConfig | undefined, params: GetFeedParams): Promise<GetPostsResponse>;
export declare function createPost(config: ArimanSdkConfig | undefined, body: CreatePostBody): Promise<CreatePostResponse>;
//# sourceMappingURL=posts.d.ts.map