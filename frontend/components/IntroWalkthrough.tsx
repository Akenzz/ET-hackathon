"use client";

import { useState } from "react";
import { Wind, Users, HardHat, MapPinned, Sparkles, ArrowRight } from "lucide-react";
import type { UserRole } from "@/lib/role";

interface IntroWalkthroughProps {
  onComplete: (role: UserRole) => void;
}

const STEPS = ["welcome", "role", "orient"] as const;
type Step = (typeof STEPS)[number];

export default function IntroWalkthrough({ onComplete }: IntroWalkthroughProps) {
  const [step, setStep] = useState<Step>("welcome");
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const stepIndex = STEPS.indexOf(step);

  function goNext() {
    const next = STEPS[stepIndex + 1];
    if (next) setStep(next);
  }

  function handleFinish() {
    onComplete(selectedRole ?? "citizen");
  }

  return (
    <div className="fixed inset-0 z-2000 flex items-center justify-center bg-navy/90 p-4 backdrop-blur-md">
      <div className="w-full max-w-md rounded-3xl border border-border/80 bg-bg-elevated/95 p-6 shadow-2xl">
        <div className="mb-6 flex items-center gap-1.5">
          {STEPS.map((s, i) => (
            <span
              key={s}
              className={"h-1 flex-1 rounded-full transition-colors " + (i <= stepIndex ? "bg-cyan" : "bg-border")}
            />
          ))}
        </div>

        {step === "welcome" && (
          <div className="space-y-4 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-teal/25 bg-teal/15 text-teal">
              <Wind size={26} />
            </div>
            <h2 className="font-display text-2xl font-semibold text-fg">AQI Command Center</h2>
            <p className="text-sm leading-6 text-fg-faint">
              Live air quality across India, with forecasts and plain-language guidance for the hours ahead.
            </p>
            <button
              onClick={goNext}
              className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-teal px-4 py-3 text-sm font-semibold text-navy transition-transform hover:-translate-y-0.5"
            >
              Get started
              <ArrowRight size={16} />
            </button>
          </div>
        )}

        {step === "role" && (
          <div className="space-y-4">
            <div className="text-center">
              <h2 className="font-display text-xl font-semibold text-fg">How will you use this?</h2>
              <p className="mt-1 text-sm text-fg-faint">This decides how much detail you see by default.</p>
            </div>
            <div className="space-y-3">
              <button
                onClick={() => { setSelectedRole("citizen"); goNext(); }}
                className="flex w-full items-start gap-3 rounded-2xl border border-border/80 bg-bg-elevated-2/80 p-4 text-left transition-all hover:-translate-y-0.5 hover:border-teal/40"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-teal/15 text-teal">
                  <Users size={18} />
                </div>
                <div>
                  <p className="font-semibold text-fg">Citizen</p>
                  <p className="mt-0.5 text-xs leading-5 text-fg-faint">Simple status and health advisories, low clutter.</p>
                </div>
              </button>
              <button
                onClick={() => { setSelectedRole("engineer"); goNext(); }}
                className="flex w-full items-start gap-3 rounded-2xl border border-border/80 bg-bg-elevated-2/80 p-4 text-left transition-all hover:-translate-y-0.5 hover:border-indigo/40"
              >
                <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo/15 text-indigo">
                  <HardHat size={18} />
                </div>
                <div>
                  <p className="font-semibold text-fg">Engineer</p>
                  <p className="mt-0.5 text-xs leading-5 text-fg-faint">Raw values, station IDs, model validation detail.</p>
                </div>
              </button>
            </div>
          </div>
        )}

        {step === "orient" && (
          <div className="space-y-4 text-center">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl border border-cyan/25 bg-cyan/15 text-cyan">
              <MapPinned size={26} />
            </div>
            <h2 className="font-display text-xl font-semibold text-fg">Everything else is optional</h2>
            <p className="text-sm leading-6 text-fg-faint">
              You&apos;ll land on one live number. Tap any section to expand it — nothing else loads until you ask for it.
            </p>
            <button
              onClick={handleFinish}
              className="mt-2 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-teal px-4 py-3 text-sm font-semibold text-navy transition-transform hover:-translate-y-0.5"
            >
              <Sparkles size={16} />
              Enter dashboard
            </button>
          </div>
        )}

        {step !== "welcome" && (
          <button onClick={handleFinish} className="mt-4 w-full text-center text-[11px] text-fg-faint hover:text-fg-muted">
            Skip intro
          </button>
        )}
      </div>
    </div>
  );
}