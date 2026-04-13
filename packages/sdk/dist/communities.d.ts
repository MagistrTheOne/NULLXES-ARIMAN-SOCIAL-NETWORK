import type { ArimanSdkConfig, CommunityDetailResponse } from "./types.js";
export type GetCommunityParams = {
    identityId?: string;
};
export declare function getCommunity(config: ArimanSdkConfig | undefined, slug: string, params?: GetCommunityParams): Promise<CommunityDetailResponse>;
export declare function joinCommunity(config: ArimanSdkConfig | undefined, slug: string): Promise<{
    ok: boolean;
    joined: boolean;
}>;
//# sourceMappingURL=communities.d.ts.map