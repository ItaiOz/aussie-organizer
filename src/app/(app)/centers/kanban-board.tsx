"use client";
import { useState, useMemo, useTransition } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
  type DragOverEvent,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  arrayMove,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { toast } from "sonner";
import { StickyNote, User, Calendar, MapPin, Pencil } from "lucide-react";
import { format } from "date-fns";
import { moveCenter } from "./actions";
import { CenterDialog, type CenterInitial } from "./center-dialog";

type Card = {
  id: string;
  name: string;
  region: string | null;
  contactName: string | null;
  notes: string | null;
  bookedFrom: string | null;
  bookedTo: string | null;
  status: string;
};

function fmtBookedDates(from: string | null, to: string | null): string | null {
  if (!from && !to) return null;
  const f = (s: string) => format(new Date(s), "d MMM yyyy");
  if (from && to) return `${f(from)} – ${f(to)}`;
  if (from) return `from ${f(from)}`;
  return `until ${f(to!)}`;
}

const COLUMNS = [
  {
    id: "need_to_contact",
    title: "Need to contact",
    tint: "bg-zinc-100 text-zinc-700",
  },
  { id: "contacted", title: "Contacted", tint: "bg-amber-100 text-amber-800" },
  { id: "booked", title: "Booked", tint: "bg-green-100 text-green-800" },
] as const;

const COLUMN_IDS = COLUMNS.map((c) => c.id) as readonly string[];

export function KanbanBoard({ initial }: { initial: Card[] }) {
  const [cards, setCards] = useState<Card[]>(initial);
  const [prevInitial, setPrevInitial] = useState(initial);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [editingCard, setEditingCard] = useState<Card | null>(null);
  const [, startTransition] = useTransition();

  // Re-sync from server when the page refreshes after create/edit/delete/move.
  // Skip while a drag is in progress to avoid stomping the optimistic state.
  if (initial !== prevInitial && !activeId) {
    setPrevInitial(initial);
    setCards(initial);
  }

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
  );

  const byColumn = useMemo(() => {
    const map: Record<string, Card[]> = {};
    for (const col of COLUMNS) map[col.id] = [];
    for (const c of cards) {
      if (map[c.status]) map[c.status].push(c);
    }
    return map;
  }, [cards]);

  const activeCard = cards.find((c) => c.id === activeId);

  function findColumn(id: string): string | null {
    if (COLUMN_IDS.includes(id)) return id;
    return cards.find((c) => c.id === id)?.status ?? null;
  }

  function onDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id));
  }

  function onDragOver(e: DragOverEvent) {
    const { active, over } = e;
    if (!over) return;
    const activeIdStr = String(active.id);
    const overIdStr = String(over.id);
    const activeCol = findColumn(activeIdStr);
    const overCol = findColumn(overIdStr);
    if (!activeCol || !overCol || activeCol === overCol) return;

    setCards((prev) => {
      const moving = prev.find((c) => c.id === activeIdStr);
      if (!moving) return prev;
      const without = prev.filter((c) => c.id !== activeIdStr);

      const overCard = prev.find((c) => c.id === overIdStr);
      let insertIdx: number;
      if (overCard && overCard.status === overCol) {
        insertIdx = without.findIndex((c) => c.id === overIdStr);
      } else {
        const destCards = without.filter((c) => c.status === overCol);
        const lastDest = destCards[destCards.length - 1];
        insertIdx = lastDest
          ? without.findIndex((c) => c.id === lastDest.id) + 1
          : without.length;
      }
      const updated = { ...moving, status: overCol };
      return [
        ...without.slice(0, insertIdx),
        updated,
        ...without.slice(insertIdx),
      ];
    });
  }

  function onDragEnd(e: DragEndEvent) {
    const { active, over } = e;
    setActiveId(null);
    if (!over) return;
    const activeIdStr = String(active.id);
    const overIdStr = String(over.id);
    const activeCol = findColumn(activeIdStr);
    const overCol = findColumn(overIdStr);
    if (!activeCol || !overCol) return;

    if (overCol === activeCol && activeIdStr !== overIdStr) {
      const destCards = cards.filter((c) => c.status === overCol);
      const oldIdx = destCards.findIndex((c) => c.id === activeIdStr);
      const newIdx = destCards.findIndex((c) => c.id === overIdStr);
      if (oldIdx >= 0 && newIdx >= 0 && oldIdx !== newIdx) {
        const reordered = arrayMove(destCards, oldIdx, newIdx);
        const others = cards.filter((c) => c.status !== overCol);
        setCards([...others, ...reordered]);
      }
    }

    const finalDest = cards.filter(
      (c) =>
        c.status === overCol || (activeCol !== overCol && c.id === activeIdStr),
    );
    const finalIndex = finalDest.findIndex((c) => c.id === activeIdStr);

    startTransition(async () => {
      const res = await moveCenter({
        id: activeIdStr,
        toStatus: overCol,
        toIndex: Math.max(0, finalIndex),
      });
      if (!res.ok) toast.error(res.error ?? "Failed to move");
    });
  }

  const dialogInitial: CenterInitial | null = editingCard
    ? {
        id: editingCard.id,
        name: editingCard.name,
        status: editingCard.status,
        region: editingCard.region,
        contactName: editingCard.contactName,
        bookedFrom: editingCard.bookedFrom,
        bookedTo: editingCard.bookedTo,
        notes: editingCard.notes,
      }
    : null;

  return (
    <>
      <DndContext
        id="centers-kanban"
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={onDragStart}
        onDragOver={onDragOver}
        onDragEnd={onDragEnd}
      >
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {COLUMNS.map((col) => (
            <Column
              key={col.id}
              id={col.id}
              title={col.title}
              tint={col.tint}
              cards={byColumn[col.id]}
              onEdit={setEditingCard}
            />
          ))}
        </div>
        <DragOverlay>
          {activeCard ? <CardView card={activeCard} dragging /> : null}
        </DragOverlay>
      </DndContext>
      <CenterDialog
        open={!!editingCard}
        onOpenChange={(v) => !v && setEditingCard(null)}
        initial={dialogInitial}
      />
    </>
  );
}

