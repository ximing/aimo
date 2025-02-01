import { FastifyReply, FastifyRequest } from 'fastify';
import xlsx from 'xlsx';
import { eq } from 'drizzle-orm';

import { db } from '@/lib/db.js';
import { notes } from '@/config/schema.js';
import { generateEmbedding } from '@/lib/openai.js';

interface ImportRow {
  content: string;
  // 其他可能的字段
}

export async function importNotes(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const file = await request.file();
  const userId = request.user.id;

  if (!file) {
    throw new Error('No file uploaded');
  }
  const buffer = await file.toBuffer();
  const workbook = xlsx.read(buffer);
  const worksheet = workbook.Sheets[workbook.SheetNames[0]];
  const data = xlsx.utils.sheet_to_json(worksheet);

  const importedNotes = [];
  for (const item of data) {
    const row = item as ImportRow;
    const content = row.content;
    const embedding = await generateEmbedding(content);

    const [note] = await db
      .insert(notes)
      .values({
        userId,
        content,
        vectorEmbedding: embedding,
        isPublic: false,
      })
      .returning();

    importedNotes.push(note);
  }

  return { imported: importedNotes.length };
}

export async function exportNotes(
  request: FastifyRequest,
  reply: FastifyReply
) {
  const userId = request.user.id;
  const format = (request.query as { format?: string }).format || 'json';

  const userNotes = await db.query.notes.findMany({
    where: eq(notes.userId, userId),
    columns: {
      id: true,
      content: true,
      createdAt: true,
      updatedAt: true,
      // ... 其他需要的字段
    },
    with: {
      noteTags: {
        with: {
          tag: true,
        },
      },
    },
  });

  if (format === 'xlsx') {
    const worksheet = xlsx.utils.json_to_sheet(userNotes);
    const workbook = xlsx.utils.book_new();
    xlsx.utils.book_append_sheet(workbook, worksheet, 'Notes');

    const buffer = xlsx.write(workbook, { type: 'buffer', bookType: 'xlsx' });

    reply.header(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    reply.header('Content-Disposition', 'attachment; filename="notes.xlsx"');
    return reply.send(buffer);
  }

  if (format === 'csv') {
    const worksheet = xlsx.utils.json_to_sheet(userNotes);
    const csv = xlsx.utils.sheet_to_csv(worksheet);

    reply.header('Content-Type', 'text/csv');
    reply.header('Content-Disposition', 'attachment; filename="notes.csv"');
    return reply.send(csv);
  }

  // Default to JSON
  reply.header('Content-Type', 'application/json');
  reply.header('Content-Disposition', 'attachment; filename="notes.json"');
  return reply.send(JSON.stringify(userNotes, null, 2));
}
