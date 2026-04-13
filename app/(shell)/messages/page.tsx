import { Suspense } from "react";
import { MessagesView } from "@/components/messages/messages-view";
import { StreamMessagesView } from "@/components/messages/stream-messages-view";

export default function MessagesPage() {
  const useStream = Boolean(process.env.NEXT_PUBLIC_STREAM_API_KEY);
  return (
    <Suspense fallback={null}>
      {useStream ? <StreamMessagesView /> : <MessagesView />}
    </Suspense>
  );
}
