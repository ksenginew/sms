# Eduscend

Welcome to the **Eduscend** project repository, developed by Group **Moonhare**. This platform is a centralized, cloud-based solution designed to replace manual, paper-based school management processes in Sri Lanka with a secure, mobile-friendly Progressive Web App.

## 🛠 Tech Stack

* **Runtime:** Bun
* **Framework:** SvelteKit
* **ORM:** Drizzle
* **Database:** libSQL / SQLite
* **Authentication:** Better Auth
* **Styling:** Bootstrap 5 (0 custom CSS)

---

## 🚀 Getting Started

### Prerequisites
Ensure you have [Bun](https://bun.sh/) installed on your local machine.

### Installation
```sh
# Install dependencies
bun install
```

### Developing
Start the local development server with hot-reloading:
```sh
# Start the server
bun run dev

# Start the server and open the app in a new browser tab
bun run dev -- --open
```

### Database Management
Eduscend uses Drizzle ORM with libSQL. To manage your schema:
```sh
# Generate migrations
bunx drizzle-kit generate

# Push schema changes
bunx drizzle-kit push
```

### Building
To create a production-ready version:
```sh
bun run build
```
Preview the production build locally using `bun run preview`.

---

## 📝 Project Overview

### Core Objectives
* **Unified Data:** A single source of truth for all student records.
* **Resource Management:** Digital tools for teachers to manage educational materials.
* **Automated Tracking:** Robust analytics for attendance and exam results.
* **Activity Logging:** Centralized tracking for curricular and extra-curricular achievements.

### Key Features
| Role | Primary Functions |
| :--- | :--- |
| **Teachers** | Mark attendance, upload results, and verify student achievements. |
| **Students** | Consume content, track performance, and request achievement verification. |
| **Parents** | Monitor attendance and exam results via interactive charts. |
| **Admins** | Manage school-wide data and identify underperforming students. |

---

## 🧩 Object, Class, and Entity Structure

This project primarily follows a service + role-context architecture on the server side.
Instead of checking raw role strings in every route, role behavior is encapsulated in classes.

### 1) Role Context Class Hierarchy (Authorization Model)

The role model is defined in `src/lib/server/role-context.ts`.

**Base class:**
- `RoleContext`

**Derived classes:**
- `ExternalRoleContext`
- `AdminRoleContext`
- `TeacherRoleContext`
- `StudentRoleContext`

**Factory:**
- `createRoleContext(person)`

**Core methods (capability-based):**
- `isAuthenticated()`, `isAdmin()`, `isTeacher()`, `isStudent()`
- `canManagePeople()`
- `canManageClassCatalog()`
- `canManageClassMembers()`
- `canViewExam(isVisible)`
- `canViewClassDetail(isVisible, isMember)`
- `canManageAttendanceForClass(members)`
- `isMemberOfClass(database, classId)`
- `canManageMembersForClass(database, classId)`

This gives polymorphic authorization: routes call capability methods, and each subclass decides behavior.

### 2) Route-Level Service/Object Pattern

For complex route logic, the code uses object-oriented service classes.

Example:
- `src/routes/dashboard/people/+page.server.ts`

Main service class:
- `PeoplePageService`

Supported methods:
- `load(...)`: list + pagination + optional edit target
- `create(...)`: validate + insert person
- `update(...)`: validate + update person
- `delete(...)`: remove person

Internal helper methods:
- `readValue(...)`
- `readIntParam(...)`
- `getDatabaseErrorMessage(...)`
- `assertAdmin(...)`

This encapsulates parsing, validation, and DB behavior behind a single object.

### 3) Attendance Role-Specific Classes

The attendance listing route introduces a second inheritance layer for role-specific data retrieval:
- `src/routes/dashboard/attendance/+page.server.ts`

Classes:
- `AttendanceRoleContext` (abstract)
- `AdminAttendanceContext`
- `TeacherAttendanceContext`
- `StudentAttendanceContext`

Supported methods:
- `getClasses(classSearchCondition)`
- `getStudentAttendanceData(input)`

This is used to keep role-specific query logic separate and avoid long conditional blocks.

### 4) Entity Layer (Database-Backed Domain Models)

Data entities are defined in:
- `src/lib/server/db/schema.ts`

Key entities include:
- `people`
- `classes`
- `classPerson`
- `attendance`
- `attendanceSessions`
- `exams`
- `subjects`
- `papers`
- `scores`

Important exported constants/types:
- `ROLES`
- `ATTENDANCE_STATUSES`
- `Person` (inferred from Drizzle schema)

These entities represent persisted domain data, while role/service classes represent behavior.

### 5) Quick Mental Model

- **Entities** = what is stored (tables + inferred types)
- **Classes** = who can do what (role context + service logic)
- **Objects** = runtime instances (e.g., `roleContext`, `peoplePageService`)
- **Methods** = capability and workflow APIs used by routes

This separation improves maintainability, testability, and consistency of authorization rules.

---

## 🛡 Quality Standards
The system is built with a focus on **Security** to protect sensitive data, **Accuracy** in grading, and **Availability** via the cloud. It is designed to be **Portable**, ensuring a consistent experience across different browsers and operating systems.