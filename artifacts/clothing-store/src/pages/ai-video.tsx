import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Play, Sparkles, Music, Image as ImageIcon, Video, Wand2 } from "lucide-react";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";

export default function AiVideo() {
  const [email, setEmail] = useState("");
  const { toast } = useToast();

  const handleRequestAccess = (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) return;
    toast({
      title: "Request submitted!",
      description: "We'll notify you when AI Video is available.",
    });
    setEmail("");
  };

  return (
    <div className="space-y-12 pb-12">
      {/* Hero Section */}
      <section className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-sidebar to-sidebar-accent border border-sidebar-border px-6 py-16 md:py-24 text-center">
        <div className="absolute inset-0 bg-[url('https://images.unsplash.com/photo-1558769132-cb1aea458c5e?q=80&w=2000&auto=format&fit=crop')] bg-cover bg-center opacity-10 mix-blend-overlay"></div>
        <div className="relative z-10 max-w-3xl mx-auto space-y-6">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/20 text-primary-foreground border border-primary/30 text-sm font-medium mb-4 backdrop-blur-sm">
            <Sparkles className="w-4 h-4" /> Coming Soon
          </div>
          <h1 className="text-4xl md:text-6xl font-bold tracking-tight text-white mb-6">
            Turn Products into <br className="hidden md:block"/> Promotional Videos
          </h1>
          <p className="text-lg md:text-xl text-white/70 mb-8 max-w-2xl mx-auto">
            Automatically generate high-converting TikTok and Reels videos from your product images. No editing skills required.
          </p>
          
          <div className="relative inline-block mt-8 group cursor-pointer">
            <div className="absolute inset-0 bg-primary rounded-full blur-xl opacity-50 group-hover:opacity-100 transition-opacity animate-pulse"></div>
            <div className="relative bg-white text-primary w-20 h-20 rounded-full flex items-center justify-center shadow-2xl transition-transform hover:scale-105">
              <Play className="w-8 h-8 ml-1" fill="currentColor" />
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="max-w-5xl mx-auto">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold tracking-tight">Everything you need to go viral</h2>
        </div>
        <div className="grid md:grid-cols-3 gap-6">
          <Card className="bg-card hover:border-primary/50 transition-colors">
            <CardContent className="p-6 space-y-4">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <ImageIcon className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-semibold">Image to Video</h3>
              <p className="text-muted-foreground text-sm">Select your product images and let our AI animate them with dynamic transitions and effects.</p>
            </CardContent>
          </Card>
          <Card className="bg-card hover:border-primary/50 transition-colors">
            <CardContent className="p-6 space-y-4">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <Music className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-semibold">Trending Audio</h3>
              <p className="text-muted-foreground text-sm">Automatically syncs transitions to the beat of royalty-free, trending background music.</p>
            </CardContent>
          </Card>
          <Card className="bg-card hover:border-primary/50 transition-colors">
            <CardContent className="p-6 space-y-4">
              <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary">
                <Wand2 className="w-6 h-6" />
              </div>
              <h3 className="text-xl font-semibold">Auto Captions</h3>
              <p className="text-muted-foreground text-sm">Generate engaging captions from your product descriptions to capture viewers' attention.</p>
            </CardContent>
          </Card>
        </div>
      </section>

      {/* Waitlist */}
      <section className="max-w-2xl mx-auto text-center space-y-6 bg-muted p-8 md:p-12 rounded-3xl border">
        <Video className="w-12 h-12 mx-auto text-primary" />
        <h2 className="text-2xl font-bold">Request Early Access</h2>
        <p className="text-muted-foreground">Join the waitlist to be the first to try AI Promotional Videos when it launches.</p>
        <form onSubmit={handleRequestAccess} className="flex flex-col sm:flex-row gap-3 max-w-md mx-auto">
          <Input 
            type="email" 
            placeholder="Enter your email address" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="flex-1"
            required
          />
          <Button type="submit">Join Waitlist</Button>
        </form>
      </section>
    </div>
  );
}