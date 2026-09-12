"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "../ui/Button";
import { dateInputClass, Field, inputClass } from "../ui/Field";
import { Panel } from "../ui/Panel";
import { useGoals } from "@/lib/store/GoalsStore";
import { newId } from "@/lib/store/mutations";
import { deleteImage, downscale, putImage } from "@/lib/store/images";
import { parseAmount, toDollars } from "@/lib/money";
import { toISODate } from "@/lib/dates";
import {
  CATEGORIES,
  CATEGORY_LABEL,
  FREQUENCIES,
  FREQUENCY_LABEL,
  PRIORITIES,
  PRIORITY_LABEL,
  type Category,
  type Frequency,
  type Goal,
  type Priority,
} from "@/lib/schema";
import { isValid, validateGoal, type Errors, type GoalField, type GoalInput } from "@/lib/validate";
import { GoalImage } from "./GoalImage";

const EMOJI = ["🏡", "✈️", "🚙", "💍", "👶", "🌿", "🎓", "💼", "🎄", "🌸", "⛵", "🎁"];

const blank = (): GoalInput => ({
  name: "",
  category: "",
  customCategory: "",
  target: "",
  opening: "",
  targetDate: "",
  contribution: "",
  frequency: "monthly",
  priority: "medium",
  emoji: "",
  notes: "",
});

const fromGoal = (goal: Goal): GoalInput => ({
  name: goal.name,
  category: goal.category,
  customCategory: goal.customCategory ?? "",
  target: String(toDollars(goal.targetCents)),
  opening: String(toDollars(goal.openingBalanceCents)),
  targetDate: goal.targetDate,
  contribution: String(toDollars(goal.contributionCents)),
  frequency: goal.frequency,
  priority: goal.priority,
  emoji: goal.emoji ?? "",
  notes: goal.notes ?? "",
});

