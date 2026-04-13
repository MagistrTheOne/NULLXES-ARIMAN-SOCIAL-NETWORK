import type { ArimanSdkConfig, SearchUsersResponse } from "./types.js";
export type SearchUsersParams = {
    search: string;
    limit?: number;
};
export declare function searchUsers(config: ArimanSdkConfig | undefined, params: SearchUsersParams): Promise<SearchUsersResponse>;
//# sourceMappingURL=users-search.d.ts.map