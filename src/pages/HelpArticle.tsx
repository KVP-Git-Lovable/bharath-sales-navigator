import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ThumbsUp, ThumbsDown, ChevronRight, CheckCircle2, Info, Lightbulb, MapPin, Clock, ShoppingCart, BarChart3, Sparkles, ClipboardList, ZoomIn } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { HelpArticleLanguageSelector } from "@/components/help/HelpArticleLanguageSelector";
import { HelpArticleChat } from "@/components/help/HelpArticleChat";
import { useTranslation } from "react-i18next";

// Screenshot imports
import imgMyVisitOverview from "@/assets/help/my-visit-overview.png";
import imgBeatPlanning from "@/assets/help/beat-planning.png";
import imgCheckIn from "@/assets/help/check-in-screen.png";
import imgOrderEntry from "@/assets/help/order-entry.png";
import imgTodaySummary from "@/assets/help/today-summary.png";
import imgVisitStatuses from "@/assets/help/visit-statuses.png";

interface ArticleSection {
  title: string;
  icon?: React.ReactNode;
  content: string[];
  tips?: string[];
  steps?: string[];
  screenshot?: { src: string; alt: string; caption?: string };
}

interface ArticleData {
  id: string;
  title: string;
  category: string;
  readTime: string;
  lastUpdated: string;
  summary: string;
  sections: ArticleSection[];
  nextArticle?: { id: string; title: string };
  prevArticle?: { id: string; title: string };
}

