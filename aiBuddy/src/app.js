const express = require("express");

const app = express();

app.use(express.json());

app.get("/", (req, res) => {
    res.status(200).json({ message: "AI Buddy service is running" });
});

app.get("/health", (req, res) => {
    res.status(200).json({ status: "ok", service: "aiBuddy" });
});

module.exports = app;
