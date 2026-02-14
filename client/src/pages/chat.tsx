import { useState, useRef, useEffect } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Send, Plus, Trash2, MessageCircle, Bot, User, Loader2 } from "lucide-react";
import type { Conversation, Message } from "@shared/schema";

function MessageBubble({ message }: { message: Message }) {
  const isUser = message.role === "user";

  return (
    <div
      className={`flex gap-3 ${isUser ? "flex-row-reverse" : ""}`}
      data-testid={`message-${message.id}`}
    >
      <Avatar className="h-8 w-8 flex-shrink-0">
        <AvatarFallback className={isUser ? "bg-primary text-primary-foreground" : "bg-accent"}>
          {isUser ? <User className="h-4 w-4" /> : <Bot className="h-4 w-4" />}
        </AvatarFallback>
      </Avatar>
      <div className={`max-w-[75%] ${isUser ? "text-right" : ""}`}>
        <p className="text-xs text-muted-foreground mb-1">
          {isUser ? "You" : "BrightBot"}
        </p>
        <Card className={`px-4 py-3 ${isUser ? "bg-primary text-primary-foreground" : ""}`}>
          <p className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</p>
        </Card>
      </div>
    </div>
  );
}

function EmptyChat() {
  return (
    <div className="flex flex-col items-center justify-center h-full text-center p-8">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-primary/10 mb-4">
        <Bot className="h-8 w-8 text-primary" />
      </div>
      <h3 className="text-lg font-semibold mb-2">Welcome to BrightCare Daycare</h3>
      <p className="text-muted-foreground text-sm max-w-md mb-6">
        I'm BrightBot, your friendly daycare assistant. I can help you with questions about enrollment, 
        hours of operation, tuition, health policies, feeding schedules, and more.
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-w-md w-full">
        {[
          "What are your hours of operation?",
          "How much is tuition?",
          "What is the enrollment process?",
          "Tell me about your health policies",
        ].map((q) => (
          <Card
            key={q}
            className="px-3 py-2 text-sm text-muted-foreground hover-elevate cursor-pointer"
            data-testid={`suggestion-${q.slice(0, 20).replace(/\s+/g, "-").toLowerCase()}`}
          >
            {q}
          </Card>
        ))}
      </div>
    </div>
  );
}

