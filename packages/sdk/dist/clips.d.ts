import type { ArimanSdkConfig, CreateClipBody, CreateClipResponse, GetClipsParams, GetClipsResponse } from "./types.js";
export declare function getClips(config: ArimanSdkConfig | undefined, params: GetClipsParams): Promise<GetClipsResponse>;
export declare function createClip(config: ArimanSdkConfig | undefined, body: CreateClipBody): Promise<CreateClipResponse>;
//# sourceMappingURL=clips.d.ts.map