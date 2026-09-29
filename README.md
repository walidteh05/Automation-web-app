# Automation Management System

ระบบจัดการเครื่องจักรสำหรับโรงงาน
ใช้สำหรับติดตามสถานะเครื่องจักร บันทึก Alarm และจัดการงานบำรุงรักษา
พร้อมระบบ Authentication และ Role-based Access Control สำหรับ Admin และ Technician

---

## Project Overview

Automation Management System เป็น Web Application สำหรับจัดการข้อมูลเครื่องจักรภายในโรงงาน โดยแบ่งการทำงานหลักออกเป็น 3 ส่วน:

- Machine Management
- Alarm Records
- Maintenance Records

ระบบมี Dashboard สำหรับแสดงภาพรวมของเครื่องจักรและประวัติ Alarm / Maintenance
ข้อมูลทั้งหมดจัดเก็บใน Supabase PostgreSQL และมี Row Level Security (RLS)
สำหรับควบคุมสิทธิ์การเข้าถึงข้อมูลตาม Role ของผู้ใช้งาน

---

## Features

### Dashboard
- แสดงจำนวนเครื่องจักรทั้งหมด
- แสดงจำนวนเครื่องจักรตามสถานะ
- แสดงจำนวน Alarm ทั้งหมด
- แสดงจำนวน Maintenance ทั้งหมด
- แสดง Alarm ล่าสุด
- แสดง Maintenance ล่าสุด
- Refresh ข้อมูลจาก Supabase

### Machines
- เพิ่มเครื่องจักร
- แก้ไขข้อมูลเครื่องจักร
- Soft Delete เครื่องจักร
- ค้นหาเครื่องจักร
- กรองตามสถานะ
- ตรวจสอบข้อมูลก่อนบันทึก

### Alarms
- เพิ่ม Alarm Record
- แก้ไข Alarm Record
- ลบ Alarm สำหรับ Admin
- ค้นหา Alarm
- กรองตามสถานะ
- เชื่อมโยง Alarm กับเครื่องจักร

### Maintenance
- เพิ่ม Maintenance Record
- แก้ไข Maintenance Record
- ลบ Maintenance สำหรับ Admin
- ค้นหา Maintenance
- กรองตามสถานะ
- กรองตามเครื่องจักร
- เชื่อมโยงงานกับ Technician

---

## User Roles

### Admin

Admin สามารถ:

- ดู Dashboard
- จัดการ Machine Master
- เพิ่ม / แก้ไข / ลบเครื่องจักร
- ดู / เพิ่ม / แก้ไข / ลบ Alarm
- ดู / เพิ่ม / แก้ไข / ลบ Maintenance
- ดูข้อมูลทั้งหมดในระบบ

### Technician

Technician สามารถ:

- ดู Dashboard
- ดูข้อมูลเครื่องจักร
- ค้นหาและกรองข้อมูลเครื่องจักร
- ดู / เพิ่ม / แก้ไข Alarm
- ดู / เพิ่ม / แก้ไข Maintenance

Technician ไม่มีสิทธิ์ลบข้อมูล Alarm และ Maintenance
และไม่สามารถจัดการ Machine Master ในระดับ Admin ได้

---

## Technology Stack

- Next.js
- React
- TypeScript
- Supabase
- PostgreSQL
- GitHub
- GitHub Actions
- Vercel

---

## Database Schema

ระบบใช้ตารางหลักดังนี้:

### profiles

ใช้เก็บข้อมูลผู้ใช้งานและ Role

- `id`
- `display_name`
- `role`

Role ที่ใช้ในระบบ:

- `admin`
- `technician`

### machines

ใช้เก็บข้อมูลเครื่องจักร

- `id`
- `machine_code`
- `machine_name`
- `machine_type`
- `location`
- `status`
- `created_at`
- `updated_at`
- `deleted_at`

Machine Status:

- `running`
- `stop`
- `alarm`
- `maintenance`

### alarm_records

ใช้เก็บข้อมูล Alarm

- `id`
- `machine_id`
- `alarm_code`
- `alarm_description`
- `occurred_at`
- `cause`
- `status`
- `created_by`
- `created_at`
- `updated_at`

Alarm Status:

- `open`
- `in_progress`
- `closed`

### maintenance_records

ใช้เก็บข้อมูลงานบำรุงรักษา

- `id`
- `machine_id`
- `technician_id`
- `description`
- `work_performed`
- `maintenance_at`
- `status`
- `created_at`
- `updated_at`

Maintenance Status:

- `planned`
- `in_progress`
- `completed`
- `cancelled`

---

## Authentication & Authorization

ระบบใช้ Supabase Authentication สำหรับ Login และ Register

การเข้าสู่ระบบใช้:

- Username
- Password

หลัง Login ระบบจะตรวจสอบ Role จาก `profiles`

Role ที่รองรับ:

```text
admin
technician
