import type { ArimanSdkConfig, CreateCommentBody, GetActivityResponse, ListCommentsResponse, PostInteractionState } from "./types.js";
export declare function listPostComments(config: ArimanSdkConfig | undefined, postId: string, limit?: number): Promise<ListCommentsResponse>;
export declare function createComment(config: ArimanSdkConfig | undefined, postId: string, body: CreateCommentBody): Promise<{
    comment: {
        id: string;
        postId: string;
        authorIdentityId: string;
        body: string;
        createdAt: string;
    };
}>;
export declare function toggleEcho(config: ArimanSdkConfig | undefined, postId: string, identityId: string): Promise<PostInteractionState>;
export declare function toggleSave(config: ArimanSdkConfig | undefined, postId: string, identityId: string): Promise<PostInteractionState>;
export type GetActivityParams = {
    identityId: string;
    limit?: number;
};
export declare function getActivity(config: ArimanSdkConfig | undefined, params: GetActivityParams): Promise<GetActivityResponse>;
//# sourceMappingURL=post-social.d.ts.map