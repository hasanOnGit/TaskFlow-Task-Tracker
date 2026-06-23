require("dotenv").config();
const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const User = require("./src/models/user.model");
const Task = require("./src/models/task.model");

const TEST_PASSWORD = "password123";

const TEST_USERS = [
  {
    username: "Mary Manager",
    email: "manager@test.com",
    role: "manager",
    manager: null,
  },
  {
    username: "Leo Team Lead",
    email: "lead@test.com",
    role: "team_lead",
    reportsToEmail: "manager@test.com",
  },
  {
    username: "Emma Employee",
    email: "employee@test.com",
    role: "employee",
    reportsToEmail: "lead@test.com",
  },
];

async function seed() {
  if (!process.env.MONGO_URI) {
    console.error("Set MONGO_URI in backend/.env before running seed.");
    process.exit(1);
  }

  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");

    await Task.deleteMany({});
    await User.deleteMany({});

    const hashed = await bcrypt.hash(TEST_PASSWORD, 10);
    const created = {};

    for (const u of TEST_USERS) {
      let manager = null;
      if (u.reportsToEmail) {
        manager = created[u.reportsToEmail]._id;
      }

      created[u.email] = await User.create({
        username: u.username,
        email: u.email,
        password: hashed,
        role: u.role,
        manager,
      });
    }

    await Task.create([
      {
        title: "Review team performance",
        description: "Monthly review for all team leads.",
        status: "pending",
        assignedTo: created["lead@test.com"]._id,
        createdBy: created["manager@test.com"]._id,
      },
      {
        title: "Fix login bug",
        description: "Investigate intermittent login failure.",
        status: "pending",
        assignedTo: created["employee@test.com"]._id,
        createdBy: created["lead@test.com"]._id,
      },
      {
        title: "Update API docs",
        description: "Document the task endpoints.",
        status: "completed",
        assignedTo: created["employee@test.com"]._id,
        createdBy: created["employee@test.com"]._id,
      },
    ]);

    console.log("\nSeed complete. Test logins (password for all: password123):\n");
    console.log("  Manager   -> manager@test.com");
    console.log("  Team Lead -> lead@test.com");
    console.log("  Employee  -> employee@test.com\n");

    await mongoose.disconnect();
    process.exit(0);
  } catch (error) {
    console.error("Seed failed:", error.message);
    process.exit(1);
  }
}

seed();
