import { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Send,
  Bot,
  User,
  Loader2,
  X,
  MessageCircle,
  Baby,
  BookOpen,
  Puzzle,
  Palette,
  ShieldCheck,
  Lock,
  HeartHandshake,
  Stethoscope,
  ClipboardCheck,
  Sparkles,
  AlertTriangle,
  Users,
  CheckCircle2,
} from "lucide-react";
import logoImg from "@assets/BrightCare-Daycare-logo_1771012586178.png";

interface ChatMessage {
  id: number;
  role: "user" | "assistant";
  content: string;
}

function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputValue, setInputValue] = useState("");
  const scrollRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const nextId = useRef(1);

  const sendMessage = useMutation({
    mutationFn: async (content: string) => {
      const history = messages.map((m) => ({ role: m.role, content: m.content }));
      const res = await apiRequest("POST", "/api/chat", { message: content, history });
      return res.json();
    },
    onSuccess: (data: { content: string }) => {
      setMessages((prev) => [
        ...prev,
        { id: nextId.current++, role: "assistant", content: data.content },
      ]);
    },
  });

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, sendMessage.isPending]);

  useEffect(() => {
    if (isOpen && textareaRef.current) {
      textareaRef.current.focus();
    }
  }, [isOpen]);

  const handleSend = () => {
    const content = inputValue.trim();
    if (!content || sendMessage.isPending) return;
    setMessages((prev) => [...prev, { id: nextId.current++, role: "user", content }]);
    setInputValue("");
    sendMessage.mutate(content);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <>
      {isOpen && (
        <div
          className="fixed bottom-20 right-4 sm:right-6 z-50 w-[360px] max-w-[calc(100vw-2rem)] rounded-md border bg-background shadow-lg flex flex-col"
          style={{ height: "500px", maxHeight: "calc(100vh - 8rem)" }}
          data-testid="chat-widget-panel"
        >
          <div className="flex items-center justify-between gap-2 px-4 py-3 border-b bg-primary text-primary-foreground rounded-t-md">
            <div className="flex items-center gap-2">
              <Bot className="h-5 w-5" />
              <span className="font-semibold text-sm">BrightBot Assistant</span>
            </div>
            <Button
              size="icon"
              variant="ghost"
              className="text-primary-foreground no-default-hover-elevate"
              onClick={() => setIsOpen(false)}
              data-testid="button-close-chat"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <ScrollArea className="flex-1" ref={scrollRef}>
            <div className="p-4 space-y-4">
              {messages.length === 0 && (
                <div className="text-center py-6">
                  <div className="flex h-12 w-12 mx-auto items-center justify-center rounded-full bg-primary/10 mb-3">
                    <Bot className="h-6 w-6 text-primary" />
                  </div>
                  <p className="text-sm font-medium mb-1">Hi there! I'm BrightBot</p>
                  <p className="text-xs text-muted-foreground">
                    Ask me anything about BrightCare Daycare! For a quick answer to commonly asked questions, click a question below or type in your own question. 
                  </p>
                  <div className="mt-4 space-y-2">
                    {["What are your hours?", "How much is tuition?", "What is enrollment like?"].map((q) => (
                      <Button
                        key={q}
                        variant="outline"
                        size="sm"
                        className="w-full justify-start text-xs text-muted-foreground font-normal"
                        onClick={() => {
                          setMessages((prev) => [...prev, { id: nextId.current++, role: "user", content: q }]);
                          sendMessage.mutate(q);
                        }}
                        data-testid={`suggestion-${q.slice(0, 15).replace(/\s+/g, "-").toLowerCase()}`}
                      >
                        {q}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
              {messages.map((msg) => (
                <div
                  key={msg.id}
                  className={`flex gap-2 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
                  data-testid={`message-bubble-${msg.id}`}
                >
                  <Avatar className="h-7 w-7 flex-shrink-0">
                    <AvatarFallback className={msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}>
                      {msg.role === "user" ? <User className="h-3 w-3" /> : <Bot className="h-3 w-3" />}
                    </AvatarFallback>
                  </Avatar>
                  <div className={`max-w-[80%] rounded-md px-3 py-2 text-sm ${msg.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted"}`}>
                    <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                  </div>
                </div>
              ))}
              {sendMessage.isPending && (
                <div className="flex gap-2">
                  <Avatar className="h-7 w-7 flex-shrink-0">
                    <AvatarFallback className="bg-muted">
                      <Bot className="h-3 w-3" />
                    </AvatarFallback>
                  </Avatar>
                  <div className="rounded-md px-3 py-2 bg-muted">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <Loader2 className="h-3 w-3 animate-spin" />
                      Thinking...
                    </div>
                  </div>
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="border-t p-3">
            <div className="flex gap-2 items-end">
              <Textarea
                ref={textareaRef}
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your question..."
                className="resize-none min-h-[40px] max-h-24 text-sm"
                rows={1}
                disabled={sendMessage.isPending}
                data-testid="input-message"
              />
              <Button
                size="icon"
                onClick={handleSend}
                disabled={!inputValue.trim() || sendMessage.isPending}
                data-testid="button-send-message"
              >
                <Send className="h-4 w-4" />
              </Button>
            </div>
            <p className="text-[10px] text-muted-foreground text-center mt-1">
              
            </p>
          </div>
        </div>
      )}

      <Button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-4 right-4 sm:right-6 z-50 h-14 w-14 rounded-full shadow-lg"
        data-testid="button-toggle-chat"
      >
        {isOpen ? <X className="h-6 w-6" /> : <MessageCircle className="h-6 w-6" />}
      </Button>
    </>
  );
}

function SafetyItem({ icon: Icon, text }: { icon: typeof ShieldCheck; text: string }) {
  return (
    <div className="flex items-start gap-3">
      <div className="flex-shrink-0 h-8 w-8 rounded-full bg-accent/15 dark:bg-accent/25 flex items-center justify-center mt-0.5">
        <Icon className="h-4 w-4 text-accent dark:text-accent" />
      </div>
      <p className="text-sm" data-testid={`text-safety-${text.slice(0, 15).replace(/\s+/g, "-").toLowerCase()}`}>{text}</p>
    </div>
  );
}

export default function HomePage() {
  return (
    <div className="relative">
      <section className="relative overflow-hidden bg-gradient-to-br from-primary/10 via-background to-secondary/10 dark:from-primary/5 dark:to-secondary/5 py-16 sm:py-24 px-6" id="hero" data-testid="section-hero">
        <div className="max-w-5xl mx-auto flex flex-col md:flex-row items-center gap-10">
          <div className="flex-1 text-center md:text-left">
            <img src={logoImg} alt="BrightCare" className="h-64 w-64 object-contain opacity-80" />
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight mb-3" data-testid="text-hero-title">
              BrightCare Daycare
            </h1>
            <p className="text-lg text-primary font-medium mb-4" data-testid="text-hero-subtitle">
              We care for your kids, like they're our kids.
            </p>
            <p className="text-muted-foreground leading-relaxed max-w-xl">
              At BrightCare Daycare, every child is welcomed into a nurturing, joyful environment where curiosity is encouraged and confidence grows every day. We believe early childhood should be filled with exploration, creativity, and caring relationships that help children feel safe, supported, and excited to learn.
            </p>
            <p className="text-muted-foreground leading-relaxed max-w-xl mt-3">
              Our experienced educators focus on each child's unique personality and developmental needs, creating meaningful experiences that prepare them for lifelong learning — while making every day fun.
            </p>
          </div>
          <div className="flex-shrink-0 hidden md:block">
            <ChatWidget />
          </div>
        </div>
      </section>

      <section className="py-16 px-6" id="programs" data-testid="section-programs">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-2">Our Learning Programs</h2>
          <p className="text-muted-foreground text-center mb-10 max-w-2xl mx-auto">
            We offer age-appropriate programs designed to support social, emotional, cognitive, and physical development.
          </p>
          <div className="grid sm:grid-cols-2 gap-4">
            <Card className="p-6" data-testid="card-program-infant">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-full bg-primary/10 dark:bg-primary/20 flex items-center justify-center">
                  <Baby className="h-5 w-5 text-primary" />
                </div>
                <h3 className="font-semibold">Infant & Toddler Care</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Gentle routines and loving interactions help our youngest learners feel secure while exploring their surroundings. Sensory play, language development, and motor skills are introduced through guided play.
              </p>
            </Card>
            <Card className="p-6" data-testid="card-program-preschool">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-full bg-secondary/15 dark:bg-secondary/20 flex items-center justify-center">
                  <BookOpen className="h-5 w-5 text-secondary" />
                </div>
                <h3 className="font-semibold">Early Preschool (Ages 2-3)</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Children build independence, communication skills, and early problem-solving through structured play, storytelling, and collaborative activities.
              </p>
            </Card>
            <Card className="p-6" data-testid="card-program-prek">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-full bg-accent/15 dark:bg-accent/25 flex items-center justify-center">
                  <Puzzle className="h-5 w-5 text-accent dark:text-accent" />
                </div>
                <h3 className="font-semibold">Pre-K Readiness (Ages 4-5)</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Our Pre-K program focuses on foundational literacy, math exploration, social skills, and creative expression — preparing children for a confident transition to kindergarten.
              </p>
            </Card>
            <Card className="p-6" data-testid="card-program-enrichment">
              <div className="flex items-center gap-3 mb-3">
                <div className="h-10 w-10 rounded-full bg-chart-4/15 dark:bg-chart-4/20 flex items-center justify-center">
                  <Palette className="h-5 w-5 text-chart-4" />
                </div>
                <h3 className="font-semibold">Enrichment Activities</h3>
              </div>
              <p className="text-sm text-muted-foreground leading-relaxed">
                We incorporate art, music, movement, and outdoor play daily to support creativity and whole-child development.
              </p>
            </Card>
          </div>
        </div>
      </section>

      <section className="py-16 px-6 bg-muted/40 dark:bg-muted/20" id="safety" data-testid="section-safety">
        <div className="max-w-5xl mx-auto">
          <h2 className="text-2xl font-bold text-center mb-2">Safety & Care You Can Trust</h2>
          <p className="text-muted-foreground text-center mb-10 max-w-2xl mx-auto">
            Your child's safety and well-being are our top priorities. BrightCare Daycare maintains high standards to ensure peace of mind for families.
          </p>
          <div className="grid sm:grid-cols-2 gap-4 max-w-3xl mx-auto">
            <SafetyItem icon={Lock} text="Secure entry and monitored access" />
            <SafetyItem icon={CheckCircle2} text="Background-checked and certified staff" />
            <SafetyItem icon={Stethoscope} text="First aid & CPR trained caregivers" />
            <SafetyItem icon={Sparkles} text="Clean, sanitized classrooms and play areas" />
            <SafetyItem icon={Users} text="Age-appropriate supervision ratios" />
            <SafetyItem icon={AlertTriangle} text="Emergency preparedness procedures" />
            <SafetyItem icon={ClipboardCheck} text="Daily wellness checks" />
          </div>
          <p className="text-sm text-muted-foreground text-center mt-8 max-w-xl mx-auto">
            We partner with families to maintain a healthy, supportive environment where children thrive.
          </p>
        </div>
      </section>

      <section className="py-16 px-6" id="community" data-testid="section-community">
        <div className="max-w-3xl mx-auto text-center">
          <div className="flex h-14 w-14 mx-auto items-center justify-center rounded-full bg-primary/10 dark:bg-primary/20 mb-4">
            <HeartHandshake className="h-7 w-7 text-primary" />
          </div>
          <h2 className="text-2xl font-bold mb-3">A Warm Community for Families</h2>
          <p className="text-muted-foreground leading-relaxed mb-4">
            We believe strong partnerships with families help children succeed. BrightCare Daycare keeps parents connected through regular updates, open communication, and family engagement opportunities.
          </p>
          <p className="text-muted-foreground font-medium">
            Our goal is simple: create a place where children love to learn and families feel confident every day.
          </p>
        </div>
      </section>

      <footer className="py-8 px-6 border-t" id="about" data-testid="section-footer">
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <img src={logoImg} alt="BrightCare" className="h-8 w-8 object-contain" />
            <span className="text-sm font-semibold">BrightCare Daycare</span>
          </div>
          <p className="text-xs text-muted-foreground text-center">
            Pre-K Childcare. Where every child shines bright.
          </p>
        </div>
      </footer>

      
    </div>
  );
}
