import { Building, Laptop, LineChart, Globe } from "lucide-react";

const items = [
  { icon: Building, title: "Institution Dashboards", desc: "Full admin panels for schools and universities to manage learners." },
  { icon: Laptop, title: "White-Label Apps", desc: "Custom branded learning experiences for organizations." },
  { icon: LineChart, title: "Teacher Analytics", desc: "Instructor insights into student performance and engagement." },
  { icon: Globe, title: "Enterprise Deployments", desc: "Scale to thousands of users with dedicated infrastructure." },
];

const ExpansionSection = () => (
  <section className="py-24 bg-muted/50">
    <div className="container max-w-7xl mx-auto px-4">
      <div className="text-center max-w-2xl mx-auto mb-16">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent mb-4">Platform Roadmap</p>
        <h2 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">
          Built for students today. Ready for institutions tomorrow.
        </h2>
        <p className="text-muted-foreground text-lg mt-4">
          Our platform is designed to scale from individual learners to entire educational organizations.
        </p>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {items.map((item) => (
          <div key={item.title} className="bg-card border border-border rounded-2xl p-6 hover:shadow-md hover:border-accent/20 transition-all text-center">
            <div className="h-12 w-12 rounded-xl bg-secondary flex items-center justify-center mx-auto mb-4">
              <item.icon className="h-6 w-6 text-navy" />
            </div>
            <h3 className="text-base font-semibold text-foreground mb-2">{item.title}</h3>
            <p className="text-sm text-muted-foreground leading-relaxed">{item.desc}</p>
          </div>
        ))}
      </div>
    </div>
  </section>
);

export default ExpansionSection;