export function GoalForm({ existing }: { existing?: Goal }) {
  const router = useRouter();
  const { addGoal, updateGoal } = useGoals();
  const editing = Boolean(existing);

  const [form, setForm] = useState<GoalInput>(existing ? fromGoal(existing) : blank());
  const [errors, setErrors] = useState<Errors<GoalField>>({});
  const [submitted, setSubmitted] = useState(false);
  const [imageId, setImageId] = useState<string | undefined>(existing?.imageId);
  const [imageError, setImageError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const set = <K extends keyof GoalInput>(key: K, value: GoalInput[K]) => {
    const next = { ...form, [key]: value };
    setForm(next);
    if (submitted) setErrors(validateGoal(next));
  };

  async function onPickImage(file: File | undefined) {
    if (!file) return;
    setImageError(null);
    if (!file.type.startsWith("image/")) {
      setImageError("Choose an image file.");
      return;
    }
    setBusy(true);
    try {
      const blob = await downscale(file);
      const id = imageId ?? newId();
      await putImage(id, blob);
      setImageId(id);
    } catch {
      setImageError("That image couldn't be read. Try another.");
    } finally {
      setBusy(false);
    }
  }

  async function onRemoveImage() {
    if (!imageId) return;
    try {
      await deleteImage(imageId);
    } catch {
      // The reference is dropped regardless; an orphan blob is harmless.
    }
    setImageId(undefined);
  }

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    setSubmitted(true);
    const found = validateGoal(form);
    setErrors(found);
    if (!isValid(found)) {
      document.querySelector<HTMLElement>("[aria-invalid='true']")?.focus();
      return;
    }

    const shared = {
      name: form.name.trim(),
      category: form.category as Category,
      customCategory: form.category === "custom" ? form.customCategory?.trim() : undefined,
      targetCents: parseAmount(form.target)!,
      openingBalanceCents: parseAmount(form.opening === "" ? "0" : form.opening)!,
      targetDate: form.targetDate,
      contributionCents: parseAmount(form.contribution === "" ? "0" : form.contribution)!,
      frequency: form.frequency as Frequency,
      priority: form.priority as Priority,
      emoji: form.emoji || undefined,
      notes: form.notes?.trim() || undefined,
      imageId,
    };

    if (existing) {
      updateGoal(existing.id, shared);
      router.push(`/goals/${existing.id}`);
      return;
    }

    const goal: Goal = {
      ...shared,
      id: newId(),
      createdAt: new Date().toISOString(),
      archivedAt: null,
      completedAt: null,
    };
    addGoal(goal);
    router.push(`/goals/${goal.id}`);
  }

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-3">
      <Panel title={editing ? "Edit goal" : "New goal"}>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Field label="Goal name" error={errors.name}>
              {(p) => (
                <input
                  {...p}
                  className={inputClass(Boolean(errors.name))}
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  placeholder="House Deposit"
                  maxLength={60}
                />
              )}
            </Field>
          </div>

          <Field label="Category" error={errors.category}>
            {(p) => (
              <select
                {...p}
                className={inputClass(Boolean(errors.category))}
                value={form.category}
                onChange={(e) => set("category", e.target.value as Category)}
              >
                <option value="">Choose…</option>
                {CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {CATEGORY_LABEL[c]}
                  </option>
                ))}
              </select>
            )}
          </Field>

          {form.category === "custom" && (
            <Field label="Category name" error={errors.customCategory}>
              {(p) => (
                <input
                  {...p}
                  className={inputClass(Boolean(errors.customCategory))}
                  value={form.customCategory}
                  onChange={(e) => set("customCategory", e.target.value)}
                  placeholder="Boat"
                />
              )}
            </Field>
          )}

          <Field label="Priority" error={errors.priority}>
            {(p) => (
              <select
                {...p}
                className={inputClass(Boolean(errors.priority))}
                value={form.priority}
                onChange={(e) => set("priority", e.target.value as Priority)}
              >
                {PRIORITIES.map((x) => (
                  <option key={x} value={x}>
                    {PRIORITY_LABEL[x]}
                  </option>
                ))}
              </select>
            )}
          </Field>

          <Field label="Target amount" error={errors.target}>
            {(p) => (
              <input
                {...p}
                inputMode="decimal"
                className={inputClass(Boolean(errors.target))}
                value={form.target}
                onChange={(e) => set("target", e.target.value)}
                placeholder="$50,000"
              />
            )}
          </Field>

          <Field
            label="Already saved"
            error={errors.opening}
            hint="What you've put aside before tracking started."
          >
            {(p) => (
              <input
                {...p}
                inputMode="decimal"
                className={inputClass(Boolean(errors.opening))}
                value={form.opening}
                onChange={(e) => set("opening", e.target.value)}
                placeholder="$0"
              />
            )}
          </Field>

          <Field label="Target date" error={errors.targetDate}>
            {(p) => (
              <input
                {...p}
                type="date"
                min={toISODate(new Date())}
                className={dateInputClass(Boolean(errors.targetDate))}
                value={form.targetDate}
                onChange={(e) => set("targetDate", e.target.value)}
              />
            )}
          </Field>

          <Field label="Regular contribution" error={errors.contribution}>
            {(p) => (
              <input
                {...p}
                inputMode="decimal"
                className={inputClass(Boolean(errors.contribution))}
                value={form.contribution}
                onChange={(e) => set("contribution", e.target.value)}
                placeholder="$200"
              />
            )}
          </Field>

          <Field label="How often" error={errors.frequency}>
            {(p) => (
              <select
                {...p}
                className={inputClass(Boolean(errors.frequency))}
                value={form.frequency}
                onChange={(e) => set("frequency", e.target.value as Frequency)}
              >
                {FREQUENCIES.map((f) => (
                  <option key={f} value={f}>
                    {FREQUENCY_LABEL[f]}
                  </option>
                ))}
              </select>
            )}
          </Field>

          <fieldset className="m-0 border-0 p-0 sm:col-span-2">
            <legend className="mb-1.5 flex items-baseline gap-2 text-[11px] font-medium tracking-[0.12em] text-muted">
              EMOJI
              <span className="font-normal tracking-normal lowercase opacity-70">optional</span>
            </legend>
            <div className="flex flex-wrap items-center gap-2">
              {EMOJI.map((e) => (
                <button
                  key={e}
                  type="button"
                  aria-pressed={form.emoji === e}
                  aria-label={`Use the ${e} emoji`}
                  onClick={() => set("emoji", form.emoji === e ? "" : e)}
                  className={`grid h-10 w-10 place-items-center rounded-[10px] border text-lg transition-colors ${
                    form.emoji === e
                      ? "border-secondary bg-tint-soft"
                      : "border-border bg-surface hover:bg-background"
                  }`}
                >
                  {e}
                </button>
              ))}
            </div>
            {errors.emoji && (
              <p role="alert" className="mt-1.5 text-[11.5px] font-medium text-warning">
                {errors.emoji}
              </p>
            )}
          </fieldset>

          <div className="sm:col-span-2">
            <Field label="Notes" optional error={errors.notes} hint="Why this one matters.">
              {(p) => (
                <textarea
                  {...p}
                  rows={3}
                  maxLength={500}
                  className={`${inputClass(Boolean(errors.notes))} resize-y`}
                  value={form.notes}
                  onChange={(e) => set("notes", e.target.value)}
                  placeholder="A place of our own, and a garden big enough for the good stuff."
                />
              )}
            </Field>
          </div>

          <div className="sm:col-span-2">
            <Field label="Image" optional error={imageError ?? undefined} hint="Stored on this device only.">
              {(p) => (
                <div className="flex flex-wrap items-center gap-3">
                  {imageId && (
                    <GoalImage
                      imageId={imageId}
                      alt=""
                      className="h-16 w-24 rounded-[10px] object-cover"
                    />
                  )}
                  <input
                    {...p}
                    type="file"
                    accept="image/*"
                    disabled={busy}
                    onChange={(e) => onPickImage(e.target.files?.[0])}
                    className="text-[12.5px] text-muted file:mr-3 file:rounded-full file:border-0 file:bg-primary file:px-4 file:py-2 file:text-[12.5px] file:text-on-primary"
                  />
                  {imageId && (
                    <Button type="button" variant="ghost" onClick={onRemoveImage}>
                      Remove
                    </Button>
                  )}
                </div>
              )}
            </Field>
          </div>
        </div>

        <div className="mt-5 flex flex-wrap gap-2">
          <Button type="submit" disabled={busy}>
            {editing ? "Save changes" : "Create goal"}
          </Button>
          <Button type="button" variant="secondary" onClick={() => router.back()}>
            Cancel
          </Button>
        </div>

        {submitted && !isValid(errors) && (
          <p role="status" className="mt-3 text-[12.5px] text-warning">
            Check the highlighted fields above.
          </p>
        )}
      </Panel>
    </form>
  );
}
