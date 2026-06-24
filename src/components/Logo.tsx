import shieldLogo from "@/assets/images/shield_logo_1782228638116.jpg";

export function Logo({ size = 40 }: { size?: number }) {
  return (
    <div className="flex items-center gap-2.5">
      <div
        className="grid place-items-center rounded-xl shadow-elegant overflow-hidden"
        style={{ width: size, height: size }}
      >
        <img
          src={shieldLogo}
          alt="EDVORA College"
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
      </div>
      <div className="leading-tight">
        <div className="font-bold tracking-tight text-foreground text-base">EDVORA</div>
        <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          COLLEGE
        </div>
      </div>
    </div>
  );
}
