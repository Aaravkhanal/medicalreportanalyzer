import { useState, useRef, useEffect } from "react";
import { MessageCircle, X, Send, Loader2, Bot, User } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { chatWithReport } from "@/lib/summarize";
import { toast } from "sonner";

type Message = { role: "user" | "assistant"; content: string };

export function ReportChat({ reportText }: { reportText: string }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hi! I'm MedExplain AI. I have read your report. What questions do you have?",
    },
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isLoading, isOpen]);

  async function handleSend() {
    if (!input.trim() || isLoading) return;
    const userMsg = input.trim();
    setInput("");

    const newMessages: Message[] = [...messages, { role: "user", content: userMsg }];
    setMessages(newMessages);
    setIsLoading(true);

    try {
      // Exclude initial greeting to save tokens if we want, but it's fine.
      const apiMessages = newMessages.filter(
        (m) =>
          m.role !== "assistant" ||
          m.content !==
            "Hi! I'm MedExplain AI. I have read your report. What questions do you have?",
      );
      const response = await chatWithReport(reportText, apiMessages);
      setMessages([...newMessages, { role: "assistant", content: response }]);
    } catch (e: unknown) {
      const err = e as Error;
      toast.error(err.message || "Failed to get AI response");
      setMessages([...newMessages, { role: "assistant", content: "Sorry, I encountered an error. Please try again." }]);
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <>
      {!isOpen && (
        <Button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 h-14 w-14 rounded-full shadow-xl gradient-medical text-white transition-all hover:scale-110 hover:shadow-2xl z-50 animate-in fade-in zoom-in"
          size="icon"
        >
          <MessageCircle className="h-6 w-6" />
        </Button>
      )}

      {isOpen && (
        <Card className="fixed bottom-6 right-6 w-80 sm:w-[400px] flex flex-col shadow-2xl z-50 border-border bg-background h-[500px] max-h-[85vh] animate-in slide-in-from-bottom-5 fade-in-50">
          <div className="flex items-center justify-between p-3 border-b bg-muted/30">
            <div className="flex items-center gap-2 font-semibold">
              <div className="bg-primary/10 p-1.5 rounded-full">
                <Bot className="h-4 w-4 text-primary" />
              </div>
              MedExplain AI
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-full"
              onClick={() => setIsOpen(false)}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>

          <ScrollArea className="flex-1 p-4">
            <div className="space-y-4 pb-2">
              {messages.map((msg, i) => (
                <div
                  key={i}
                  className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : ""}`}
                >
                  <div
                    className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 mt-0.5 ${msg.role === "user" ? "bg-primary text-primary-foreground shadow-sm" : "bg-muted text-muted-foreground border"}`}
                  >
                    {msg.role === "user" ? (
                      <User className="h-4 w-4" />
                    ) : (
                      <Bot className="h-4 w-4" />
                    )}
                  </div>
                  <div
                    className={`text-sm p-3.5 rounded-2xl max-w-[80%] ${msg.role === "user" ? "bg-primary text-primary-foreground rounded-tr-sm shadow-sm" : "bg-muted/50 text-foreground rounded-tl-sm border"}`}
                  >
                    <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex gap-3">
                  <div className="h-8 w-8 rounded-full flex items-center justify-center shrink-0 bg-muted text-muted-foreground border mt-0.5">
                    <Bot className="h-4 w-4" />
                  </div>
                  <div className="text-sm p-3.5 rounded-2xl bg-muted/50 text-foreground rounded-tl-sm border flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    <span className="text-muted-foreground">Thinking...</span>
                  </div>
                </div>
              )}
              <div ref={scrollRef} />
            </div>
          </ScrollArea>

          <div className="p-3 border-t bg-background rounded-b-xl">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSend();
              }}
              className="flex items-center gap-2"
            >
              <Input
                placeholder="Ask about your report..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                disabled={isLoading}
                className="flex-1 rounded-full px-4"
              />
              <Button
                type="submit"
                size="icon"
                disabled={!input.trim() || isLoading}
                className="h-10 w-10 shrink-0 rounded-full gradient-medical shadow-sm transition-transform hover:scale-105"
              >
                <Send className="h-4 w-4 text-white" />
              </Button>
            </form>
          </div>
        </Card>
      )}
    </>
  );
}
