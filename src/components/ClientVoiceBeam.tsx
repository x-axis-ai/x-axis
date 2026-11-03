import React, { useEffect, useState } from "react";

type VoiceBeamProps = Record<string, unknown> & {
  children: React.ReactNode;
};

function isWebKit(): boolean {
  if (typeof navigator === "undefined") return false;
  return /AppleWebKit/i.test(navigator.userAgent) && !/Chrom(e|ium)/i.test(navigator.userAgent);
}

/** Safari logs errors for VoiceBeam's `@property … syntax: "<number>"` rules. */
function stripVoiceBeamPropertyRules() {
  document.querySelectorAll("style").forEach((el) => {
    const text = el.textContent;
    if (!text || !text.includes("@property --vb-opacity")) return;
    el.textContent = text.replace(/@property[^{]+\{[^}]*\}/g, "");
  });
}

/**
 * Mount VoiceBeam only on the client. Avoids SSR hydration mismatches from
 * injected `@property` CSS, and strips those rules on WebKit where they error.
 */
export default function ClientVoiceBeam({ children, ...props }: VoiceBeamProps) {
  const [Beam, setBeam] = useState<React.ComponentType<VoiceBeamProps> | null>(
    null
  );

  useEffect(() => {
    let cancelled = false;
    void import("voice-glow").then((mod) => {
      if (!cancelled) setBeam(() => mod.VoiceBeam as React.ComponentType<VoiceBeamProps>);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!Beam || !isWebKit()) return;

    stripVoiceBeamPropertyRules();
    // VoiceBeam injects <style> as a child of the wrapper, not into <head>.
    const observer = new MutationObserver(stripVoiceBeamPropertyRules);
    observer.observe(document.body, { childList: true, subtree: true });
    return () => observer.disconnect();
  }, [Beam]);

  if (!Beam) return <>{children}</>;

  const webkitProps = isWebKit()
    ? { distortion: 0, distortionDetail: 0 }
    : null;

  return (
    <Beam {...props} {...webkitProps}>
      {children}
    </Beam>
  );
}
