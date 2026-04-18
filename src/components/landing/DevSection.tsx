import { Server, Shield, Brain, Cpu } from "lucide-react";

const DevSection = () => (
  <section className="py-24 bg-deep text-deep-foreground relative overflow-hidden">
    <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-interface/5 rounded-full blur-[100px]" />

    <div className="container max-w-7xl mx-auto px-4 relative">
      <div className="grid lg:grid-cols-2 gap-16 items-center">
        {/* Left text */}
        <div className="space-y-6">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-soft">Built for Developers</p>
          <h2 className="text-3xl md:text-4xl font-bold tracking-tight">
            Powered by cutting-edge <span className="text-highlight">AI technology.</span>
          </h2>
          <p className="text-soft text-lg leading-relaxed">
            Our platform leverages state-of-the-art language models, scalable cloud infrastructure, and continuous learning engines to deliver intelligent tutoring at scale.
          </p>
          <div className="space-y-4 pt-4">
            {[
              { icon: Brain, label: "Advanced AI models for natural tutoring" },
              { icon: Server, label: "Scalable infrastructure for millions of learners" },
              { icon: Cpu, label: "Continuous learning engine that improves over time" },
              { icon: Shield, label: "Enterprise-grade security & data handling" },
            ].map((item, i) => (
              <div key={i} className="flex items-center gap-3">
                <item.icon className="h-5 w-5 text-highlight" />
                <span className="text-sm text-soft font-medium">{item.label}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right code visual */}
        <div className="bg-navy/60 backdrop-blur border border-interface/20 rounded-2xl overflow-hidden">
          <div className="flex items-center gap-2 px-5 py-3 border-b border-interface/20">
            <div className="h-3 w-3 rounded-full bg-destructive/60" />
            <div className="h-3 w-3 rounded-full bg-accent/60" />
            <div className="h-3 w-3 rounded-full bg-highlight/60" />
            <span className="ml-3 text-xs text-soft font-mono">ai-tutor.config.ts</span>
          </div>
          <pre className="p-5 text-sm font-mono leading-relaxed overflow-x-auto">
            <code>
              <span className="text-interface">const</span>{" "}
              <span className="text-highlight">tutorConfig</span> = {"{\n"}
              {"  "}<span className="text-soft">model:</span>{" "}
              <span className="text-green-400">"studymind-v3"</span>,{"\n"}
              {"  "}<span className="text-soft">capabilities:</span> [{"\n"}
              {"    "}<span className="text-green-400">"document-analysis"</span>,{"\n"}
              {"    "}<span className="text-green-400">"adaptive-quizzing"</span>,{"\n"}
              {"    "}<span className="text-green-400">"real-time-tutoring"</span>,{"\n"}
              {"    "}<span className="text-green-400">"progress-tracking"</span>{"\n"}
              {"  "}],{"\n"}
              {"  "}<span className="text-soft">maxConcurrentUsers:</span>{" "}
              <span className="text-highlight">Infinity</span>,{"\n"}
              {"  "}<span className="text-soft">encryption:</span>{" "}
              <span className="text-green-400">"AES-256"</span>{"\n"}
              {"}"};
            </code>
          </pre>
        </div>
      </div>
    </div>
  </section>
);

export default DevSection;
