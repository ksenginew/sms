import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from 'drizzle-orm';
import { user } from './auth-schema';
export * from "./auth-schema";

export const ROLES = ["admin", "teacher", "student"] as const;

export const people = sqliteTable('people', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),    
  name: text("name"),
  email: text("email").unique(),
  image: text("image"),
  firstName: text("first_name"),
  lastName: text("last_name"),
  fullname: text("fullname"),
  idnumber: text("idnumber"),
  phone: text("phone"),
  mobilePhone: text("mobile_phone"),
  address: text("address"),
  role: text('role', { enum: ROLES }).notNull(),
  userId: text('user_id').references(() => user.id),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(strftime('%s', 'now'))`),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(strftime('%s', 'now'))`)
    .$onUpdateFn(() => new Date()),
  updatedBy: text('updated_by'),
});

export type Person = typeof people.$inferSelect;

export const classes = sqliteTable('classes', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  title: text('title').notNull().unique(),
  description: text('description'),
  tags: text('tags'), // Stored as JSON string
  visible: integer('visible', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(strftime('%s', 'now'))`),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(strftime('%s', 'now'))`)
    .$onUpdateFn(() => new Date()),
  updatedBy: text('updated_by'),
});

export const classPerson = sqliteTable('class_person', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  classId: text('class_id').notNull().references(() => classes.id),
  personId: text('person_id').notNull().references(() => people.id),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(strftime('%s', 'now'))`),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(strftime('%s', 'now'))`)
    .$onUpdateFn(() => new Date()),
  updatedBy: text('updated_by'),
});

export const attendance = sqliteTable('attendance', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  personId: text('person_id').notNull().references(() => people.id),
  date: text('date').notNull(),
  status: text('status', {enum:["present", "absent", "late", "excused"]}).notNull(),
  notes: text('notes'),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(strftime('%s', 'now'))`),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(strftime('%s', 'now'))`)
    .$onUpdateFn(() => new Date()),
  updatedBy: text('updated_by'),
});

export const subjects = sqliteTable('subjects', {
  id: text('id').primaryKey().$defaultFn(() => crypto.randomUUID()),
  title: text('title').notNull().unique(),
  description: text('description'),
});

export const exams = sqliteTable('exams', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  title: text('title').notNull().unique(),
  description: text('description'),
  tags: text('tags'), // Stored as JSON string
  visible: integer('visible', { mode: 'boolean' }).notNull().default(true),
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(strftime('%s', 'now'))`),
});

export const papers = sqliteTable('papers', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  examId: integer('exam_id').references(() => exams.id),
  subjectId: text('subject_id').references(() => subjects.id).notNull(),
  title: text('title'),
  description: text('description'),
  structure: text('structure'), // Stored as JSON string
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(strftime('%s', 'now'))`),
});

export const scores = sqliteTable('scores', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  paperId: integer('paper_id').notNull().references(() => papers.id),
  personId: text('person_id').notNull().references(() => people.id),
  numeric: integer('numeric'),
  text: text('text'),
  json: text('json'), // Stored as JSON string
  createdAt: integer('created_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(strftime('%s', 'now'))`),
  updatedAt: integer('updated_at', { mode: 'timestamp' })
    .notNull()
    .default(sql`(strftime('%s', 'now'))`)
    .$onUpdateFn(() => new Date()),
  updatedBy: text('updated_by'),
});
