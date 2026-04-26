import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { collection, getDocs, query, where, addDoc, updateDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { aiComplete } from "@/lib/aiService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, Calendar, RefreshCw, FileText, CheckCircle2, ChevronRight, CalendarDays } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";

export default function StudyPlanner() {
  const { user } = useAuth();
  const [selectedMaterial, setSelectedMaterial] = useState<any>(null);
  const [generating, setGenerating] = useState(false);
  const [examDateStr, setExamDateStr] = useState("");
  
  const { data: materials, isLoading: materialsLoading } = useQuery({
    queryKey: ["user-materials", user?.uid],
    queryFn: async () => {
      if (!user) return [];
      const q = query(collection(db, "materials"), where("user_id", "==", user.uid));
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    },
    enabled: !!user,
  });

  const { data: plans, isLoading: plansLoading, refetch: refetchPlans } = useQuery({
    queryKey: ["study-plans", selectedMaterial?.id],
    queryFn: async () => {
      if (!selectedMaterial?.id || !user) return [];
      const q = query(
        collection(db, "study_plans"), 
        where("material_id", "==", selectedMaterial.id),
        where("user_id", "==", user.uid)
      );
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    },
    enabled: !!selectedMaterial?.id && !!user,
  });

  const activePlan = plans && plans.length > 0 ? plans[0] : null;

  const handleGenerate = async () => {
    if (!selectedMaterial || !user) return;
    
    if (!examDateStr) {
       toast.error("Please select an exam/target date");
       return;
    }
    
    const examDate = new Date(examDateStr);
    const today = new Date();
    const daysDiff = Math.ceil((examDate.getTime() - today.getTime()) / (1000 * 3600 * 24));
    
    if (daysDiff <= 0) {
      toast.error("Target date must be in the future");
      return;
    }

    setGenerating(true);
    try {
      const prompt = `Act as an expert study planner. I need to master the following material in exactly ${daysDiff} days.
Break the content down into a daily study roadmap.
Return ONLY a valid JSON array of objects, where each object represents a day.
Format:
[
  {
    "day": 1,
    "title": "Introduction & Basics",
    "tasks": ["Read chapter 1", "Define core terms"],
    "completed": false
  }
]
Limit to max 14 days (if more than 14 days, group them into weekly or bi-weekly milestones but keep the array length manageable).

Content:
${selectedMaterial.extracted_text?.substring(0, 8000) || selectedMaterial.summary}`;

      const res = await aiComplete({
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        maxTokens: 2500,
      });

      let jsonString = res;
      // Extract from markdown code block if present
      if (jsonString.includes("```json")) {
        jsonString = jsonString.split("```json")[1].split("```")[0];
      } else if (jsonString.includes("```")) {
         // Some models just use ``` without json
         const parts = jsonString.split("```");
         if (parts.length >= 3) {
            jsonString = parts[1];
         }
      }

      // Ensure we only parse from the first [ to the last ]
      const firstIdx = jsonString.indexOf('[');
      const lastIdx = jsonString.lastIndexOf(']');
      
      if (firstIdx === -1 || lastIdx === -1) {
        throw new Error("Failed to locate JSON array in AI output");
      }
      
      jsonString = jsonString.substring(firstIdx, lastIdx + 1);
      
      let schedule;
      try {
        schedule = JSON.parse(jsonString);
      } catch (parseErr) {
        console.error("Raw string that failed to parse:", jsonString);
        throw new Error("Failed to parse AI output as JSON");
      }

      await addDoc(collection(db, "study_plans"), {
        user_id: user.uid,
        material_id: selectedMaterial.id,
        target_date: examDate.toISOString(),
        schedule,
        created_at: Date.now()
      });
      
      toast.success("Study Roadmap generated!");
      refetchPlans();
    } catch (error) {
      console.error(error);
      toast.error("Failed to generate plan.");
    } finally {
      setGenerating(false);
    }
  };


  
  const toggleDayComplete = async (dayIndex: number) => {
     if (!activePlan) return;
     try {
       const newSchedule = [...activePlan.schedule];
       newSchedule[dayIndex].completed = !newSchedule[dayIndex].completed;
       await updateDoc(doc(db, "study_plans", activePlan.id), {
         schedule: newSchedule
       });
       refetchPlans();
     } catch (e) {
       toast.error("Failed to update progress");
     }
  };

  if (materialsLoading) {
    return <div className="p-8 flex justify-center"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;
  }

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center">
          <CalendarDays className="h-5 w-5 text-success" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Study Planner</h1>
          <p className="text-muted-foreground text-sm">AI-generated daily roadmaps to ace your exams</p>
        </div>
      </div>

      {!selectedMaterial ? (
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 mt-6">
          {materials?.map((m: any) => (
            <div key={m.id} className="bg-card border border-border rounded-xl p-5 hover:border-success/40 cursor-pointer transition-colors" onClick={() => setSelectedMaterial(m)}>
              <div className="flex items-start gap-3">
                <FileText className="h-5 w-5 text-success mt-0.5" />
                <div>
                  <h3 className="font-semibold text-foreground truncate">{m.file_name}</h3>
                  <p className="text-xs text-muted-foreground mt-1">Select to view or create plan</p>
                </div>
              </div>
            </div>
          ))}
          {materials?.length === 0 && (
             <div className="col-span-full text-center py-12 text-muted-foreground bg-muted/50 rounded-xl border border-dashed border-border">
                <FileText className="h-8 w-8 mx-auto mb-3 opacity-40" />
                <p className="text-sm mb-4">No materials uploaded yet.</p>
                <Link to="/materials">
                  <Button variant="outline" size="sm">Upload Material</Button>
                </Link>
             </div>
          )}
        </div>
      ) : (
        <div className="space-y-6 animate-fade-in">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">Plan for: {selectedMaterial.file_name}</h2>
            <Button variant="ghost" size="sm" onClick={() => setSelectedMaterial(null)}>
              Back to Materials
            </Button>
          </div>

          {plansLoading || generating ? (
            <div className="bg-card border border-border rounded-xl p-12 flex flex-col items-center justify-center gap-4 text-center">
              <RefreshCw className="h-8 w-8 text-success animate-spin" />
              <p className="text-muted-foreground text-sm">{generating ? "AI is crunching the timeline..." : "Loading plan..."}</p>
            </div>
          ) : !activePlan ? (
            <div className="bg-card border border-border rounded-xl p-8 space-y-6">
              <div className="text-center">
                <Calendar className="h-12 w-12 text-muted-foreground mx-auto opacity-50 mb-4" />
                <h3 className="font-bold text-foreground">No Plan Generated</h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto mt-1 mb-6">
                  Set your target date, and AI will break the material down into a daily schedule.
                </p>
              </div>
              <div className="max-w-xs mx-auto space-y-4">
                 <div className="space-y-2">
                   <label className="text-sm font-medium">Target / Exam Date</label>
                   <Input type="date" value={examDateStr} onChange={e => setExamDateStr(e.target.value)} />
                 </div>
                 <Button onClick={handleGenerate} disabled={generating || !examDateStr} className="w-full bg-success text-success-foreground hover:bg-success/90">
                   Generate Roadmap
                 </Button>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
               <div className="flex items-center justify-between bg-success/10 border border-success/20 rounded-lg p-4">
                  <div className="text-sm">
                    <span className="font-semibold text-success">Target Date:</span> {new Date(activePlan.target_date).toLocaleDateString()}
                  </div>
                  <div className="text-sm font-medium">
                     Progress: {activePlan.schedule.filter((d:any)=>d.completed).length} / {activePlan.schedule.length} Days
                  </div>
               </div>
               
               <div className="relative border-l-2 border-border ml-3 space-y-8 py-4">
                 {activePlan.schedule.map((dayObj: any, index: number) => (
                   <div key={index} className="relative pl-6">
                     {/* Timeline node */}
                     <button 
                       onClick={() => toggleDayComplete(index)}
                       className={`absolute -left-[11px] top-1 h-5 w-5 rounded-full border-2 bg-background flex items-center justify-center transition-colors ${dayObj.completed ? 'border-success' : 'border-muted-foreground'}`}
                     >
                       {dayObj.completed && <div className="h-2.5 w-2.5 rounded-full bg-success" />}
                     </button>
                     
                     <div className={`bg-card border rounded-xl p-4 transition-all ${dayObj.completed ? 'border-success/30 opacity-70' : 'border-border shadow-sm'}`}>
                        <div className="flex items-center gap-2 mb-2">
                          <span className={`text-xs font-bold uppercase tracking-wider px-2 py-0.5 rounded ${dayObj.completed ? 'bg-success/20 text-success' : 'bg-muted text-muted-foreground'}`}>
                             Day {dayObj.day || index + 1}
                          </span>
                          <h4 className={`font-semibold text-sm ${dayObj.completed ? 'line-through text-muted-foreground' : 'text-foreground'}`}>
                            {dayObj.title}
                          </h4>
                        </div>
                        <ul className={`text-sm space-y-1.5 pl-5 list-disc ${dayObj.completed ? 'text-muted-foreground' : 'text-muted-foreground'}`}>
                          {dayObj.tasks?.map((task: string, tIdx: number) => (
                             <li key={tIdx}>{task}</li>
                          ))}
                        </ul>
                     </div>
                   </div>
                 ))}
               </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
