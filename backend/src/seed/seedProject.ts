type GenerateProjectsOptions = {
  count?: number;
  userIds: string[];
};

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

const pickOne = <T,>(values: T[]) => values[Math.floor(Math.random() * values.length)]!;
const pickMany = <T,>(values: T[], count: number) => {
  const shuffled = [...values].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, count);
};
const randomDate = () => new Date(Date.now() - Math.floor(Math.random() * 1000 * 60 * 60 * 24 * 30));
const randomParagraph = () => `${pickOne(projectDescs)} ${pickOne(projectDescs)}`;
const randomSentence = () => pickOne(sentences);
const randomTitle = () => `${pickOne(companyAdjectives)} ${pickOne(companyNouns)}`;
const randomSlug = () => Math.random().toString(36).slice(2, 10);

const generateReply = (userIds: string[]) => ({
  user: pickOne(userIds),
  text: randomSentence(),
  createdAt: randomDate(),
});

const generateComment = (userIds: string[]) => ({
  user: pickOne(userIds),
  text: randomParagraph(),
  createdAt: randomDate(),
  replies: Array.from({ length: Math.floor(Math.random() * 4) }, () => generateReply(userIds)),
});

export const generateProjects = ({ count = 400, userIds }: GenerateProjectsOptions) => {
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