const mongoose = require("mongoose");

const studentSchema = new mongoose.Schema(
    {
        studentId: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            match: [/^\d{6}$/, "MSSV phải gồm đúng 6 chữ số"]
        },
        name: {
            type: String,
            required: true,
            trim: true
        },
        email: {
            type: String,
            required: true,
            unique: true,
            trim: true,
            lowercase: true
        },
        dateOfBirth: {
            type: Date,
            required: true
        },
        gender: {
            type: String,
            required: true,
            enum: ["Nam", "Nữ", "Khác"]
        },
        className: {
            type: String,
            required: true,
            trim: true
        },
        major: {
            type: String,
            required: true,
            trim: true
        },
        phone: {
            type: String,
            trim: true,
            match: [/^\d{9,11}$/, "Số điện thoại không hợp lệ"]
        },
        citizenId: {
            type: String,
            trim: true,
            unique: true,
            sparse: true,
            match: [/^\d{12}$/, "CCCD phải gồm 12 chữ số"]
        },
        avatarUrl: {
            type: String,
            trim: true
        }
    },
    {
        timestamps: true
    }
);

module.exports = mongoose.model("Student", studentSchema);