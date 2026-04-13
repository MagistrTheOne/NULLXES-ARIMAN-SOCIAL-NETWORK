"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createArimanSdk, type ConversationSummaryRow } from "@nullxes/ariman-sdk";
import { type Channel as StreamChannel, StreamChat } from "stream-chat";
import {
  Channel,
  ChannelHeader,
  Chat,
  MessageInput,
  MessageList,
  Window,
} from "stream-chat-react";
import {
  CancelCallButton,
  type VideoPlaceholderProps,
  SpeakingWhileMutedNotification,
  ToggleAudioPublishingButton,
  ToggleVideoPublishingButton,
  StreamCall,
  StreamTheme,
  StreamVideo,
  StreamVideoClient,
  SpeakerLayout,
  createSoundDetector,
  useCallStateHooks,
  useParticipantViewContext,
} from "@stream-io/video-react-sdk";
import { Maximize, Minimize2 } from "lucide-react";
import { ConversationList } from "@/components/messages/conversation-list";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { userFacingApiError } from "@/lib/http-error-message";

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type StreamTokenResponse = {
  apiKey: string;
  token: string;
  callType: string;
  callId: string;
  channelType: string;
  channelId: string;
  user: {
    id: string;
    name: string;
    image: string | null;
  };
};

function nameInitials(name: string) {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return `${parts[0]?.[0] ?? ""}${parts[1]?.[0] ?? ""}`.toUpperCase();
  return name.slice(0, 2).toUpperCase() || "?";
}

function ParticipantOverlay() {
  const { participant, participantViewElement } = useParticipantViewContext();
  const [isFullscreen, setIsFullscreen] = useState(false);
  const label =
    (participant as { name?: string; id?: string }).name ??
    (participant as { id?: string }).id ??
    "Participant";
  const isMuted = (participant as { isAudioEnabled?: boolean }).isAudioEnabled === false;

  useEffect(() => {
    const handler = () => {
      setIsFullscreen(document.fullscreenElement === participantViewElement);
    };
    window.addEventListener("fullscreenchange", handler);
    return () => {
      window.removeEventListener("fullscreenchange", handler);
    };
  }, [participantViewElement]);

  const toggleFullscreen = useCallback(() => {
    if (!participantViewElement) return;
    if (document.fullscreenElement === participantViewElement) {
      void document.exitFullscreen();
      return;
    }
    void participantViewElement.requestFullscreen();
  }, [participantViewElement]);

  return (
    <div className="pointer-events-none absolute inset-0 z-10 flex items-start justify-between p-2">
      <span className="rounded border border-border bg-background/90 px-2 py-1 text-[10px] font-medium tracking-wide text-foreground backdrop-blur-sm">
        {label}
        {isMuted ? " · muted" : ""}
      </span>
      <button
        type="button"
        onClick={toggleFullscreen}
        className="pointer-events-auto inline-flex size-7 items-center justify-center rounded border border-border bg-background/90 text-foreground backdrop-blur-sm"
      >
        {isFullscreen ? <Minimize2 className="size-3.5" /> : <Maximize className="size-3.5" />}
      </button>
    </div>
  );
}

function ParticipantPlaceholder({ style }: VideoPlaceholderProps) {
  const { participant } = useParticipantViewContext();
  const label =
    (participant as { name?: string; id?: string }).name ??
    (participant as { id?: string }).id ??
    "Participant";
  const image = (participant as { image?: string }).image;
  return (
    <div
      style={{ ...style }}
      className="absolute inset-0 flex size-full items-center justify-center bg-muted/40"
    >
      {image ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={image} alt={label} className="size-20 rounded-full object-cover" />
      ) : (
        <span className="inline-flex size-20 items-center justify-center rounded-full border border-border bg-background text-lg font-medium text-foreground">
          {nameInitials(label)}
        </span>
      )}
    </div>
  );
}

