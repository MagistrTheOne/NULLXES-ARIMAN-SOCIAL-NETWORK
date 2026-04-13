import type { ArimanSdkConfig, CreateClipBody, CreateClipResponse, GetClipsParams, GetClipsResponse, RecordClipViewResponse, UploadClipVideoParams, UploadClipVideoResponse } from "./types.js";
export declare function getClips(config: ArimanSdkConfig | undefined, params: GetClipsParams): Promise<GetClipsResponse>;
export declare function createClip(config: ArimanSdkConfig | undefined, body: CreateClipBody): Promise<CreateClipResponse>;
export declare function uploadClipVideo(config: ArimanSdkConfig | undefined, params: UploadClipVideoParams): Promise<UploadClipVideoResponse>;
export declare function recordClipView(config: ArimanSdkConfig | undefined, clipId: string): Promise<RecordClipViewResponse>;
//# sourceMappingURL=clips.d.ts.map