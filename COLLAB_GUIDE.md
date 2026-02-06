# 🛠️ Git Collaboration Guide for This Project

## 📌 Branching Rules

We use developer-based branching to avoid conflicts and keep our repository organized.

✅ Main Branches:
- main → Production-stable code only (DO NOT TOUCH)
- dev → Shared development branch (latest working version)
- dev-ayumi, dev-marc, dev-mc, dev-cj → Personal branches for each developer

---

# 🔥 Step-by-Step Collaboration Process

### 1️⃣ Initial Setup (First Time Only)

Clone the repository:
```bash
git clone https://github.com/Boto-Mo-To-Capstone-Project/BotoMoTo.git
cd BotoMoTo
``` 

Check existing branches:
```bash
git branch -r
```

Switch to `dev` branch:
```bash
git checkout dev
git pull origin dev
```

Install project dependencies:
```bash
npm install
```

Run the project locally:
```bash
npm run dev
```

---

### 2️⃣ Start of Every Task

Before working, always pull the latest code from `dev`:
```bash
git checkout dev
git pull origin dev
```

Install latest dependencies (if package updates happened):
```bash
npm install
```

Run the project:
```bash
npm run dev
```

---

### 3️⃣ Create or Switch to Your Personal Branch

If your branch doesn’t exist yet on the remote repository, create it:
```bash
git checkout -b dev-<your-name>
git push origin dev-<your-name>
```

If your branch already exists, switch to it:
```bash
git checkout dev-<your-name>
git pull origin dev-<your-name>
```

**Example for Ayumi:**
```bash
# we push the branch to remote only once
git checkout -b dev-ayumi
git push origin dev-ayumi
```
OR
```bash
git checkout dev-ayumi
git pull origin dev-ayumi
```

---

### 4️⃣ Work on Your Code

Make your changes, then check modified files:
```bash
git status
```

Add files to commit:
```bash
git add .
```

Make a clear, descriptive commit:
```bash
git commit -m "added login form component"
```

---

### 5️⃣ Push Your Work to Your Personal Branch
```bash
git push origin dev-<your-name>
```

**Example:**
```bash
git push origin dev-ayumi
```

---

### 6️⃣ Create a Pull Request (PR) to `dev`

- Go to GitHub
- Open a Pull Request from your branch `dev-<your-name>` → `dev`
- Add a short description of your changes
- Wait for team review
- After approval, merge to `dev`

---

# 🛠️ Commands Quick Reference

**Pull latest dev code:**
```bash
git checkout dev  
git pull origin dev  
npm install  
npm run dev  
```

**Create personal branch:**
```bash
git checkout -b dev-<your-name>  
git pull origin dev-<your-name>  
```

**Switch to personal branch:**
```bash
git checkout dev-<your-name>  
git pull origin dev-<your-name>  
```

**Add and commit changes:**
```bash
git add .  
git commit -m "short but clear description"  
```

**Push changes to remote:**
```bash
git push origin dev-<your-name>  
```

---

# ⚠️ Important Reminders

✅ Never commit directly to `main`  
✅ Always pull latest `dev` before working  
✅ Keep commit messages short but clear  
✅ Use only your assigned `dev-<your-name>` branch  
✅ Regularly push your progress to avoid conflicts  

---

# 💡 Example Commit Messages

- "added homepage layout"  
- "fixed button style on dashboard"  
- "improved form validation on login"  
- "updated navigation menu"  

---

# 🚀 Need Help?

If you're unsure about Git commands or stuck with conflicts, ask the team before pushing. Collaboration works best when everyone follows the same workflow.

Happy coding!
