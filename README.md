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

## 🛡 Quality Standards
The system is built with a focus on **Security** to protect sensitive data, **Accuracy** in grading, and **Availability** via the cloud. It is designed to be **Portable**, ensuring a consistent experience across different browsers and operating systems.