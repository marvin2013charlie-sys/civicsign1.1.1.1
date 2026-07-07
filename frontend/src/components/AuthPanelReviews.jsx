import React from "react";
import { Star } from "lucide-react";
import { AUTH_REVIEWS } from "@/data/authReviews";

function ReviewCard({ review, showStars }) {
  return (
    <figure className="cs-auth-review-card">
      {showStars && (
        <div className="flex gap-0.5" aria-hidden>
          {Array.from({ length: 5 }).map((_, i) => (
            <Star
              key={i}
              className="h-3 w-3 fill-[var(--c-icon-on-dark)] text-[var(--c-icon-on-dark)]"
            />
          ))}
        </div>
      )}
      <blockquote className={`text-sm leading-relaxed text-white/88 ${showStars ? "mt-2.5" : ""}`}>
        &ldquo;{review.quote}&rdquo;
      </blockquote>
      <figcaption className="mt-3 text-xs font-semibold text-white/55">
        {review.name} · {review.role}
      </figcaption>
    </figure>
  );
}

/** Vertically sliding quotes on the auth panel (client reviews or admin slides). */
export function AuthPanelReviews({
  reviews,
  label = "Trusted by UK teams",
  showStars = true,
}) {
  const items = reviews?.length ? reviews : AUTH_REVIEWS;
  const loop = [...items, ...items];

  return (
    <div className="cs-auth-reviews" data-testid="auth-panel-reviews">
      <p className="mb-3 text-[11px] font-semibold uppercase tracking-widest text-white/45">
        {label}
      </p>
      <div className="cs-auth-reviews-viewport">
        <div
          className="cs-auth-reviews-track"
          style={{ "--review-count": items.length }}
        >
          {loop.map((review, i) => (
            <ReviewCard key={`${review.name}-${i}`} review={review} showStars={showStars} />
          ))}
        </div>
      </div>
    </div>
  );
}