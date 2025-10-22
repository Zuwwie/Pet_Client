import { useState, CSSProperties } from "react";

type Props = {
    src: string;
    alt: string;
    eager?: boolean;            // перші N — можна грузити одразу
    className?: string;
    style?: CSSProperties;
    onLoad?: () => void;
};

export default function LazyImg({
                                    src,
                                    alt,
                                    eager = false,
                                    className,
                                    style,
                                    onLoad,
                                }: Props) {
    const [loaded, setLoaded] = useState(false);

    return (
        <div
            className={className}
            style={{
                position: "relative",
                width: "100%",
                height: "100%",
                ...style,
            }}
        >
            {/* скелетон, поки не завантажено */}
            {!loaded && (
                <div
                    aria-hidden
                    style={{
                        position: "absolute",
                        inset: 0,
                        background: "#f1f5f9",
                        animation: "lazyPulse 1.2s ease-in-out infinite",
                    }}
                />
            )}

            <img
                src={src}
                alt={alt}
                loading={eager ? "eager" : "lazy"}
                fetchPriority={eager ? "high" : "low"}
                decoding="async"
                onLoad={() => {
                    setLoaded(true);
                    onLoad?.();
                }}
                style={{
                    width: "100%",
                    height: "100%",
                    objectFit: "contain",
                    objectPosition: "center",
                    display: "block",
                    opacity: loaded ? 1 : 0,
                    transition: "opacity .25s ease",
                }}
            />
            <style>{`
        @keyframes lazyPulse {
          0% { opacity:.6 }
          50% { opacity:.9 }
          100% { opacity:.6 }
        }
      `}</style>
        </div>
    );
}
