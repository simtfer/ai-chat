import { cn, hexAlpha } from "@/lib/utils";

export function Avatar({
  name,
  emoji,
  color,
  size = 36,
  className,
  active,
  dim,
}: {
  name: string;
  emoji: string;
  color: string;
  size?: number;
  className?: string;
  active?: boolean;
  dim?: boolean;
}) {
  return (
    <span
      className={cn(
        "relative grid shrink-0 place-items-center rounded-full font-medium text-white transition-all duration-300",
        dim && "opacity-45 saturate-50",
        className,
      )}
      style={{
        width: size,
        height: size,
        fontSize: Math.max(12, size * 0.44),
        background: `linear-gradient(150deg, ${hexAlpha(color, 0.95)}, ${hexAlpha(color, 0.42)})`,
        boxShadow: active
          ? `0 0 0 1.5px ${hexAlpha(color, 0.75)}, 0 0 22px -2px ${hexAlpha(color, 0.65)}`
          : `inset 0 1px 0 rgba(255,255,255,0.22), 0 4px 14px -6px ${hexAlpha(color, 0.6)}`,
      }}
      title={name}
      aria-label={name}
    >
      <span className="drop-shadow-[0_1px_2px_rgba(0,0,0,0.35)]">{emoji}</span>
    </span>
  );
}

export function AvatarStack({
  members,
  size = 22,
  max = 4,
}: {
  members: Array<{ id: string; name: string; emoji: string; color: string }>;
  size?: number;
  max?: number;
}) {
  const shown = members.slice(0, max);
  const rest = members.length - shown.length;
  return (
    <div className="flex items-center">
      {shown.map((member, index) => (
        <span
          key={member.id}
          className="rounded-full ring-2 ring-[#0b0e16]"
          style={{ marginLeft: index === 0 ? 0 : -size * 0.3 }}
        >
          <Avatar name={member.name} emoji={member.emoji} color={member.color} size={size} />
        </span>
      ))}
      {rest > 0 ? (
        <span
          className="grid place-items-center rounded-full bg-white/[0.08] text-[10px] font-medium text-ink-2 ring-2 ring-[#0b0e16]"
          style={{ width: size, height: size, marginLeft: -size * 0.3 }}
        >
          +{rest}
        </span>
      ) : null}
    </div>
  );
}
