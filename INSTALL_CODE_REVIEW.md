# Code Review Agent - Installation Guide

This guide will help you install and configure the automated code review agent for the personal-automation-dashboard project.

## Step 1: Install ESLint Dependencies

### Backend
```bash
cd backend
npm install --save-dev \
  eslint \
  @typescript-eslint/parser \
  @typescript-eslint/eslint-plugin
```

### Frontend
```bash
cd frontend
npm install --save-dev \
  eslint \
  @typescript-eslint/parser \
  @typescript-eslint/eslint-plugin \
  eslint-plugin-react \
  eslint-plugin-react-hooks
```

## Step 2: Update package.json Scripts

### Backend - Add to package.json scripts:
```json
{
  "scripts": {
    "dev": "node --watch src/server.js",
    "start": "node src/server.js",
    "migrate": "node src/database/migrate.js",
    "lint": "eslint . --ext .js,.ts",
    "lint:fix": "eslint . --ext .js,.ts --fix",
    "type-check": "tsc --noEmit"
  }
}
```

### Frontend - Already has type-check, add lint:
```json
{
  "scripts": {
    "dev": "vite",
    "build": "tsc && vite build",
    "preview": "vite preview",
    "type-check": "tsc --noEmit",
    "lint": "eslint . --ext .ts,.tsx",
    "lint:fix": "eslint . --ext .ts,.tsx --fix"
  }
}
```

## Step 3: Test Locally

### Backend
```bash
cd backend
npm run lint
npm run type-check
```

### Frontend
```bash
cd frontend
npm run lint
npm run type-check
```

## Step 4: Configure GitHub Secrets (Optional - for AI Review)

1. Go to your GitHub repository
2. Navigate to: Settings → Secrets and variables → Actions
3. Click "New repository secret"
4. Add: `OPENAI_API_KEY` with your OpenAI API key

## Step 5: Push to GitHub

```bash
git add .github/workflows/code-review.yml
git add backend/.eslintrc.json
git add frontend/.eslintrc.json
git add CODE_REVIEW_SETUP.md
git add INSTALL_CODE_REVIEW.md
git commit -m "Add automated code review workflow with ESLint and AI agent"
git push
```

## Step 6: Create a Test Pull Request

1. Create a new branch: `git checkout -b test-code-review`
2. Make a small change to any file
3. Commit and push: `git push origin test-code-review`
4. Create a PR on GitHub
5. Watch the code review agent in action!

## What You'll See

Once the workflow runs, you'll see:

1. **✅ Checks in PR** - ESLint, TypeScript, Security scans
2. **💬 Inline Comments** - Code suggestions from reviewdog
3. **🤖 AI Review** - Intelligent feedback from GPT-4 (if configured)
4. **🔒 Security Alerts** - Vulnerability scan results
5. **📊 Summary** - Overall code quality report

## Quick Commands Reference

```bash
# Run all checks locally (backend)
cd backend
npm run lint && npm run type-check

# Run all checks locally (frontend)
cd frontend
npm run lint && npm run type-check

# Auto-fix ESLint issues
npm run lint:fix

# Check specific file
npx eslint src/path/to/file.ts
```

## Troubleshooting

### "eslint: command not found"
Run: `npm install` in backend and frontend directories

### "Module not found: @typescript-eslint/parser"
Run the installation commands from Step 1 above

### ESLint errors on existing code
This is normal for a new setup. Fix them gradually or use:
```bash
npm run lint:fix
```

### Workflow not running
1. Check `.github/workflows/code-review.yml` exists
2. Verify you pushed to GitHub
3. Check Actions tab is enabled in repository settings

## Next Steps

1. ✅ Install dependencies (Step 1)
2. ✅ Update package.json (Step 2)
3. ✅ Test locally (Step 3)
4. ⚠️ Optionally add OpenAI key (Step 4)
5. ✅ Push to GitHub (Step 5)
6. ✅ Test with a PR (Step 6)

## Cost Estimate

- **GitHub Actions**: Free for public repos, 2000 min/month for private
- **AI Reviews**: $0.01-$0.10 per PR (only if OPENAI_API_KEY is set)
- **Other Tools**: All free and open source

---

**Ready to go!** Once installed, every PR will automatically get reviewed by the code review agent. 🚀
