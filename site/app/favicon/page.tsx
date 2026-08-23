/** Favicon source: the header tile at 512px on a transparent page. Screenshot `#tile` with the background omitted into `app/icon.png`. */
export default function Page() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-transparent">
      <div
        id="tile"
        className="flex size-[512px] items-center justify-center rounded-[112px] border-[12px] bg-card text-[300px] leading-none"
      >
        <span className="[filter:grayscale(1)_contrast(0)_brightness(0.97)_sepia(0.25)]">🧘</span>
      </div>
    </div>
  );
}
