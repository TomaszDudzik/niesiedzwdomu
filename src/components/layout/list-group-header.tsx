interface ListGroupHeaderProps {
  icon: string;
  title: string;
  count: number;
}

export function ListGroupHeader({ icon, title, count }: ListGroupHeaderProps) {
  return (
    <div className="mb-4 flex items-center gap-2">
      <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center text-lg leading-none">{icon}</span>
      <h2 className="text-[15px] font-semibold leading-none text-foreground">{title}</h2>
      <span className="text-[12px] leading-none text-muted-foreground">({count})</span>
    </div>
  );
}