export default function ChatPage() {
  const [activeConversationId, setActiveConversationId] = useState<number | null>(null);
  const [inputValue, setInputValue] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { data: conversations = [], isLoading: loadingConversations } = useQuery<Conversation[]>({
    queryKey: ["/api/conversations"],
  });

  const { data: conversationData, isLoading: loadingMessages } = useQuery<Conversation & { messages: Message[] }>({
    queryKey: ["/api/conversations", activeConversationId],
    enabled: !!activeConversationId,
  });

  const messages = conversationData?.messages || [];

  const createConversation = useMutation({
    mutationFn: async () => {
      const res = await apiRequest("POST", "/api/conversations", { title: "New Conversation" });
      return res.json();
    },
    onSuccess: (data: Conversation) => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      setActiveConversationId(data.id);
    },
  });

  const deleteConversation = useMutation({
    mutationFn: async (id: number) => {
      await apiRequest("DELETE", `/api/conversations/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      if (activeConversationId) {
        setActiveConversationId(null);
      }
    },
  });

  const sendMessage = useMutation({
    mutationFn: async ({ conversationId, content }: { conversationId: number; content: string }) => {
      const res = await apiRequest("POST", `/api/conversations/${conversationId}/messages`, { content });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/conversations", activeConversationId] });
    },
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, sendMessage.isPending]);

  const handleSend = async () => {
    const content = inputValue.trim();
    if (!content) return;

    let convId = activeConversationId;
    if (!convId) {
      const res = await apiRequest("POST", "/api/conversations", { title: content.slice(0, 50) });
      const conv = await res.json();
      queryClient.invalidateQueries({ queryKey: ["/api/conversations"] });
      setActiveConversationId(conv.id);
      convId = conv.id;
    }

    setInputValue("");
    sendMessage.mutate({ conversationId: convId!, content });
  };

  const handleSuggestionClick = (suggestion: string) => {
    setInputValue(suggestion);
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="flex h-full">
      <div className="w-64 border-r flex flex-col bg-card/50">
        <div className="p-3 border-b">
          <Button
            onClick={() => createConversation.mutate()}
            className="w-full"
            disabled={createConversation.isPending}
            data-testid="button-new-conversation"
          >
            <Plus className="h-4 w-4 mr-2" />
            New Chat
          </Button>
        </div>
        <ScrollArea className="flex-1">
          <div className="p-2 space-y-1">
            {loadingConversations ? (
              Array.from({ length: 3 }).map((_, i) => (
                <Skeleton key={i} className="h-10 w-full" />
              ))
            ) : conversations.length === 0 ? (
              <p className="text-xs text-muted-foreground text-center p-4">
                No conversations yet. Start a new chat!
              </p>
            ) : (
              conversations.map((conv) => (
                <div
                  key={conv.id}
                  className={`flex items-center gap-2 rounded-md px-3 py-2 text-sm cursor-pointer group hover-elevate ${
                    activeConversationId === conv.id ? "bg-accent" : ""
                  }`}
                  onClick={() => setActiveConversationId(conv.id)}
                  data-testid={`conversation-item-${conv.id}`}
                >
                  <MessageCircle className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                  <span className="truncate flex-1">{conv.title}</span>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 invisible group-hover:visible"
                    onClick={(e) => {
                      e.stopPropagation();
                      deleteConversation.mutate(conv.id);
                    }}
                    data-testid={`button-delete-conversation-${conv.id}`}
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </div>

      <div className="flex-1 flex flex-col">
        <div className="border-b px-6 py-3 flex items-center gap-2">
          <Bot className="h-5 w-5 text-primary" />
          <h2 className="font-semibold text-sm">BrightBot</h2>
          <Badge variant="secondary" className="text-xs">AI Assistant</Badge>
        </div>

        <div className="flex-1 overflow-hidden">
          {!activeConversationId && !loadingMessages ? (
            <div className="h-full" onClick={(e) => {
              const card = (e.target as HTMLElement).closest("[data-testid^='suggestion-']");
              if (card) {
                const suggestions = [
                  "What are your hours of operation?",
                  "How much is tuition?",
                  "What is the enrollment process?",
                  "Tell me about your health policies",
                ];
                const idx = Array.from(card.parentElement?.children || []).indexOf(card);
                if (idx >= 0 && idx < suggestions.length) {
                  handleSuggestionClick(suggestions[idx]);
                }
              }
            }}>
              <EmptyChat />
            </div>
          ) : loadingMessages ? (
            <div className="p-6 space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className={`flex gap-3 ${i % 2 === 0 ? "flex-row-reverse" : ""}`}>
                  <Skeleton className="h-8 w-8 rounded-full" />
                  <Skeleton className="h-16 w-64 rounded-md" />
                </div>
              ))}
            </div>
          ) : (
            <ScrollArea className="h-full" ref={scrollRef}>
              <div className="p-6 space-y-6">
                {messages.map((msg) => (
                  <MessageBubble key={msg.id} message={msg} />
                ))}
                {sendMessage.isPending && (
                  <div className="flex gap-3">
                    <Avatar className="h-8 w-8 flex-shrink-0">
                      <AvatarFallback className="bg-accent">
                        <Bot className="h-4 w-4" />
                      </AvatarFallback>
                    </Avatar>
                    <Card className="px-4 py-3">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        BrightBot is thinking...
                      </div>
                    </Card>
                  </div>
                )}
              </div>
            </ScrollArea>
          )}
        </div>

        <div className="border-t p-4">
          <div className="flex gap-2 items-end max-w-3xl mx-auto">
            <Textarea
              ref={textareaRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Ask BrightBot about our daycare..."
              className="resize-none min-h-[44px] max-h-32"
              rows={1}
              disabled={sendMessage.isPending}
              data-testid="input-message"
            />
            <Button
              onClick={handleSend}
              disabled={!inputValue.trim() || sendMessage.isPending}
              data-testid="button-send-message"
            >
              <Send className="h-4 w-4" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground text-center mt-2">
            BrightBot is an AI assistant. Information provided should be verified with the facility.
          </p>
        </div>
      </div>
    </div>
  );
}
