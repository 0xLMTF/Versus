import { Router } from "express";

const router = Router();

const users = [
  {
    id: "1",
    name: "Alex",
    tag: "@alex_god",
    password: "versus123",
    role: "SUPERADMIN",
    elo: 2150,
    wins: 42,
    losses: 24,
    streak: 5,
    theme_color: "#00F2FE",
    avatar_url: null,
  },
  {
    id: "2",
    name: "Clément",
    tag: "@clement_boss",
    password: "versus123",
    role: "USER",
    elo: 2090,
    wins: 38,
    losses: 20,
    streak: 3,
    theme_color: "#ff00ff",
    avatar_url: null,
  },
  {
  id: "3",
  name: "Hugo",
  tag: "@hugo_fast",
  password: "versus123",
  role: "USER",
  elo: 1850,
  wins: 30,
  losses: 25,
  streak: 2,
  theme_color: "#ff00ff",
  avatar_url: null,
 },
];

router.post("/auth/login", (req, res) => {
  const { tag, password } = req.body;

  const user = users.find(
    (u) => u.tag === tag && u.password === password,
  );

  if (!user) {
    return res.status(401).json({
      error: "Identifiants invalides",
    });
  }

  return res.json({
    token: "demo-token",
    refreshToken: "demo-refresh-token",
    user,
  });
});

router.post("/auth/register", (req, res) => {
  const { name, tag, password } = req.body;

  const user = {
    id: crypto.randomUUID(),
    name,
    tag,
    password,
    role: "USER",
    elo: 1000,
    wins: 0,
    losses: 0,
    streak: 0,
    theme_color: "#00F2FE",
    avatar_url: null,
  };

  users.push(user);

  res.json({
    token: "demo-token",
    refreshToken: "demo-refresh-token",
    user,
  });
});

router.post("/auth/logout", (_req, res) => {
  res.json({
    success: true,
  });
});

export default router;