import { useState, useRef, useEffect } from "react";
import { Send, Bot, User } from "lucide-react";
import Navbar from "@/components/Navbar";
import { db } from "@/lib/firebase";
import { collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, Timestamp } from "firebase/firestore";
import gsap from "gsap";

interface Message {
  id: string;
  visitorId: string;
  text: string;
  sender: "visitor" | "admin";
  createdAt: Timestamp | null;
}

const getVisitorId = (): string => {
  let id = localStorage.getItem("chat_visitor_id");
  if (!id) {
    id = "visitor-" + Date.now() + "-" + Math.random().toString(36).substring(2, 8);
    localStorage.setItem("chat_visitor_id", id);
  }
  return id;
};

const Chat = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const bottomRef = useRef<HTMLDivElement>(null);
  const visitorId = useRef(getVisitorId());
  const cursorGlowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const q = query(
      collection(db, "chats", visitorId.current, "messages"),
      orderBy("createdAt", "asc")
    );
    const unsub = onSnapshot(q, (snapshot) => {
      const msgs: Message[] = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      } as Message));
      setMessages(msgs);
      setLoading(false);
    }, () => {
      setLoading(false);
    });
    return unsub;
  }, []);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    const moveCursor = (e: MouseEvent) => {
      if (cursorGlowRef.current) {
        gsap.to(cursorGlowRef.current, {
          x: e.clientX,
          y: e.clientY,
          duration: 0.6,
          ease: "power2.out",
        });
      }
    };
    window.addEventListener("mousemove", moveCursor);
    return () => window.removeEventListener("mousemove", moveCursor);
  }, []);

  const sendMessage = async () => {
    if (!input.trim()) return;
    const text = input.trim();
    setInput("");

    try {
      await addDoc(collection(db, "chats", visitorId.current, "messages"), {
        text,
        sender: "visitor",
        visitorId: visitorId.current,
        createdAt: serverTimestamp(),
      });

      const { setDoc, doc } = await import("firebase/firestore");
      await setDoc(doc(db, "chats", visitorId.current), {
        visitorId: visitorId.current,
        lastMessage: text,
        lastMessageAt: serverTimestamp(),
        unread: true,
      }, { merge: true });
    } catch (e) {
      console.error("Failed to send message:", e);
    }
  };

  const formatTime = (ts: Timestamp | null) => {
    if (!ts) return "";
    const d = ts.toDate();
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  return (
    <div className="min-h-screen bg-transparent text-stone-800 flex flex-col overflow-x-hidden relative selection:bg-amber-500/20 selection:text-amber-700">
      <Navbar />

      {/* Sunlit Amber Cursor Glow Follower */}
      <div 
        ref={cursorGlowRef} 
        className="fixed w-[600px] h-[600px] rounded-full bg-[radial-gradient(circle_at_center,rgba(212,175,55,0.08)_0%,rgba(245,158,11,0.04)_50%,transparent_100%)] pointer-events-none -translate-x-1/2 -translate-y-1/2 z-10 mix-blend-multiply no-print"
      />

      <div className="flex-1 flex flex-col max-w-3xl mx-auto w-full px-4 pt-24 pb-8 relative z-20">
        <div className="text-center py-6 animate-fade-in">
          <h1 className="text-4xl font-heading font-black text-gradient tracking-tight mb-2">Chat with Admin</h1>
          <p className="text-sm text-stone-600">Send a message and I'll respond as soon as possible.</p>
        </div>

        {/* Chat Card Box */}
        <div className="glass-card flex-1 flex flex-col p-6 border border-white/50 hover:shadow-amber-500/5 transition-all duration-500 rounded-2xl min-h-[50vh]">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto space-y-4 pb-4 pr-1">
            {loading && (
              <div className="text-center py-8 text-stone-500 text-sm">Loading messages...</div>
            )}
            {!loading && messages.length === 0 && (
              <div className="text-center py-8 text-stone-500 text-sm">
                No messages yet. Send a message to start the conversation!
              </div>
            )}
            {messages.map((msg) => (
              <div key={msg.id} className={`flex items-end gap-3 ${msg.sender === "visitor" ? "flex-row-reverse" : ""}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 border border-white/80 shadow-md ${
                  msg.sender === "admin" ? "bg-white/50 text-amber-600" : "bg-amber-500/10 text-amber-600"
                }`}>
                  {msg.sender === "admin" ? <Bot size={15} /> : <User size={15} />}
                </div>
                <div>
                  <div className={`px-5 py-3.5 rounded-2xl text-sm leading-relaxed max-w-lg ${
                    msg.sender === "visitor" 
                      ? "bg-amber-500 text-white rounded-br-none shadow-md shadow-amber-500/10" 
                      : "bg-white/60 text-stone-850 border border-white/80 rounded-bl-none shadow-sm"
                  }`}>
                    {msg.text}
                  </div>
                  <p className={`text-[10px] text-stone-400 font-bold uppercase tracking-widest mt-1.5 ${msg.sender === "visitor" ? "text-right" : ""}`}>
                    {formatTime(msg.createdAt)}
                  </p>
                </div>
              </div>
            ))}
            <div ref={bottomRef} />
          </div>

          {/* Input Box */}
          <div className="flex gap-2 border-t border-white/30 pt-4 mt-4">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && sendMessage()}
              placeholder="Type your message..."
              className="flex-1 bg-white/40 border border-white/60 rounded-full px-5 py-3 text-sm focus:outline-none focus:border-amber-500 focus:ring-1 focus:ring-amber-500 placeholder:text-stone-400 text-stone-800 transition-all duration-300"
            />
            <button 
              onClick={sendMessage} 
              disabled={!input.trim()}
              className="glass-btn-3d w-11 h-11 flex items-center justify-center rounded-full disabled:opacity-40"
            >
              <Send size={15} className="text-amber-600" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Chat;