function Column({
  id,
  title,
  tint,
  cards,
  onEdit,
}: {
  id: string;
  title: string;
  tint: string;
  cards: Card[];
  onEdit: (c: Card) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <div
      ref={setNodeRef}
      className={
        "rounded-xl border border-zinc-200 bg-zinc-50/50 transition-colors " +
        (isOver ? "border-zinc-400 bg-zinc-100" : "")
      }
    >
      <div className="p-3 border-b border-zinc-200 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span
            className={"text-xs font-semibold px-2 py-0.5 rounded-full " + tint}
          >
            {title}
          </span>
          <span className="text-xs text-zinc-500">{cards.length}</span>
        </div>
      </div>
      <SortableContext
        items={cards.map((c) => c.id)}
        strategy={verticalListSortingStrategy}
      >
        <div className="p-3 space-y-2 min-h-[200px]">
          {cards.length === 0 && (
            <div className="text-xs text-zinc-400 text-center py-8 border-2 border-dashed border-zinc-200 rounded-lg">
              Drop here
            </div>
          )}
          {cards.map((c) => (
            <SortableCard key={c.id} card={c} onEdit={() => onEdit(c)} />
          ))}
        </div>
      </SortableContext>
    </div>
  );
}

function SortableCard({ card, onEdit }: { card: Card; onEdit: () => void }) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: card.id });
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.3 : 1,
  };
  return (
    <div ref={setNodeRef} style={style} {...attributes} {...listeners}>
      <CardView card={card} onEdit={onEdit} />
    </div>
  );
}

function CardView({ card, dragging, onEdit }: { card: Card; dragging?: boolean; onEdit?: () => void }) {
  const bookedDates = fmtBookedDates(card.bookedFrom, card.bookedTo);
  return (
    <div
      className={
        "group relative rounded-lg bg-white border border-zinc-200 p-3 cursor-grab active:cursor-grabbing shadow-sm " +
        (dragging ? "shadow-lg rotate-1" : "hover:border-zinc-300")
      }
    >
      {onEdit && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onEdit();
          }}
          onPointerDown={(e) => e.stopPropagation()}
          className="absolute top-2 right-2 p-1.5 rounded-md text-zinc-400 hover:text-zinc-900 hover:bg-zinc-100 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
          aria-label="Edit"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
      )}
      <div className="font-medium text-zinc-900 pr-6">{card.name}</div>
      <div className="mt-1.5 space-y-1 text-xs text-zinc-500">
        {card.region && (
          <div className="flex items-center gap-1.5">
            <MapPin className="h-3 w-3" /> {card.region}
          </div>
        )}
        {card.contactName && (
          <div className="flex items-center gap-1.5">
            <User className="h-3 w-3" /> {card.contactName}
          </div>
        )}
        {bookedDates && (
          <div className="flex items-center gap-1.5 text-zinc-700 font-medium">
            <Calendar className="h-3 w-3" /> {bookedDates}
          </div>
        )}
        {card.notes && (
          <div className="flex items-start gap-1.5">
            <StickyNote className="h-3 w-3 mt-0.5 shrink-0" />
            <span className="text-zinc-600">{card.notes}</span>
          </div>
        )}
      </div>
    </div>
  );
}
