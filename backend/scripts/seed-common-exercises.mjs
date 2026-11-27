import mongoose from "mongoose";
import dns from "node:dns";
import { db_uri } from "../dist/src/config/config.service.js";
import { exerciseModel } from "../dist/src/database/models/exercise.model.js";
import { userModel } from "../dist/src/database/models/user.model.js";
import { roleEnum } from "../dist/src/common/enums/role.enum.js";

const exercises = [
  { name: "Barbell Squat", muscleGroup: "Legs", equipment: "Barbell and squat rack", instructions: "Brace your core, bend your knees and hips to squat, then push through your feet to stand.", videoUrl: "https://www.youtube.com/watch?v=vaMYBmJH-tw" },
  { name: "Barbell Bench Press", muscleGroup: "Chest", equipment: "Barbell and bench", instructions: "Lie on the bench, lower the bar with control toward your chest, then press it upward.", videoUrl: "https://www.youtube.com/watch?v=9SdwTIG6hJY" },
  { name: "Romanian Deadlift", muscleGroup: "Hamstrings and glutes", equipment: "Barbell", instructions: "With soft knees, hinge your hips back while keeping the bar close to your legs; stand by extending your hips.", videoUrl: "https://www.youtube.com/watch?v=3VXmecChYYM" },
  { name: "Lat Pulldown", muscleGroup: "Back", equipment: "Lat pulldown machine", instructions: "Grip the bar, pull it toward your upper chest, and return it slowly without swinging.", videoUrl: "https://www.youtube.com/watch?v=SALxEARiMkw" },
  { name: "Dumbbell Shoulder Press", muscleGroup: "Shoulders", equipment: "Dumbbells and bench", instructions: "Sit with your back supported, press the dumbbells overhead, then lower them under control.", videoUrl: "https://www.youtube.com/watch?v=tp9RRXCvnko" },
  { name: "One-Arm Dumbbell Row", muscleGroup: "Back", equipment: "Dumbbell and bench", instructions: "Brace on a bench, hinge at the hips, pull the dumbbell toward your hip, then lower it slowly.", videoUrl: "https://www.youtube.com/watch?v=gfUg6qWohTk" },
  { name: "Push-Up", muscleGroup: "Chest", equipment: "Bodyweight", instructions: "Keep your body aligned, lower your chest toward the floor, then press back up.", videoUrl: "https://www.youtube.com/watch?v=-HPPxGxJvU4" },
  { name: "Plank", muscleGroup: "Core", equipment: "Bodyweight", instructions: "Rest on your forearms and toes, brace your core, and maintain a straight line from head to heels.", videoUrl: "https://www.youtube.com/watch?v=mwlp75MS6Rg" },
  { name: "Dumbbell Biceps Curl", muscleGroup: "Biceps", equipment: "Dumbbells", instructions: "Keep your upper arms near your sides, curl the dumbbells upward, and lower them slowly.", videoUrl: "https://www.youtube.com/watch?v=sYV-ki-1blM" },
  { name: "Leg Press", muscleGroup: "Legs", equipment: "Leg press machine", instructions: "Place your feet on the platform, lower it within a comfortable range, and press it back without locking your knees.", videoUrl: "https://www.youtube.com/watch?v=cDGOn-yfKJA" },
];

dns.setServers(["1.1.1.1", "8.8.8.8"]);
try {
  await mongoose.connect(db_uri, { serverSelectionTimeoutMS: 10000 });
  const coaches = await userModel.find({ role: roleEnum.coach }).select("_id").limit(2);
  if (coaches.length !== 1) throw new Error("Expected exactly one coach account; choose the owner before seeding.");
  let added = 0;
  let videosUpdated = 0;
  for (const exercise of exercises) {
    const escaped = exercise.name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const now = new Date();
    const result = await exerciseModel.updateOne(
      { name: { $regex: `^${escaped}$`, $options: "i" } },
      { $setOnInsert: { ...exercise, createdBy: coaches[0]._id, createdAt: now, updatedAt: now } },
      { upsert: true, runValidators: true, timestamps: false },
    );
    added += result.upsertedCount;
    if (!result.upsertedCount) {
      const fixed = await exerciseModel.updateOne(
        { name: { $regex: `^${escaped}$`, $options: "i" }, videoUrl: /^https?:\/\/example\.com\//i },
        { $set: { videoUrl: exercise.videoUrl } },
        { runValidators: true },
      );
      videosUpdated += fixed.modifiedCount;
    }
  }
  console.log(JSON.stringify({ added, alreadyPresent: exercises.length - added, videosUpdated }));
} catch (error) {
  console.error("Exercise seed failed:", error instanceof Error ? error.message : "Unknown error");
  process.exitCode = 1;
} finally {
  await mongoose.disconnect();
}
