// services/packaging.images.ts
const files = import.meta.glob("../assets/packaging/*.webp", {
    eager: true,
    as: "url",
}) as Record<string, string>;

export const PACKAGING_IMG: Record<string, string> = Object.fromEntries(
    Object.entries(files).map(([path, url]) => {
        const file = path.split("/").pop()!;            // "Box-1.webp"
        const key = file.replace(/\.[^.]+$/, "").toLowerCase(); // -> "box-1"
        return [key, url];
    })
);

if (import.meta.env.DEV && Object.keys(PACKAGING_IMG).length === 0) {
    console.warn("[packaging] glob не знайшов файлів. Перевір шлях: src/assets/packaging/*.webp");
}
