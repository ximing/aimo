# 🚀 AIMO - AI-Powered Smart Note System

[![CI](https://github.com/ximing/aimo/actions/workflows/ci.yml/badge.svg?branch=master)](https://github.com/ximing/aimo/actions/workflows/ci.yml)
[![Docker Build and Publish](https://github.com/ximing/aimo/actions/workflows/docker-publish.yml/badge.svg?branch=master)](https://github.com/ximing/aimo/actions/workflows/docker-publish.yml)
![Node.js](https://img.shields.io/badge/Node.js-20+-green)
![React](https://img.shields.io/badge/React-19-blue)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7+-blue)
![Docker](https://img.shields.io/badge/Docker-Ready-blue)
![License](https://img.shields.io/badge/License-BSL%201.1-blue)

English | [简体中文](./README.md)

A modern AI-powered note-taking and knowledge management tool that combines semantic search, intelligent associations, and multi-platform support to help you build your own knowledge graph.

![AIMO Screenshot](./apps/web/src/assets/landing/00.png)

## ✨ Core Features

### 🤖 AI Capabilities

- **Smart Summarization** - AI automatically generates note summaries, extracting key information quickly
- **Semantic Search** - Vector-based search powered by OpenAI Embedding, understanding meaning rather than keyword matching
- **Intelligent Associations** - Automatically discovers relationships between notes, building a visual knowledge graph
- **Daily Recommendations** - Smart recommendations of "On This Day" notes to rediscover past inspirations

### 📝 Note Management

- **Color Tags** - 10+ color labels for intuitive note categorization
- **Category Management** - Multi-level category system for flexible knowledge organization
- **Version History** - Track note modifications, revert anytime
- **Relation Graph** - Visualize references and relationships between notes

### 🔍 Discovery & Search

- **Full-text Search** - Quickly search note titles and content
- **Tag Filtering** - Filter notes by tags
- **Calendar Heatmap** - Visualize note activity, click dates to filter
- **Smart Sorting** - Sort by time, relevance, and more

### 💻 Multi-Platform Support

- **Web App** - Responsive design for desktop and mobile browsers
- **Desktop Client** - Electron app for macOS, Windows, and Linux
- **Mobile App** - Android APK support, iOS pending release
- **Browser Extension** - Quick web content saving (in development)

### 🎨 Personalization

- **Dark/Light Theme** - One-click switching, easy on the eyes
- **PWA Support** - Install as desktop app, works offline
- **Keyboard Shortcuts** - Ctrl+K quick search for efficient operation

## 📸 Screenshots

|                Smart Note Editor                |                 Semantic Search                 |                Knowledge Graph                 |
| :---------------------------------------------: | :---------------------------------------------: | :--------------------------------------------: |
| ![Editor](./apps/web/src/assets/landing/00.png) | ![Search](./apps/web/src/assets/landing/01.png) | ![Graph](./apps/web/src/assets/landing/02.png) |

|                 Multimedia Support                  |                     AI Explore                      |                Theme Switching                 |
| :-------------------------------------------------: | :-------------------------------------------------: | :--------------------------------------------: |
| ![Multimedia](./apps/web/src/assets/landing/03.png) | ![AI Explore](./apps/web/src/assets/landing/04.png) | ![Theme](./apps/web/src/assets/landing/05.png) |

## 🚀 Quick Start

### Requirements

- **Node.js** >= 20.0
- **pnpm** >= 10.0
- **OpenAI API Key** - For AI features

### Local Development

```bash
# 1. Clone the project
git clone https://github.com/ximing/aimo.git
cd aimo

# 2. Install dependencies
pnpm install

# 3. Configure environment variables
cp .env.example .env
# Edit .env, fill in JWT_SECRET and OPENAI_API_KEY

# 4. Start development server
pnpm dev

# The app will start at http://localhost:3000
```

### Common Commands

```bash
pnpm dev:web       # Start frontend only
pnpm dev:server    # Start backend only
pnpm dev:client    # Start Electron desktop client
pnpm build         # Build all apps
pnpm lint          # Code linting
pnpm format        # Code formatting
```

## 🐳 Docker Deployment

### Using Pre-built Image

```bash
docker pull ghcr.io/ximing/aimo:stable

docker run -d \
  -p 3000:3000 \
  --name aimo \
  --env-file .env \
  -v $(pwd)/data:/app/data \
  ghcr.io/ximing/aimo:stable
```

## 📥 Download Clients

| Platform |                         Download Link                          | System Requirements |
| :------: | :------------------------------------------------------------: | :-----------------: |
|  macOS   |   [Download](https://github.com/ximing/aimo/releases/latest)   |      macOS 12+      |
| Windows  |   [Download](https://github.com/ximing/aimo/releases/latest)   |     Windows 10+     |
|  Linux   |   [Download](https://github.com/ximing/aimo/releases/latest)   |    Ubuntu 20.04+    |
| Android  | [Download](https://github.com/ximing/aimo-app/releases/latest) |    Android 8.0+     |
|   iOS    |                        Pending release                         |          -          |

## ⚙️ Environment Variables

### Required Configuration

```env
# JWT Secret (at least 32 characters)
JWT_SECRET=your-super-secret-key

# OpenAI API Key
OPENAI_API_KEY=sk-xxx...
```

### Database Configuration

```env
# LanceDB storage type: local or s3
LANCEDB_STORAGE_TYPE=local
LANCEDB_PATH=./lancedb_data
```

### Attachment Storage

```env
# Storage type: local or s3
ATTACHMENT_STORAGE_TYPE=local
ATTACHMENT_LOCAL_PATH=./attachments
ATTACHMENT_MAX_FILE_SIZE=52428800  # 50MB
```

For more configuration options, see [.env.example](./.env.example)

## 📁 Project Structure

```
aimo/
├── apps/
│   ├── web/              # React frontend app
│   ├── server/           # Express backend service
│   ├── client/           # Electron desktop client
│   └── extension/        # Browser extension
├── packages/
│   └── dto/              # Shared type definitions
├── docker-compose.yml    # Docker deployment config
└── package.json          # Root configuration
```

## 🤝 Contributing

1. Fork this repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Create a Pull Request

## 📄 License

This project is licensed under the [Business Source License 1.1 (BSL 1.1)](./LICENSE).

- ✅ **Allowed**: Personal use, non-commercial use, internal enterprise use
- ❌ **Prohibited**: Commercial services, commercial product integration
- 💼 **Commercial License**: Contact us for commercial licensing

## 📞 Contact Us

- 📧 Email: morningxm@hotmail.com
- 🐛 Issues: [GitHub Issues](https://github.com/ximing/aimo/issues)
- 💬 Discussions: [GitHub Discussions](https://github.com/ximing/aimo/discussions)

---

<p align="center">
  Made with ❤️ by <a href="https://github.com/ximing">ximing</a>
</p>
