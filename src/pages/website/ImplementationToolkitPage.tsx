import { useState, useEffect } from "react";
import { ArrowLeft, FileText, Calendar, Calculator, TrendingUp, Users, CheckSquare, Download, Save, FolderOpen, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate } from "react-router-dom";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { WebsiteHeader } from "@/components/website/WebsiteHeader";
import { WebsiteFooter } from "@/components/website/WebsiteFooter";
import { RequirementWizard } from "@/components/implementation/RequirementWizard";
import { ProjectPlanner } from "@/components/implementation/ProjectPlanner";
import { EstimationCalculator } from "@/components/implementation/EstimationCalculator";
import { ROITracker } from "@/components/implementation/ROITracker";
import { TrainingTracker } from "@/components/implementation/TrainingTracker";
import { GoLiveChecklist } from "@/components/implementation/GoLiveChecklist";
import { generateImplementationPDF } from "@/utils/implementationPDFGenerator";
import { useToast } from "@/hooks/use-toast";

const SAVES_KEY = "quickapp-implementation-saves";

interface SavedToolkit {
  id: string;
  name: string;
  savedAt: string;
  data: ImplementationData;
}

function loadSaves(): SavedToolkit[] {
  try {
    const raw = localStorage.getItem(SAVES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

function persistSaves(saves: SavedToolkit[]) {
  localStorage.setItem(SAVES_KEY, JSON.stringify(saves));
}

export interface ImplementationData {
  companyProfile: {
    companyName: string;
    industry: string;
    headquarters: string;
    statesRegions: string;
    annualRevenue: string;
    distributorCount: string;
    salesRepCount: string;
    retailerCount: string;
    currentTechStack: string;
    decisionMakers: string;
  };
  salesOperations: {
    beatPlanningProcess: string;
    visitTracking: string;
    averageVisitsPerDay: string;
    attendanceManagement: string;
    gpsTracking: string;
    targetTracking: string;
    reportsSubmitted: string[];
  };
  orderManagement: {
    orderCaptureProcess: string;
    orderCaptureTime: string;
    pricingTiers: string;
    promotionalSchemes: string;
    schemeCalculations: string;
    orderToDeliveryTime: string;
  };
  distributorNetwork: {
    activeDistributors: string;
    primaryOrderProcess: string;
    inventoryTracking: string;
    claimsProcessing: string;
    secondarySalesVisibility: string;
  };
  retailerManagement: {
    masterDataMaintenance: string;
    classificationSystem: string;
    creditLimitManagement: string;
    loyaltyPrograms: string;
    feedbackCapture: string;
  };
  reporting: {
    reportsGenerated: string[];
    reportGenerationTime: string;
    primaryConsumers: string;
    kpisTracked: string[];
  };
  painPoints: Array<{
    area: string;
    challenge: string;
    impact: string;
    priority: 'high' | 'medium' | 'low';
  }>;
  featureMapping: Record<string, {
    required: boolean;
    priority: 'critical' | 'high' | 'medium' | 'low';
    notes: string;
  }>;
  dataMigration: Array<{
    entity: string;
    sourceSystem: string;
    recordCount: string;
    format: string;
    priority: 'high' | 'medium' | 'low';
  }>;
  projectPlan: {
    startDate: string;
    phases: Array<{
      name: string;
      duration: number;
      startDate: string;
      endDate: string;
    }>;
  };
  estimation: {
    teamSize: number;
    distributorCount: number;
    retailerCount: number;
    modulesSelected: string[];
    integrationComplexity: 'low' | 'medium' | 'high';
    dataMigrationVolume: 'small' | 'medium' | 'large';
    trainingLocations: number;
    totalEffort: number;
    timeline: number;
    pricing: string;
  };
  roiMetrics: {
    baseline: Record<string, number>;
    target: Record<string, number>;
    actual: Record<string, number>;
  };
  training: {
    batches: Array<{
      name: string;
      audience: string;
      duration: string;
      mode: string;
      status: 'planned' | 'in-progress' | 'completed';
      completedUsers: number;
      totalUsers: number;
    }>;
    regions: Array<{
      name: string;
      trainingDate: string;
      trainer: string;
      venue: string;
      userCount: number;
      status: 'planned' | 'in-progress' | 'completed';
    }>;
  };
  goLive: {
    preGoLive: Record<string, boolean>;
    goLiveDay: Record<string, boolean>;
    postGoLive: Record<string, boolean>;
  };
}

const defaultData: ImplementationData = {
  companyProfile: {
    companyName: "",
    industry: "Mobile Distribution",
    headquarters: "",
    statesRegions: "",
    annualRevenue: "",
    distributorCount: "",
    salesRepCount: "",
    retailerCount: "",
    currentTechStack: "",
    decisionMakers: "",
  },
  salesOperations: {
    beatPlanningProcess: "",
    visitTracking: "",
    averageVisitsPerDay: "",
    attendanceManagement: "",
    gpsTracking: "",
    targetTracking: "",
    reportsSubmitted: [],
  },
  orderManagement: {
    orderCaptureProcess: "",
    orderCaptureTime: "",
    pricingTiers: "",
    promotionalSchemes: "",
    schemeCalculations: "",
    orderToDeliveryTime: "",
  },
  distributorNetwork: {
    activeDistributors: "",
    primaryOrderProcess: "",
    inventoryTracking: "",
    claimsProcessing: "",
    secondarySalesVisibility: "",
  },
  retailerManagement: {
    masterDataMaintenance: "",
    classificationSystem: "",
    creditLimitManagement: "",
    loyaltyPrograms: "",
    feedbackCapture: "",
  },
  reporting: {
    reportsGenerated: [],
    reportGenerationTime: "",
    primaryConsumers: "",
    kpisTracked: [],
  },
  painPoints: [],
  featureMapping: {},
  dataMigration: [],
  projectPlan: {
    startDate: "",
    phases: [],
  },
  estimation: {
    teamSize: 0,
    distributorCount: 0,
    retailerCount: 0,
    modulesSelected: [],
    integrationComplexity: 'medium',
    dataMigrationVolume: 'medium',
    trainingLocations: 1,
    totalEffort: 0,
    timeline: 0,
    pricing: "",
  },
  roiMetrics: {
    baseline: {},
    target: {},
    actual: {},
  },
  training: {
    batches: [
      { name: "Batch 1", audience: "Admin & IT Team", duration: "2 days", mode: "In-person", status: "planned", completedUsers: 0, totalUsers: 0 },
      { name: "Batch 2", audience: "Regional Trainers", duration: "2 days", mode: "In-person", status: "planned", completedUsers: 0, totalUsers: 0 },
      { name: "Batch 3", audience: "State Trainers", duration: "1 day", mode: "Virtual", status: "planned", completedUsers: 0, totalUsers: 0 },
      { name: "Batch 4", audience: "Field Users", duration: "0.5 day", mode: "In-person", status: "planned", completedUsers: 0, totalUsers: 0 },
    ],
    regions: [
      { name: "North", trainingDate: "", trainer: "", venue: "", userCount: 0, status: "planned" },
      { name: "South", trainingDate: "", trainer: "", venue: "", userCount: 0, status: "planned" },
      { name: "East", trainingDate: "", trainer: "", venue: "", userCount: 0, status: "planned" },
      { name: "West", trainingDate: "", trainer: "", venue: "", userCount: 0, status: "planned" },
    ],
  },
  goLive: {
    preGoLive: {},
    postGoLive: {},
    goLiveDay: {},
  },
};

export default function ImplementationToolkitPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState("requirements");
  const [data, setData] = useState<ImplementationData>(defaultData);
  const [isSaving, setIsSaving] = useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = useState(false);
  const [saveName, setSaveName] = useState("");
  const [loadDialogOpen, setLoadDialogOpen] = useState(false);
  const [saves, setSaves] = useState<SavedToolkit[]>([]);

  useEffect(() => {
    setSaves(loadSaves());
  }, []);

  // Load saved data from localStorage
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" });
    const savedData = localStorage.getItem("quickapp-implementation-data");
    if (savedData) {
      try {
        setData(JSON.parse(savedData));
      } catch (e) {
        console.error("Failed to load saved data:", e);
      }
    }
  }, []);

  // Auto-save to localStorage
  const saveData = (newData: ImplementationData) => {
    setData(newData);
    localStorage.setItem("quickapp-implementation-data", JSON.stringify(newData));
  };

  const handleSave = () => {
    const defaultName =
      data.companyProfile.companyName?.trim() ||
      `Toolkit ${new Date().toLocaleDateString()}`;
    setSaveName(defaultName);
    setSaveDialogOpen(true);
  };

  const confirmSave = () => {
    const name = saveName.trim();
    if (!name) {
      toast({ title: "Name required", variant: "destructive" });
      return;
    }
    setIsSaving(true);
    localStorage.setItem("quickapp-implementation-data", JSON.stringify(data));
    const current = loadSaves();
    const existingIdx = current.findIndex((s) => s.name === name);
    const entry: SavedToolkit = {
      id: existingIdx >= 0 ? current[existingIdx].id : crypto.randomUUID(),
      name,
      savedAt: new Date().toISOString(),
      data,
    };
    const next =
      existingIdx >= 0
        ? current.map((s, i) => (i === existingIdx ? entry : s))
        : [entry, ...current];
    persistSaves(next);
    setSaves(next);
    setSaveDialogOpen(false);
    setIsSaving(false);
    toast({
      title: "Toolkit Saved",
      description: `"${name}" is available under Load Saved.`,
    });
  };

  const handleLoad = (id: string) => {
    const entry = saves.find((s) => s.id === id);
    if (!entry) return;
    saveData(entry.data);
    setLoadDialogOpen(false);
    toast({ title: "Loaded", description: `Restored "${entry.name}".` });
  };

  const handleDeleteSave = (id: string) => {
    const next = saves.filter((s) => s.id !== id);
    persistSaves(next);
    setSaves(next);
  };

  const handleGeneratePDF = async () => {
    try {
      await generateImplementationPDF(data);
      toast({
        title: "PDF Generated",
        description: "Your implementation document has been downloaded.",
      });
    } catch (error) {
      console.error("PDF generation error:", error);
      toast({
        title: "Error",
        description: "Failed to generate PDF. Please try again.",
        variant: "destructive",
      });
    }
  };

  const handleExportJSON = () => {
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `quickapp-implementation-${data.companyProfile.companyName || "project"}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJSON = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        try {
          const importedData = JSON.parse(e.target?.result as string);
          saveData(importedData);
          toast({
            title: "Data Imported",
            description: "Implementation data has been loaded successfully.",
          });
        } catch (error) {
          toast({
            title: "Import Error",
            description: "Failed to import data. Please check the file format.",
            variant: "destructive",
          });
        }
      };
      reader.readAsText(file);
    }
  };

  const tabs = [
    { id: "requirements", label: "Requirements", icon: FileText },
    { id: "project", label: "Project Plan", icon: Calendar },
    { id: "estimation", label: "Estimation", icon: Calculator },
    { id: "roi", label: "ROI Tracker", icon: TrendingUp },
    { id: "training", label: "Training", icon: Users },
    { id: "golive", label: "Go-Live", icon: CheckSquare },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-b from-[#1A1F2C] via-[#1A1F2C] to-[#0F1218]">
      <WebsiteHeader />

      {/* Header */}
      <section className="pt-8 pb-4 px-3 sm:px-4">
        <div className="container mx-auto max-w-7xl">
          <Button
            variant="ghost"
            onClick={() => navigate("/insights")}
            className="text-white/70 hover:text-white mb-4"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Insights
          </Button>

          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
            <div>
              <h1 className="text-3xl md:text-4xl font-bold text-white mb-2">
                Implementation <span className="bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">Toolkit</span>
              </h1>
              <p className="text-white/70">
                Complete requirement analysis, project planning, and tracking tools
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                onClick={handleSave}
                disabled={isSaving}
                className="bg-white/5 border-white/20 text-white hover:bg-white/10"
              >
                <Save className="w-4 h-4 mr-2" />
                {isSaving ? "Saving..." : "Save Progress"}
              </Button>
              <Button
                variant="outline"
                onClick={() => setLoadDialogOpen(true)}
                className="bg-white/5 border-white/20 text-white hover:bg-white/10"
              >
                <FolderOpen className="w-4 h-4 mr-2" />
                Load Saved ({saves.length})
              </Button>
              <Button
                onClick={handleGeneratePDF}
                className="bg-gradient-to-r from-amber-500 to-orange-500 text-white hover:from-amber-600 hover:to-orange-600"
              >
                <Download className="w-4 h-4 mr-2" />
                Generate PDF
              </Button>
            </div>
          </div>

          {/* Import/Export */}
          <div className="flex gap-2 mt-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={handleExportJSON}
              className="text-white/60 hover:text-white text-xs"
            >
              Export JSON
            </Button>
            <label className="cursor-pointer">
              <input
                type="file"
                accept=".json"
                onChange={handleImportJSON}
                className="hidden"
              />
              <span className="text-white/60 hover:text-white text-xs px-3 py-1.5 rounded-md hover:bg-white/10 transition-colors">
                Import JSON
              </span>
            </label>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="px-4 pb-20">
        <div className="container mx-auto max-w-7xl">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full flex flex-wrap bg-white/5 border border-white/10 rounded-xl p-1 mb-6 h-auto">
              {tabs.map((tab) => (
                <TabsTrigger
                  key={tab.id}
                  value={tab.id}
                  className="flex-1 min-w-[120px] flex items-center justify-center gap-2 py-3 data-[state=active]:bg-gradient-to-r data-[state=active]:from-amber-500 data-[state=active]:to-orange-500 data-[state=active]:text-white text-white/70 rounded-lg transition-all"
                >
                  <tab.icon className="w-4 h-4" />
                  <span className="hidden sm:inline">{tab.label}</span>
                </TabsTrigger>
              ))}
            </TabsList>

            <TabsContent value="requirements" className="mt-0">
              <RequirementWizard data={data} onUpdate={saveData} />
            </TabsContent>

            <TabsContent value="project" className="mt-0">
              <ProjectPlanner data={data} onUpdate={saveData} />
            </TabsContent>

            <TabsContent value="estimation" className="mt-0">
              <EstimationCalculator data={data} onUpdate={saveData} />
            </TabsContent>

            <TabsContent value="roi" className="mt-0">
              <ROITracker
                value={data.roiMetrics}
                onChange={(roiMetrics) => saveData({ ...data, roiMetrics })}
              />
            </TabsContent>

            <TabsContent value="training" className="mt-0">
              <TrainingTracker data={data} onUpdate={saveData} />
            </TabsContent>

            <TabsContent value="golive" className="mt-0">
              <GoLiveChecklist data={data} onUpdate={saveData} />
            </TabsContent>
          </Tabs>
        </div>
      </section>

      <WebsiteFooter />

      <Dialog open={saveDialogOpen} onOpenChange={setSaveDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Save Toolkit</DialogTitle>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Save name</Label>
            <Input
              value={saveName}
              onChange={(e) => setSaveName(e.target.value)}
              placeholder="e.g., Acme Corp — Draft 1"
            />
            <p className="text-xs text-muted-foreground">
              Saving with an existing name overwrites that entry.
            </p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSaveDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={confirmSave}>Save</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={loadDialogOpen} onOpenChange={setLoadDialogOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Saved Toolkits</DialogTitle>
          </DialogHeader>
          {saves.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              No saved toolkits yet. Click "Save Progress" to create one.
            </p>
          ) : (
            <div className="space-y-2 max-h-[60vh] overflow-y-auto">
              {saves.map((s) => (
                <div
                  key={s.id}
                  className="flex items-center justify-between p-3 border rounded-lg hover:bg-accent/50"
                >
                  <div className="min-w-0">
                    <p className="font-medium truncate">{s.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(s.savedAt).toLocaleString()} ·{" "}
                      {s.data.companyProfile.companyName || "No company name"}
                    </p>
                  </div>
                  <div className="flex gap-2 shrink-0">
                    <Button size="sm" onClick={() => handleLoad(s.id)}>
                      Load
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteSave(s.id)}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
