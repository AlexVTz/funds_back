// server.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const { User } = require("./database");

const app = express();
const PORT = process.env.PORT || 4000;

// Middleware
app.use(
  cors({
    origin: ["http://localhost:3000", "https://funds-front-one.vercel.app"],
    credentials: true,
  })
);
app.use(express.json());
const JWT_SECRET = process.env.JWT_SECRET;

// In-memory user store (for testing only!)
let users = []; // In production, use a real database

// 1. Sign Up Route
app.post("/signup", async (req, res) => {
  console.log("hit signup", req.body);
  try {
    const { username, password, email, country } = req.body;
    const existingUser = await User.findOne({ where: { username } });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    // Hash the password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create new user object
    const newUser = await User.create({
      id: Date.now(),
      username,
      email,
      country,
      password: hashedPassword,
    });
    console.log(newUser, users);
    return res.status(201).json({ message: "User created successfully" });
  } catch (err) {
    return res.status(500).json({ error: err, message: "Error creating user" });
  }
});

// 2. Login Route
app.post("/login", async (req, res) => {
  try {
    const { username, password } = req.body;
    const user = await User.findOne({ where: { username } });
    if (!user) {
      return res.status(401).json({ message: "Invalid username or password" });
    }

    // Compare password with hashed password
    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid username or password" });
    }

    // Create JWT token
    const token = jwt.sign(
      { userId: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: "1h" }
    );
    // Return token
    return res.status(200).json({ message: "Login successful", token });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ error: err, message: "Error logging in" });
  }
});

// 3. Protected Route
app.get("/profile", async (req, res) => {
  // Typically, you'd read the token from the Authorization header: Bearer <token>
  const authHeader = req.headers.authorization;
  if (!authHeader) {
    return res.status(401).json({ message: "No token provided" });
  }

  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const user = await User.findByPk(decoded.userId);
    if (!user) {
      return res.status(401).json({ message: "Invalid token" });
    }

    // If token is valid, return some protected data
    return res.status(200).json({
      message: "Protected data accessed successfully",
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        country: user.country,
      },
    });
  } catch (err) {
    return res.status(401).json({ error: err, message: "Invalid token" });
  }
});

app.listen(PORT, () => {
  console.log(`Auth backend is running on http://localhost:${PORT}`);
});
