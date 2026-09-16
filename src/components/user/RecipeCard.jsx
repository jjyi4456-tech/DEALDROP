import { ingredientByKey } from "@/lib/ingredients";

// One recipe card: shows required ingredients (have/need) + the reward.
// - Default mode (onCraft provided): renders its own Craft button (Inventory page).
// - Selectable mode (onSelect provided): the whole card is tappable to select it
//   and the built-in Craft button is hidden — used by the wallet's "ห้องครัว"
//   tab which owns a single full-width Craft button.
export default function RecipeCard({ recipe, haveMap, crafting, onCraft, onSelect, selected }) {
  const ingredients = recipe.ingredients || [];
  const canCraft = ingredients.length > 0 && ingredients.every((ing) => (haveMap[ing.key] || 0) >= (Number(ing.quantity) || 1));
  const selectable = typeof onSelect === "function";

  const rewardLabel =
    recipe.result_reward_type === "percent" ? `ลด ${recipe.result_reward_value}%`
    : recipe.result_reward_type === "cash" ? `ลด ${recipe.result_reward_value}฿`
    : `แถม ${recipe.result_reward_value}`;

  return (
    <div
      onClick={selectable ? () => onSelect(recipe) : undefined}
      onKeyDown={selectable ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onSelect(recipe); } } : undefined}
      role={selectable ? "button" : undefined}
      tabIndex={selectable ? 0 : undefined}
      className={`rounded-2xl border bg-card p-4 shadow-sm transition ${canCraft ? "ring-1 ring-primary/40" : ""} ${selectable ? "cursor-pointer" : ""} ${selected ? "border-primary ring-2 ring-primary" : ""}`}
    >
      <div className="flex items-start gap-3">
        <div className="flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-amber-100 to-orange-100 text-2xl">
          {recipe.emoji || "🧪"}
        </div>
        <div className="flex-1">
          <h3 className="font-bold leading-tight">{recipe.name}</h3>
          <p className="text-xs text-muted-foreground">{recipe.result_title}</p>
        </div>
        <span className="rounded-full bg-primary/10 px-2.5 py-1 text-xs font-bold text-primary">{rewardLabel}</span>
      </div>

      <div className="mt-3 flex flex-wrap gap-1.5">
        {ingredients.map((ing) => {
          const need = Number(ing.quantity) || 1;
          const have = haveMap[ing.key] || 0;
          const enough = have >= need;
          const emoji = ing.emoji || ingredientByKey[ing.key]?.emoji || "";
          return (
            <span key={ing.key} className={`rounded-full px-2 py-0.5 text-xs font-medium ${enough ? "bg-emerald-50 text-emerald-600" : "bg-muted text-muted-foreground"}`}>
              {emoji} {ing.name} {have}/{need}
            </span>
          );
        })}
      </div>

      {selectable ? (
        selected ? (
          <div className="mt-3 rounded-xl bg-primary/10 py-2 text-center text-xs font-bold text-primary">✓ เลือกสูตรนี้แล้ว</div>
        ) : canCraft ? (
          <div className="mt-3 rounded-xl border border-dashed border-primary/40 py-2 text-center text-xs font-medium text-primary">เลือกสูตรนี้</div>
        ) : null
      ) : (
        <button
          onClick={onCraft}
          disabled={!canCraft || crafting}
          className={`mt-3 w-full rounded-xl py-2.5 text-sm font-bold transition ${canCraft ? "bg-primary text-primary-foreground active:scale-95" : "bg-muted text-muted-foreground"}`}
        >
          {crafting ? "กำลังคราฟต์..." : canCraft ? "🧪 คราฟต์คูปอง" : "วัตถุดิบไม่ครบ"}
        </button>
      )}
    </div>
  );
}