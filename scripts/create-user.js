// Usage: node scripts/create-user.js <username> <password> [admin|manager]
const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");

const [username, password, role = "admin"] = process.argv.slice(2);
if (!username || !password) {
  console.error("Usage: node scripts/create-user.js <username> <password> [admin|manager]");
  process.exit(1);
}

const prisma = new PrismaClient();
prisma.user
  .upsert({
    where: { username },
    create: { username, name: username, passwordHash: bcrypt.hashSync(password, 10), role },
    update: { passwordHash: bcrypt.hashSync(password, 10) },
  })
  .then((u) => {
    console.log(`User "${u.username}" (${u.role}) is ready — password set.`);
    return prisma.$disconnect();
  })
  .catch((e) => {
    console.error(e.message);
    process.exit(1);
  });
