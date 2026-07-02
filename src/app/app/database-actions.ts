"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getActiveWorkspaceId } from "./actions";
import { limit, LIMITS } from "@/lib/validation";
import {
  newId,
  type CellValue,
  type PropertyType,
  type ViewType,
  type ViewConfig,
  type SelectOption,
} from "@/lib/database";

async function assertDatabase(databaseId: string): Promise<string> {
  const workspaceId = await getActiveWorkspaceId();
  const db = await prisma.database.findFirst({
    where: { id: databaseId, workspaceId },
    select: { id: true },
  });
  if (!db) throw new Error("Database not found");
  return workspaceId;
}

/**
 * Create a new database page with sensible default properties, a table view and
 * a few empty rows. Returns the new page id.
 */
export async function createDatabasePage(
  parentId?: string | null,
): Promise<string> {
  const workspaceId = await getActiveWorkspaceId();

  const siblingCount = await prisma.page.count({
    where: { workspaceId, parentId: parentId ?? null, archivedAt: null },
  });

  const page = await prisma.page.create({
    data: {
      workspaceId,
      parentId: parentId ?? null,
      type: "database",
      title: "Untitled Database",
      icon: "🗄️",
      order: siblingCount,
    },
  });

  const statusOptions: SelectOption[] = [
    { id: newId(), name: "Todo", color: "gray" },
    { id: newId(), name: "In Progress", color: "blue" },
    { id: newId(), name: "Done", color: "green" },
  ];

  const database = await prisma.database.create({
    data: {
      workspaceId,
      pageId: page.id,
      properties: {
        create: [
          { name: "Name", type: "text", order: 0 },
          {
            name: "Status",
            type: "select",
            options: JSON.stringify(statusOptions),
            order: 1,
          },
          { name: "Date", type: "date", order: 2 },
          { name: "Done", type: "checkbox", order: 3 },
        ],
      },
      views: {
        create: [{ name: "Table", type: "table", order: 0 }],
      },
    },
    include: { properties: true },
  });

  const nameProp = database.properties.find((p) => p.name === "Name")!;
  const statusProp = database.properties.find((p) => p.name === "Status")!;

  await prisma.databaseRow.createMany({
    data: [0, 1, 2].map((i) => ({
      databaseId: database.id,
      order: i,
      cells: JSON.stringify({
        [nameProp.id]: ["First item", "Second item", "Third item"][i],
        [statusProp.id]: statusOptions[i % statusOptions.length].id,
      }),
    })),
  });

  revalidatePath("/app", "layout");
  return page.id;
}

export async function addRow(databaseId: string): Promise<void> {
  await assertDatabase(databaseId);
  const count = await prisma.databaseRow.count({ where: { databaseId } });
  await prisma.databaseRow.create({
    data: { databaseId, order: count, cells: "{}" },
  });
  revalidatePath("/app", "layout");
}

export async function updateCell(
  rowId: string,
  propertyId: string,
  value: CellValue,
): Promise<void> {
  const workspaceId = await getActiveWorkspaceId();
  if (typeof value === "string") limit(value, LIMITS.cell, "Cell value");
  const row = await prisma.databaseRow.findFirst({
    where: { id: rowId, database: { workspaceId } },
    select: { cells: true },
  });
  if (!row) throw new Error("Row not found");

  let cells: Record<string, CellValue> = {};
  try {
    cells = JSON.parse(row.cells);
  } catch {
    cells = {};
  }
  if (value === null || value === "") {
    delete cells[propertyId];
  } else {
    cells[propertyId] = value;
  }

  await prisma.databaseRow.update({
    where: { id: rowId },
    data: { cells: JSON.stringify(cells) },
  });
  revalidatePath("/app", "layout");
}

export async function deleteRow(rowId: string): Promise<void> {
  const workspaceId = await getActiveWorkspaceId();
  const row = await prisma.databaseRow.findFirst({
    where: { id: rowId, database: { workspaceId } },
    select: { id: true },
  });
  if (!row) throw new Error("Row not found");
  await prisma.databaseRow.delete({ where: { id: rowId } });
  revalidatePath("/app", "layout");
}

export async function addProperty(
  databaseId: string,
  type: PropertyType,
  name?: string,
): Promise<void> {
  await assertDatabase(databaseId);
  const count = await prisma.databaseProperty.count({ where: { databaseId } });
  await prisma.databaseProperty.create({
    data: {
      databaseId,
      name: name?.trim() || defaultPropertyName(type),
      type,
      order: count,
    },
  });
  revalidatePath("/app", "layout");
}

export async function updateProperty(
  propertyId: string,
  data: { name?: string; type?: PropertyType; options?: SelectOption[] },
): Promise<void> {
  const workspaceId = await getActiveWorkspaceId();
  const prop = await prisma.databaseProperty.findFirst({
    where: { id: propertyId, database: { workspaceId } },
    select: { id: true },
  });
  if (!prop) throw new Error("Property not found");

  await prisma.databaseProperty.update({
    where: { id: propertyId },
    data: {
      ...(data.name !== undefined ? { name: data.name.trim() || "Untitled" } : {}),
      ...(data.type !== undefined ? { type: data.type } : {}),
      ...(data.options !== undefined
        ? { options: JSON.stringify(data.options) }
        : {}),
    },
  });
  revalidatePath("/app", "layout");
}

export async function deleteProperty(propertyId: string): Promise<void> {
  const workspaceId = await getActiveWorkspaceId();
  const prop = await prisma.databaseProperty.findFirst({
    where: { id: propertyId, database: { workspaceId } },
    select: { id: true },
  });
  if (!prop) throw new Error("Property not found");
  await prisma.databaseProperty.delete({ where: { id: propertyId } });
  revalidatePath("/app", "layout");
}

export async function addView(
  databaseId: string,
  type: ViewType,
): Promise<string> {
  await assertDatabase(databaseId);
  const count = await prisma.databaseView.count({ where: { databaseId } });
  const view = await prisma.databaseView.create({
    data: {
      databaseId,
      name: type[0].toUpperCase() + type.slice(1),
      type,
      order: count,
    },
  });
  revalidatePath("/app", "layout");
  return view.id;
}

export async function updateView(
  viewId: string,
  data: { name?: string; type?: ViewType; config?: ViewConfig },
): Promise<void> {
  const workspaceId = await getActiveWorkspaceId();
  const view = await prisma.databaseView.findFirst({
    where: { id: viewId, database: { workspaceId } },
    select: { id: true },
  });
  if (!view) throw new Error("View not found");
  await prisma.databaseView.update({
    where: { id: viewId },
    data: {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.type !== undefined ? { type: data.type } : {}),
      ...(data.config !== undefined
        ? { config: JSON.stringify(data.config) }
        : {}),
    },
  });
  revalidatePath("/app", "layout");
}

export async function deleteView(viewId: string): Promise<void> {
  const workspaceId = await getActiveWorkspaceId();
  const view = await prisma.databaseView.findFirst({
    where: { id: viewId, database: { workspaceId } },
    select: { id: true, databaseId: true },
  });
  if (!view) throw new Error("View not found");
  const remaining = await prisma.databaseView.count({
    where: { databaseId: view.databaseId },
  });
  if (remaining <= 1) throw new Error("A database needs at least one view");
  await prisma.databaseView.delete({ where: { id: viewId } });
  revalidatePath("/app", "layout");
}

function defaultPropertyName(type: PropertyType): string {
  const map: Record<PropertyType, string> = {
    text: "Text",
    number: "Number",
    select: "Select",
    date: "Date",
    checkbox: "Checkbox",
  };
  return map[type];
}
