"use client";

import { useEffect, useState } from "react";
import { StreamChat } from "stream-chat";
import {
  Channel,
  ChannelHeader,
  ChannelList,
  Chat,
  MessageInput,
  MessageList,
  Window,
} from "stream-chat-react";
import {
  CallControls,
  SpeakerLayout,
  StreamCall,
  StreamTheme,
  StreamVideo,
  StreamVideoClient,
} from "@stream-io/video-react-sdk";
import { userFacingApiError } from "@/lib/http-error-message";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Skeleton } from "@/components/ui/skeleton";

type StreamTokenResponse = {
  apiKey: string;
  token: string;
  callType: string;
  callId: string;
  user: {
    id: string;
    name: string;
    image: string | null;
  };
};

export function StreamMessagesView() {
  const [tab, setTab] = useState("chat");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [chatClient, setChatClient] = useState<StreamChat | null>(null);
  const [channelCid, setChannelCid] = useState<string | null>(null);
  const [videoClient, setVideoClient] = useState<StreamVideoClient | null>(null);
  const [callInstance, setCallInstance] = useState<ReturnType<StreamVideoClient["call"]> | null>(null);

  const activeChannel = useMemo(() => {
    if (!chatClient || !channelCid) return null;
    return chatClient.channel(channelCid.split(":")[0] ?? "messaging", channelCid.split(":")[1] ?? "ariman-global");
  }, [chatClient, channelCid]);

  useEffect(() => {
    let cancelled = false;
    let mountedChat: StreamChat | null = null;
    let mountedVideo: StreamVideoClient | null = null;
    let mountedCall: ReturnType<StreamVideoClient["call"]> | null = null;

    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/stream/token", { method: "GET" });
        if (!res.ok) throw new Error((await res.json()).error ?? "Stream token failed");
        const tokenPayload = (await res.json()) as StreamTokenResponse;

        const chat = StreamChat.getInstance(tokenPayload.apiKey);
        mountedChat = chat;
        await chat.connectUser(
          {
            id: tokenPayload.user.id,
            name: tokenPayload.user.name,
            image: tokenPayload.user.image ?? undefined,
          },
          tokenPayload.token,
        );
        const globalChannel = chat.channel("messaging", "ariman-global", {
          name: "ARIMAN Global",
          members: [tokenPayload.user.id],
        });
        await globalChannel.watch();

        const video = new StreamVideoClient({
          apiKey: tokenPayload.apiKey,
          user: {
            id: tokenPayload.user.id,
            name: tokenPayload.user.name,
            image: tokenPayload.user.image ?? undefined,
          },
          token: tokenPayload.token,
        });
        mountedVideo = video;
        const call = video.call(tokenPayload.callType, tokenPayload.callId);
        mountedCall = call;
        await call.join({ create: true });

        if (cancelled) return;
        setChatClient(chat);
        setChannelCid(globalChannel.cid);
        setVideoClient(video);
        setCallInstance(call);
      } catch (e) {
        if (!cancelled) setError(userFacingApiError(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      if (mountedCall) void mountedCall.leave();
      if (mountedVideo) void mountedVideo.disconnectUser();
      if (mountedChat) void mountedChat.disconnectUser();
    };
  }, []);

  if (loading) {
    return (
      <div className="space-y-3 p-6">
        <Skeleton className="h-10 w-40 animate-none border border-border bg-muted/20 shadow-none" />
        <Skeleton className="h-128 w-full animate-none border border-border bg-muted/20 shadow-none" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6">
        <p className="text-sm text-destructive">{error}</p>
      </div>
    );
  }

  if (!chatClient || !activeChannel || !videoClient || !callInstance) {
    return (
      <div className="p-6">
        <p className="text-sm text-muted-foreground">Stream is not ready.</p>
      </div>
    );
  }

  return (
    <div className="p-6">
      <Tabs value={tab} onValueChange={(v) => v && setTab(v)} className="mb-6">
        <TabsList variant="line" className="h-10 border-b border-border bg-transparent p-0">
          <TabsTrigger value="chat" className="rounded-none border-0 shadow-none data-active:shadow-none">
            Chat
          </TabsTrigger>
          <TabsTrigger value="call" className="rounded-none border-0 shadow-none data-active:shadow-none">
            Call
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {tab === "chat" ? (
        <div className="h-[calc(100vh-14rem)] min-h-136 overflow-hidden border border-border">
          <Chat client={chatClient} theme="str-chat__theme-light">
            <div className="grid h-full min-h-0 grid-cols-[18rem_1fr]">
              <ChannelList />
              <Channel channel={activeChannel}>
                <Window>
                  <ChannelHeader />
                  <MessageList />
                  <MessageInput />
                </Window>
              </Channel>
            </div>
          </Chat>
        </div>
      ) : (
        <div className="h-[calc(100vh-14rem)] min-h-136 overflow-hidden border border-border p-3">
          <StreamVideo client={videoClient}>
            <StreamCall call={callInstance}>
              <StreamTheme>
                <div className="h-full">
                  <SpeakerLayout participantBarPosition="right" />
                  <CallControls />
                </div>
              </StreamTheme>
            </StreamCall>
          </StreamVideo>
        </div>
      )}
    </div>
  );
}
