# Verdict V2

[![Vercel Deploy](https://vercel.com/button)](https://verdict-o97i8pw01-amitrajput111s-projects.vercel.app)

**Verdict** is a modern, production‑grade social‑debate platform that lets users watch content, pick a side, react, comment, earn streaks, and shape a role‑based identity.

---

## ✨ Features
- **Content Feed** – Stream videos and articles.
- **Side Picking** – Choose a stance and see community sentiment.
- **Real‑time Interaction** – Reactions & comments powered by Socket.io.
- **Streaks & Badges** – Gamified engagement.
- **Role Identity** – Users build a profile based on their activity.

---

## 🛠️ Tech Stack
| Layer | Technology |
|-------|------------|
| **Frontend** | Expo (React Native), React Navigation, Zustand, `socket.io-client` |
| **Backend** | Express.js, Socket.io, in‑memory mock DB (compatible with Postgres/Redis) |
| **Deployment** | Vercel – static Expo web build + Serverless Functions for the API |
| **CI/CD** | GitHub Actions workflow (`.github/workflows/deploy.yml`) |

---

## 🚀 Getting Started (Local Development)
```bash
# Clone the repository (already done)
npm install               # Install all dependencies
npm run start             # Start Expo dev server (web: http://localhost:8082)
```
The app will launch in your browser. For native development, follow the standard Expo instructions.

---

## 📦 Production Build & Deploy
The repository ships with a `vercel.json` configuration and a GitHub Actions workflow that automatically builds and deploys on every push to `main`.

### Manual Deploy (CLI)
```bash
npx vercel --prod --yes --token <YOUR_VERCEL_TOKEN>
```
This command builds the Expo web bundle (`mobile/dist/`) and deploys both the static assets and the serverless API.

### Live Demo
[Visit the live Vercel deployment](https://verdict-3ipgycf46-amitrajput111s-projects.vercel.app)

---

## 📚 Documentation
- **Project Overview** – `verdict_v2_product_documentation.md` (in the repo).
- **API Reference** – See `backend/src/index.js` for the Express routes.
- **Design Mockups** – Available in the `assets/` folder.

---

## 🤝 Contributing
Contributions are welcome! Please fork the repo, create a feature branch, and submit a pull request. Follow the existing linting and formatting conventions.

---

## 📜 License
This project is licensed under the MIT License.

---

*README authored by an experienced software engineer with 20+ years of professional development and production‑grade deployment expertise.*
