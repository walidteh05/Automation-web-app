# Automation Management System

> Web-based Factory Machine Management System

ระบบจัดการเครื่องจักรภายในโรงงานสำหรับติดตามสถานะเครื่องจักร
จัดการ Alarm Records และ Maintenance Records
พร้อมระบบ Authentication และ Role-Based Access Control (RBAC)
สำหรับผู้ใช้งานระดับ **Admin** และ **Technician**

---

## 📌 Overview

**Automation Management System (AMS)** เป็น Web Application
ที่พัฒนาขึ้นเพื่อช่วยจัดการข้อมูลและติดตามสถานะเครื่องจักรภายในโรงงาน
โดยรวบรวมข้อมูลสำคัญไว้ในระบบเดียว ได้แก่

- Machine Management
- Alarm Records
- Maintenance Records
- Dashboard Monitoring
- Authentication & Authorization

ระบบเชื่อมต่อกับ **Supabase PostgreSQL** เพื่อจัดเก็บข้อมูล
และใช้ **Row Level Security (RLS)** ในการควบคุมสิทธิ์การเข้าถึงข้อมูล
ตาม Role ของผู้ใช้งาน

---

## ✨ Features

### Dashboard

- แสดงจำนวนเครื่องจักรทั้งหมด
- แสดงสถานะเครื่องจักร
  - Running
  - Stop
  - Alarm
  - Maintenance
- แสดงจำนวน Alarm ทั้งหมด
- แสดงจำนวน Maintenance ทั้งหมด
- แสดง Alarm ล่าสุด
- แสดง Maintenance ล่าสุด
- Refresh ข้อมูลจากฐานข้อมูล

### Machines

Machine Master สำหรับจัดการข้อมูลเครื่องจักร

- เพิ่มข้อมูลเครื่องจักร
- แก้ไขข้อมูลเครื่องจักร
- Soft Delete เครื่องจักร
- ค้นหาเครื่องจักร
- กรองตามสถานะ
- ตรวจสอบข้อมูลก่อนบันทึก
- ป้องกัน Machine Code ซ้ำ

### Alarms

ระบบบันทึกและติดตาม Alarm ของเครื่องจักร

- เพิ่ม Alarm Record
- แก้ไข Alarm Record
- ลบ Alarm สำหรับ Admin
- ค้นหา Alarm
- กรองตามสถานะ
- เชื่อมโยง Alarm กับเครื่องจักร
- ระบุสาเหตุของ Alarm
- ระบุผู้บันทึกข้อมูล

### Maintenance

ระบบจัดการงานบำรุงรักษา

- เพิ่ม Maintenance Record
- แก้ไข Maintenance Record
- ลบ Maintenance สำหรับ Admin
- ค้นหา Maintenance
- กรองตามสถานะ
- กรองตามเครื่องจักร
- ระบุ Technician ผู้รับผิดชอบ
- บันทึกรายละเอียดการดำเนินงาน

---

## 👥 User Roles & Permissions

ระบบรองรับ 2 Role หลัก

| Feature | Admin | Technician |
|---|:---:|:---:|
| Dashboard | ✅ | ✅ |
| View Machines | ✅ | ✅ |
| Create Machine | ✅ | ❌ |
| Update Machine | ✅ | ❌ |
| Delete Machine | ✅ | ❌ |
| View Alarms | ✅ | ✅ |
| Create Alarm | ✅ | ✅ |
| Update Alarm | ✅ | ✅ |
| Delete Alarm | ✅ | ❌ |
| View Maintenance | ✅ | ✅ |
| Create Maintenance | ✅ | ✅ |
| Update Maintenance | ✅ | ✅ |
| Delete Maintenance | ✅ | ❌ |

### Admin

สามารถจัดการข้อมูลหลักของระบบ รวมถึง Machine Master
และสามารถลบ Alarm และ Maintenance Records ได้

### Technician

สามารถตรวจสอบเครื่องจักร บันทึกและแก้ไข Alarm
รวมถึงจัดการงาน Maintenance ได้ แต่ไม่มีสิทธิ์ลบข้อมูล
และไม่สามารถจัดการ Machine Master ในระดับ Admin

---

## 🔐 Authentication & Authorization

ระบบใช้ **Supabase Authentication** สำหรับการ Login และ Register

### Authentication

การเข้าสู่ระบบใช้:

- Username
- Password

หลังจาก Login ระบบจะตรวจสอบ Role ของผู้ใช้งานจาก `profiles`

### Supported Roles

```text
admin
technician
