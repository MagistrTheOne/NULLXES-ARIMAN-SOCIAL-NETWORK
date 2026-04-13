import type { ArimanSdkConfig, MentionCandidatesResponse } from "./types.js";
export type ListMentionCandidatesParams = {
    q?: string;
    limit?: number;
};
export declare function listMentionCandidates(config: ArimanSdkConfig | undefined, params?: ListMentionCandidatesParams): Promise<MentionCandidatesResponse>;
//# sourceMappingURL=mention-candidates.d.ts.map