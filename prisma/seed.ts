import "dotenv/config";
import { PrismaClient } from "../src/generated/prisma/client";
import bcrypt from "bcryptjs";
import { subDays } from "date-fns";

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
  await prisma.dailySale.deleteMany();
  await prisma.apartmentAssignment.deleteMany();
  await prisma.apartment.deleteMany();
  await prisma.employee.deleteMany();
  await prisma.shoppingCenter.deleteMany();
  await prisma.user.deleteMany();

  const hash = (p: string) => bcrypt.hashSync(p, 10);

  await prisma.user.createMany({
    data: [
      {
        username: "mesmerizing",
        name: "Owner",
        passwordHash: hash("babasoda"),
        role: "admin",
      },
    ],
  });

  const chadstone = await prisma.shoppingCenter.create({
    data: {
      name: "Chadstone",
      status: "booked",
      region: "South-East Melbourne",
      contactName: "Sarah Mitchell",
      bookedFrom: new Date("2026-01-15"),
      bookedTo: new Date("2026-12-31"),
      notes: "Premium foot traffic — kiosk on level 1 near food court",
    },
  });
  const highpoint = await prisma.shoppingCenter.create({
    data: {
      name: "Highpoint",
      status: "booked",
      region: "Western Melbourne",
      contactName: "James O'Brien",
      bookedFrom: new Date("2025-11-01"),
      bookedTo: new Date("2026-10-31"),
    },
  });
  const eastland = await prisma.shoppingCenter.create({
    data: {
      name: "Eastland",
      status: "booked",
      region: "Outer East Melbourne",
      contactName: "Priya Sharma",
      bookedFrom: new Date("2026-03-01"),
      bookedTo: new Date("2026-09-30"),
      notes: "Renewal due Q3 — start renegotiation in July",
    },
  });
  await prisma.shoppingCenter.create({
    data: {
      name: "Westfield Doncaster",
      status: "contacted",
      region: "North-East Melbourne",
      contactName: "Michael Chen",
      notes: "Spoke with leasing manager 2026-05-10 — sent kiosk specs",
    },
  });
  await prisma.shoppingCenter.create({
    data: {
      name: "The Glen",
      status: "contacted",
      region: "South-East Melbourne",
      contactName: "Emily Wright",
      notes: "Waiting on availability calendar from leasing team",
    },
  });
  await prisma.shoppingCenter.create({
    data: {
      name: "Westfield Knox",
      status: "contacted",
      region: "Outer East Melbourne",
      contactName: "Liam Patel",
    },
  });
  await prisma.shoppingCenter.create({
    data: {
      name: "Northland",
      status: "need_to_contact",
      region: "Northern Melbourne",
    },
  });
  await prisma.shoppingCenter.create({
    data: {
      name: "Knox City",
      status: "need_to_contact",
      region: "Outer East Melbourne",
      notes: "Visit during weekday lunch to scout traffic",
    },
  });
  await prisma.shoppingCenter.create({
    data: {
      name: "Southland",
      status: "need_to_contact",
      region: "Bayside Melbourne",
    },
  });
  await prisma.shoppingCenter.create({
    data: {
      name: "Werribee Plaza",
      status: "need_to_contact",
      region: "Western Melbourne",
      notes: "Lower rent, smaller traffic — backup option",
    },
  });
  await prisma.shoppingCenter.create({
    data: {
      name: "Westfield Geelong",
      status: "need_to_contact",
      region: "Geelong",
      contactName: "TBD",
      notes: "Worth a phone call — friend's contact works there",
    },
  });

  const apt1 = await prisma.apartment.create({
    data: {
      address: "12/45 Burwood Rd",
      city: "Hawthorn VIC",
      bedrooms: 2,
      monthlyRent: 2800,
      landlord: "Sam Cohen",
      landlordPhone: "0400-111-222",
      leaseStart: new Date("2026-01-15"),
    },
  });
  const apt2 = await prisma.apartment.create({
    data: {
      address: "8/220 Lygon St",
      city: "Carlton VIC",
      bedrooms: 3,
      monthlyRent: 3600,
      landlord: "Lior R.",
      leaseStart: new Date("2025-09-01"),
    },
  });

  const employees = await Promise.all([
    prisma.employee.create({
      data: { fullName: "Yossi Levi", centerId: chadstone.id },
    }),
    prisma.employee.create({
      data: { fullName: "Noa Avraham", centerId: chadstone.id },
    }),
    prisma.employee.create({
      data: { fullName: "Dani Ben-David", centerId: highpoint.id },
    }),
    prisma.employee.create({
      data: { fullName: "Maya Gold", centerId: highpoint.id },
    }),
    prisma.employee.create({
      data: { fullName: "Eitan Rosen", centerId: eastland.id },
    }),
    prisma.employee.create({
      data: { fullName: "Tal Shoham", centerId: eastland.id },
    }),
  ]);

  await prisma.apartmentAssignment.createMany({
    data: [
      {
        apartmentId: apt1.id,
        employeeId: employees[0].id,
        moveInDate: new Date("2026-01-15"),
      },
      {
        apartmentId: apt1.id,
        employeeId: employees[1].id,
        moveInDate: new Date("2026-01-15"),
      },
      {
        apartmentId: apt2.id,
        employeeId: employees[2].id,
        moveInDate: new Date("2025-09-01"),
      },
      {
        apartmentId: apt2.id,
        employeeId: employees[3].id,
        moveInDate: new Date("2026-02-01"),
      },
      {
        apartmentId: apt2.id,
        employeeId: employees[4].id,
        moveInDate: new Date("2025-10-01"),
      },
    ],
  });

  const today = new Date();
  const sales: Array<{
    employeeId: string;
    centerId: string;
    date: Date;
    cashAmount: number;
    creditAmount: number;
  }> = [];
  for (let i = 0; i < 21; i++) {
    const date = subDays(today, i);
    for (const e of employees) {
      if (Math.random() < 0.85) {
        sales.push({
          employeeId: e.id,
          centerId: e.centerId!,
          date,
          cashAmount: Math.round(200 + Math.random() * 600),
          creditAmount: Math.round(400 + Math.random() * 1200),
        });
      }
    }
  }
  await prisma.dailySale.createMany({ data: sales });

  const supplier = await prisma.supplier.create({
    data: {
      name: "Aussie Wholesale Co",
      contactPerson: "John P.",
      phone: "(03) 8000-1234",
      email: "orders@aussiewholesale.au",
    },
  });
  const products = await Promise.all([
    prisma.product.create({
      data: {
        sku: "SKU-001",
        name: "Premium Wallet",
        category: "Accessories",
        unitPrice: 49.95,
        costPrice: 18,
        supplierId: supplier.id,
      },
    }),
    prisma.product.create({
      data: {
        sku: "SKU-002",
        name: "Leather Belt",
        category: "Accessories",
        unitPrice: 39.95,
        costPrice: 14,
        supplierId: supplier.id,
      },
    }),
    prisma.product.create({
      data: {
        sku: "SKU-003",
        name: "Sunglasses Classic",
        category: "Eyewear",
        unitPrice: 79.95,
        costPrice: 22,
        supplierId: supplier.id,
      },
    }),
  ]);
  for (const p of products) {
    await prisma.stockLevel.create({
      data: {
        productId: p.id,
        quantity: Math.round(40 + Math.random() * 80),
        reorderThreshold: 15,
      },
    });
  }

  console.log("\nSeed complete.");
  console.log("Login with one of:");
  console.log("  owner    / owner123");
  console.log("  manager1 / manager123");
  console.log("  manager2 / manager123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
