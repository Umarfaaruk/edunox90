import { useState, useEffect } from "react";
import { useLocation, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { collection, getDocs, query, where, addDoc, updateDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { aiComplete } from "@/lib/aiService";
import { Button } from "@/components/ui/button";
import { Loader2, BrainCircuit, RefreshCw, FileText, CheckCircle2, ArrowRight } from "lucide-react";
import { toast } from "sonner";


interface FlashcardDoc {
  id: string;
  question: string;
  answer: string;
  next_review: number;
  interval: number;
  ease: number;
  material_id: string;
  user_id: string;
  created_at: number;
}

export default function Flashcards() {
  const { user } = useAuth();
  const location = useLocation();
  const [selectedMaterial, setSelectedMaterial] = useState<any>(location.state?.preselectedMaterial || null);
  const [generating, setGenerating] = useState(false);
  
  // Study State
  const [isFlipped, setIsFlipped] = useState(false);
  const [currentCardIndex, setCurrentCardIndex] = useState(0);

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

  const { data: flashcards, isLoading: cardsLoading, refetch: refetchCards } = useQuery({
    queryKey: ["flashcards", selectedMaterial?.id],
    queryFn: async () => {
      if (!selectedMaterial?.id || !user) return [];
      const q = query(
        collection(db, "flashcards"), 
        where("material_id", "==", selectedMaterial.id),
        where("user_id", "==", user.uid)
      );
      const snap = await getDocs(q);
      return (snap.docs.map(d => ({ id: d.id, ...d.data() })) as FlashcardDoc[]).sort((a, b) => {
        // Sort by next_review date so due cards are first
        const aDate = a.next_review || 0;
        const bDate = b.next_review || 0;
        return aDate - bDate;
      });
    },
    enabled: !!selectedMaterial?.id && !!user,
  });

  const handleGenerate = async () => {
    if (!selectedMaterial || !user) return;
    setGenerating(true);
    try {
      const prompt = `Extract exactly 10 key flashcard question-answer pairs from the following study material. 
Return ONLY a valid JSON array of objects with "question" and "answer" string keys. Keep answers concise.

Content:
${selectedMaterial.extracted_text?.substring(0, 8000) || selectedMaterial.summary}`;

      const res = await aiComplete({
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        maxTokens: 2000,
      });

      let jsonString = res;
      if (jsonString.includes("```json")) {
        jsonString = jsonString.split("```json")[1].split("```")[0];
      } else if (jsonString.includes("```")) {
         const parts = jsonString.split("```");
         if (parts.length >= 3) {
            jsonString = parts[1];
         }
      }

      const firstIdx = jsonString.indexOf('[');
      const lastIdx = jsonString.lastIndexOf(']');
      if (firstIdx === -1 || lastIdx === -1) {
        throw new Error("Failed to locate JSON array in AI output");
      }
      jsonString = jsonString.substring(firstIdx, lastIdx + 1);
      
      let pairs;
      try {
        pairs = JSON.parse(jsonString);
      } catch (parseErr) {
        console.error("Raw string that failed to parse:", jsonString);
        throw new Error("Failed to parse AI output as JSON");
      }

      for (const pair of pairs) {
        await addDoc(collection(db, "flashcards"), {
          user_id: user.uid,
          material_id: selectedMaterial.id,
          question: pair.question,
          answer: pair.answer,
          created_at: Date.now(),
          next_review: Date.now(),
          interval: 0,
          ease: 2.5
        });
      }
      toast.success("Flashcards generated!");
      refetchCards();
    } catch (error) {
      console.error(error);
      toast.error("Failed to generate flashcards.");
    } finally {
      setGenerating(false);
    }
  };

  const handleReview = async (quality: "hard" | "good" | "easy") => {
    if (!flashcards || !flashcards[currentCardIndex]) return;
    const card = flashcards[currentCardIndex];
    
    // Super simple spaced repetition algorithm
    let newInterval = card.interval || 0;
    if (quality === "hard") {
      newInterval = 0; // Review again very soon (e.g., today)
    } else if (quality === "good") {
      newInterval = newInterval === 0 ? 1 : newInterval * 2;
    } else {
      newInterval = newInterval === 0 ? 3 : newInterval * 3;
    }

    const nextReview = Date.now() + newInterval * 24 * 60 * 60 * 1000;

    try {
      await updateDoc(doc(db, "flashcards", card.id), {
        interval: newInterval,
        next_review: nextReview
      });
      
      setIsFlipped(false);
      if (currentCardIndex < flashcards.length - 1) {
        setCurrentCardIndex(prev => prev + 1);
      } else {
        toast.success("You've reviewed all cards for now!");
        refetchCards();
        setCurrentCardIndex(0);
      }
    } catch (e) {
      toast.error("Failed to save progress");
    }
  };

  if (materialsLoading) {
    return <div className="p-8 flex justify-center"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;
  }

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-cta/10 flex items-center justify-center">
          <BrainCircuit className="h-5 w-5 text-cta" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">AI Flashcards</h1>
          <p className="text-muted-foreground text-sm">Automated spaced repetition for your uploaded materials</p>
        </div>
      </div>

      {!selectedMaterial ? (
        <div className="grid sm:grid-cols-2 gap-4 mt-6">
          {materials?.map((m: any) => (
            <div key={m.id} className="bg-card border border-border rounded-xl p-5 hover:border-cta/40 cursor-pointer transition-colors" onClick={() => setSelectedMaterial(m)}>
              <div className="flex items-start gap-3">
                <FileText className="h-5 w-5 text-cta mt-0.5" />
                <div>
                  <h3 className="font-semibold text-foreground truncate">{m.file_name}</h3>
                  <p className="text-xs text-muted-foreground mt-1">Select to study flashcards</p>
                </div>
              </div>
            </div>
          ))}
          {materials?.length === 0 && (
             <div className="col-span-2 text-center py-12 text-muted-foreground bg-muted/50 rounded-xl border border-dashed border-border">
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
            <h2 className="text-lg font-bold">Studying: {selectedMaterial.file_name}</h2>
            <Button variant="ghost" size="sm" onClick={() => { setSelectedMaterial(null); setCurrentCardIndex(0); setIsFlipped(false); }}>
              Back to Materials
            </Button>
          </div>

          {cardsLoading || generating ? (
            <div className="bg-card border border-border rounded-xl p-12 flex flex-col items-center justify-center gap-4 text-center">
              <RefreshCw className="h-8 w-8 text-primary animate-spin" />
              <p className="text-muted-foreground text-sm">{generating ? "AI is generating your flashcards. This may take a minute..." : "Loading cards..."}</p>
            </div>
          ) : flashcards?.length === 0 ? (
            <div className="bg-card border border-border rounded-xl p-12 text-center space-y-4">
              <BrainCircuit className="h-12 w-12 text-muted-foreground mx-auto opacity-50" />
              <div>
                <h3 className="font-bold text-foreground">No Flashcards Yet</h3>
                <p className="text-sm text-muted-foreground max-w-md mx-auto mt-1">
                  Let AI automatically extract the key concepts from this material into a study deck.
                </p>
              </div>
              <Button onClick={handleGenerate} disabled={generating} className="bg-cta text-cta-foreground hover:bg-cta/90">
                Generate Deck Now
              </Button>
            </div>
          ) : (
            <div className="max-w-xl mx-auto space-y-8">
               <div className="text-center text-sm font-medium text-muted-foreground">
                  Card {currentCardIndex + 1} of {flashcards?.length}
               </div>
               
               {/* The Card */}
               <div 
                 onClick={() => setIsFlipped(!isFlipped)}
                 className="relative min-h-[300px] w-full cursor-pointer perspective-1000 group"
               >
                 <div className={`w-full h-full min-h-[300px] bg-card border-2 border-border rounded-2xl p-8 flex flex-col items-center justify-center text-center transition-all duration-500 transform-style-preserve-3d ${isFlipped ? 'rotate-y-180' : ''} hover:border-cta/40 hover:shadow-lg`}>
                    
                    {!isFlipped ? (
                      // Front (Question)
                      <div className="backface-hidden w-full space-y-4">
                         <span className="text-xs font-bold uppercase tracking-wider text-cta">Question</span>
                         <h3 className="text-xl md:text-2xl font-medium text-foreground leading-relaxed">
                           {flashcards?.[currentCardIndex]?.question}
                         </h3>
                         <p className="text-xs text-muted-foreground absolute bottom-6 left-0 w-full">Click to reveal answer</p>
                      </div>
                    ) : (
                      // Back (Answer) - In real CSS you'd do proper 3D flips, here we simulate by conditional render with rotate-y-180 on parent
                      <div className="w-full space-y-4 rotate-y-180">
                         <span className="text-xs font-bold uppercase tracking-wider text-success">Answer</span>
                         <p className="text-lg text-foreground leading-relaxed">
                           {flashcards?.[currentCardIndex]?.answer}
                         </p>
                      </div>
                    )}

                 </div>
               </div>

               {/* Controls */}
               {isFlipped && (
                 <div className="flex gap-3 justify-center animate-fade-in">
                   <Button variant="outline" className="border-destructive text-destructive hover:bg-destructive/10 px-8" onClick={() => handleReview("hard")}>
                     Hard
                   </Button>
                   <Button variant="outline" className="border-primary text-primary hover:bg-primary/10 px-8" onClick={() => handleReview("good")}>
                     Good
                   </Button>
                   <Button variant="outline" className="border-success text-success hover:bg-success/10 px-8" onClick={() => handleReview("easy")}>
                     Easy
                   </Button>
                 </div>
               )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
