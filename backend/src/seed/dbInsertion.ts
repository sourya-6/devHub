import dotenv from "dotenv";
import bcrypt from "bcryptjs";
import { randomUUID } from "node:crypto";
import { connectDB } from "../db/index.js";
import { User } from "../models/user.model.js";
import { Project } from "../models/project.model.js";
import { generateProjects } from "./seedProject.js";

dotenv.config();

const USER_COUNT = 50;
const PROJECT_COUNT = 400;

const firstNames = ["Aarav", "Isha", "Rohan", "Nora", "Maya", "Arjun", "Kabir", "Zoya"];
const lastNames = ["Sharma", "Patel", "Reddy", "Khan", "Verma", "Iyer", "Mehta", "Nair"];

const pickOne = <T,>(values: T[]) => values[Math.floor(Math.random() * values.length)]!;
const buildName = () => `${pickOne(firstNames)} ${pickOne(lastNames)}`;
const slugify = (value: string) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.|\.$/g, "");

const buildUsers = async () => {
  const password = await bcrypt.hash("password123", 10);

  return Array.from({ length: USER_COUNT }, (_, index) => {
    const name = buildName();
    const unique = `${slugify(name)}.${index + 1}`;

    return {
      name,
      username: unique,
      email: `${unique}@example.com`,
      password,
      avatar: `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(name + randomUUID())}`,
    };
  });
};

const seedDatabase = async () => {
  await connectDB();

  await Promise.all([User.deleteMany({}), Project.deleteMany({})]);

  const createdUsers = await User.insertMany(await buildUsers());
  const userIds = createdUsers.map((user) => user._id.toString());

  const projects = generateProjects({ count: PROJECT_COUNT, userIds });
  await Project.insertMany(projects);

  console.log(`Seeded ${createdUsers.length} users and ${projects.length} projects`);
  process.exit(0);
};

seedDatabase().catch((error) => {
  console.error("Seeding failed:", error);
  process.exit(1);
});