function AudioVolumeIndicator() {
  const { useMicrophoneState } = useCallStateHooks();
  const { isEnabled, mediaStream } = useMicrophoneState();
  const [audioLevel, setAudioLevel] = useState(0);

  useEffect(() => {
    if (!isEnabled || !mediaStream) return;
    const dispose = createSoundDetector(
      mediaStream,
      ({ audioLevel: level }) => setAudioLevel(level),
      { detectionFrequencyInMs: 80, destroyStreamOnStop: false },
    );
    return () => {
      void dispose().catch(() => {});
    };
  }, [isEnabled, mediaStream]);

  if (!isEnabled) return null;

  return (
    <div className="flex items-center gap-2 border-t border-border px-4 py-2">
      <span className="font-mono text-[10px] tracking-wide text-muted-foreground uppercase">Mic</span>
      <div className="h-1.5 flex-1 overflow-hidden rounded bg-muted">
        <div
          className="h-full bg-foreground transition-transform duration-100"
          style={{ transform: `scaleX(${Math.max(0, Math.min(1, audioLevel / 100))})`, transformOrigin: "left center" }}
        />
      </div>
    </div>
  );
}

function ArimanCallControls() {
  return (
    <div className="str-video__call-controls border-t border-border bg-background/95 px-3 py-2">
      <SpeakingWhileMutedNotification>
        <ToggleAudioPublishingButton />
      </SpeakingWhileMutedNotification>
      <ToggleVideoPublishingButton />
      <CancelCallButton />
    </div>
  );
}

