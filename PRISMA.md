# Prisma Commands Cheat Sheet

## ✅ Initial Setup

Install Prisma and initialize configuration:

```bash
npm install prisma @prisma/client
npx prisma init
```

---

## ✅ Update Your `.env` for SQLite

Example:

```ini
DATABASE_URL="file:./dev.db"
```

Or if you prefer to store `.db` inside `/prisma`:

```ini
DATABASE_URL="file:./prisma/dev.db"
```

---

## ✅ Create Your First Migration

This generates your SQLite `.db` file and applies your schema:

```bash
npx prisma migrate dev --name init
```

---

## ✅ Apply Schema Changes (Future Migrations)

Whenever you update your `schema.prisma`:

```bash
npx prisma migrate dev --name your_migration_name
```

---

## ✅ Generate Prisma Client (When Needed)

You can manually regenerate Prisma Client:

```bash
npx prisma generate
```

This is auto-run with `migrate dev`, but good to know.

---

## ✅ Open Prisma Studio (Visual DB Browser)

```bash
npx prisma studio
```

Access your tables via a web GUI for easy data viewing.

---

## ✅ Other Useful Commands

- Reset Database (drops and recreates your dev DB):

```bash
npx prisma migrate reset
```

- Pull existing DB structure into `schema.prisma` (for reverse-engineering):

```bash
npx prisma db pull
```

---

# ✅ SQL to Prisma Schema Equivalents

| SQL Data Type               | Prisma Type Example                             |
|-----------------------------|-------------------------------------------------|
| `INTEGER PRIMARY KEY`       | `id Int @id @default(autoincrement())`         |
| `TEXT`                      | `String`                                       |
| `VARCHAR(255)`              | `String`                                       |
| `BOOLEAN`                   | `Boolean`                                      |
| `DATE`                      | `DateTime`                                     |
| `DATETIME`                  | `DateTime`                                     |
| `REAL` or `DOUBLE`          | `Float`                                        |
| `DECIMAL(10,2)`             | `Decimal` (requires `@db.Decimal(10,2)` for precision) |
| `UNIQUE` Constraint         | `@unique`                                      |
| Foreign Key Relationship    | `@relation` with related model                 |

---

## ✅ Example SQL → Prisma

**SQL Table:**

```sql
CREATE TABLE users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL
);
```

**Prisma Model:**

```prisma
model User {
  id    Int    @id @default(autoincrement())
  name  String
  email String @unique
}
```

**SQL Relationship Example:**

```sql
CREATE TABLE posts (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  title TEXT NOT NULL,
  user_id INTEGER,
  FOREIGN KEY (user_id) REFERENCES users(id)
);
```

**Prisma Relationship:**

```prisma
model Post {
  id     Int    @id @default(autoincrement())
  title  String
  userId Int?
  user   User?  @relation(fields: [userId], references: [id])
}
```

---

# ✅ Best Practices for Writing Prisma Schemas

✅ Use `@id` and `@default(autoincrement())` for primary keys  
✅ Always mark unique fields with `@unique` (e.g., email)  
✅ Use `?` for optional fields (nullable columns)  
✅ Name models singular (`User`, not `Users`)  
✅ Keep relationships explicit using `@relation`  
✅ Use clear migration names (`add-user-profile`, `add-isActive-flag`)  
✅ Avoid complex types inside SQLite (good for dev, not prod)  
✅ Prefer PostgreSQL or MySQL for production projects  
✅ Use Prisma Studio to visualize your DB during dev  
✅ Keep `.env` files private, never commit sensitive data  

---

# ⚠️ Notes

- Prisma Client auto-updates on `migrate dev`  
- Use SQLite for development only; MySQL/PostgreSQL recommended for production  
- Keep `.env` credentials secure  
- Migrations act like version control for your DB — avoid deleting them in production  
