import AdminChatView from "@/components/chat/AdminChatView";

export default function CustomerChatPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Customer's Chat</h1>
        <p className="text-sm text-muted-foreground">Chat with your customers in real-time</p>
      </div>
      <AdminChatView />
    </div>
  );
}