const articlesDB: Record<string, ArticleData> = {
  "my-visit-overview": {
    id: "my-visit-overview",
    title: "Overview – How My Visit Works",
    category: "My Visit",
    readTime: "3 min read",
    lastUpdated: "March 2026",
    summary: "My Visit is your daily command center for field sales. It combines beat planning, GPS-verified check-ins, order placement, and real-time progress tracking into one seamless workflow.",
    sections: [
      {
        title: "What is My Visit?",
        icon: <MapPin className="w-4 h-4" />,
        content: [
          "My Visit is the core module that manages your entire day in the field. From the moment you start your day to the last check-out, everything is tracked here.",
          "It shows your planned retailers for the day based on your beat schedule, lets you check in at each stop with GPS verification, and allows you to place orders directly during the visit."
        ],
        screenshot: { src: imgMyVisitOverview, alt: "My Visit daily screen showing retailer cards with status badges", caption: "My Visit – Your daily retailer visit list with live status tracking" },
      },
      {
        title: "Key Features at a Glance",
        icon: <ClipboardList className="w-4 h-4" />,
        content: [],
        steps: [
          "Beat-based daily schedule – See which retailers to visit today",
          "GPS-verified check-in & check-out – Accurate location tracking",
          "In-visit order entry – Place orders right from the visit screen",
          "Visit status tracking – Planned, In Progress, Productive, Unproductive",
          "Today's summary dashboard – Real-time progress with order totals",
          "Auto Plan (AI) – Let AI suggest the optimal visit sequence",
          "Multiple orders per visit – Place separate orders in the same retailer visit",
        ],
      },
      {
        title: "Typical Daily Workflow",
        icon: <Clock className="w-4 h-4" />,
        content: [
          "Here's how a typical day looks using My Visit:"
        ],
        steps: [
          "Mark attendance (Start My Day) from the Home screen",
          "Open My Visit to see today's planned beat and retailers",
          "Navigate to the first retailer and tap 'Check-In'",
          "GPS location is automatically captured and verified",
          "Take orders using the Order Entry form",
          "Tap 'Check-Out' after completing the visit",
          "Move to the next retailer and repeat",
          "View Today's Summary to see your progress and total orders",
          "End your day from the Home screen when done",
        ],
      },
      {
        title: "Navigation",
        icon: <Info className="w-4 h-4" />,
        content: [
          "You can access My Visit from the Home screen's 'Today's Visit' card, or from the bottom navigation bar. The visit screen has multiple views:",
        ],
        steps: [
          "Beat View – Shows all retailers in today's beat plan",
          "All Retailers – Browse the complete retailer list",
          "Timeline – Visual timeline of your day's check-ins",
          "Summary – Quick stats on visits, orders, and progress",
        ],
      },
    ],
    nextArticle: { id: "my-visit-beat-planning", title: "Beat Planning & Day Schedule" },
  },
  "my-visit-beat-planning": {
    id: "my-visit-beat-planning",
    title: "Beat Planning & Day Schedule",
    category: "My Visit",
    readTime: "2 min read",
    lastUpdated: "March 2026",
    summary: "Learn how beats organize your daily route and how to view, switch, or create beat plans for efficient territory coverage.",
    sections: [
      {
        title: "What is a Beat?",
        content: [
          "A beat is a predefined route or area containing a group of retailers. Each day of the week can have a different beat assigned, ensuring complete territory coverage over time.",
          "Your beat for the day determines which retailers appear on your My Visit screen."
        ],
        screenshot: { src: imgBeatPlanning, alt: "Beat schedule showing weekly plan with retailer counts", caption: "Weekly beat schedule – Each day has an assigned beat with retailers" },
      },
      {
        title: "Viewing Your Beat Plan",
        content: [],
        steps: [
          "Open My Visit – The current beat name is displayed at the top",
          "Tap the beat name to see beat details including retailer count and distance",
          "Use 'All Beat' tab to see the full week's beat schedule",
        ],
      },
      {
        title: "Adding Retailers to Today's Plan",
        content: [
          "If you need to visit a retailer not in the current beat, you can add them directly:"
        ],
        steps: [
          "Tap 'All Retailers' tab in the visit screen",
          "Search for the retailer by name or phone",
          "Tap to add them to today's plan",
          "They will appear in your visit list for the day",
        ],
        tips: [
          "Added retailers don't change your permanent beat plan – they are one-time additions for today only."
        ],
      },
    ],
    prevArticle: { id: "my-visit-overview", title: "Overview – How My Visit Works" },
    nextArticle: { id: "my-visit-check-in-out", title: "Check-In & Check-Out (GPS Verified)" },
  },
  "my-visit-check-in-out": {
    id: "my-visit-check-in-out",
    title: "Check-In & Check-Out (GPS Verified)",
    category: "My Visit",
    readTime: "2 min read",
    lastUpdated: "March 2026",
    summary: "Understand how GPS-verified check-in and check-out works, and what happens when GPS is unavailable.",
    sections: [
      {
        title: "How Check-In Works",
        content: [
          "When you arrive at a retailer location, tap the 'Check-In' button on the retailer's visit card. The app will:"
        ],
        screenshot: { src: imgCheckIn, alt: "GPS check-in screen with location verified", caption: "GPS-verified check-in – Location is auto-captured and verified" },
        steps: [
          "Request your current GPS location",
          "Verify you are within range of the retailer's registered address",
          "Record the check-in time and coordinates",
          "Change the visit status to 'In Progress'",
        ],
      },
      {
        title: "How Check-Out Works",
        content: [
          "After completing your visit activities (orders, branding, etc.), tap 'Check-Out'. The app records:"
        ],
        steps: [
          "Check-out time and GPS coordinates",
          "Total time spent at the retailer",
          "Visit outcome – Productive (order placed) or Unproductive (no order)",
        ],
        tips: [
          "Always check out before leaving. If you forget, the system may auto-checkout after a timeout.",
          "Ensure GPS/Location services are turned on for accurate tracking.",
        ],
      },
      {
        title: "What if GPS is Unavailable?",
        content: [
          "If your device can't get a GPS fix, the app will still allow check-in but may flag it for manager review. Check-ins without GPS verification are marked differently in reports."
        ],
      },
    ],
    prevArticle: { id: "my-visit-beat-planning", title: "Beat Planning & Day Schedule" },
    nextArticle: { id: "my-visit-order-entry", title: "Placing Orders During a Visit" },
  },
  "my-visit-order-entry": {
    id: "my-visit-order-entry",
    title: "Placing Orders During a Visit",
    category: "My Visit",
    readTime: "2 min read",
    lastUpdated: "March 2026",
    summary: "Step-by-step guide to placing orders while visiting a retailer, including product search, cart management, and applicable schemes.",
    sections: [
      {
        title: "Starting an Order",
        content: [
          "Once you've checked in to a retailer, you can start placing an order:"
        ],
        screenshot: { src: imgOrderEntry, alt: "Order entry screen with product catalog and cart", caption: "Order Entry – Browse products, add quantities, and see cart totals" },
        steps: [
          "Tap the 'Order Entry' button on the visit screen",
          "Browse products by category or search by name",
          "Enter quantity for each product",
          "The app auto-calculates totals based on price lists",
        ],
      },
      {
        title: "Using the Cart",
        content: [
          "As you add products, they accumulate in your cart:"
        ],
        steps: [
          "Tap 'View Cart' to see all added items",
          "Adjust quantities or remove items as needed",
          "Review applicable schemes and discounts",
          "Tap 'Place Order' to confirm and submit",
        ],
        tips: [
          "You can place multiple separate orders in the same visit – each appears as a separate card.",
          "The cart persists even if you navigate away temporarily.",
        ],
      },
      {
        title: "Schemes & Discounts",
        content: [
          "Active schemes are automatically shown during order entry. Look for the 'Schemes' button or badge to see what offers apply to the current retailer or products."
        ],
      },
    ],
    prevArticle: { id: "my-visit-check-in-out", title: "Check-In & Check-Out (GPS Verified)" },
    nextArticle: { id: "my-visit-visit-status", title: "Visit Statuses Explained" },
  },
  "my-visit-visit-status": {
    id: "my-visit-visit-status",
    title: "Visit Statuses Explained",
    category: "My Visit",
    readTime: "2 min read",
    lastUpdated: "March 2026",
    summary: "What each visit status means and how it gets assigned automatically.",
    sections: [
      {
        title: "Status Types",
        content: [],
        screenshot: { src: imgVisitStatuses, alt: "Visit status cards showing Planned, In Progress, Productive, Unproductive", caption: "Visit statuses – Each visit is auto-classified based on activity" },
        steps: [
          "Planned – Visit is scheduled but not started. Default state for the day.",
          "In Progress – You have checked in but not yet checked out.",
          "Productive – Visit completed with at least one order placed.",
          "Unproductive – Visit completed but no order was placed.",
          "Store Closed – Retailer was closed when you arrived.",
          "Cancelled – Visit was cancelled before or during execution.",
        ],
      },
      {
        title: "How Status is Assigned",
        content: [
          "Statuses are mostly automatic. When you check in, it moves to 'In Progress'. When you check out, the system checks if an order was placed – if yes, it's 'Productive'; otherwise 'Unproductive'.",
          "You can manually mark a visit as 'Store Closed' or 'Cancelled' from the visit options menu."
        ],
        tips: [
          "Productive visits contribute to your daily performance metrics and leaderboard points.",
        ],
      },
    ],
    prevArticle: { id: "my-visit-order-entry", title: "Placing Orders During a Visit" },
    nextArticle: { id: "my-visit-auto-plan", title: "Using Auto Plan (AI-Powered)" },
  },
  "my-visit-auto-plan": {
    id: "my-visit-auto-plan",
    title: "Using Auto Plan (AI-Powered)",
    category: "My Visit",
    readTime: "2 min read",
    lastUpdated: "March 2026",
    summary: "Let AI optimize your visit sequence for maximum efficiency and coverage.",
    sections: [
      {
        title: "What is Auto Plan?",
        icon: <Sparkles className="w-4 h-4" />,
        content: [
          "Auto Plan is an AI-powered feature that suggests the optimal order in which to visit your retailers for the day. It considers factors like:",
        ],
        steps: [
          "Geographic proximity – minimize travel distance",
          "Retailer priority – high-value retailers first",
          "Visit history – retailers overdue for a visit",
          "Time windows – best times to visit certain stores",
        ],
      },
      {
        title: "How to Use It",
        content: [],
        steps: [
          "Go to My Visit and tap the 'Auto Plan' button",
          "The AI analyzes your beat and suggests an optimized sequence",
          "Review the suggested plan and tap 'Accept' to apply",
          "Your visit list will be reordered accordingly",
        ],
        tips: [
          "Auto Plan works best when retailer GPS coordinates are accurate.",
          "You can always manually reorder after applying Auto Plan.",
        ],
      },
    ],
    prevArticle: { id: "my-visit-visit-status", title: "Visit Statuses Explained" },
    nextArticle: { id: "my-visit-today-summary", title: "Today's Summary & Progress" },
  },
  "my-visit-today-summary": {
    id: "my-visit-today-summary",
    title: "Today's Summary & Progress",
    category: "My Visit",
    readTime: "2 min read",
    lastUpdated: "March 2026",
    summary: "Track your daily progress with real-time stats on visits, orders, and productivity.",
    sections: [
      {
        title: "Accessing Today's Summary",
        icon: <BarChart3 className="w-4 h-4" />,
        content: [
          "Today's Summary is accessible from the Home screen and gives you a real-time snapshot of your day:"
        ],
        screenshot: { src: imgTodaySummary, alt: "Today's summary dashboard with visit and order stats", caption: "Today's Summary – Real-time stats on visits, orders, and productivity" },
        steps: [
          "Total planned visits vs completed visits",
          "Number of productive and unproductive visits",
          "Total order value for the day",
          "Orders placed count",
          "New retailers added (if any)",
        ],
      },
      {
        title: "Progress Indicators",
        content: [
          "The progress bar on the Home screen shows your visit completion rate. It updates automatically as you check in and out of retailers.",
          "A green progress bar means you're on track; amber means you're falling behind the planned count."
        ],
        tips: [
          "Check the summary periodically to stay on target.",
          "The summary data syncs even in low-connectivity areas once you're back online.",
        ],
      },
    ],
    prevArticle: { id: "my-visit-auto-plan", title: "Using Auto Plan (AI-Powered)" },
    nextArticle: { id: "my-visit-tips", title: "Tips & Best Practices" },
  },
  "my-visit-tips": {
    id: "my-visit-tips",
    title: "Tips & Best Practices",
    category: "My Visit",
    readTime: "2 min read",
    lastUpdated: "March 2026",
    summary: "Pro tips to get the most out of the My Visit module.",
    sections: [
      {
        title: "Before You Start Your Day",
        icon: <Lightbulb className="w-4 h-4" />,
        content: [],
        steps: [
          "Check your beat plan the evening before to know your route",
          "Ensure your phone's GPS is enabled and battery is charged",
          "Download any pending offline data if you'll be in low-connectivity areas",
        ],
      },
      {
        title: "During Your Visits",
        content: [],
        steps: [
          "Always check in before entering the store for accurate time tracking",
          "Use the retailer intelligence cards to prepare your pitch before entering",
          "Place orders while inside the store to avoid missing items",
          "Check out immediately after leaving – don't batch check-outs",
        ],
      },
      {
        title: "End of Day",
        content: [],
        steps: [
          "Review Today's Summary to ensure all visits are accounted for",
          "Mark any remaining planned visits as 'Store Closed' or 'Cancelled' with reasons",
          "End your day from the attendance module to stop GPS tracking",
        ],
        tips: [
          "Consistent check-in/out helps your manager understand your field patterns and provide better support.",
          "Productive visit ratio is a key metric in your performance dashboard.",
        ],
      },
    ],
    prevArticle: { id: "my-visit-today-summary", title: "Today's Summary & Progress" },
  },
};

