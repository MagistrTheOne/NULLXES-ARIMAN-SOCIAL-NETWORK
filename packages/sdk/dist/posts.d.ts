import type { ArimanSdkConfig, CreatePostBody, CreatePostResponse, GetPostsResponse, MeResponse, PatchMeBody, PatchMeResponse } from "./types.js";
export declare function getMe(config: ArimanSdkConfig | undefined): Promise<MeResponse>;
export declare function patchMe(config: ArimanSdkConfig | undefined, body: PatchMeBody): Promise<PatchMeResponse>;
export type GetFeedParams = {
    identityId: string;
    limit?: number;
};
export declare function getFeed(config: ArimanSdkConfig | undefined, params: GetFeedParams): Promise<GetPostsResponse>;
/** Alias for {@link getFeed} — list posts for an identity you own. */
export declare const getPosts: typeof getFeed;
export declare function createPost(config: ArimanSdkConfig | undefined, body: CreatePostBody): Promise<CreatePostResponse>;
//# sourceMappingURL=posts.d.ts.map