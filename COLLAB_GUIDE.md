# 🛠️ Git Collaboration Guide for This Project

## 📌 Branching Rules

We use developer-based branching to avoid conflicts and keep our repository organized.

✅ Main Branches:
- main → Production/stable code only (DO NOT TOUCH)
- dev → Shared development branch (latest working version)
- dev/ayumi, dev/marc, dev/mc, dev/cj → Personal branches for each developer

---

# 🔥 Step-by-Step Collaboration Process

### 1️⃣ Initial Setup (First Time Only)

Clone the repository:
```bash
git clone url-to-repo.git
cd repo-name
``` 

Check existing branches:
```bash
# this will show you all remote branches that are already connected to your local repository
git branch -r
```

---

### 2️⃣ Start of Every Task

Before working, always pull the latest code from `dev`:
```bash
git checkout dev
git pull origin dev
```

---

### 3️⃣ Create or Switch to Your Personal Branch

If your branch doesn’t exist yet, create it:
```bash
git checkout -b dev/<your-name>
git pull origin dev/<your-name>
```
If your branch already exists, switch to it:
```bash
git checkout dev/<your-name>
git pull origin dev/<your-name>
```
**Example for Ayumi:**
```bash
# this creates a new branch if it doesn't exist and switches to it
git checkout -b dev/ayumi
git pull origin dev/ayumi
```
OR
```bash
# this switches to an existing branch and pulls latest changes
git checkout dev/ayumi
git pull origin dev/ayumi
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
git push origin dev/<your-name>
```
**Example:**
```bash
git push origin dev/ayumi
```

---

### 6️⃣ Create a Pull Request (PR) to `dev`

- Go to GitHub
- Open a Pull Request from your branch `dev/<your-name>` → `dev`
- Add a short description of your changes
- Wait for team review
- After approval, merge to `dev`

---

# 🛠️ Commands Quick Reference

**Pull latest dev code:**
```bash
git checkout dev  
git pull origin dev  
```
**Create personal branch:**
```bash
git checkout -b dev/<your-name>  
git pull origin dev/<your-name>  
```
**Switch to personal branch:**
```bash
git checkout dev/<your-name>  
git pull origin dev/<your-name>  
```
**Add and commit changes:**
```bash
git add .  
git commit -m "short but clear description"  
```
**Push changes to remote:**
```bash
git push origin dev/<your-name>  
```

---

# ⚠️ Important Reminders

✅ Never commit directly to `main`  
✅ Always pull latest `dev` before working  
✅ Keep commit messages short but clear  
✅ Use only your assigned `dev/<your-name>` branch  
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
