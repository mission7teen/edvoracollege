import shieldLogo from "@/assets/images/shield_logo_1782228638116.jpg";
import { useData } from "@/lib/store";

export function Logo({ size = 40 }: { size?: number }) {
  const settings = useData((s) => s.settings);
  const src = settings.logo?.trim() ? settings.logo : shieldLogo;
  const name = settings.name || "EDVORA COLLEGE";
  const [first, ...rest] = name.split(" ");

  return (
    <div className="flex items-center gap-2.5">
      <div
        className="grid place-items-center rounded-xl shadow-elegant overflow-hidden"
        style={{ width: size, height: size }}
      >
        <img
          src={src}
          alt={`${name} logo`}
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
      </div>
      <div className="leading-tight">
        <div className="font-bold tracking-tight text-foreground text-base">{first}</div>
        <div className="text-[10px] uppercase tracking-[0.18em] text-muted-foreground">
          {rest.join(" ") || "COLLEGE"}
        </div>
      </div>
    </div>
  );
}
