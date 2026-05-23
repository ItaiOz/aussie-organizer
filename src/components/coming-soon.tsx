import { Card, CardContent } from "@/components/ui/card";

export function ComingSoon({ description }: { description?: string }) {
  return (
    <Card>
      <CardContent className="p-16 text-center">
        <div className="text-zinc-500 text-sm">Coming soon</div>
        {description && <p className="text-zinc-400 text-xs mt-2 max-w-md mx-auto">{description}</p>}
      </CardContent>
    </Card>
  );
}
