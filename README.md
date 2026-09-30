# Automation Management System

<p align="center">
  <strong>Web-based Factory Machine Management System</strong>
</p>

<p align="center">
  ระบบจัดการเครื่องจักรสำหรับโรงงาน
  สำหรับติดตามสถานะเครื่องจักร จัดการ Alarm และงานบำรุงรักษา
</p>

<p align="center">
  <img src="https://img.shields.io/badge/Next.js-16-black?logo=next.js" alt="Next.js" />
  <img src="https://img.shields.io/badge/React-19-61DAFB?logo=react" alt="React" />
  <img src="https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/Supabase-PostgreSQL-3ECF8E?logo=supabase" alt="Supabase" />
  <img src="https://img.shields.io/badge/GitHub-Actions-2088FF?logo=githubactions" alt="GitHub Actions" />
  <img src="https://img.shields.io/badge/Vercel-000000?logo=vercel" alt="Vercel" />
</p>

---

## 📌 Project Overview

**Automation Management System (AMS)** เป็น Web Application สำหรับบริหารจัดการเครื่องจักรภายในโรงงาน โดยรวบรวมข้อมูลสำคัญของระบบไว้ในศูนย์กลางเดียว ได้แก่

- ข้อมูลเครื่องจักร (Machine Master)
- Alarm Records
- Maintenance Records
- Dashboard Monitoring
- Machine History
- Alarm Analytics
- Search & Filter
- Export CSV
- In-app Notification
- Authentication & Authorization

ระบบช่วยให้ผู้ใช้งานสามารถติดตามสถานะเครื่องจักร ตรวจสอบเหตุการณ์ Alarm และบันทึกประวัติการบำรุงรักษาได้อย่างเป็นระบบ

ข้อมูลจัดเก็บด้วย **Supabase PostgreSQL** และควบคุมสิทธิ์การเข้าถึงด้วย **Role-Based Access Control (RBAC)** ร่วมกับ **Row Level Security (RLS)**

---

## 🎯 Project Objectives

ระบบถูกออกแบบเพื่อรองรับการจัดการเครื่องจักรภายในโรงงาน โดยมีวัตถุประสงค์หลักดังนี้

- ติดตามสถานะของเครื่องจักรภายในโรงงาน
- จัดเก็บและติดตาม Alarm ที่เกิดขึ้น
- จัดการงานบำรุงรักษาและผู้รับผิดชอบ
- ดูประวัติของเครื่องจักรแต่ละเครื่อง
- วิเคราะห์ข้อมูล Alarm
- ค้นหาและกรองข้อมูลได้สะดวก
- ส่งออกข้อมูลเพื่อนำไปวิเคราะห์ต่อ
- ควบคุมสิทธิ์การเข้าถึงข้อมูลตาม Role
- แสดงข้อมูลสำคัญผ่าน Dashboard

---

## ✨ Main Features

### Dashboard

Dashboard แสดงภาพรวมของระบบจากข้อมูลจริงใน Supabase

- จำนวนเครื่องจักรทั้งหมด
- จำนวนเครื่องจักรตามสถานะ
- Running
- Stop
- Alarm
- Maintenance
- จำนวน Alarm ทั้งหมด
- จำนวน Maintenance ทั้งหมด
- Recent Alarms
- Recent Maintenance
- Alarm Analytics
- Refresh ข้อมูลล่าสุด

### Machines

Machine Master สำหรับจัดการข้อมูลเครื่องจักร

- เพิ่มเครื่องจักร
- แก้ไขข้อมูลเครื่องจักร
- Soft Delete
- ค้นหาเครื่องจักร
- Filter ตามสถานะ
- Validation
- ป้องกัน Machine Code ซ้ำ
- ดู Machine History

### Alarms

ระบบบันทึกและติดตาม Alarm

- เพิ่ม Alarm
- แก้ไข Alarm
- ลบ Alarm สำหรับ Admin
- ค้นหา Alarm
- Filter ตามสถานะ
- Filter ตามเครื่องจักร
- Filter ตามช่วงวันที่
- ระบุสาเหตุของ Alarm
- ระบุผู้บันทึก
- Alarm Analytics
- Export CSV

### Maintenance

ระบบจัดการงานบำรุงรักษา

- เพิ่ม Maintenance Record
- แก้ไข Maintenance Record
- ลบ Maintenance สำหรับ Admin
- ค้นหา Maintenance
- Filter ตามสถานะ
- Filter ตามเครื่องจักร
- Filter ตามช่วงวันที่
- ระบุ Technician ผู้รับผิดชอบ
- บันทึก Work Performed
- Export CSV

### Machine History

แสดงประวัติของเครื่องจักรแต่ละเครื่องโดยรวมข้อมูลจาก

- Alarm Records
- Maintenance Records

และเรียงตามเวลาจากใหม่ไปเก่า

### Alarm Analytics

แสดงข้อมูลวิเคราะห์ Alarm จากข้อมูลจริง เช่น

- จำนวน Alarm ตามสถานะ
- แนวโน้มจำนวน Alarm รายวันย้อนหลัง

### In-app Notification

ระบบแจ้งเตือนภายในเว็บไซต์จากข้อมูล Alarm และ Maintenance ที่ต้องติดตาม

รองรับ:

- Unread Notification
- Read Notification
- Mark as Read
- อ่านทั้งหมด
- Badge จำนวน Notification
- ลิงก์ไปยังหน้าที่เกี่ยวข้อง

### Dark Mode

รองรับ Light Mode และ Dark Mode พร้อมจดจำ Theme ของผู้ใช้

### Export CSV

รองรับการส่งออกข้อมูลจาก

- Alarms
- Maintenance

โดยรองรับการ Export ตาม Search / Filter ที่ผู้ใช้กำลังใช้งาน

### Responsive UI

รองรับการใช้งานบน

- Desktop
- Tablet
- Mobile

---

## 👥 User Roles

ระบบรองรับ 2 Role หลัก

### Admin

Admin สามารถ:

- ดู Dashboard
- เพิ่ม / แก้ไข / ลบ Machines
- ดู / เพิ่ม / แก้ไข / ลบ Alarms
- ดู / เพิ่ม / แก้ไข / ลบ Maintenance
- ดูข้อมูลทั้งหมดในระบบ

### Technician

Technician สามารถ:

- ดู Dashboard
- ดูข้อมูล Machines
- ค้นหาและ Filter Machines
- ดู / เพิ่ม / แก้ไข Alarms
- ดู / เพิ่ม / แก้ไข Maintenance

Technician ไม่มีสิทธิ์ลบ Alarm และ Maintenance
และไม่สามารถจัดการ Machine Master ในระดับ Admin

---

## 🔐 Authentication & Authorization

ระบบใช้ **Supabase Authentication** สำหรับการจัดการบัญชีผู้ใช้

การเข้าสู่ระบบประกอบด้วย:

- Username
- Password

หลังจาก Login ระบบจะตรวจสอบ Role ของผู้ใช้จาก `profiles`

### Supported Roles

```text
admin
technician