export default function HelpArticle() {
  const { articleId } = useParams<{ articleId: string }>();
  const navigate = useNavigate();
  const [feedback, setFeedback] = useState<"up" | "down" | null>(null);
  const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
  const [lightboxImg, setLightboxImg] = useState<{ src: string; alt: string } | null>(null);
  const { i18n } = useTranslation();
  const [articleLang, setArticleLang] = useState(i18n.language?.split("-")[0] || "en");
  const [translatedSections, setTranslatedSections] = useState<Record<string, string> | null>(null);
  const [isTranslating, setIsTranslating] = useState(false);

  const article = articleId ? articlesDB[articleId] : null;

  // Translate article content when language changes
  useEffect(() => {
    if (!article || articleLang === "en") {
      setTranslatedSections(null);
      return;
    }
    
    const translateArticle = async () => {
      setIsTranslating(true);
      try {
        // Collect all translatable text
        const textsToTranslate: string[] = [article.title, article.summary];
        article.sections.forEach((s) => {
          textsToTranslate.push(s.title);
          s.content.forEach((c) => textsToTranslate.push(c));
          s.steps?.forEach((st) => textsToTranslate.push(st));
          s.tips?.forEach((t) => textsToTranslate.push(t));
        });

        const { data, error } = await supabase.functions.invoke("translate-address", {
          body: { addresses: textsToTranslate, targetLanguage: articleLang },
        });

        if (!error && data?.translatedAddresses) {
          const map: Record<string, string> = {};
          textsToTranslate.forEach((orig, i) => {
            map[orig] = data.translatedAddresses[i] || orig;
          });
          setTranslatedSections(map);
        }
      } catch {
        // Silently fall back to English
      } finally {
        setIsTranslating(false);
      }
    };

    translateArticle();
  }, [articleLang, articleId]);

  // Helper to get translated text
  const tx = (text: string) => {
    if (!translatedSections || articleLang === "en") return text;
    return translatedSections[text] || text;
  };

  const handleFeedback = async (type: "up" | "down") => {
    setFeedback(type);
    setFeedbackSubmitted(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        await supabase.from("ai_feature_feedback").insert({
          user_id: user.id,
          feature: `help_article_${articleId}`,
          feedback_type: type === "up" ? "positive" : "negative",
        });
      }
    } catch {
      // silently fail
    }

    toast.success(type === "up" ? "Glad it helped! 🎉" : "Thanks for the feedback. We'll improve this.");
  };

  if (!article) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center space-y-3">
          <p className="text-muted-foreground">Article not found</p>
          <Button variant="outline" onClick={() => navigate("/help-center")}>
            Back to Help Center
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-background/95 backdrop-blur border-b">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center gap-3">
          <button onClick={() => navigate("/help-center")} className="p-1.5 rounded-lg hover:bg-muted">
            <ArrowLeft className="w-5 h-5 text-foreground" />
          </button>
          <div className="min-w-0 flex-1">
            <p className="text-xs text-primary font-medium">{article.category}</p>
            <h1 className="text-sm font-semibold text-foreground truncate">{article.title}</h1>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-2xl mx-auto px-4 py-5 space-y-5">
        {/* Meta */}
        <div className="flex items-center gap-2 flex-wrap">
          <Badge variant="secondary" className="text-xs">{article.readTime}</Badge>
          <Badge variant="outline" className="text-xs">Updated {article.lastUpdated}</Badge>
        </div>

        {/* Summary */}
        <Card className="border-primary/20 bg-primary/5">
          <CardContent className="p-4">
            <p className="text-sm text-foreground leading-relaxed">{article.summary}</p>
          </CardContent>
        </Card>

        {/* Sections */}
        {article.sections.map((section, i) => (
          <div key={i} className="space-y-2.5">
            <div className="flex items-center gap-2">
              {section.icon && (
                <div className="p-1.5 rounded-md bg-primary/10 text-primary">
                  {section.icon}
                </div>
              )}
              <h2 className="font-semibold text-foreground text-[15px]">{section.title}</h2>
            </div>

            {section.content.map((para, j) => (
              <p key={j} className="text-sm text-muted-foreground leading-relaxed">{para}</p>
            ))}

            {section.steps && (
              <div className="space-y-1.5 ml-1">
                {section.steps.map((step, k) => (
                  <div key={k} className="flex gap-2.5 items-start">
                    <CheckCircle2 className="w-4 h-4 text-primary mt-0.5 shrink-0" />
                    <span className="text-sm text-foreground">{step}</span>
                  </div>
                ))}
              </div>
            )}

            {section.tips && (
              <div className="rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 p-3 space-y-1.5">
                <div className="flex items-center gap-1.5">
                  <Lightbulb className="w-3.5 h-3.5 text-amber-600" />
                  <span className="text-xs font-semibold text-amber-700 dark:text-amber-400">Tip</span>
                </div>
                {section.tips.map((tip, t) => (
                  <p key={t} className="text-xs text-amber-800 dark:text-amber-300 leading-relaxed">{tip}</p>
                ))}
              </div>
            )}

            {section.screenshot && (
              <button
                onClick={() => setLightboxImg(section.screenshot!)}
                className="group relative w-full rounded-xl overflow-hidden border border-border shadow-sm hover:shadow-md transition-shadow mt-2"
              >
                <img
                  src={section.screenshot.src}
                  alt={section.screenshot.alt}
                  className="w-full max-h-[400px] object-contain bg-muted/30"
                  loading="lazy"
                />
                <div className="absolute inset-0 bg-foreground/0 group-hover:bg-foreground/5 transition-colors flex items-center justify-center">
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity bg-background/80 backdrop-blur-sm rounded-full p-2 shadow">
                    <ZoomIn className="w-5 h-5 text-foreground" />
                  </div>
                </div>
                {section.screenshot.caption && (
                  <div className="px-3 py-2 bg-muted/50 border-t border-border">
                    <p className="text-xs text-muted-foreground text-center">{section.screenshot.caption}</p>
                  </div>
                )}
              </button>
            )}

            {i < article.sections.length - 1 && <Separator className="mt-4" />}
          </div>
        ))}

        {/* Screenshot Lightbox */}
        <Dialog open={!!lightboxImg} onOpenChange={() => setLightboxImg(null)}>
          <DialogContent className="max-w-[95vw] max-h-[95vh] p-2 bg-background border-border">
            {lightboxImg && (
              <img
                src={lightboxImg.src}
                alt={lightboxImg.alt}
                className="max-w-full max-h-[85vh] object-contain mx-auto rounded"
              />
            )}
          </DialogContent>
        </Dialog>

        {/* Feedback */}
        <Card className="border-muted">
          <CardContent className="p-4 text-center space-y-3">
            <p className="text-sm font-medium text-foreground">Was this article helpful?</p>
            {feedbackSubmitted ? (
              <div className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
                {feedback === "up" ? (
                  <ThumbsUp className="w-5 h-5 text-primary fill-primary" />
                ) : (
                  <ThumbsDown className="w-5 h-5 text-destructive fill-destructive" />
                )}
                <span>Thanks for your feedback!</span>
              </div>
            ) : (
              <div className="flex items-center justify-center gap-3">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleFeedback("up")}
                  className="gap-1.5 hover:bg-primary/10 hover:text-primary hover:border-primary"
                >
                  <ThumbsUp className="w-4 h-4" /> Yes, helpful
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleFeedback("down")}
                  className="gap-1.5 hover:bg-destructive/10 hover:text-destructive hover:border-destructive"
                >
                  <ThumbsDown className="w-4 h-4" /> Not helpful
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex items-center justify-between gap-3 pb-6">
          {article.prevArticle ? (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/help-center/${article.prevArticle!.id}`)}
              className="text-xs gap-1 text-muted-foreground"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span className="max-w-[120px] truncate">{article.prevArticle.title}</span>
            </Button>
          ) : <div />}
          {article.nextArticle && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate(`/help-center/${article.nextArticle!.id}`)}
              className="text-xs gap-1 text-muted-foreground"
            >
              <span className="max-w-[120px] truncate">{article.nextArticle.title}</span>
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
