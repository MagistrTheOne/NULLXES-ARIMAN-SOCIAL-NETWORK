"use client";

import { format } from "date-fns";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createArimanSdk, type CommentRow, type PostRow } from "@nullxes/ariman-sdk";
import { userFacingApiError } from "@/lib/http-error-message";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { Loader2, MoreHorizontal, Pencil, Trash2 } from "lucide-react";

function formatPostTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return format(d, "MMM d, yyyy · HH:mm");
}

export function FeedPost({
  post,
  viewerIdentityId,
  onPostUpdated,
  onPostRemoved,
  layout = "full",
  showOwnerActions = false,
  className,
}: {
  post: PostRow;
  viewerIdentityId: string | null;
  onPostUpdated?: () => void | Promise<void>;
  onPostRemoved?: () => void | Promise<void>;
  layout?: "full" | "compact";
  showOwnerActions?: boolean;
  className?: string;
}) {
  const sdk = useMemo(() => createArimanSdk(), []);
  const handle = post.authorHandle ?? "—";
  const display = post.authorDisplayName ?? "Member";
  const isOwner = Boolean(
    viewerIdentityId && post.authorIdentityId && viewerIdentityId === post.authorIdentityId,
  );
  const showMenu = showOwnerActions && isOwner;

  const [bodyText, setBodyText] = useState(post.body);
  const [editedAt, setEditedAt] = useState(post.editedAt ?? null);
  const [echoCount, setEchoCount] = useState(post.echoCount ?? 0);
  const [commentCount, setCommentCount] = useState(post.commentCount ?? 0);
  const [saveCount, setSaveCount] = useState(post.saveCount ?? 0);
  const [echoed, setEchoed] = useState(!!post.echoedByViewer);
  const [saved, setSaved] = useState(!!post.savedByViewer);
  const [replyOpen, setReplyOpen] = useState(false);
  const [comments, setComments] = useState<CommentRow[]>([]);
  const [loadingComments, setLoadingComments] = useState(false);
  const [commentDraft, setCommentDraft] = useState("");
  const [postingComment, setPostingComment] = useState(false);
  const [echoBusy, setEchoBusy] = useState(false);
  const [saveBusy, setSaveBusy] = useState(false);
  const [analyzeOpen, setAnalyzeOpen] = useState(false);
  const [analyzeLoading, setAnalyzeLoading] = useState(false);
  const [analyzeText, setAnalyzeText] = useState<string | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editDraft, setEditDraft] = useState(post.body);
  const [editBusy, setEditBusy] = useState(false);
  const [deleteBusy, setDeleteBusy] = useState(false);

  useEffect(() => {
    setBodyText(post.body);
    setEditedAt(post.editedAt ?? null);
    setEditDraft(post.body);
  }, [post.id, post.body, post.editedAt]);

  useEffect(() => {
    setEchoCount(post.echoCount ?? 0);
    setCommentCount(post.commentCount ?? 0);
    setSaveCount(post.saveCount ?? 0);
    setEchoed(!!post.echoedByViewer);
    setSaved(!!post.savedByViewer);
  }, [
    post.id,
    post.echoCount,
    post.commentCount,
    post.saveCount,
    post.echoedByViewer,
    post.savedByViewer,
  ]);

  const loadComments = useCallback(async () => {
    setLoadingComments(true);
    try {
      const d = await sdk.listPostComments(post.id, 80);
      setComments(d.comments ?? []);
    } catch (e) {
      toast.error(userFacingApiError(e));
    } finally {
      setLoadingComments(false);
    }
  }, [sdk, post.id]);

  useEffect(() => {
    if (replyOpen) void loadComments();
  }, [replyOpen, loadComments]);

  const runAnalyze = useCallback(async () => {
    setAnalyzeLoading(true);
    setAnalyzeText(null);
    try {
      const r = await sdk.analyzePost(post.id);
      setAnalyzeText(r.explanation);
    } catch (e) {
      toast.error(userFacingApiError(e));
    } finally {
      setAnalyzeLoading(false);
    }
  }, [sdk, post.id]);

  useEffect(() => {
    if (!analyzeOpen) return;
    void runAnalyze();
  }, [analyzeOpen, runAnalyze]);

  async function onEcho() {
    if (!viewerIdentityId) {
      toast.message("Choose an identity in the feed header first.");
      return;
    }
    setEchoBusy(true);
    try {
      const out = await sdk.toggleEcho(post.id, viewerIdentityId);
      setEchoCount(out.echoCount);
      setCommentCount(out.commentCount);
      setSaveCount(out.saveCount);
      setEchoed(out.echoedByViewer);
      setSaved(out.savedByViewer);
      await onPostUpdated?.();
    } catch (e) {
      toast.error(userFacingApiError(e));
    } finally {
      setEchoBusy(false);
    }
  }

  async function onSave() {
    if (!viewerIdentityId) {
      toast.message("Choose an identity in the feed header first.");
      return;
    }
    setSaveBusy(true);
    try {
      const out = await sdk.toggleSave(post.id, viewerIdentityId);
      setEchoCount(out.echoCount);
      setCommentCount(out.commentCount);
      setSaveCount(out.saveCount);
      setEchoed(out.echoedByViewer);
      setSaved(out.savedByViewer);
      await onPostUpdated?.();
    } catch (e) {
      toast.error(userFacingApiError(e));
    } finally {
      setSaveBusy(false);
    }
  }

  async function submitComment() {
    if (!viewerIdentityId || !commentDraft.trim()) return;
    setPostingComment(true);
    try {
      await sdk.createComment(post.id, { identityId: viewerIdentityId, body: commentDraft.trim() });
      setCommentDraft("");
      setCommentCount((c) => c + 1);
      await loadComments();
      await onPostUpdated?.();
      toast.success("Comment added");
    } catch (e) {
      toast.error(userFacingApiError(e));
    } finally {
      setPostingComment(false);
    }
  }

  async function saveEdit() {
    const t = editDraft.trim();
    if (!t) return;
    setEditBusy(true);
    try {
      await sdk.patchPost(post.id, { body: t });
      setBodyText(t);
      setEditedAt(new Date().toISOString());
      setEditOpen(false);
      await onPostUpdated?.();
      toast.success("Post updated");
    } catch (e) {
      toast.error(userFacingApiError(e));
    } finally {
      setEditBusy(false);
    }
  }

  async function removePost() {
    setDeleteBusy(true);
    try {
      await sdk.deletePost(post.id);
      setEditOpen(false);
      await onPostRemoved?.();
      await onPostUpdated?.();
      toast.success("Post removed");
    } catch (e) {
      toast.error(userFacingApiError(e));
    } finally {
      setDeleteBusy(false);
    }
  }

  return (
    <div className={cn("group relative", className)}>
      {showMenu ? (
        <div className="absolute right-2 top-2 z-1 opacity-100 transition-opacity duration-150 md:opacity-0 md:group-hover:opacity-100">
          <DropdownMenu>
            <DropdownMenuTrigger
              type="button"
              className={cn(
                buttonVariants({ variant: "ghost", size: "icon" }),
                "size-8 border border-border bg-background/90 shadow-none backdrop-blur-sm",
              )}
              aria-label="Post actions"
            >
              <MoreHorizontal className="size-4" />
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="min-w-32 border-border shadow-none ring-1 ring-border">
              <DropdownMenuItem
                onClick={() => {
                  setEditDraft(bodyText);
                  setEditOpen(true);
                }}
              >
                <Pencil className="size-3.5" />
                Edit
              </DropdownMenuItem>
              <DropdownMenuItem
                disabled={deleteBusy}
                onClick={() => {
                  if (window.confirm("Remove this post from your profile?")) void removePost();
                }}
              >
                <Trash2 className="size-3.5" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      ) : null}

      <Card
        className={cn(
          "border-border shadow-none ring-1 ring-border transition-colors duration-150",
          showMenu && "pr-10",
        )}
      >
        <CardHeader className={cn("space-y-1 pb-2", layout === "compact" && "pb-1")}>
          {layout === "full" ? (
            <>
              <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
                <span className="text-sm font-medium text-foreground">{display}</span>
                <span className="font-mono text-xs text-muted-foreground">@{handle}</span>
              </div>
              <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
                <time className="font-mono text-[10px] text-muted-foreground">{formatPostTime(post.createdAt)}</time>
                {editedAt ? (
                  <span className="font-mono text-[10px] text-muted-foreground">· edited</span>
                ) : null}
              </div>
            </>
          ) : (
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-[10px] text-muted-foreground">{formatPostTime(post.createdAt)}</span>
              {editedAt ? (
                <span className="font-mono text-[10px] text-muted-foreground">edited</span>
              ) : null}
            </div>
          )}
        </CardHeader>
        <CardContent className="pt-0 pb-3">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{bodyText}</p>
        </CardContent>
        <CardFooter className="flex flex-col gap-3 border-t border-border pt-3">
          <div className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={cn("border-border shadow-none transition-colors duration-150", echoed && "bg-muted")}
              disabled={echoBusy}
              onClick={() => void onEcho()}
            >
              Echo{echoCount > 0 ? ` · ${echoCount}` : ""}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-border shadow-none transition-colors duration-150"
              onClick={() => setReplyOpen((v) => !v)}
            >
              Reply{commentCount > 0 ? ` · ${commentCount}` : ""}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={cn("border-border shadow-none transition-colors duration-150", saved && "bg-muted")}
              disabled={saveBusy}
              onClick={() => void onSave()}
            >
              Save{saveCount > 0 ? ` · ${saveCount}` : ""}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="border-border shadow-none transition-colors duration-150"
              disabled={analyzeLoading && analyzeOpen}
              onClick={() => setAnalyzeOpen(true)}
            >
              Analyze
            </Button>
          </div>

          {replyOpen ? (
            <div className="w-full space-y-3 rounded-md border border-border bg-card/50 p-3">
              <p className="font-mono text-[10px] tracking-wide text-muted-foreground uppercase">Comments</p>
              {loadingComments ? (
                <div className="space-y-2">
                  <Skeleton className="h-10 animate-none border border-border bg-muted/30 shadow-none" />
                  <Skeleton className="h-10 animate-none border border-border bg-muted/30 shadow-none" />
                </div>
              ) : comments.length === 0 ? (
                <p className="text-xs text-muted-foreground">No comments yet.</p>
              ) : (
                <ul className="max-h-60 space-y-2 overflow-y-auto">
                  {comments.map((c) => (
                    <li key={c.id} className="rounded border border-border bg-background px-2 py-2 text-xs">
                      <div className="flex flex-wrap items-baseline gap-x-2">
                        <span className="font-medium text-foreground">{c.authorDisplayName}</span>
                        <span className="font-mono text-[10px] text-muted-foreground">@{c.authorHandle}</span>
                      </div>
                      <p className="mt-1 whitespace-pre-wrap text-foreground">{c.body}</p>
                      <p className="mt-1 font-mono text-[10px] text-muted-foreground">{formatPostTime(c.createdAt)}</p>
                    </li>
                  ))}
                </ul>
              )}
              <div className="space-y-2">
                <Textarea
                  value={commentDraft}
                  onChange={(e) => setCommentDraft(e.target.value)}
                  placeholder={viewerIdentityId ? "Write a comment…" : "Select an identity above"}
                  disabled={!viewerIdentityId}
                  className="min-h-16 resize-none border border-border bg-background text-sm shadow-none"
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="border-border shadow-none"
                  disabled={!viewerIdentityId || postingComment || !commentDraft.trim()}
                  onClick={() => void submitComment()}
                >
                  {postingComment ? "Posting…" : "Post comment"}
                </Button>
              </div>
            </div>
          ) : null}
        </CardFooter>
      </Card>

      <Sheet open={editOpen} onOpenChange={setEditOpen}>
        <SheetContent side="right" className="border-border sm:max-w-md">
          <SheetHeader>
            <SheetTitle>Edit post</SheetTitle>
            <SheetDescription>Update the text shown on your profile and feed.</SheetDescription>
          </SheetHeader>
          <div className="mt-6 space-y-4 px-4 pb-6">
            <Textarea
              value={editDraft}
              onChange={(e) => setEditDraft(e.target.value)}
              className="min-h-40 resize-none border border-border bg-background text-sm shadow-none"
              onKeyDown={(e) => {
                if (e.key === "Enter" && (e.metaKey || e.ctrlKey)) {
                  e.preventDefault();
                  void saveEdit();
                }
              }}
            />
            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="border-border shadow-none"
                disabled={editBusy || !editDraft.trim()}
                onClick={() => void saveEdit()}
              >
                {editBusy ? <Loader2 className="size-4 animate-spin" /> : "Save"}
              </Button>
              <Button type="button" variant="ghost" className="shadow-none" onClick={() => setEditOpen(false)}>
                Cancel
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={analyzeOpen} onOpenChange={setAnalyzeOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>Analyze</DialogTitle>
            <DialogDescription>Model explanation for this post.</DialogDescription>
          </DialogHeader>
          {analyzeLoading ? (
            <Skeleton className="min-h-24 animate-none border border-border bg-muted/30 shadow-none" />
          ) : analyzeText ? (
            <p className="max-h-[min(60vh,24rem)] overflow-y-auto whitespace-pre-wrap text-sm text-foreground">
              {analyzeText}
            </p>
          ) : (
            <p className="text-sm text-muted-foreground">No result.</p>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
