import PageHeader from "@/components/shared/PageHeader";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Target, Megaphone } from "lucide-react";
import QuestBuilder from "@/pages/merchant/QuestBuilder";
import BannerManager from "@/pages/merchant/BannerManager";
import FlashSurgeCard from "@/components/merchant/FlashSurgeCard";

export default function Campaigns() {
  return (
    <div>
      <PageHeader title="แคมเปญ & ภารกิจ" subtitle="สร้างภารกิจเช็คอินและแบนเนอร์โปรโมตของร้าน — รวมไว้ที่เดียว" />
      <Tabs defaultValue="quests">
        <TabsList className="mb-4">
          <TabsTrigger value="quests">
            <Target className="mr-1.5 h-4 w-4" /> ภารกิจเช็คอิน
          </TabsTrigger>
          <TabsTrigger value="banner">
            <Megaphone className="mr-1.5 h-4 w-4" /> แบนเนอร์โปรโมต
          </TabsTrigger>
        </TabsList>
        <TabsContent value="quests">
          <FlashSurgeCard />
          <div className="mt-6">
            <QuestBuilder />
          </div>
        </TabsContent>
        <TabsContent value="banner">
          <BannerManager />
        </TabsContent>
      </Tabs>
    </div>
  );
}