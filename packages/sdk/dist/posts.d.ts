import type { ArimanSdkConfig, CreatePostBody, CreatePostResponse, GetPostsResponse, MeResponse, PatchMeBody, PatchMeResponse, PatchPostBody, ProfileStatsResponse } from "./types.js";
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
export type GetProfileStatsParams = {
    identityId: string;
};
export declare function getProfileStats(config: ArimanSdkConfig | undefined, params: GetProfileStatsParams): Promise<ProfileStatsResponse>;
export declare function patchPost(config: ArimanSdkConfig | undefined, postId: string, body: PatchPostBody): Promise<{
    ok: boolean;
}>;
export declare function deletePost(config: ArimanSdkConfig | undefined, postId: string): Promise<{
    ok: boolean;
}>;
//# sourceMappingURL=posts.d.ts.map