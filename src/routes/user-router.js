import express, { Router } from "express";
import { UserModel } from "../models/user.js";
import bcrypt from 'bcrypt';
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from 'passport-local';
import { z } from "zod";

import jwt from "jsonwebtoken";
const jwtpassword=process.env.JWT_SECRET;


const router = Router();
const saltRounds = parseInt(process.env.SALTROUND) || 10; // Provide a default value if SALTROUND is not set
const app = express();

router.use(session({
    secret: process.env.PASSPORT_SECRET, // replace with your actual secret key
    resave: false,
    saveUninitialized: false
  }));
  router.use(passport.initialize());
  router.use(passport.session());

// zod signup schema
const signupSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters long")
    .max(64, "Password must not exceed 64 characters")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one digit")
    .regex(/[^a-zA-Z0-9]/, "Password must contain at least one special character")
});

// zod login schema
const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Password must be at least 8 characters long")
    .max(64, "Password must not exceed 64 characters")
    .regex(/[a-z]/, "Password must contain at least one lowercase letter")
    .regex(/[A-Z]/, "Password must contain at least one uppercase letter")
    .regex(/[0-9]/, "Password must contain at least one digit")
    .regex(/[^a-zA-Z0-9]/, "Password must contain at least one special character"),
});

// Signup route
router.post("/signup", async (req, res) => {
  const { username, email, password} = req.body;
  const userData = { username, email, password, organizationName, phoneNo };
  const responseCheck = signupSchema.safeParse(userData);
  if (!responseCheck.success) {
    return res.status(400).json({ error: responseCheck.error });
  }

  try {
    const existingUser = await UserModel.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: "User already exists" });
    } else {
      const hashedPassword = await bcrypt.hash(password, saltRounds);
      const newUser = new UserModel({ username, email, password: hashedPassword, organizationName, phoneNo });
      await newUser.save();
      return res.status(201).json({ message: "User created successfully" });
    }
  } catch (err) {
    console.error(err);
    res.status(500).json({ message: "Server error" });
  }
});

// Input validation middleware for login
const inputValidate = (req, res, next) => {
  const { email, password } = req.body;
  const loginUser = { email, password };
  const inputValidate = loginSchema.safeParse(loginUser);
  if (!inputValidate.success) {
    return res.status(400).json({ msg: inputValidate.error });
  } else {
    next();
  }
};

// Passport Local Strategy
// Modify passport local strategy to include isAdmin field
passport.use(
  new LocalStrategy({ usernameField: 'email' }, async (email, password, done) => {
    try {
      const user = await UserModel.findOne({ email });
      if (!user) {
        return done(null, false, { message: "Incorrect email." });
      }

      const isPasswordValid = await bcrypt.compare(password, user.password);
      if (!isPasswordValid) {
        return done(null, false, { message: "Incorrect password." });
      }

      return done(null, user);
    } catch (err) {
      return done(err);
    }
  })
);


// Login route
router.post('/login', inputValidate, (req, res, next) => {
  passport.authenticate('local', (err, user, info) => {
    if (err) {
      return next(err);
    }
    if (!user) {
      return res.status(401).json({ message: info.message });
    }
    req.logIn(user, (err) => {
      if (err) {
        return next(err);
      }
      var token =jwt.sign({email:req.body.email},jwtpasswort)
      localStorage.setItem('token', token);
      return res.status(200).json({ message: 'Login successful' });
    });
  })(req, res, next);
});




// Passport serialize and deserialize
passport.serializeUser((user, done) => {
  done(null, user.id);
});

passport.deserializeUser(async (id, done) => {
  try {
    const user = await UserModel.findById(id);
    done(null, user);
  } catch (err) {
    done(err);
  }
});


export default router;