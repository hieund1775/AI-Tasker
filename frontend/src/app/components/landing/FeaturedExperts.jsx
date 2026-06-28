import { Star, ReceiptText, Users } from 'lucide-react';

export function FeaturedExperts() {
  // TODO: Replace with API call when backend is ready
  const experts = [];

  return (
    <section id="experts" className="py-20 px-4 sm:px-6 lg:px-8 bg-card">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-14">
          <h2 className="text-3xl font-bold text-foreground tracking-tight mb-3">Featured Experts</h2>
          <p className="text-base text-muted-foreground max-w-md mx-auto">Connect with top-rated AI professionals</p>
        </div>

        {experts.length === 0 ? (
          <div className="text-center py-16 bg-secondary/20 rounded-xl border border-border">
            <Users className="w-12 h-12 text-muted-foreground/30 mx-auto mb-4" />
            <h3 className="text-base font-semibold text-foreground/60 mb-2">No experts available</h3>
            <p className="text-sm text-muted-foreground">Check back soon for featured AI experts.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {experts.map((expert) => (
              <div
                key={expert.id}
                className="bg-card border border-border rounded-xl p-6 hover:border-border/60 transition-colors cursor-pointer"
              >
                <div className="flex flex-col items-center text-center gap-4">
                  <div className={`w-16 h-16 rounded-xl bg-primary-light flex-shrink-0`} />
                  <div>
                    <h3 className="font-semibold text-foreground mb-1">{expert.name}</h3>
                    <p className="text-sm text-muted-foreground">{expert.specialization}</p>
                  </div>
                </div>

                <div className="flex items-center justify-between pt-4 mt-4 border-t border-border">
                  <div className="flex items-center gap-1">
                    <Star className="w-4 h-4 fill-warning text-warning" />
                    <span className="font-medium text-foreground text-sm">{expert.rating}</span>
                    <span className="text-xs text-muted-foreground">({expert.reviews})</span>
                  </div>
                  <div className="flex items-center gap-1 text-muted-foreground text-sm">
                    <ReceiptText className="w-4 h-4" />
                    <span className="font-medium">${expert.hourlyRate}/hr</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
