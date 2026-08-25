const express = require("express");
const cors = require("cors");
const mongoose = require("mongoose");
const Student = require("./models/Student");
require("dotenv").config();

const app = express();

app.use(cors());
app.use(express.json({ limit: "3mb" }));

const PORT = process.env.PORT || 5000;

const validateStudentData = (data) => {
    const requiredFields = ["studentId", "name", "email", "dateOfBirth", "gender", "className", "major"];
    const missingField = requiredFields.find((field) => !String(data[field] || "").trim());
    if (missingField) return "Vui lòng điền đầy đủ thông tin bắt buộc";
    if (!/^\d{6}$/.test(data.studentId)) return "MSSV phải gồm đúng 6 chữ số";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(data.email)) return "Email không đúng định dạng";
    if (data.phone && !/^\d{9,11}$/.test(data.phone)) return "Số điện thoại không hợp lệ";
    if (data.citizenId && !/^\d{12}$/.test(data.citizenId)) return "CCCD phải gồm 12 chữ số";
    const birthDate = new Date(data.dateOfBirth);
    const minimumDate = new Date();
    minimumDate.setFullYear(minimumDate.getFullYear() - 18);
    if (Number.isNaN(birthDate.getTime()) || birthDate > minimumDate) return "Sinh viên phải đủ 18 tuổi";
    return null;
};

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
        const validationError = validateStudentData(req.body);
        if (validationError) return res.status(400).json({ message: validationError });
        const student = new Student(req.body);
        const savedStudent = await student.save();

        res.status(201).json(savedStudent);
    } catch (error) {
        if (error.code === 11000) {
            const duplicatedField = Object.keys(error.keyPattern || {})[0];
            const fieldName = duplicatedField === "studentId" ? "MSSV" : "email";

            return res.status(409).json({
                message: `${fieldName} đã tồn tại trong hệ thống`
            });
        }

        res.status(400).json({
            message: "Thêm sinh viên thất bại",
            error: error.message
        });
    }
});

// API cập nhật sinh viên
app.put("/api/students/:id", async (req, res) => {
    try {
        const validationError = validateStudentData(req.body);
        if (validationError) return res.status(400).json({ message: validationError });
        const student = await Student.findByIdAndUpdate(
            req.params.id,
            req.body,
            { new: true, runValidators: true }
        );

        if (!student) {
            return res.status(404).json({ message: "Không tìm thấy sinh viên" });
        }

        res.json(student);
    } catch (error) {
        if (error.code === 11000) {
            const duplicatedField = Object.keys(error.keyPattern || {})[0];
            const fieldName = duplicatedField === "studentId" ? "MSSV" : "email";
            return res.status(409).json({ message: `${fieldName} đã tồn tại trong hệ thống` });
        }

        res.status(400).json({ message: "Cập nhật sinh viên thất bại", error: error.message });
    }
});

// API xóa sinh viên
app.delete("/api/students/:id", async (req, res) => {
    try {
        const student = await Student.findByIdAndDelete(req.params.id);

        if (!student) {
            return res.status(404).json({ message: "Không tìm thấy sinh viên" });
        }

        res.json({ message: "Xóa sinh viên thành công" });
    } catch (error) {
        res.status(400).json({ message: "Xóa sinh viên thất bại", error: error.message });
    }
});

app.listen(PORT, () => {
    console.log(`Server đang chạy tại port ${PORT}`);
});