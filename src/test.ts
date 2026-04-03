import type { Person } from "$lib/server/db/schema";
import type { Session, User } from "better-auth";

export const test_user: User = {
    id: "1234567890",
    createdAt: new Date(),
    updatedAt: new Date(),
    email: "test@example.com",
    emailVerified: true,
    name: "Test User",
    image: "https://example.com/avatar.png"
};

export const test_session: Session = {
    id: "test-session-id",
    createdAt: new Date(),
    updatedAt: new Date(),
    userId: "1234567890",
    expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
    token: "test-session-token",
    ipAddress: null,
    userAgent: null
}

export const test_person: Person = {
    id: "person-123",
    createdAt: new Date(),
    updatedAt: new Date(),
    name: "Test Person",
    fullname: "Test Person Fullname",
    email: "test-person@example.com",
    role: "admin",
    userId: "1234567890",
    updatedBy: null
}; 

