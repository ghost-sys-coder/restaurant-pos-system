import { ArrowDown, ArrowUp, Plus, Settings2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import type { MenuOptionGroup } from '../types.ts';
import { formatCurrency } from '../utils/formatters.ts';

type Props = { groups: MenuOptionGroup[]; onChange: (groups: MenuOptionGroup[]) => void };
const emptyGroup = (): MenuOptionGroup => ({ name: '', minSelections: 0, maxSelections: 1, choices: [{ name: '', price: 0 }] });

export default function ModifierGroupBuilder({ groups, onChange }: Props) {
  const updateGroup = (index: number, patch: Partial<MenuOptionGroup>) => onChange(groups.map((group, groupIndex) => groupIndex === index ? { ...group, ...patch } : group));
  const moveGroup = (index: number, direction: -1 | 1) => {
    const destination = index + direction;
    if (destination < 0 || destination >= groups.length) return;
    const next = [...groups];
    [next[index], next[destination]] = [next[destination], next[index]];
    onChange(next);
  };
  const updateChoice = (groupIndex: number, choiceIndex: number, patch: { name?: string; price?: number }) => updateGroup(groupIndex, { choices: groups[groupIndex].choices.map((choice, index) => index === choiceIndex ? { ...choice, ...patch } : choice) });

  return <section className="overflow-hidden rounded-2xl border border-indigo-100 bg-indigo-50/40">
    <header className="flex items-start justify-between gap-4 border-b border-indigo-100 bg-white px-4 py-4">
      <div className="flex gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-xl bg-indigo-100 text-indigo-700"><Settings2 className="size-4" /></span><div><h4 className="text-sm font-bold text-slate-900">Meal customizations</h4><p className="mt-1 text-xs leading-5 text-slate-500">Add the choices staff can offer when this meal is ordered, such as size, sauce, or extras.</p></div></div>
      <Button type="button" variant="outline" className="shrink-0 bg-white" onClick={() => onChange([...groups, emptyGroup()])}><Plus />Add group</Button>
    </header>
    <div className="space-y-4 p-4">
      {!groups.length && <button type="button" onClick={() => onChange([emptyGroup()])} className="w-full rounded-xl border border-dashed border-indigo-200 bg-white px-5 py-8 text-center hover:border-indigo-400 hover:bg-indigo-50"><Plus className="mx-auto size-5 text-indigo-600" /><span className="mt-2 block text-sm font-bold text-slate-800">Add the first customization</span><span className="mt-1 block text-xs text-slate-500">Example: “Choose a size” with Regular and Large options.</span></button>}
      {groups.map((group, groupIndex) => {
        const required = (group.minSelections ?? 0) > 0;
        return <article key={groupIndex} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xs">
          <div className="flex items-center justify-between gap-3 border-b border-slate-100 bg-slate-50/70 px-4 py-3"><div><p className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">Customization {groupIndex + 1}</p><p className="text-xs text-slate-500">What choice should staff ask the customer to make?</p></div><div className="flex items-center gap-1"><Button type="button" size="icon-sm" variant="ghost" aria-label="Move customization up" disabled={groupIndex === 0} onClick={() => moveGroup(groupIndex, -1)}><ArrowUp /></Button><Button type="button" size="icon-sm" variant="ghost" aria-label="Move customization down" disabled={groupIndex === groups.length - 1} onClick={() => moveGroup(groupIndex, 1)}><ArrowDown /></Button><Button type="button" size="icon-sm" variant="ghost" aria-label="Delete customization" className="text-rose-600 hover:bg-rose-50" onClick={() => onChange(groups.filter((_, index) => index !== groupIndex))}><Trash2 /></Button></div></div>
          <div className="space-y-4 p-4">
            <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_190px]"><div className="space-y-1.5"><Label htmlFor={`modifier-name-${groupIndex}`}>Question shown while ordering</Label><Input id={`modifier-name-${groupIndex}`} value={group.name} maxLength={60} placeholder="e.g. Choose your sauce" onChange={event => updateGroup(groupIndex, { name: event.target.value })} /></div><div className="space-y-1.5"><Label htmlFor={`modifier-limit-${groupIndex}`}>Maximum choices</Label><Input id={`modifier-limit-${groupIndex}`} type="number" min="1" max={Math.max(1, group.choices.length)} value={group.maxSelections ?? 1} onChange={event => updateGroup(groupIndex, { maxSelections: Math.max(1, Math.min(group.choices.length, Number(event.target.value) || 1)) })} /></div></div>
            <button type="button" role="switch" aria-checked={required} onClick={() => updateGroup(groupIndex, { minSelections: required ? 0 : 1 })} className="flex w-full items-center justify-between rounded-xl border border-slate-200 px-3 py-2.5 text-left"><span><span className="block text-xs font-bold text-slate-800">Customer must choose</span><span className="block text-[11px] text-slate-500">Turn this on when the meal cannot be added without a selection.</span></span><span className={`relative h-6 w-11 rounded-full transition ${required ? 'bg-indigo-600' : 'bg-slate-300'}`}><span className={`absolute top-1 size-4 rounded-full bg-white transition-transform ${required ? 'translate-x-6' : 'translate-x-1'}`} /></span></button>
            <div><div className="mb-2 flex items-center justify-between"><div><p className="text-xs font-bold text-slate-800">Available choices</p><p className="text-[11px] text-slate-500">The extra fee is optional. Leave it at zero when the choice is included.</p></div><Button type="button" size="sm" variant="outline" onClick={() => updateGroup(groupIndex, { choices: [...group.choices, { name: '', price: 0 }] })}><Plus />Add choice</Button></div>
              <div className="space-y-2">{group.choices.map((choice, choiceIndex) => <div key={choiceIndex} className="grid grid-cols-[minmax(0,1fr)_150px_32px] items-end gap-2 rounded-xl border border-slate-100 bg-slate-50/70 p-2.5"><div className="space-y-1"><Label htmlFor={`modifier-choice-${groupIndex}-${choiceIndex}`} className="text-[11px]">Choice name</Label><Input id={`modifier-choice-${groupIndex}-${choiceIndex}`} value={choice.name} maxLength={60} placeholder="e.g. BBQ sauce" onChange={event => updateChoice(groupIndex, choiceIndex, { name: event.target.value })} /></div><div className="space-y-1"><Label htmlFor={`modifier-price-${groupIndex}-${choiceIndex}`} className="text-[11px]">Extra fee (UGX)</Label><Input id={`modifier-price-${groupIndex}-${choiceIndex}`} type="number" min="0" step="500" value={choice.price} onChange={event => updateChoice(groupIndex, choiceIndex, { price: Math.max(0, Math.round(Number(event.target.value) || 0)) })} /></div><Button type="button" size="icon" variant="ghost" aria-label={`Remove ${choice.name || 'choice'}`} disabled={group.choices.length === 1} className="text-slate-400 hover:text-rose-600" onClick={() => updateGroup(groupIndex, { choices: group.choices.filter((_, index) => index !== choiceIndex), maxSelections: Math.min(group.maxSelections ?? 1, group.choices.length - 1) })}><Trash2 /></Button>{choice.name && <p className="col-span-3 text-[11px] text-slate-500">Ordering preview: <strong className="text-slate-700">{choice.name}</strong>{choice.price > 0 ? ` · +${formatCurrency(choice.price)}` : ' · Included'}</p>}</div>)}</div>
            </div>
          </div>
        </article>;
      })}
    </div>
  </section>;
}
