import { useEffect, useRef, useState } from "react";
import { useInView } from "framer-motion";
import { useExperience } from "@/components/Experience";

export default function AmbientVideo() {
  const video = useRef(null);
  const container = useRef(null);
  const inView = useInView(container, { amount: 0.1 });
  const { animationsEnabled } = useExperience();
  const [visible, setVisible] = useState(!document.hidden);
  const [loaded, setLoaded] = useState(false);
  const [ready, setReady] = useState(false);
  const [saveData] = useState(() => navigator.connection?.saveData === true);
  const shouldPlay = animationsEnabled && inView && visible && !saveData;

  useEffect(() => {
    const update = () => setVisible(!document.hidden);
    document.addEventListener("visibilitychange", update);
    return () => document.removeEventListener("visibilitychange", update);
  }, []);
  useEffect(() => {
    if (shouldPlay) setLoaded(true);
  }, [shouldPlay]);
  useEffect(() => {
    const element = video.current;
    if (loaded && shouldPlay) element?.play().catch(() => {});
    else element?.pause();
    return () => element?.pause();
  }, [loaded, shouldPlay]);

  return (
    <div ref={container} className="ambient-video" aria-hidden="true">
      <img
        src="/media/orbital-poster.png"
        alt=""
        width="640"
        height="640"
        decoding="async"
      />
      <video
        ref={video}
        src={loaded ? "/media/orbital-loop.mp4" : undefined}
        muted
        playsInline
        loop
        preload="none"
        width="640"
        height="640"
        className={ready ? "is-ready" : ""}
        onPlaying={() => setReady(true)}
        onError={() => setReady(false)}
      />
    </div>
  );
}
