const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const Student = require("./models/Student");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 5000;

// Kết nối MongoDB Atlas
mongoose
    .connect(process.env.MONGODB_URI)
    .then(() => {
        console.log("MongoDB Atlas connected successfully!");
    })
    .catch((error) => {
        console.error("MongoDB connection error:", error.message);
    });

// API kiểm tra Backend
app.get("/api/hello", (req, res) => {
    res.json({
        message: "Backend MERN đang hoạt động!"
    });
});

// API lấy danh sách sinh viên
app.get("/api/students", async (req, res) => {
    try {
        const students = await Student.find().sort({ createdAt: -1 });
        res.json(students);
    } catch (error) {
        res.status(500).json({
            message: "Lấy danh sách sinh viên thất bại",
            error: error.message
        });
    }
});

// API thêm sinh viên
app.post("/api/students", async (req, res) => {
    try {
        const student = new Student(req.body);
        const savedStudent = await student.save();

        res.status(201).json(savedStudent);
    } catch (error) {
        res.status(400).json({
            message: "Thêm sinh viên thất bại",
            error: error.message
        });
    }
});

app.listen(PORT, () => {
    console.log(`Server đang chạy tại port ${PORT}`);
});