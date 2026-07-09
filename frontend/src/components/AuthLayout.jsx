import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Globe, FileText, Activity } from "lucide-react";
import { Logo } from "@/components/Logo";
import { AuthAssistant } from "@/components/AuthAssistant";
import { AuthPanelMarquee } from "@/components/AuthPanelMarquee";
import { AuthPanelReviews } from "@/components/AuthPanelReviews";


const PANEL_STATS = [
  { icon: FileText, value: "500k+", label: "UK documents" },
  { icon: Globe, value: "100%", label: "UK-hosted" },
  { icon: Activity, value: "99.9%", label: "Uptime" },
];

function AuthBrandPanel({
  panelMarquee,
  showReviews,
  reviewSlides,
  reviewsLabel,
  reviewShowStars,
  panelQuote,
  panelBadge,
  panelTitle,
  panelSubtitle,
  panelBullets,
}) {
  return (
    <div
      className="cs-auth-panel relative hidden flex-col overflow-hidden text-white lg:flex"
      data-testid="auth-brand-panel"
    >
      {panelMarquee && <AuthPanelMarquee />}
      <div className="cs-auth-orb cs-auth-orb-a" aria-hidden />
      <div className="cs-auth-orb cs-auth-orb-b" aria-hidden />
      <div className="cs-auth-orb cs-auth-orb-c" aria-hidden />

      <div className="cs-auth-panel-inner">
        <div className="cs-auth-panel-logo">
          <Logo dark />
        </div>
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.06 }}
          className="cs-auth-panel-main"
        >
          {panelBadge && (
            typeof panelBadge === "string" ? (
              <span className="cs-auth-panel-badge">{panelBadge}</span>
            ) : (
              panelBadge
            )
          )}
          {panelTitle && (
            <h2 className="cs-auth-panel-title">
              {panelTitle}
            </h2>
          )}
          {panelSubtitle && (
            <p className="cs-auth-panel-subtitle">
              {panelSubtitle}
            </p>
          )}
          {panelBullets.length > 0 && (
            <ul className="cs-auth-panel-bullets hidden lg:block">
              {panelBullets.map(({ icon: Icon, text }) => (
                <li key={text} className="flex items-start gap-3 text-[15px] text-white/82">
                  <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-white/10 backdrop-blur">
                    <Icon className="h-4 w-4" style={{ color: "var(--c-icon-on-dark)" }} />
                  </span>
                  <span className="pt-1">{text}</span>
                </li>
              ))}
            </ul>
          )}
          {showReviews ? (
            <div className="cs-auth-panel-reviews">
              <AuthPanelReviews
                reviews={reviewSlides}
                label={reviewsLabel}
                showStars={reviewShowStars}
              />
            </div>
          ) : panelQuote ? (
            <figure className="cs-auth-panel-quote">
              <blockquote className="text-sm leading-relaxed text-white/88">
                &ldquo;{panelQuote.text}&rdquo;
              </blockquote>
              <figcaption className="mt-3 text-xs font-semibold text-white/55">
                {panelQuote.attribution}
              </figcaption>
            </figure>
          ) : null}
        </motion.div>

        <motion.footer
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.15 }}
          className="cs-auth-panel-foot shrink-0"
        >
          <div className="flex flex-wrap gap-2 sm:gap-3">
            {PANEL_STATS.map(({ icon: Icon, value, label }) => (
              <div
                key={label}
                className="flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/[0.06] px-2.5 py-1.5 backdrop-blur-sm sm:gap-2 sm:px-3 sm:py-2"
              >
                <Icon className="h-3 w-3 text-[var(--c-icon-on-dark)] sm:h-3.5 sm:w-3.5" />
                <span className="text-xs font-bold sm:text-sm">{value}</span>
                <span className="text-[10px] text-white/55 sm:text-xs">{label}</span>
              </div>
            ))}
          </div>
          <p className="mt-4 hidden text-xs text-white/45 lg:block">
            &copy; {new Date().getFullYear()}
          </p>
        </motion.footer>
      </div>
    </div>
  );
}

/**
 * Shared shell for user-facing auth pages (sign in, register, verify, reset).
 */
export function AuthLayout({
  children,
  panelTitle,
  panelSubtitle,
  panelBullets = [],
  panelQuote,
  panelBadge,
  backTo = "/",
  backLabel = "Back to home",
  authContext = "login",
  showAssistant = true,
  panelMarquee = false,
  panelReviews = false,
  reviewSlides,
  reviewsLabel,
  reviewShowStars = true,
}) {
  return (
    <div className="flex min-h-dvh flex-col lg:grid lg:h-dvh lg:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)] lg:overflow-hidden">
      <AuthBrandPanel
        panelMarquee={panelMarquee}
        showReviews={panelReviews}
        reviewSlides={reviewSlides}
        reviewsLabel={reviewsLabel}
        reviewShowStars={reviewShowStars}
        panelQuote={panelQuote}
        panelBadge={panelBadge}
        panelTitle={panelTitle}
        panelSubtitle={panelSubtitle}
        panelBullets={panelBullets}
      />

      <div className="cs-auth-form-shell flex min-h-dvh flex-1 justify-center px-5 py-8 sm:px-8 sm:py-10 lg:min-h-0 lg:h-dvh lg:overflow-y-auto lg:py-12">
        <div className="cs-auth-form-glow cs-auth-form-glow-a" aria-hidden />
        <div className="cs-auth-form-glow cs-auth-form-glow-b" aria-hidden />
        <div className="w-full max-w-[440px] lg:my-auto">
          <div className="mb-6 flex justify-end sm:mb-7">
            <Link
              to={backTo}
              className="inline-flex shrink-0 items-center gap-1.5 rounded-full border border-[var(--c-border)] bg-[var(--card)] px-3 py-1.5 text-sm text-[var(--c-muted-fg)] transition-colors hover:border-[var(--c-primary)] hover:text-[var(--c-ink)]"
              data-testid="auth-back-link"
            >
              <ArrowLeft className="h-3.5 w-3.5" />
              {backLabel}
            </Link>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, delay: 0.05 }}
            className="space-y-8"
          >
            {children}
          </motion.div>

          {showAssistant && <AuthAssistant context={authContext} />}
        </div>
      </div>
    </div>
  );
}