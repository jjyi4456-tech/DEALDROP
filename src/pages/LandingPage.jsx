import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "@/lib/AuthContext";
import LandingHeader from "@/components/landing/LandingHeader";
import LandingHero from "@/components/landing/LandingHero";
import LiveQuestShowcase from "@/components/landing/LiveQuestShowcase";
import MerchantRecruitBanner from "@/components/landing/MerchantRecruitBanner";
import SoftAuthDialog from "@/components/landing/SoftAuthDialog";

export default function LandingPage() {
  const { isAuthenticated } = useAuth();
  const navigate = useNavigate();
  // The pending quest a guest tried to start — drives the soft auth dialog and
  // the returnTo path that resumes the quest right after login.
  const [prompt, setPrompt] = useState(null);

  const goQuest = (q) => navigate(`/user/checkin?quest=${q.id}`);

  const startQuest = (q) => {
    if (isAuthenticated) {
      goQuest(q);
      return;
    }
    setPrompt({ questTitle: q.title, returnTo: `/user/checkin?quest=${q.id}` });
  };

  const startSquad = (q) => {
    if (isAuthenticated) {
      goQuest(q);
      return;
    }
    setPrompt({ questTitle: q.title, squad: true, returnTo: `/user/checkin?quest=${q.id}` });
  };

  return (
    <div className="min-h-screen bg-background">
      <LandingHeader />
      <LandingHero />
      <LiveQuestShowcase onStartQuest={startQuest} onStartSquad={startSquad} />
      <MerchantRecruitBanner />
      <footer className="border-t py-8 text-center text-xs text-muted-foreground">
        🦊 DEALDROP · เกมล่าอาหารรอบมหาวิทยาลัย · สงวนลิขสิทธิ์
      </footer>
      <SoftAuthDialog
        open={!!prompt}
        onOpenChange={(o) => {
          if (!o) setPrompt(null);
        }}
        questTitle={prompt?.questTitle}
        squad={prompt?.squad}
        returnTo={prompt?.returnTo || "/"}
      />
    </div>
  );
}