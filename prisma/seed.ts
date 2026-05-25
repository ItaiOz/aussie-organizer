import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { subDays, startOfDay } from "date-fns";

const prisma = new PrismaClient();

async function main() {
  console.log("Seeding...");

  await prisma.purchaseOrderItem.deleteMany();
  await prisma.purchaseOrder.deleteMany();
  await prisma.stockMovement.deleteMany();
  await prisma.stockLevel.deleteMany();
  await prisma.product.deleteMany();
  await prisma.supplier.deleteMany();
  await prisma.weeklyPayroll.deleteMany();
  await prisma.employeeSale.deleteMany();
  await prisma.dailySale.deleteMany();
  await prisma.apartmentAssignment.deleteMany();
  await prisma.apartment.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.shoppingCenter.deleteMany();
  await prisma.user.deleteMany();

  const hash = (p: string) => bcrypt.hashSync(p, 10);

  await prisma.user.createMany({
    data: [
      { username: "owner", name: "Owner", passwordHash: hash("owner123"), role: "admin" },
      { username: "manager1", name: "Manager One", passwordHash: hash("manager123"), role: "manager" },
    ],
  });

  const chadstone = await prisma.shoppingCenter.create({
    data: {
      name: "Chadstone",
      status: "booked",
      region: "New South Wales",
      contactName: "Sarah Mitchell",
      bookedFrom: new Date("2026-01-15"),
      bookedTo: new Date("2026-12-31"),
    },
  });
  await prisma.shoppingCenter.create({
    data: { name: "Westfield Doncaster", status: "contacted", region: "New South Wales", contactName: "Michael Chen" },
  });
  await prisma.shoppingCenter.create({
    data: { name: "Pacific Fair", status: "need_to_contact", region: "Queensland" },
  });

  const employees = await Promise.all([
    prisma.employee.create({ data: { fullName: "Yossi Levi", role: "region_manager", payout: 1100 } }),
    prisma.employee.create({ data: { fullName: "Noa Avraham", role: "employee", payout: 900 } }),
    prisma.employee.create({ data: { fullName: "Maya Gold", role: "employee", payout: 850 } }),
  ]);

  const today = startOfDay(new Date());
  for (let i = 0; i < 30; i++) {
    if (Math.random() < 0.1) continue;
    const date = subDays(today, i);
    const cash = Math.round(300 + Math.random() * 800);
    const card = Math.round(500 + Math.random() * 1500);
    const refund = Math.random() < 0.15 ? Math.round(50 + Math.random() * 300) : 0;
    const net = cash + card - refund;

    const sale = await prisma.dailySale.create({
      data: { centerId: chadstone.id, date, cashAmount: cash, cardAmount: card, refundAmount: refund },
    });
    const numSellers = 1 + Math.floor(Math.random() * 3);
    const chosen = [...employees].sort(() => Math.random() - 0.5).slice(0, Math.min(numSellers, employees.length));
    let remaining = net;
    for (let k = 0; k < chosen.length; k++) {
      const isLast = k === chosen.length - 1;
      const portion = isLast ? remaining : Math.round(net / chosen.length);
      remaining -= portion;
      if (portion > 0) {
        await prisma.employeeSale.create({
          data: { dailySaleId: sale.id, employeeId: chosen[k].id, amount: portion },
        });
      }
    }
  }

  console.log("\nSeed complete.");
  console.log("Login: owner / owner123  or  manager1 / manager123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
