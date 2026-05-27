const { PrismaClient } = require('@prisma/client');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const { randomUUID } = require('crypto');

dotenv.config();

const prisma = new PrismaClient();

const USER_COUNT = 50;
const PROJECT_COUNT = 400;

const firstNames = ["Aarav", "Isha", "Rohan", "Nora", "Maya", "Arjun", "Kabir", "Zoya"];
const lastNames = ["Sharma", "Patel", "Reddy", "Khan", "Verma", "Iyer", "Mehta", "Nair"];

const tagsPool = [
  "Angular",
  "React",
  "Node.js",
  "MongoDB",
  "Express",
  "Docker",
  "TypeScript",
  "PostgreSQL",
  "Redis",
  "Kubernetes",
];

const companyAdjectives = ["Smart", "Dynamic", "Modern", "Agile", "Scalable", "Unified"];
const companyNouns = ["Platform", "Workflow", "Studio", "System", "Suite", "Hub"];
const projectDescs = [
  "A clean dashboard for teams to track progress and collaborate in one place.",
  "A lightweight application for managing tasks, feedback, and delivery milestones.",
  "A production-ready service for handling project visibility and team coordination.",
  "A responsive interface built for fast iteration and smooth user workflows.",
];
const sentences = [
  "Built to improve team visibility and reduce manual coordination.",
  "Designed for fast iteration and a simple user experience.",
  "Helps teams keep work organized across multiple projects.",
  "Focuses on clarity, speed, and reliable collaboration.",
];

const pickOne = (values) => values[Math.floor(Math.random() * values.length)];
const pickMany = (values, count) => {
  const shuffled = [...values].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
};
const randomDate = () => new Date(Date.now() - Math.floor(Math.random() * 1000 * 60 * 60 * 24 * 30));
const randomParagraph = () => `${pickOne(projectDescs)} ${pickOne(projectDescs)}`;
const randomSentence = () => pickOne(sentences);
const randomTitle = () => `${pickOne(companyAdjectives)} ${pickOne(companyNouns)}`;
const randomSlug = () => Math.random().toString(36).slice(2, 10);

const generateReply = (userIds) => ({
  user: pickOne(userIds),
  text: randomSentence(),
  createdAt: randomDate(),
});

const generateComment = (userIds) => ({
  user: pickOne(userIds),
  text: randomParagraph(),
  createdAt: randomDate(),
  replies: Array.from({ length: Math.floor(Math.random() * 4) }, () => generateReply(userIds)),
});

const generateProjects = ({ count = 400, userIds }) => {
  return Array.from({ length: count }, () => ({
    title: randomTitle(),
    description: `${randomParagraph()} ${randomParagraph()}`,
    image: `https://picsum.photos/seed/${randomSlug()}/800/600`,
    liveLink: `https://example.com/${randomSlug()}`,
    gitHubLink: `https://github.com/devhub/${randomSlug()}`,
    tags: pickMany(tagsPool, 2 + Math.floor(Math.random() * 4)),
    owner: pickOne(userIds),
    likes: Array.from({ length: Math.floor(Math.random() * 100) }, () => pickOne(userIds)),
    comments: Array.from({ length: Math.floor(Math.random() * 10) }, () => generateComment(userIds)),
  }));
};

async function seed() {
  try {
    const isReset = process.argv.includes('--reset');
    console.log(`Starting Prisma seed... mode=${isReset ? 'reset' : 'append'}`);

    if (isReset) {
      // Full reset mode: delete all seeded domain tables.
      await prisma.projectReply.deleteMany();
      await prisma.projectComment.deleteMany();
      await prisma.projectLike.deleteMany();
      await prisma.project.deleteMany();
      await prisma.notification.deleteMany();
      await prisma.user.deleteMany();
    }

    // Preserve existing users by default and only create additional users when needed.
    const existingUsers = await prisma.user.findMany({
      select: { id: true, name: true, username: true, email: true, password: true, avatar: true },
    });

    const users = [...existingUsers];
    const passwordHash = await bcrypt.hash('password123', 10);
    const usersToCreate = Math.max(0, USER_COUNT - users.length);
    for (let i = 0; i < usersToCreate; i++) {
      const name = `${pickOne(firstNames)} ${pickOne(lastNames)}`;
      const unique = `${name.toLowerCase().replace(/[^a-z0-9]+/g, '.')}.${Date.now()}.${i + 1}`;
      const username = unique;
      const email = `${unique}@example.com`;
      const avatar = `https://api.dicebear.com/9.x/initials/svg?seed=${encodeURIComponent(name + randomUUID())}`;

      const user = await prisma.user.create({ data: { name, username, email, password: passwordHash, avatar } });
      users.push(user);
    }

    const userIds = users.map((u) => u.id);

    // Generate projects
    const projects = generateProjects({ count: PROJECT_COUNT, userIds });

    let createdCount = 0;
    for (const p of projects) {
      const created = await prisma.project.create({
        data: {
          title: p.title,
          description: p.description,
          image: p.image,
          liveLink: p.liveLink,
          gitHubLink: p.gitHubLink,
          tags: p.tags,
          ownerId: p.owner,
          likeCount: p.likes.length,
        },
      });

      // Create likes
      if (p.likes && p.likes.length) {
        const likesData = p.likes.map((uid) => ({ userId: uid, projectId: created.id }));
        // createMany ignores duplicates, but ensure data is valid
        try {
          await prisma.projectLike.createMany({ data: likesData, skipDuplicates: true });
        } catch (e) {
          // fallback to individual creates if createMany not supported
          for (const ld of likesData) {
            try { await prisma.projectLike.create({ data: ld }); } catch (_) {}
          }
        }
      }

      // Create comments and replies
      if (p.comments && p.comments.length) {
        for (const c of p.comments) {
          const createdComment = await prisma.projectComment.create({
            data: {
              projectId: created.id,
              userId: c.user,
              text: c.text,
              createdAt: c.createdAt,
            },
          });

          if (c.replies && c.replies.length) {
            for (const r of c.replies) {
              await prisma.projectReply.create({
                data: {
                  commentId: createdComment.id,
                  userId: r.user,
                  text: r.text,
                  createdAt: r.createdAt,
                },
              });
            }
          }
        }
      }

      createdCount++;
      if (createdCount % 50 === 0) console.log(`Created ${createdCount}/${projects.length} projects`);
    }

    console.log(`Users available: ${users.length} (${existingUsers.length} existing, ${usersToCreate} created)`);
    console.log(`Created ${createdCount} new projects`);
  } catch (error) {
    console.error('Seeding failed:', error);
    process.exitCode = 1;
  } finally {
    await prisma.$disconnect();
  }
}

seed();
