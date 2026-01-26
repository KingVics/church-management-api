## Church Management System – Backend API

An open-source backend API built to help churches manage members, attendance, services, departments, follow-ups, and reports.

This project was designed for small to medium churches but is flexible enough to scale.

## ✨ Features


## 👥 Member Management

Member onboarding and registration

Profile picture upload

Member notes (pastoral notes, observations, follow-ups)

Archive members (soft delete / inactive members)

Department assignment

## ✅ Attendance Management

Manual attendance marking

Automated attendance support (NFC / QR ready)

Attendance per service

Present and absent tracking

## ⏱️ Services & Programs

Create and manage church services (e.g. Sunday Service, Midweek Service)

Track attendance per service

Service schedules

## 🧾 Reports

Download attendance reports

Service-based attendance summaries

Member participation reports

## 🗣️ Testimony Management

Text testimonies

Voice testimonies (audio upload and storage)

Admin moderation support (optional)

## 📞 Call & Follow-Up Management

Automatically generates absentee list after each service

Assigns absent members to admins or workers responsible for follow-up

Tracks follow-up responsibility

## 🔔 Automated Cron Jobs

Runs after every service

Generates:

Present members list

Absent members list

Triggers follow-up workflows

## 🧑‍💼 Admin & Access Control

Admin creation and management

Role-based access control (RBAC)

Permission-based authorization

Fine-grained module access

## 📺 Live Streaming

Schedule live streaming services

“Watch Live” configuration support

Streaming metadata management

## 🏢 Department Management

Create and manage church departments

Assign members to departments

Department-based reporting

## 🧱 Tech Stack

Runtime: Node.js

Framework: Express.js

Database: MongoDB (Mongoose)

Authentication: JWT

File Uploads: Multipart / Cloud storage ready

Scheduler: Cron jobs

📁 Project Structure

## 🔐 Authentication & Authorization

JWT-based authentication

Role-based access control

Permission checks per module

Admin-only routes protected via middleware

## 🛡️ Data Privacy & Responsibility

This system stores personal member data.

Administrators are responsible for:

Securing the database

Restricting admin access

Complying with local data protection regulations

Proper handling of uploaded media (images, audio)

## ⚠️ Disclaimer

This software is provided “as is”, without warranty of any kind.

The authors are not responsible for:

Data loss

Misuse of member information

Legal compliance issues

## 🤝 Contributing

Contributions are welcome.

Fork the repository

Create a feature branch

Submit a pull request

For major changes, please open an issue first.

## 📄 License

MIT License

## 🙏 Purpose

This project exists to:

Reduce administrative burden in churches

Improve member care and follow-up

Provide a free and open tool for ministry use