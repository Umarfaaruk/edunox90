const logos: string[] = [];
// Partner logos will appear here once partnerships are established

const TrustedBy = () => {
  if (logos.length === 0) return null;

  return (
    <section className="py-16 bg-background border-b border-border">
      <div className="container max-w-7xl mx-auto px-4">
        <p className="text-center text-xs font-semibold uppercase tracking-[0.2em] text-muted-foreground mb-10">
          Trusted by students & communities worldwide
        </p>
        <div className="flex flex-wrap items-center justify-center gap-x-12 gap-y-6">
          {logos.map((name) => (
            <div
              key={name}
              className="text-muted-foreground/40 font-bold text-lg tracking-tight select-none"
            >
              {name}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default TrustedBy;
