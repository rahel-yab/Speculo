"use client";

import "plyr/dist/plyr.css";

import Plyr from "plyr";
import { useEffect, useRef } from "react";

export function VideoPlayer({
  src,
  onReady
}: {
  src: string;
  onReady?: (element: HTMLVideoElement) => void;
}) {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const playerRef = useRef<Plyr | null>(null);

  useEffect(() => {
    if (!videoRef.current) return;
    playerRef.current = new Plyr(videoRef.current, { controls: ["play", "progress", "current-time", "mute", "volume", "fullscreen"] });
    onReady?.(videoRef.current);
    return () => {
      playerRef.current?.destroy();
      playerRef.current = null;
    };
  }, [onReady]);

  return (
    <div className="overflow-hidden rounded-[24px] border border-white/8 bg-black shadow-panel">
      <video ref={videoRef} className="aspect-video w-full" controls playsInline src={src} />
    </div>
  );
}
