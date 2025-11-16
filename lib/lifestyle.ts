import { supabaseAdmin } from "./supabaseAdmin";
import { z } from "zod";
import { LifestylePayload, SleepItem, WorkoutItem } from "./schemas";

type LifestylePayloadType = z.infer<typeof LifestylePayload>;

/**
 * Upsert lifestyle data (sleep and workouts) into respective tables.
 */
export async function upsertLifestyle(userId: string, payload: LifestylePayloadType): Promise<void> {
  const sb = supabaseAdmin;

  // Upsert sleep data
  if (payload.sleep && payload.sleep.length > 0) {
    const sleepRows = payload.sleep.map((sleep) => ({
      user_id: userId,
      date: sleep.date,
      duration_min: sleep.duration_min,
      bedtime: sleep.bedtime ?? null,
      waketime: sleep.waketime ?? null,
    }));

    const { error: sleepError } = await sb
      .from("lifestyle_sleep")
      .upsert(sleepRows, { onConflict: "user_id,date" });

    if (sleepError) {
      throw new Error(`Failed to upsert sleep data: ${sleepError.message}`);
    }
  }

  // Upsert workout data
  if (payload.workouts && payload.workouts.length > 0) {
    const workoutRows = payload.workouts.map((workout) => ({
      user_id: userId,
      start: workout.start,
      type: workout.type,
      minutes: workout.minutes,
      rpe: workout.rpe ?? null,
    }));

    const { error: workoutError } = await sb
      .from("lifestyle_workouts")
      .upsert(workoutRows, { onConflict: "user_id,start" });

    if (workoutError) {
      throw new Error(`Failed to upsert workout data: ${workoutError.message}`);
    }
  }
}

