// src/pages/Product.tsx
import React, { useState, useMemo, useRef } from "react";
import VantaComponent from "@/components/VantaComponent";
import Interact from "@/components/Interact";

const hslToHex = (h: number, s: number, l: number) => {
  const a = s * Math.min(l, 1 - l);
  const f = (n: number) => {
    const k = (n + h / 30) % 12;
    const color = l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
    return Math.round(255 * color);
  };
  return (f(0) << 16) | (f(8) << 8) | f(4);
};

const randomColor = () =>
  hslToHex(
    Math.random() * 360,
    0.55 + Math.random() * 0.45,
    0.3 + Math.random() * 0.45
  );

const randomDuration = () => 35 + Math.random() * 100;

// Utility function to interpolate between two colors
const interpolateColor = (
  startColor: number,
  endColor: number,
  factor: number
) => {
  const start = {
    r: (startColor >> 16) & 0xff,
    g: (startColor >> 8) & 0xff,
    b: startColor & 0xff,
  };
  const end = {
    r: (endColor >> 16) & 0xff,
    g: (endColor >> 8) & 0xff,
    b: endColor & 0xff,
  };

  const r = Math.round(start.r + factor * (end.r - start.r));
  const g = Math.round(start.g + factor * (end.g - start.g));
  const b = Math.round(start.b + factor * (end.b - start.b));

  return (r << 16) | (g << 8) | b;
};

export default function Product() {
  const [highColor, setHigh] = useState(0xFFFFFF);
  const [midColor, setMid] = useState(0x0);
  const [lowColor, setLow] = useState(0x0);
  const [base, setBase] = useState(0x0);
  const [blur, setBlur] = useState(1);
  const [speed, setSpeed] = useState(0.1);

  const stopLoopRef = useRef(false);
  const loopStartedRef = useRef(false);
  const animateColorsRef = useRef(false);
  const speedTargetRef = useRef(0.1);
  const blurTargetRef = useRef(1);

  const updateColors = () => {
    stopLoopRef.current = false;
    animateColorsRef.current = true;
    speedTargetRef.current = 6;
    blurTargetRef.current = 0.5;

    if (loopStartedRef.current) return;
    loopStartedRef.current = true;

    const makeLane = (start: number) => ({
      start,
      target: randomColor(),
      progress: 0,
      duration: randomDuration(),
    });

    const high = makeLane(highColor);
    const mid = makeLane(midColor);
    const low = makeLane(lowColor);

    const stepLane = (
      lane: { start: number; target: number; progress: number; duration: number },
      setColor: (color: number) => void
    ) => {
      lane.progress += 1 / lane.duration;
      if (lane.progress >= 1) {
        lane.start = lane.target;
        lane.target = randomColor();
        lane.progress = 0;
        lane.duration = randomDuration();
      }
      setColor(interpolateColor(lane.start, lane.target, lane.progress));
    };

    const colorLoop = () => {
      if (stopLoopRef.current) {
        loopStartedRef.current = false;
        return;
      }

      if (animateColorsRef.current) {
        stepLane(high, setHigh);
        stepLane(mid, setMid);
        stepLane(low, setLow);
      }

      setSpeed((current) => current + (speedTargetRef.current - current) * 0.02);
      setBlur((current) => current + (blurTargetRef.current - current) * 0.02);

      requestAnimationFrame(colorLoop);
    };

    colorLoop();
  };

  const useDefaults = () => {
    animateColorsRef.current = false;
    speedTargetRef.current = 0.7;
    blurTargetRef.current = 0.8;
  };

  const key = useMemo(
    () => `${highColor}-${midColor}-${lowColor}-${base}-${speed}-${blur}`,
    [highColor, midColor, lowColor, base, speed, blur]
  );

  return (
    <main className="relative min-h-[100dvh] overflow-hidden">
      <VantaComponent
        highColor={highColor}
        midColor={midColor}
        lowColor={lowColor}
        base={base}
        speed={speed}
        blur={blur}
      />
      <div className="relative z-10 flex min-h-[100dvh] w-full flex-col items-center pt-[env(safe-area-inset-top)] pb-[env(safe-area-inset-bottom)]">
        <Interact updateColors={updateColors} useDefaults={useDefaults} />
      </div>
    </main>
  );
}
