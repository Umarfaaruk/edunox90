import { useState, useCallback, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { collection, getDocs, query, where, updateDoc, doc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/contexts/AuthContext";
import { aiComplete } from "@/lib/aiService";
import { Button } from "@/components/ui/button";
import { Loader2, Network, RefreshCw, FileText } from "lucide-react";
import { toast } from "sonner";
import { Link } from "react-router-dom";
import {
  ReactFlow,
  MiniMap,
  Controls,
  Background,
  useNodesState,
  useEdgesState,
  MarkerType
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';

export default function ConceptMap() {
  const { user } = useAuth();
  const [selectedMaterial, setSelectedMaterial] = useState<any>(null);
  const [generating, setGenerating] = useState(false);
  
  const [nodes, setNodes, onNodesChange] = useNodesState([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState([]);

  const { data: materials, isLoading: materialsLoading, refetch: refetchMaterials } = useQuery({
    queryKey: ["user-materials", user?.uid],
    queryFn: async () => {
      if (!user) return [];
      const q = query(collection(db, "materials"), where("user_id", "==", user.uid));
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ id: d.id, ...d.data() }));
    },
    enabled: !!user,
  });

  // Load existing map if present
  useEffect(() => {
    if (selectedMaterial?.concept_map) {
      setNodes(selectedMaterial.concept_map.nodes || []);
      setEdges(selectedMaterial.concept_map.edges || []);
    } else {
      setNodes([]);
      setEdges([]);
    }
  }, [selectedMaterial, setNodes, setEdges]);

  const handleGenerate = async () => {
    if (!selectedMaterial || !user) return;
    setGenerating(true);
    try {
      const prompt = `Analyze the following study material and extract a hierarchy of concepts to create a mind map.
Return ONLY a valid JSON object with two arrays: "nodes" and "edges".

Nodes format: { "id": "1", "data": { "label": "Main Topic" }, "position": { "x": 250, "y": 0 } }
Edges format: { "id": "e1-2", "source": "1", "target": "2", "animated": true }

Rules:
1. Extract 1 main central node (y: 0, x: 400).
2. Extract 3-5 subtopics (y: 150, spread x).
3. Extract 2-3 child details for each subtopic (y: 300, spread x).
4. Do not include markdown code blocks, just the JSON.

Content:
${selectedMaterial.extracted_text?.substring(0, 8000) || selectedMaterial.summary}`;

      const res = await aiComplete({
        messages: [{ role: "user", content: prompt }],
        temperature: 0.7,
        maxTokens: 2500,
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

      const firstIdx = jsonString.indexOf('{');
      const lastIdx = jsonString.lastIndexOf('}');
      if (firstIdx === -1 || lastIdx === -1) {
        throw new Error("Failed to locate JSON object in AI output");
      }
      jsonString = jsonString.substring(firstIdx, lastIdx + 1);
      
      let graphData;
      try {
        graphData = JSON.parse(jsonString);
      } catch (parseErr) {
        console.error("Raw string that failed to parse:", jsonString);
        throw new Error("Failed to parse AI output as JSON");
      }
      
      // Polish edges for better UI
      const styledEdges = (graphData.edges || []).map((e: any) => ({
        ...e,
        markerEnd: { type: MarkerType.ArrowClosed, color: '#f59e0b' },
        style: { stroke: '#f59e0b', strokeWidth: 2 }
      }));

      // Polish nodes for better UI
      const styledNodes = (graphData.nodes || []).map((n: any) => ({
        ...n,
        style: {
          background: '#1e293b',
          color: '#f8fafc',
          border: '1px solid #334155',
          borderRadius: '8px',
          padding: '10px 15px',
          fontSize: '12px',
          fontWeight: 'bold',
          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)'
        }
      }));

      // Save to material doc
      await updateDoc(doc(db, "materials", selectedMaterial.id), {
        concept_map: { nodes: styledNodes, edges: styledEdges }
      });
      
      setNodes(styledNodes);
      setEdges(styledEdges);
      
      // Update local state to prevent refetch need
      setSelectedMaterial({ ...selectedMaterial, concept_map: { nodes: styledNodes, edges: styledEdges }});
      refetchMaterials();
      
      toast.success("Concept Map generated!");
    } catch (error) {
      console.error(error);
      toast.error("Failed to generate concept map.");
    } finally {
      setGenerating(false);
    }
  };

  if (materialsLoading) {
    return <div className="p-8 flex justify-center"><Loader2 className="animate-spin h-8 w-8 text-primary" /></div>;
  }

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
          <Network className="h-5 w-5 text-primary" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-foreground">Concept Maps</h1>
          <p className="text-muted-foreground text-sm">Visualize knowledge structures from your materials</p>
        </div>
      </div>

      {!selectedMaterial ? (
        <div className="grid sm:grid-cols-2 md:grid-cols-3 gap-4 mt-6">
          {materials?.map((m: any) => (
            <div key={m.id} className="bg-card border border-border rounded-xl p-5 hover:border-primary/40 cursor-pointer transition-colors" onClick={() => setSelectedMaterial(m)}>
              <div className="flex items-start gap-3">
                <FileText className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <h3 className="font-semibold text-foreground truncate">{m.file_name}</h3>
                  <p className="text-xs text-muted-foreground mt-1">
                    {m.concept_map ? "Map ready • Click to view" : "Click to generate map"}
                  </p>
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
        <div className="space-y-4 animate-fade-in flex flex-col h-[700px]">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-bold">Mapping: {selectedMaterial.file_name}</h2>
            <div className="flex gap-2">
               {nodes.length > 0 && (
                 <Button variant="outline" size="sm" onClick={handleGenerate} disabled={generating}>
                   <RefreshCw className={`h-4 w-4 mr-2 ${generating ? "animate-spin" : ""}`} /> Regenerate
                 </Button>
               )}
               <Button variant="secondary" size="sm" onClick={() => setSelectedMaterial(null)}>
                 Back
               </Button>
            </div>
          </div>

          {generating ? (
             <div className="flex-1 bg-card border border-border rounded-xl flex flex-col items-center justify-center gap-4 text-center">
               <RefreshCw className="h-8 w-8 text-primary animate-spin" />
               <p className="text-muted-foreground text-sm">AI is building the concept hierarchy. This may take a minute...</p>
             </div>
          ) : nodes.length === 0 ? (
             <div className="flex-1 bg-card border border-border rounded-xl flex flex-col items-center justify-center gap-4 text-center">
               <Network className="h-12 w-12 text-muted-foreground opacity-50" />
               <div>
                 <h3 className="font-bold text-foreground">No Map Generated</h3>
                 <p className="text-sm text-muted-foreground max-w-md mx-auto mt-1">
                   Let AI analyze the document and create a visual tree of the key concepts.
                 </p>
               </div>
               <Button onClick={handleGenerate} className="bg-primary text-primary-foreground">
                 Generate Concept Map
               </Button>
             </div>
          ) : (
             <div className="flex-1 bg-slate-950 border border-slate-800 rounded-xl overflow-hidden relative">
               <ReactFlow
                 nodes={nodes}
                 edges={edges}
                 onNodesChange={onNodesChange}
                 onEdgesChange={onEdgesChange}
                 fitView
                 className="bg-slate-950"
                 colorMode="dark"
               >
                 <Controls className="bg-slate-900 border-slate-700 fill-slate-200" />
                 <MiniMap className="bg-slate-900 border-slate-800" maskColor="rgba(15, 23, 42, 0.7)" />
                 <Background color="#334155" gap={16} />
               </ReactFlow>
             </div>
          )}
        </div>
      )}
    </div>
  );
}
