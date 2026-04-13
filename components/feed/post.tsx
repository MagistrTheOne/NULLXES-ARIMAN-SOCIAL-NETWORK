"use client";

import { format } from "date-fns";
import { useCallback, useEffect, useMemo, useState } from "react";
import { createArimanSdk, type CommentRow, type PostRow } from "@nullxes/ariman-sdk";
import { userFacingApiError } from "@/lib/http-error-message";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardFooter, CardHeader } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

function formatPostTime(iso: string) {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  return format(d, "MMM d, yyyy · HH:mm");
}

export function FeedPost({
  post,
  viewerIdentityId,
  onPostUpdated,
  className,
}: {
  post: PostRow;
  viewerIdentityId: string | null;
  onPostUpdated?: () => void | Promise<void>;
  className?: string;
}) {
  const sdk = useMemo(() => createArimanSdk(), []);
  const handle = post.authorHandle ?? "—";
  const display = post.authorDisplayName ?? "Member";

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

  return (
    <Card className={cn("border-border shadow-none ring-1 ring-border", className)}>
      <CardHeader className="space-y-1 pb-2">
        <div className="flex flex-wrap items-baseline gap-x-2 gap-y-0.5">
          <span className="text-sm font-medium text-foreground">{display}</span>
          <span className="font-mono text-xs text-muted-foreground">@{handle}</span>
        </div>
        <time className="font-mono text-[10px] text-muted-foreground">{formatPostTime(post.createdAt)}</time>
      </CardHeader>
      <CardContent className="pt-0 pb-3">
        <p className="whitespace-pre-wrap text-sm leading-relaxed text-foreground">{post.body}</p>
      </CardContent>
      <CardFooter className="flex flex-col gap-3 border-t border-border pt-3">
        <div className="flex flex-wrap items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={cn("border-border shadow-none", echoed && "bg-muted")}
            disabled={echoBusy}
            onClick={() => void onEcho()}
          >
            Echo{echoCount > 0 ? ` · ${echoCount}` : ""}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-border shadow-none"
            onClick={() => setReplyOpen((v) => !v)}
          >
            Reply{commentCount > 0 ? ` · ${commentCount}` : ""}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={cn("border-border shadow-none", saved && "bg-muted")}
            disabled={saveBusy}
            onClick={() => void onSave()}
          >
            Save{saveCount > 0 ? ` · ${saveCount}` : ""}
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="border-border shadow-none"
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
    </Card>
  );
}