export function StreamMessagesView() {
  const sdk = useMemo(() => createArimanSdk(), []);
  const router = useRouter();
  const searchParams = useSearchParams();
  const conversationFromQuery = searchParams.get("conversation");
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const [summaries, setSummaries] = useState<ConversationSummaryRow[]>([]);
  const [loadingSummaries, setLoadingSummaries] = useState(true);
  const [loadingRoom, setLoadingRoom] = useState(false);
  const [tab, setTab] = useState("chat");
  const [error, setError] = useState<string | null>(null);
  const [chatClient, setChatClient] = useState<StreamChat | null>(null);
  const [videoClient, setVideoClient] = useState<StreamVideoClient | null>(null);
  const [channel, setChannel] = useState<StreamChannel | null>(null);
  const [callInstance, setCallInstance] = useState<ReturnType<StreamVideoClient["call"]> | null>(null);

  const refreshSummaries = useCallback(async () => {
    const data = await sdk.listConversationSummaries();
    setSummaries(data.conversations ?? []);
  }, [sdk]);

  useEffect(() => {
    let cancelled = false;
    setLoadingSummaries(true);
    void (async () => {
      try {
        await refreshSummaries();
      } catch (e) {
        if (!cancelled) setError(userFacingApiError(e));
      } finally {
        if (!cancelled) setLoadingSummaries(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [refreshSummaries]);

  useEffect(() => {
    if (conversationFromQuery && UUID_RE.test(conversationFromQuery)) {
      setActiveConversationId(conversationFromQuery);
      return;
    }
    if (!conversationFromQuery && summaries.length > 0) {
      const first = summaries[0]?.conversationId ?? null;
      if (first) {
        setActiveConversationId(first);
        router.replace(`/messages?conversation=${encodeURIComponent(first)}`);
      }
    }
  }, [conversationFromQuery, summaries, router]);

  useEffect(() => {
    if (!activeConversationId) {
      setChannel(null);
      setCallInstance(null);
      return;
    }
    let cancelled = false;
    let localChat: StreamChat | null = null;
    let localVideo: StreamVideoClient | null = null;
    let localCall: ReturnType<StreamVideoClient["call"]> | null = null;

    void (async () => {
      setLoadingRoom(true);
      setError(null);
      try {
        const [tokenRes, conversation] = await Promise.all([
          fetch(`/api/stream/token?conversationId=${encodeURIComponent(activeConversationId)}`),
          sdk.getConversation(activeConversationId),
        ]);
        const payload = (await tokenRes.json()) as StreamTokenResponse | { error?: string };
        if (!tokenRes.ok) {
          throw new Error((payload as { error?: string }).error ?? "Stream token failed");
        }
        const tokenPayload = payload as StreamTokenResponse;

        const chat = StreamChat.getInstance(tokenPayload.apiKey);
        localChat = chat;
        await chat.connectUser(
          {
            id: tokenPayload.user.id,
            name: tokenPayload.user.name,
            image: tokenPayload.user.image ?? undefined,
          },
          tokenPayload.token,
        );
        const members = (conversation.members ?? []).map((m) => `ariman-user-${m.userId}`);
        const nextChannel = chat.channel(tokenPayload.channelType, tokenPayload.channelId, {
          members,
        });
        await nextChannel.watch();

        const video = new StreamVideoClient({
          apiKey: tokenPayload.apiKey,
          user: {
            id: tokenPayload.user.id,
            name: tokenPayload.user.name,
            image: tokenPayload.user.image ?? undefined,
          },
          token: tokenPayload.token,
        });
        localVideo = video;
        const nextCall = video.call(tokenPayload.callType, tokenPayload.callId);
        localCall = nextCall;
        await nextCall.join({ create: true });

        if (cancelled) return;
        setChatClient(chat);
        setVideoClient(video);
        setChannel(nextChannel);
        setCallInstance(nextCall);
      } catch (e) {
        if (!cancelled) setError(userFacingApiError(e));
      } finally {
        if (!cancelled) setLoadingRoom(false);
      }
    })();

    return () => {
      cancelled = true;
      if (localCall) void localCall.leave();
      if (localVideo) void localVideo.disconnectUser();
      if (localChat) void localChat.disconnectUser();
    };
  }, [activeConversationId, sdk]);

  const onSelectConversation = useCallback(
    (conversationId: string) => {
      setActiveConversationId(conversationId);
      router.replace(`/messages?conversation=${encodeURIComponent(conversationId)}`);
    },
    [router],
  );

  return (
    <div className="ariman-stream p-4 sm:p-6">
      {error ? <p className="mb-3 text-sm text-destructive">{error}</p> : null}
      <div className="grid min-h-[calc(100vh-10rem)] grid-cols-1 gap-4 lg:grid-cols-[18rem_1fr]">
        <aside className="border border-border">
          <div className="border-b border-border px-3 py-2">
            <p className="text-sm font-medium text-foreground">Messages</p>
          </div>
          <ConversationList
            items={summaries}
            activeId={activeConversationId}
            loading={loadingSummaries}
            onSelect={onSelectConversation}
          />
        </aside>

        <section className="border border-border">
          <Tabs value={tab} onValueChange={(v) => v && setTab(v)} className="h-full">
            <TabsList variant="line" className="h-10 border-b border-border bg-transparent p-0">
              <TabsTrigger value="chat" className="rounded-none border-0 shadow-none data-active:shadow-none">
                Chat
              </TabsTrigger>
              <TabsTrigger value="call" className="rounded-none border-0 shadow-none data-active:shadow-none">
                Call
              </TabsTrigger>
            </TabsList>

            {loadingRoom ? (
              <div className="space-y-3 p-4">
                <Skeleton className="h-12 w-full animate-none border border-border bg-muted/20 shadow-none" />
                <Skeleton className="h-80 w-full animate-none border border-border bg-muted/20 shadow-none" />
              </div>
            ) : !chatClient || !videoClient || !channel || !callInstance ? (
              <div className="p-4 text-sm text-muted-foreground">Select a conversation to load Stream chat and call.</div>
            ) : tab === "chat" ? (
              <div className="h-[calc(100vh-14rem)] min-h-136 overflow-hidden">
                <Chat client={chatClient} theme="str-chat__theme-light ariman-stream-chat">
                  <Channel channel={channel}>
                    <Window>
                      <ChannelHeader />
                      <MessageList />
                      <MessageInput />
                    </Window>
                  </Channel>
                </Chat>
              </div>
            ) : (
              <div className="h-[calc(100vh-14rem)] min-h-136 overflow-hidden">
                <StreamVideo client={videoClient}>
                  <StreamTheme className="ariman-stream-video h-full">
                    <StreamCall call={callInstance}>
                      <div className="flex h-full flex-col">
                        <div className="min-h-0 flex-1 p-2">
                          <SpeakerLayout
                            participantsBarPosition="right"
                            mirrorLocalParticipantVideo={false}
                            VideoPlaceholder={ParticipantPlaceholder}
                            ParticipantViewUISpotlight={ParticipantOverlay}
                            ParticipantViewUIBar={ParticipantOverlay}
                          />
                        </div>
                        <AudioVolumeIndicator />
                        <ArimanCallControls />
                      </div>
                    </StreamCall>
                  </StreamTheme>
                </StreamVideo>
              </div>
            )}
          </Tabs>
        </section>
      </div>
    </div>
  );
}
